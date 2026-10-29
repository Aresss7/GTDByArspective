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
      const stmt = this.db.prepare('SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC');
      return stmt.all(status) as Project[];
    }
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    return stmt.all() as Project[];
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
    firstStepTitle: string;
    approximatePlan?: string;
    completionCriteria?: string;
    sourceTaskId?: string; // Исходная задача из Корзины, если проект возник из нее
  }): { project: Project; firstStep: Task } {
    const now = new Date().toISOString();
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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
        data.firstStepTitle,
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

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    const res = stmt.run(id);
    return res.changes > 0;
  }
}
