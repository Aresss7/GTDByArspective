import Database from 'better-sqlite3';
import { Project, Task, ProjectStatus } from '../../shared/types';
import { TaskRepository } from './taskRepository';

export class ProjectRepository {
  private taskRepo: TaskRepository;

  constructor(private db: Database.Database) {
    this.taskRepo = new TaskRepository(db);
  }

  getAll(status?: ProjectStatus): Project[] {
    if (status) {
      const stmt = this.db.prepare('SELECT * FROM projects WHERE status = ? AND deleted_at IS NULL ORDER BY created_at DESC');
      return stmt.all(status) as Project[];
    }
    const stmt = this.db.prepare('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC');
    return stmt.all() as Project[];
  }

  getTrash(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE deleted_at IS NOT NULL ORDER BY updated_at DESC');
    return stmt.all() as Project[];
  }

  restore(id: string): Project | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const stmt = this.db.prepare('UPDATE projects SET deleted_at = NULL, updated_at = ? WHERE id = ?');
    stmt.run(now, id);
    return this.getById(id);
  }

  getById(id: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id);
    return (row as Project) || null;
  }

  getProjectWithSteps(id: string): { project: Project; steps: Task[] } | null {
    const project = this.getById(id);
    if (!project) return null;
    const steps = this.taskRepo.getByProjectId(id);
    return { project, steps };
  }

  createWithFirstStep(data: {
    title: string;
    description?: string;
    firstStepTitle?: string;
    approximatePlan?: string;
    completionCriteria?: string;
    sourceTaskId?: string; // Исходная задача из Корзины, если проект возник из нее
    existingTaskId?: string; // Если проект создается прямо из существующей задачи (без дублирования!)
  }): { project: Project; firstStep?: Task } {
    const now = new Date().toISOString();
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Вариант 1: Проект создается прямо из существующей задачи — привязываем ее как 1-й шаг без дублирования
    if (data.existingTaskId) {
      const existingTask = this.taskRepo.getById(data.existingTaskId);
      if (existingTask) {
        const tx = this.db.transaction(() => {
          const insertProjectStmt = this.db.prepare(`
            INSERT INTO projects (
              id, title, description, first_step_task_id, approximate_plan,
              completion_criteria, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          insertProjectStmt.run(
            projectId,
            data.title,
            data.description || null,
            data.existingTaskId,
            data.approximatePlan || null,
            data.completionCriteria || 'Выполнение всех шагов',
            'active',
            now,
            now
          );

          const taskTitle = data.firstStepTitle?.trim() || existingTask.title;
          const updateTaskStmt = this.db.prepare(`
            UPDATE tasks SET title = ?, project_id = ?, project_order = 1, updated_at = ? WHERE id = ?
          `);
          updateTaskStmt.run(taskTitle, projectId, now, data.existingTaskId);
        });

        tx();
        const project = this.getById(projectId)!;
        const firstStep = this.taskRepo.getById(data.existingTaskId)!;
        return { project, firstStep };
      }
    }

    // Вариант 2: Создание проекта без первого шага (когда задача еще редактируется/создается в окне)
    if (!data.firstStepTitle && !data.existingTaskId) {
      const insertProjectStmt = this.db.prepare(`
        INSERT INTO projects (
          id, title, description, first_step_task_id, approximate_plan,
          completion_criteria, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertProjectStmt.run(
        projectId,
        data.title,
        data.description || null,
        null,
        data.approximatePlan || null,
        data.completionCriteria || 'Выполнение всех шагов',
        'active',
        now,
        now
      );
      const project = this.getById(projectId)!;
      return { project };
    }

    // Вариант 3: Создание проекта с генерацией новой задачи первого шага
    const firstStepId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const tx = this.db.transaction(() => {
      // 1. Создаем проект (пока без first_step_task_id, чтобы не нарушать foreign key)
      const insertProjectStmt = this.db.prepare(`
        INSERT INTO projects (
          id, title, description, first_step_task_id, approximate_plan,
          completion_criteria, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertProjectStmt.run(
        projectId,
        data.title,
        data.description || null,
        null,
        data.approximatePlan || null,
        data.completionCriteria || null,
        'active',
        now,
        now
      );

      // 2. Создаем первый шаг задачи, ссылаясь на созданный проект
      const insertTaskStmt = this.db.prepare(`
        INSERT INTO tasks (
          id, title, notes, destination, status, project_id, project_order,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertTaskStmt.run(
        firstStepId,
        data.firstStepTitle || 'Первый шаг',
        null,
        'inbox', // пока не пройдет специальную обработку «Мне?»
        'active',
        projectId,
        1,
        now,
        now
      );

      // 3. Обновляем ссылку на первый шаг в проекте
      const updateProjectStepStmt = this.db.prepare(`
        UPDATE projects SET first_step_task_id = ?, updated_at = ? WHERE id = ?
      `);
      updateProjectStepStmt.run(firstStepId, now, projectId);

      // 4. Если проект был создан из существующей задачи в корзине,
      // удаляем исходную задачу, чтобы не плодить дубликаты
      if (data.sourceTaskId) {
        const deleteSourceStmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
        deleteSourceStmt.run(data.sourceTaskId);
      }
    });

    tx();

    const project = this.getById(projectId)!;
    const firstStep = this.taskRepo.getById(firstStepId)!;
    return { project, firstStep };
  }

  update(id: string, updates: Partial<Project>): Project {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Project with id ${id} not found`);
    }

    const now = new Date().toISOString();
    let completedAt = existing.completed_at;
    if (updates.status === 'completed' && existing.status !== 'completed') {
      completedAt = now;
    } else if (updates.status === 'active' && existing.status === 'completed') {
      completedAt = null;
    }

    const updated: Project = {
      ...existing,
      ...updates,
      updated_at: now,
      completed_at: completedAt,
    };

    const stmt = this.db.prepare(`
      UPDATE projects SET
        title = @title,
        description = @description,
        first_step_task_id = @first_step_task_id,
        approximate_plan = @approximate_plan,
        completion_criteria = @completion_criteria,
        status = @status,
        updated_at = @updated_at,
        completed_at = @completed_at
      WHERE id = @id
    `);

    stmt.run({
      id: updated.id,
      title: updated.title,
      description: updated.description || null,
      first_step_task_id: updated.first_step_task_id || null,
      approximate_plan: updated.approximate_plan || null,
      completion_criteria: updated.completion_criteria || null,
      status: updated.status,
      updated_at: updated.updated_at,
      completed_at: updated.completed_at || null,
    });

    return updated;
  }

  delete(id: string, permanent: boolean = false): boolean {
    const now = new Date().toISOString();
    if (permanent) {
      const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
      const res = stmt.run(id);
      if (res.changes > 0) {
        try {
          this.db
            .prepare('INSERT OR REPLACE INTO sync_tombstones (entity_type, entity_id, deleted_at) VALUES (?, ?, ?)')
            .run('project', id, now);
        } catch {
          // Игнорируем в изолированных тестах, если таблица не инициализирована
        }
      }
      return res.changes > 0;
    } else {
      const stmt = this.db.prepare('UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?');
      const res = stmt.run(now, now, id);
      return res.changes > 0;
    }
  }
}
