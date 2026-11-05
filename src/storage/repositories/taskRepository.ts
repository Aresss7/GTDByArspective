import Database from 'better-sqlite3';
import { Task, TaskDestination, TaskStatus } from '../../shared/types';
import { v4 as uuidv4 } from 'crypto';

export class TaskRepository {
  constructor(private db: Database.Database) {}

  getAll(): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC');
    return stmt.all() as Task[];
  }

  getTrash(): Task[] {
    const stmt = this.db.prepare(
      "SELECT * FROM tasks WHERE destination = 'trash' OR deleted_at IS NOT NULL ORDER BY updated_at DESC"
    );
    return stmt.all() as Task[];
  }

  getByDestination(destination: TaskDestination): Task[] {
    const stmt = this.db.prepare(
      'SELECT * FROM tasks WHERE destination = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    );
    return stmt.all(destination) as Task[];
  }

  getByProjectId(projectId: string): Task[] {
    const stmt = this.db.prepare(
      'SELECT * FROM tasks WHERE project_id = ? AND deleted_at IS NULL ORDER BY project_order ASC, created_at ASC'
    );
    return stmt.all(projectId) as Task[];
  }

  getById(id: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id);
    return (row as Task) || null;
  }

  create(data: Partial<Task> & { title: string }): Task {
    const id = data.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const task: Task = {
      id,
      title: data.title,
      notes: data.notes || undefined,
      destination: data.destination || 'inbox',
      status: data.status || 'active',
      project_id: data.project_id || undefined,
      project_order: data.project_order || 0,
      due_date: data.due_date || undefined,
      due_time: data.due_time || undefined,
      scheduled_date: data.scheduled_date || undefined,
      scheduled_time: data.scheduled_time || undefined,
      delegated_to: data.delegated_to || undefined,
      delegated_date: data.delegated_date || undefined,
      waiting_for: data.waiting_for || undefined,
      check_date: data.check_date || undefined,
      is_pinned: data.is_pinned ? 1 : 0,
      previous_destination: data.previous_destination || undefined,
      created_at: now,
      updated_at: now,
      completed_at: data.status === 'completed' ? now : undefined,
      deleted_at: undefined,
    };

    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, title, notes, destination, status, project_id, project_order,
        due_date, due_time, scheduled_date, scheduled_time, delegated_to,
        delegated_date, waiting_for, check_date, is_pinned, previous_destination,
        created_at, updated_at, completed_at, deleted_at
      ) VALUES (
        @id, @title, @notes, @destination, @status, @project_id, @project_order,
        @due_date, @due_time, @scheduled_date, @scheduled_time, @delegated_to,
        @delegated_date, @waiting_for, @check_date, @is_pinned, @previous_destination,
        @created_at, @updated_at, @completed_at, @deleted_at
      )
    `);

    stmt.run({
      id: task.id,
      title: task.title,
      notes: task.notes || null,
      destination: task.destination,
      status: task.status,
      project_id: task.project_id || null,
      project_order: task.project_order || 0,
      due_date: task.due_date || null,
      due_time: task.due_time || null,
      scheduled_date: task.scheduled_date || null,
      scheduled_time: task.scheduled_time || null,
      delegated_to: task.delegated_to || null,
      delegated_date: task.delegated_date || null,
      waiting_for: task.waiting_for || null,
      check_date: task.check_date || null,
      is_pinned: task.is_pinned ? 1 : 0,
      previous_destination: task.previous_destination || null,
      created_at: task.created_at,
      updated_at: task.updated_at,
      completed_at: task.completed_at || null,
      deleted_at: task.deleted_at || null,
    });

    return task;
  }

  update(id: string, updates: Partial<Task>): Task {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Task with id ${id} not found`);
    }

    const now = new Date().toISOString();
    let completedAt = existing.completed_at;
    if (updates.status === 'completed' && existing.status !== 'completed') {
      completedAt = now;
    } else if (updates.status === 'active' && existing.status === 'completed') {
      completedAt = null;
    }

    // Сохраняем исходный раздел при перемещении в мусор (например, someday)
    let previousDest = updates.previous_destination !== undefined ? updates.previous_destination : existing.previous_destination;
    let deletedAt = updates.deleted_at !== undefined ? updates.deleted_at : existing.deleted_at;

    if (updates.destination === 'trash' && existing.destination !== 'trash') {
      previousDest = existing.destination;
      deletedAt = now;
    } else if (updates.destination && updates.destination !== 'trash' && existing.destination === 'trash') {
      previousDest = null;
      deletedAt = null;
    }

    const updatedTask: Task = {
      ...existing,
      ...updates,
      is_pinned: updates.is_pinned !== undefined ? (updates.is_pinned ? 1 : 0) : existing.is_pinned,
      updated_at: now,
      completed_at: completedAt,
      previous_destination: previousDest || null,
      deleted_at: deletedAt || null,
    };

    const stmt = this.db.prepare(`
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
        updated_at = @updated_at,
        completed_at = @completed_at,
        deleted_at = @deleted_at
      WHERE id = @id
    `);

    stmt.run({
      id: updatedTask.id,
      title: updatedTask.title,
      notes: updatedTask.notes || null,
      destination: updatedTask.destination,
      status: updatedTask.status,
      project_id: updatedTask.project_id || null,
      project_order: updatedTask.project_order || 0,
      due_date: updatedTask.due_date || null,
      due_time: updatedTask.due_time || null,
      scheduled_date: updatedTask.scheduled_date || null,
      scheduled_time: updatedTask.scheduled_time || null,
      delegated_to: updatedTask.delegated_to || null,
      delegated_date: updatedTask.delegated_date || null,
      waiting_for: updatedTask.waiting_for || null,
      check_date: updatedTask.check_date || null,
      is_pinned: updatedTask.is_pinned ? 1 : 0,
      previous_destination: updatedTask.previous_destination || null,
      updated_at: updatedTask.updated_at,
      completed_at: updatedTask.completed_at || null,
      deleted_at: updatedTask.deleted_at || null,
    });

    return updatedTask;
  }

  delete(id: string, permanent: boolean = false): boolean {
    if (permanent) {
      const now = new Date().toISOString();
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
      const res = stmt.run(id);
      if (res.changes > 0) {
        try {
          this.db
            .prepare('INSERT OR REPLACE INTO sync_tombstones (entity_type, entity_id, deleted_at) VALUES (?, ?, ?)')
            .run('task', id, now);
        } catch {
          // Игнорируем в изолированных тестах, если таблица не инициализирована
        }
      }
      return res.changes > 0;
    } else {
      const existing = this.getById(id);
      const now = new Date().toISOString();
      const prevDest = existing && existing.destination !== 'trash' ? existing.destination : null;
      const stmt = this.db.prepare(
        "UPDATE tasks SET previous_destination = COALESCE(?, previous_destination, 'inbox'), destination = 'trash', is_pinned = 0, deleted_at = ?, updated_at = ? WHERE id = ?"
      );
      const res = stmt.run(prevDest, now, now, id);
      return res.changes > 0;
    }
  }

  restore(id: string): Task | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const restoreDest = existing.previous_destination && existing.previous_destination !== 'trash'
      ? existing.previous_destination
      : 'inbox';
    const stmt = this.db.prepare(
      "UPDATE tasks SET destination = ?, previous_destination = NULL, deleted_at = NULL, status = 'active', updated_at = ? WHERE id = ?"
    );
    stmt.run(restoreDest, now, id);
    return this.getById(id);
  }

  getCompletedTasks(): Task[] {
    const stmt = this.db.prepare("SELECT * FROM tasks WHERE status = 'completed' ORDER BY completed_at DESC");
    return stmt.all() as Task[];
  }
}
