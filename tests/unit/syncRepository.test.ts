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
  });
});
