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
      // 1. Применяем метки удаления (tombstones) с поддержкой camelCase и snake_case
      if (clientChanges.tombstones && clientChanges.tombstones.length > 0) {
        for (const rawT of clientChanges.tombstones) {
          const t = rawT as any;
          const entityType = t.entity_type || t.entityType;
          const entityId = t.entity_id || t.entityId;
          const deletedAt = t.deleted_at || t.deletedAt || new Date().toISOString();

          if (entityType === 'task') {
            const res = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(entityId);
            if (res.changes > 0) appliedTombstones++;
            this.recordTombstone('task', entityId, deletedAt);
          } else if (entityType === 'project') {
            const res = this.db.prepare('DELETE FROM projects WHERE id = ?').run(entityId);
            if (res.changes > 0) appliedTombstones++;
            this.recordTombstone('project', entityId, deletedAt);
          }
        }
      }

      // 2. Применяем изменения проектов с защитой от воскрешения удалённых проектов
      if (clientChanges.projects && clientChanges.projects.length > 0) {
        for (const rawP of clientChanges.projects) {
          const p = rawP as any;
          const projectId = p.id;
          const pTitle = p.title;
          const pDesc = p.description || null;
          const pFirstStep = p.first_step_task_id || p.firstStepTaskId || null;
          const pPlan = p.approximate_plan || p.approximatePlan || null;
          const pCriteria = p.completion_criteria || p.completionCriteria || null;
          const pStatus = p.status || 'active';
          const pCreatedAt = p.created_at || p.createdAt || new Date().toISOString();
          const pUpdatedAt = p.updated_at || p.updatedAt || new Date().toISOString();
          const pCompletedAt = p.completed_at || p.completedAt || null;
          const pDeletedAt = p.deleted_at || p.deletedAt || null;

          // Проверяем наличие метки удаления (tombstone) для проекта
          const tombstone = this.db.prepare(
            'SELECT deleted_at FROM sync_tombstones WHERE entity_type = ? AND entity_id = ?'
          ).get('project', projectId) as { deleted_at: string } | undefined;

          if (tombstone && (!pUpdatedAt || tombstone.deleted_at >= pUpdatedAt)) {
            // Проект был окончательно удален — не воскрешаем его!
            continue;
          }

          const local = this.projectRepo.getById(projectId);
          if (!local) {
            // Новый проект с телефона
            this.db.prepare(`
              INSERT INTO projects (
                id, title, description, first_step_task_id, approximate_plan,
                completion_criteria, status, created_at, updated_at, completed_at, deleted_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              projectId,
              pTitle,
              pDesc,
              pFirstStep,
              pPlan,
              pCriteria,
              pStatus,
              pCreatedAt,
              pUpdatedAt,
              pCompletedAt,
              pDeletedAt
            );
            appliedProjects++;
          } else {
            // Проект уже существует: сравниваем даты обновления
            if (pUpdatedAt > local.updated_at) {
              const mergedDeletedAt = pDeletedAt !== null ? pDeletedAt : (pStatus === 'trash' ? (local.deleted_at || pUpdatedAt) : local.deleted_at);
              this.db.prepare(`
                UPDATE projects SET
                  title = @title,
                  description = @description,
                  first_step_task_id = @first_step_task_id,
                  approximate_plan = @approximate_plan,
                  completion_criteria = @completion_criteria,
                  status = @status,
                  updated_at = @updated_at,
                  completed_at = @completed_at,
                  deleted_at = @deleted_at
                WHERE id = @id
              `).run({
                id: projectId,
                title: pTitle,
                description: pDesc,
                first_step_task_id: pFirstStep,
                approximate_plan: pPlan,
                completion_criteria: pCriteria,
                status: pStatus,
                updated_at: pUpdatedAt,
                completed_at: pCompletedAt,
                deleted_at: mergedDeletedAt,
              });
              appliedProjects++;
            }
          }
        }
      }

      // 3. Применяем изменения задач с защитой от воскрешения удалённых задач
      if (clientChanges.tasks && clientChanges.tasks.length > 0) {
        for (const rawT of clientChanges.tasks) {
          const t = rawT as any;
          const taskId = t.id;
          const tTitle = t.title;
          const tNotes = t.notes || null;
          const tDestination = t.destination;
          const tStatus = t.status;
          const tProjectId = t.project_id || t.projectId || null;
          const tProjectOrder = t.project_order || t.projectOrder || 0;
          const tDueDate = t.due_date || t.dueDate || null;
          const tDueTime = t.due_time || t.dueTime || null;
          const tScheduledDate = t.scheduled_date || t.scheduledDate || null;
          const tScheduledTime = t.scheduled_time || t.scheduledTime || null;
          const tDelegatedTo = t.delegated_to || t.delegatedTo || null;
          const tDelegatedDate = t.delegated_date || t.delegatedDate || null;
          const tWaitingFor = t.waiting_for || t.waitingFor || null;
          const tCheckDate = t.check_date || t.checkDate || null;
          const tIsPinned = t.is_pinned !== undefined ? (t.is_pinned ? 1 : 0) : (t.isPinned !== undefined ? (t.isPinned ? 1 : 0) : 0);
          const tPreviousDestination = t.previous_destination || t.previousDestination || null;
          const tReminderOffset = t.reminder_offset !== undefined ? t.reminder_offset : (t.reminderOffset !== undefined ? t.reminderOffset : null);
          const tCreatedAt = t.created_at || t.createdAt || new Date().toISOString();
          const tUpdatedAt = t.updated_at || t.updatedAt || new Date().toISOString();
          const tCompletedAt = t.completed_at || t.completedAt || null;
          const tDeletedAt = t.deleted_at || t.deletedAt || null;

          // Проверяем наличие метки удаления (tombstone) для задачи
          const taskTombstone = this.db.prepare(
            'SELECT deleted_at FROM sync_tombstones WHERE entity_type = ? AND entity_id = ?'
          ).get('task', taskId) as { deleted_at: string } | undefined;

          if (taskTombstone && (!tUpdatedAt || taskTombstone.deleted_at >= tUpdatedAt)) {
            // Задача была окончательно удалена — не воскрешаем её!
            continue;
          }

          const local = this.taskRepo.getById(taskId);
          if (!local) {
            // Новая задача с телефона
            this.taskRepo.create({
              id: taskId,
              title: tTitle,
              notes: tNotes || undefined,
              destination: tDestination,
              status: tStatus,
              project_id: tProjectId || undefined,
              project_order: tProjectOrder,
              due_date: tDueDate || undefined,
              due_time: tDueTime || undefined,
              scheduled_date: tScheduledDate || undefined,
              scheduled_time: tScheduledTime || undefined,
              delegated_to: tDelegatedTo || undefined,
              delegated_date: tDelegatedDate || undefined,
              waiting_for: tWaitingFor || undefined,
              check_date: tCheckDate || undefined,
              is_pinned: tIsPinned,
              previous_destination: tPreviousDestination || undefined,
              reminder_offset: tReminderOffset,
            });
            // Фиксируем исходные даты создания/обновления с клиента
            this.db.prepare(`
              UPDATE tasks 
              SET created_at = ?, updated_at = ?, completed_at = ?, deleted_at = ?
              WHERE id = ?
            `).run(tCreatedAt, tUpdatedAt, tCompletedAt, tDeletedAt, taskId);

            appliedTasks++;
          } else {
            // Задача существует на обоих устройствах
            if (tUpdatedAt > local.updated_at) {
              // Версия клиента новее. Проверяем, не было ли значимого конфликта заметок/описания
              let mergedNotes = tNotes;
              if (
                local.notes && 
                tNotes && 
                local.notes.trim() !== tNotes.trim() &&
                !tNotes.includes(local.notes)
              ) {
                // Обе стороны правили заметки в офлайне: сохраняем обе части без потерь!
                mergedNotes = `${tNotes}\n\n[Версия с компьютера (${local.updated_at})]:\n${local.notes}`;
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
                  delegated_date = @delegated_date,
                  waiting_for = @waiting_for,
                  check_date = @check_date,
                  is_pinned = @is_pinned,
                  previous_destination = @previous_destination,
                  reminder_offset = @reminder_offset,
                  updated_at = @updated_at,
                  completed_at = @completed_at,
                  deleted_at = @deleted_at
                WHERE id = @id
              `).run({
                id: taskId,
                title: tTitle,
                notes: mergedNotes,
                destination: tDestination,
                status: tStatus,
                project_id: tProjectId,
                project_order: tProjectOrder,
                due_date: tDueDate,
                due_time: tDueTime,
                scheduled_date: tScheduledDate,
                scheduled_time: tScheduledTime,
                delegated_to: tDelegatedTo,
                delegated_date: tDelegatedDate,
                waiting_for: tWaitingFor,
                check_date: tCheckDate,
                is_pinned: tIsPinned !== undefined ? tIsPinned : (local.is_pinned ? 1 : 0),
                previous_destination: tPreviousDestination || local.previous_destination || null,
                reminder_offset: tReminderOffset !== undefined ? tReminderOffset : (local.reminder_offset !== undefined ? local.reminder_offset : null),
                updated_at: tUpdatedAt,
                completed_at: tCompletedAt,
                deleted_at: tDeletedAt,
              });

              appliedTasks++;
            } else if (local.updated_at > tUpdatedAt) {
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
