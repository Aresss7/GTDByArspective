import Database from 'better-sqlite3';
import crypto from 'crypto';
import { 
  SyncDevice, 
  SyncTombstone, 
  Task, 
  Project 
} from '../../shared/types';
import { TaskRepository } from './taskRepository';
import { ProjectRepository } from './projectRepository';

export class SyncRepository {
  private taskRepo: TaskRepository;
  private projectRepo: ProjectRepository;

  constructor(private db: Database.Database) {
    this.taskRepo = new TaskRepository(db);
    this.projectRepo = new ProjectRepository(db);
  }

  // Хэширование секретного токена авторизации (в базе хранится только хэш)
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  // 1. Управление доверенными устройствами
  getPairedDevices(): SyncDevice[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, 
        device_name as deviceName, 
        paired_at as pairedAt, 
        last_synced_at as lastSyncedAt, 
        (revoked_at IS NOT NULL) as isRevoked
      FROM sync_devices
      ORDER BY paired_at DESC
    `);
    const rows = stmt.all() as Array<{
      id: string;
      deviceName: string;
      pairedAt: string;
      lastSyncedAt: string | null;
      isRevoked: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      deviceName: r.deviceName,
      pairedAt: r.pairedAt,
      lastSyncedAt: r.lastSyncedAt,
      isRevoked: Boolean(r.isRevoked),
    }));
  }

  registerDevice(deviceName: string, rawToken: string): SyncDevice {
    const id = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const tokenHash = this.hashToken(rawToken);

    const stmt = this.db.prepare(`
      INSERT INTO sync_devices (
        id, device_name, token_hash, paired_at, last_synced_at, revoked_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)
    `);
    stmt.run(id, deviceName.trim(), tokenHash, now, now, now);

    return {
      id,
      deviceName: deviceName.trim(),
      pairedAt: now,
      lastSyncedAt: null,
      isRevoked: false,
    };
  }

  authenticateDevice(rawToken: string): SyncDevice | null {
    if (!rawToken) return null;
    const tokenHash = this.hashToken(rawToken);

    const stmt = this.db.prepare(`
      SELECT 
        id, 
        device_name as deviceName, 
        paired_at as pairedAt, 
        last_synced_at as lastSyncedAt, 
        revoked_at
      FROM sync_devices
      WHERE token_hash = ?
    `);
    const row = stmt.get(tokenHash) as {
      id: string;
      deviceName: string;
      pairedAt: string;
      lastSyncedAt: string | null;
      revoked_at: string | null;
    } | undefined;

    if (!row || row.revoked_at !== null) {
      return null;
    }

    return {
      id: row.id,
      deviceName: row.deviceName,
      pairedAt: row.pairedAt,
      lastSyncedAt: row.lastSyncedAt,
      isRevoked: false,
    };
  }

  revokeDevice(deviceId: string): boolean {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE sync_devices 
      SET revoked_at = ?, updated_at = ? 
      WHERE id = ? AND revoked_at IS NULL
    `);
    const res = stmt.run(now, now, deviceId);
    return res.changes > 0;
  }

  updateDeviceLastSync(deviceId: string, timestamp?: string): void {
    const now = timestamp || new Date().toISOString();
    this.db.prepare(`
      UPDATE sync_devices 
      SET last_synced_at = ?, updated_at = ? 
      WHERE id = ?
    `).run(now, now, deviceId);
  }

  // 2. Временные сессии сопряжения
  createPairingSession(pinCode: string, secretToken: string, ttlSeconds = 600): {
    id: string;
    pinCode: string;
    secretToken: string;
    expiresAt: string;
  } {
    this.cleanExpiredPairings();
    const id = `pair_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date();
    const expiresDate = new Date(now.getTime() + ttlSeconds * 1000);
    const expiresAt = expiresDate.toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO sync_pairings (id, pin_code, secret_token, expires_at, used_at, created_at)
      VALUES (?, ?, ?, ?, NULL, ?)
    `);
    stmt.run(id, pinCode, secretToken, expiresAt, now.toISOString());

    return {
      id,
      pinCode,
      secretToken,
      expiresAt,
    };
  }

  verifyAndUsePairing(pinOrSecret: string): { id: string } | null {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT id FROM sync_pairings
      WHERE (pin_code = ? OR secret_token = ?)
        AND expires_at > ?
        AND used_at IS NULL
    `);
    const row = stmt.get(pinOrSecret, pinOrSecret, now) as { id: string } | undefined;

    if (!row) return null;

    // Помечаем как использованный (одноразовый)
    this.db.prepare(`
      UPDATE sync_pairings SET used_at = ? WHERE id = ?
    `).run(now, row.id);

    return { id: row.id };
  }

  cleanExpiredPairings(): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      DELETE FROM sync_pairings 
      WHERE expires_at < ? OR used_at IS NOT NULL
    `).run(now);
  }

  // 3. Метки окончательного удаления (Tombstones)
  recordTombstone(entityType: 'task' | 'project', entityId: string, deletedAt?: string): void {
    const now = deletedAt || new Date().toISOString();
    this.db.prepare(`
      INSERT OR REPLACE INTO sync_tombstones (entity_type, entity_id, deleted_at)
      VALUES (?, ?, ?)
    `).run(entityType, entityId, now);
  }

  // 4. Получение изменений, произошедших после `sinceTimestamp`
  getChangesSince(sinceTimestamp: string | null): {
    tasks: Task[];
    projects: Project[];
    tombstones: SyncTombstone[];
  } {
    // Если sinceTimestamp null — отправляем все существующие данные (первая синхронизация)
    let tasks: Task[];
    let projects: Project[];
    let tombstones: SyncTombstone[];

    if (!sinceTimestamp) {
      tasks = this.db.prepare('SELECT * FROM tasks').all() as Task[];
      projects = this.db.prepare('SELECT * FROM projects').all() as Project[];
      tombstones = this.db.prepare('SELECT entity_type, entity_id, deleted_at FROM sync_tombstones').all() as SyncTombstone[];
    } else {
      tasks = this.db.prepare('SELECT * FROM tasks WHERE updated_at > ?').all(sinceTimestamp) as Task[];
      projects = this.db.prepare('SELECT * FROM projects WHERE updated_at > ?').all(sinceTimestamp) as Project[];
      tombstones = this.db.prepare(
        'SELECT entity_type, entity_id, deleted_at FROM sync_tombstones WHERE deleted_at > ?'
      ).all(sinceTimestamp) as SyncTombstone[];
    }

    return { tasks, projects, tombstones };
  }

  // 5. Безопасное применение изменений клиента с защитой от потери данных
  applyClientChanges(
    clientChanges: {
      tasks?: Task[];
      projects?: Project[];
      tombstones?: SyncTombstone[];
    },
    deviceId: string
  ): {
    appliedTasks: number;
    appliedProjects: number;
    appliedTombstones: number;
    conflictsResolved: number;
  } {
    let appliedTasks = 0;
    let appliedProjects = 0;
    let appliedTombstones = 0;
    let conflictsResolved = 0;

    const tx = this.db.transaction(() => {
      // 1. Применяем метки удаления (tombstones)
      if (clientChanges.tombstones && clientChanges.tombstones.length > 0) {
        for (const t of clientChanges.tombstones) {
          if (t.entity_type === 'task') {
            const res = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(t.entity_id);
            if (res.changes > 0) appliedTombstones++;
            this.recordTombstone('task', t.entity_id, t.deleted_at);
          } else if (t.entity_type === 'project') {
            const res = this.db.prepare('DELETE FROM projects WHERE id = ?').run(t.entity_id);
            if (res.changes > 0) appliedTombstones++;
            this.recordTombstone('project', t.entity_id, t.deleted_at);
          }
        }
      }

      // 2. Применяем изменения проектов
      if (clientChanges.projects && clientChanges.projects.length > 0) {
        for (const p of clientChanges.projects) {
          const local = this.projectRepo.getById(p.id);
          if (!local) {
            // Новый проект с телефона
            this.db.prepare(`
              INSERT INTO projects (
                id, title, description, first_step_task_id, approximate_plan,
                completion_criteria, status, created_at, updated_at, completed_at, deleted_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              p.id,
              p.title,
              p.description || null,
              p.first_step_task_id || null,
              p.approximate_plan || null,
              p.completion_criteria || null,
              p.status || 'active',
              p.created_at,
              p.updated_at,
              p.completed_at || null,
              p.deleted_at || null
            );
            appliedProjects++;
          } else {
            // Проект уже существует: сравниваем даты обновления
            if (p.updated_at > local.updated_at) {
              this.projectRepo.update(p.id, p);
              appliedProjects++;
            }
          }
        }
      }

      // 3. Применяем изменения задач
      if (clientChanges.tasks && clientChanges.tasks.length > 0) {
        for (const t of clientChanges.tasks) {
          const local = this.taskRepo.getById(t.id);
          if (!local) {
            // Новая задача с телефона
            this.taskRepo.create({
              id: t.id,
              title: t.title,
              notes: t.notes || undefined,
              destination: t.destination,
              status: t.status,
              project_id: t.project_id || undefined,
              project_order: t.project_order || 0,
              due_date: t.due_date || undefined,
              due_time: t.due_time || undefined,
              scheduled_date: t.scheduled_date || undefined,
              scheduled_time: t.scheduled_time || undefined,
              delegated_to: t.delegated_to || undefined,
              waiting_for: t.waiting_for || undefined,
              check_date: t.check_date || undefined,
            });
            // Фиксируем исходные даты создания/обновления с клиента
            this.db.prepare(`
              UPDATE tasks 
              SET created_at = ?, updated_at = ?, completed_at = ?, deleted_at = ?
              WHERE id = ?
            `).run(t.created_at, t.updated_at, t.completed_at || null, t.deleted_at || null, t.id);

            appliedTasks++;
          } else {
            // Задача существует на обоих устройствах
            if (t.updated_at > local.updated_at) {
              // Версия клиента новее. Проверяем, не было ли значимого конфликта заметок/описания
              let mergedNotes = t.notes || null;
              if (
                local.notes && 
                t.notes && 
                local.notes.trim() !== t.notes.trim() &&
                !t.notes.includes(local.notes)
              ) {
                // Обе стороны правили заметки в офлайне: сохраняем обе части без потерь!
                mergedNotes = `${t.notes}\n\n[Версия с компьютера (${local.updated_at})]:\n${local.notes}`;
                conflictsResolved++;
              }

              this.db.prepare(`
                UPDATE tasks SET
                  title = @title,
                  notes = @notes,
                  destination = @destination,
                  status = @status,
                  project_id = @project_id,
                  project_order = @project_order,
                  due_date = @due_date,
                  due_time = @due_time,
                  scheduled_date = @scheduled_date,
                  scheduled_time = @scheduled_time,
                  delegated_to = @delegated_to,
                  waiting_for = @waiting_for,
                  check_date = @check_date,
                  updated_at = @updated_at,
                  completed_at = @completed_at,
                  deleted_at = @deleted_at
                WHERE id = @id
              `).run({
                id: t.id,
                title: t.title,
                notes: mergedNotes,
                destination: t.destination,
                status: t.status,
                project_id: t.project_id || null,
                project_order: t.project_order || 0,
                due_date: t.due_date || null,
                due_time: t.due_time || null,
                scheduled_date: t.scheduled_date || null,
                scheduled_time: t.scheduled_time || null,
                delegated_to: t.delegated_to || null,
                waiting_for: t.waiting_for || null,
                check_date: t.check_date || null,
                updated_at: t.updated_at,
                completed_at: t.completed_at || null,
                deleted_at: t.deleted_at || null,
              });

              appliedTasks++;
            } else if (local.updated_at > t.updated_at) {
              // Версия на компьютере новее — компьютерные изменения вернутся клиенту в serverChanges
            }
          }
        }
      }

      // Обновляем отметку времени последней синхронизации для устройства
      this.updateDeviceLastSync(deviceId);
    });

    tx();

    return {
      appliedTasks,
      appliedProjects,
      appliedTombstones,
      conflictsResolved,
    };
  }
}
