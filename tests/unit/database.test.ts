import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/storage/migrations/runner';
import { TaskRepository } from '../../src/storage/repositories/taskRepository';
import { ProjectRepository } from '../../src/storage/repositories/projectRepository';
import { SessionRepository } from '../../src/storage/repositories/sessionRepository';

describe('SQLite Database & Storage Layer', () => {
  let db: Database.Database;
  let taskRepo: TaskRepository;
  let projectRepo: ProjectRepository;
  let sessionRepo: SessionRepository;

  beforeEach(() => {
    // Используем изолированную in-memory базу для каждого теста
    db = new Database(':memory:');
    runMigrations(db);
    taskRepo = new TaskRepository(db);
    projectRepo = new ProjectRepository(db);
    sessionRepo = new SessionRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Migrations', () => {
    it('should create all required tables and indexes', () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((r: any) => r.name);

      expect(tables).toContain('tasks');
      expect(tables).toContain('projects');
      expect(tables).toContain('processing_sessions');
      expect(tables).toContain('processing_steps_history');
      expect(tables).toContain('_migrations');
    });

    it('should be idempotent (running migrations twice does not fail)', () => {
      expect(() => runMigrations(db)).not.toThrow();
    });
  });

  describe('TaskRepository CRUD', () => {
    it('should create a new task in inbox by default', () => {
      const task = taskRepo.create({
        title: 'Купить молоко',
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Купить молоко');
      expect(task.destination).toBe('inbox');
      expect(task.status).toBe('active');
      expect(task.created_at).toBeDefined();

      const fetched = taskRepo.getById(task.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.title).toBe('Купить молоко');
    });

    it('should filter tasks by destination', () => {
      taskRepo.create({ title: 'Задача 1', destination: 'inbox' });
      taskRepo.create({ title: 'Задача 2', destination: 'next_actions' });
      taskRepo.create({ title: 'Задача 3', destination: 'inbox' });

      const inboxTasks = taskRepo.getByDestination('inbox');
      const nextActionTasks = taskRepo.getByDestination('next_actions');

      expect(inboxTasks.length).toBe(2);
      expect(nextActionTasks.length).toBe(1);
    });

    it('should update task destination and status', () => {
      const task = taskRepo.create({ title: 'Позвонить врачу' });
      const updated = taskRepo.update(task.id, {
        destination: 'calendar',
        scheduled_date: '2026-11-01',
        scheduled_time: '14:30',
      });

      expect(updated.destination).toBe('calendar');
      expect(updated.scheduled_date).toBe('2026-11-01');
      expect(updated.scheduled_time).toBe('14:30');
    });

    it('should soft delete task by moving to trash', () => {
      const task = taskRepo.create({ title: 'Старая задача' });
      const deleted = taskRepo.delete(task.id, false);

      expect(deleted).toBe(true);
      const afterDelete = taskRepo.getById(task.id);
      expect(afterDelete?.destination).toBe('trash');
      expect(afterDelete?.deleted_at).not.toBeNull();

      // Не отображается в обычном списке активных
      const allActive = taskRepo.getAll();
      expect(allActive.find((t) => t.id === task.id)).toBeUndefined();

      // Отображается в getTrash()
      const trash = taskRepo.getTrash();
      expect(trash.find((t) => t.id === task.id)).toBeDefined();
    });
  });

  describe('ProjectRepository & First Step Integrity', () => {
    it('should create a project and its first step transactionally', () => {
      const { project, firstStep } = projectRepo.createWithFirstStep({
        title: 'Запустить интернет-магазин',
        description: 'Магазин одежды ручной работы',
        firstStepTitle: 'Составить список из трёх поставщиков',
        approximatePlan: '1. Найти поставщиков\n2. Сравнить условия',
        completionCriteria: 'Сайт в онлайне и получен первый тестовый заказ',
      });

      expect(project.id).toBeDefined();
      expect(project.title).toBe('Запустить интернет-магазин');
      expect(project.first_step_task_id).toBe(firstStep.id);

      expect(firstStep.id).toBeDefined();
      expect(firstStep.title).toBe('Составить список из трёх поставщиков');
      expect(firstStep.project_id).toBe(project.id);

      // Проверяем получение проекта со связанными шагами
      const projectWithSteps = projectRepo.getProjectWithSteps(project.id);
      expect(projectWithSteps).not.toBeNull();
      expect(projectWithSteps?.steps.length).toBe(1);
      expect(projectWithSteps?.steps[0].id).toBe(firstStep.id);
    });

    it('should delete original inbox source task when converted to project', () => {
      const sourceTask = taskRepo.create({ title: 'Большое дело из корзины' });
      expect(taskRepo.getById(sourceTask.id)).not.toBeNull();

      const { project, firstStep } = projectRepo.createWithFirstStep({
        title: sourceTask.title,
        firstStepTitle: 'Первый конкретный шаг',
        sourceTaskId: sourceTask.id,
      });

      // Исходная задача должна быть удалена, чтобы исключить дублирование в корзине
      expect(taskRepo.getById(sourceTask.id)).toBeNull();
      expect(firstStep.project_id).toBe(project.id);
    });
  });

  describe('SessionRepository & Back-Step History', () => {
    it('should create and retrieve active session', () => {
      const task = taskRepo.create({ title: 'Задача для разбора' });
      const session = sessionRepo.createSession(task.id, 'ACTIONABLE');

      expect(session.id).toBeDefined();
      expect(session.current_task_id).toBe(task.id);
      expect(session.current_question).toBe('ACTIONABLE');

      const active = sessionRepo.getActiveSession();
      expect(active?.id).toBe(session.id);
    });

    it('should push history and pop it when navigating backwards', () => {
      const task = taskRepo.create({ title: 'Задача 1' });
      const session = sessionRepo.createSession(task.id, 'ACTIONABLE');

      // Шаг 1: Ответ «Да» на «С этим надо что-то делать?» -> переход к «Мне?»
      sessionRepo.pushHistory(session.id, 'ACTIONABLE', 'YES', { nextQuestion: 'FOR_ME' });
      sessionRepo.updateSession(session.id, { current_question: 'FOR_ME' });

      let current = sessionRepo.getSessionById(session.id);
      expect(current?.current_question).toBe('FOR_ME');

      // Шаг «Назад» (Pop)
      const popped = sessionRepo.popHistory(session.id);
      expect(popped).not.toBeNull();
      expect(popped?.question).toBe('ACTIONABLE');

      // Восстанавливаем состояние
      current = sessionRepo.updateSession(session.id, { current_question: popped!.question });
      expect(current.current_question).toBe('ACTIONABLE');

      // Повторный pop пуст
      const emptyPop = sessionRepo.popHistory(session.id);
      expect(emptyPop).toBeNull();
    });
  });
});
