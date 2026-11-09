import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/storage/migrations/runner';
import { SyncRepository } from '../../src/storage/repositories/syncRepository';
import { TaskRepository } from '../../src/storage/repositories/taskRepository';
import { ProjectRepository } from '../../src/storage/repositories/projectRepository';

describe('SyncRepository', () => {
  let db: Database.Database;
  let syncRepo: SyncRepository;
  let taskRepo: TaskRepository;
  let projectRepo: ProjectRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    syncRepo = new SyncRepository(db);
    taskRepo = new TaskRepository(db);
    projectRepo = new ProjectRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Device Management & Security', () => {
    it('should register and authenticate a trusted device', () => {
      const rawToken = 'super-secret-device-token-12345';
      const device = syncRepo.registerDevice('Pixel 8 Pro', rawToken);

      expect(device.id).toBeDefined();
      expect(device.deviceName).toBe('Pixel 8 Pro');
      expect(device.isRevoked).toBe(false);

      const auth = syncRepo.authenticateDevice(rawToken);
      expect(auth).not.toBeNull();
      expect(auth?.id).toBe(device.id);

      const failedAuth = syncRepo.authenticateDevice('wrong-token');
      expect(failedAuth).toBeNull();
    });

    it('should revoke device access and reject further requests', () => {
      const rawToken = 'device-token-to-revoke';
      const device = syncRepo.registerDevice('Old Tablet', rawToken);

      expect(syncRepo.authenticateDevice(rawToken)).not.toBeNull();

      const revoked = syncRepo.revokeDevice(device.id);
      expect(revoked).toBe(true);

      expect(syncRepo.authenticateDevice(rawToken)).toBeNull();

      const devices = syncRepo.getPairedDevices();
      const found = devices.find((d) => d.id === device.id);
      expect(found?.isRevoked).toBe(true);
    });
  });

  describe('Pairing Sessions', () => {
    it('should create and verify one-time pairing session', () => {
      const pin = '482910';
      const secret = 'pairing-secret-abc';
      const session = syncRepo.createPairingSession(pin, secret, 300);

      expect(session.pinCode).toBe(pin);
      expect(session.secretToken).toBe(secret);

      // Проверка по секрету (QR-код)
      const verified = syncRepo.verifyAndUsePairing(secret);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe(session.id);

      // Повторное использование должно быть отклонено (одноразовый код)
      const reused = syncRepo.verifyAndUsePairing(secret);
      expect(reused).toBeNull();
    });

    it('should reject invalid PIN or secret', () => {
      syncRepo.createPairingSession('111222', 'secret-xyz', 300);
      const invalid = syncRepo.verifyAndUsePairing('000000');
      expect(invalid).toBeNull();
    });
  });

  describe('Tombstones & Incremental Delta', () => {
    it('should record tombstones on permanent deletion and return in delta', () => {
      const task = taskRepo.create({ title: 'Task to be erased', destination: 'inbox' });
      taskRepo.delete(task.id, true); // permanent delete

      const changes = syncRepo.getChangesSince(null);
      const tombstone = changes.tombstones.find((t) => t.entity_id === task.id);
      expect(tombstone).toBeDefined();
      expect(tombstone?.entity_type).toBe('task');
    });

    it('should apply client changes and resolve text conflict non-destructively', () => {
      const device = syncRepo.registerDevice('Test Phone', 'token-123');

      // 1. Создаём задачу на сервере
      const task = taskRepo.create({
        title: 'Купить молоко',
        notes: 'Фермерское 3.2%',
        destination: 'next_actions',
      });

      // 2. Эмулируем одновременное изменение на клиенте (с более свежим updated_at)
      const clientUpdatedAt = new Date(Date.now() + 5000).toISOString();
      const result = syncRepo.applyClientChanges(
        {
          tasks: [
            {
              ...task,
              notes: 'Безлактозное 1.5% и хлеб',
              updated_at: clientUpdatedAt,
            },
          ],
        },
        device.id
      );

      expect(result.appliedTasks).toBe(1);
      expect(result.conflictsResolved).toBe(1);

      const updated = taskRepo.getById(task.id)!;
      // Обе заметки сохранены без потерь
      expect(updated.notes).toContain('Безлактозное 1.5% и хлеб');
      expect(updated.notes).toContain('Фермерское 3.2%');
    });

    it('should NOT resurrect deleted project if tombstone exists', () => {
      const device = syncRepo.registerDevice('Pixel 9', 'token-pixel-9');
      const { project } = projectRepo.createWithFirstStep({
        title: 'Project to delete permanently',
        firstStepTitle: 'Step 1',
        completionCriteria: 'All done',
      });

      // Удаляем проект навсегда (создаётся tombstone)
      projectRepo.delete(project.id, true);

      // Проверяем, что проект удален
      expect(projectRepo.getById(project.id)).toBeNull();

      // Телефон присылает старую копию проекта
      const result = syncRepo.applyClientChanges(
        {
          projects: [
            {
              ...project,
              updated_at: new Date(Date.now() - 10000).toISOString(),
            },
          ],
        },
        device.id
      );

      // Проект НЕ должен быть воскрешён!
      expect(result.appliedProjects).toBe(0);
      expect(projectRepo.getById(project.id)).toBeNull();
    });

    it('should unpin note/task when moved to trash', () => {
      const task = taskRepo.create({
        title: 'Important Note',
        destination: 'notes',
        is_pinned: 1,
      });

      expect(taskRepo.getById(task.id)?.is_pinned).toBe(1);

      // Удаляем в корзину (soft delete)
      taskRepo.delete(task.id, false);

      const inTrash = taskRepo.getById(task.id);
      expect(inTrash?.destination).toBe('trash');
      expect(inTrash?.is_pinned).toBe(0);
    });

    it('should successfully apply reminder_offset changes from phone to desktop', () => {
      const device = syncRepo.registerDevice('Galaxy S24', 'token-galaxy-s24');

      // 1. Создаём задачу на ПК без напоминания
      const task = taskRepo.create({
        title: 'Встреча в офисе',
        destination: 'calendar',
        scheduled_date: '2026-11-15',
        scheduled_time: '14:00',
        reminder_offset: null,
      });

      expect(taskRepo.getById(task.id)?.reminder_offset).toBeNull();

      // 2. Телефон присылает обновление: включено напоминание за 15 минут
      // Эмулируем формат даты SQLite с пробелом "YYYY-MM-DD HH:MM:SS"
      const result = syncRepo.applyClientChanges(
        {
          tasks: [
            {
              id: task.id,
              title: task.title,
              destination: task.destination,
              scheduled_date: task.scheduled_date,
              scheduled_time: task.scheduled_time,
              reminder_offset: 15,
              updated_at: '2026-11-15 12:00:00',
            } as any,
          ],
        },
        device.id
      );

      expect(result.appliedTasks).toBe(1);
      const afterPhoneSync = taskRepo.getById(task.id);
      expect(afterPhoneSync?.reminder_offset).toBe(15);

      // 3. Телефон меняет напоминание на другое значение через reminderOffset (camelCase)
      syncRepo.applyClientChanges(
        {
          tasks: [
            {
              id: task.id,
              reminderOffset: 60,
              updated_at: new Date().toISOString(),
            } as any,
          ],
        },
        device.id
      );

      expect(taskRepo.getById(task.id)?.reminder_offset).toBe(60);

      // 4. Телефон отключает напоминание (null)
      syncRepo.applyClientChanges(
        {
          tasks: [
            {
              id: task.id,
              reminder_offset: null,
              updated_at: new Date().toISOString(),
            } as any,
          ],
        },
        device.id
      );

      expect(taskRepo.getById(task.id)?.reminder_offset).toBeNull();
    });
  });
});
