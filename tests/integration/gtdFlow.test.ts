import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/storage/migrations/runner';
import { TaskRepository } from '../../src/storage/repositories/taskRepository';
import { ProjectRepository } from '../../src/storage/repositories/projectRepository';
import { SessionRepository } from '../../src/storage/repositories/sessionRepository';
import { GTDStateMachine } from '../../src/domain/gtd/stateMachine';

describe('End-to-End GTD Workflow Integration', () => {
  let db: Database.Database;
  let taskRepo: TaskRepository;
  let projectRepo: ProjectRepository;
  let sessionRepo: SessionRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    taskRepo = new TaskRepository(db);
    projectRepo = new ProjectRepository(db);
    sessionRepo = new SessionRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('Scenario 1: Full GTD Processing to Next Actions with Back button rollback', () => {
    // 1. Быстрое добавление задачи в корзину
    const task = taskRepo.create({ title: 'Оплатить счет за интернет' });
    expect(task.destination).toBe('inbox');

    // 2. Старт сессии обработки
    const session = sessionRepo.createSession(task.id, 'ACTIONABLE');
    expect(session.current_question).toBe('ACTIONABLE');

    // 3. Вопрос 1: «С этим надо что-то делать?» -> Да
    sessionRepo.pushHistory(session.id, 'ACTIONABLE', 'YES', { nextQuestion: 'FOR_ME' });
    sessionRepo.updateSession(session.id, { current_question: 'FOR_ME' });

    // 4. Вопрос 2: «Мне?» -> Нет (делегирование)
    sessionRepo.pushHistory(session.id, 'FOR_ME', 'NO', { nextQuestion: 'DELEGATE_FORM' });
    sessionRepo.updateSession(session.id, { current_question: 'DELEGATE_FORM' });

    // 5. Пользователь передумал и нажал «Назад»!
    const backStep1 = sessionRepo.popHistory(session.id);
    expect(backStep1?.question).toBe('FOR_ME');
    sessionRepo.updateSession(session.id, { current_question: backStep1!.question });

    // 6. Отвечает «Да» на «Мне?»
    sessionRepo.pushHistory(session.id, 'FOR_ME', 'YES', { nextQuestion: 'IS_NOW' });
    sessionRepo.updateSession(session.id, { current_question: 'IS_NOW' });

    // 7. «Сейчас?» -> Да
    sessionRepo.pushHistory(session.id, 'IS_NOW', 'YES', { nextQuestion: 'IS_SINGLE_STEP' });
    sessionRepo.updateSession(session.id, { current_question: 'IS_SINGLE_STEP' });

    // 8. «Одношаговая?» -> Да
    sessionRepo.pushHistory(session.id, 'IS_SINGLE_STEP', 'YES', { nextQuestion: 'IS_TWO_MINUTES' });
    sessionRepo.updateSession(session.id, { current_question: 'IS_TWO_MINUTES' });

    // 9. «Можно сделать за 2 минуты?» -> «Добавить в текущие действия» (не выполняется прямо сейчас)
    const transition = GTDStateMachine.transition('IS_TWO_MINUTES', 'DEFER_TO_NEXT_ACTIONS');
    expect(transition.isCompletedItem).toBe(true);

    const updatedTask = taskRepo.update(task.id, transition.taskUpdates!);
    expect(updatedTask.destination).toBe('next_actions');
    expect(updatedTask.status).toBe('active');

    // Сессия завершается
    sessionRepo.deleteSession(session.id);
    expect(sessionRepo.getActiveSession()).toBeNull();
  });

  it('Scenario 2: Project Creation from Inbox with First Step Pipeline to Calendar', () => {
    // 1. Исходная комплексная задача в корзине
    const inboxItem = taskRepo.create({ title: 'Организовать корпоративную конференцию' });

    // 2. Пользователь отвечает «Нет» на «Одношаговая?» -> открывается создание проекта
    const { project, firstStep } = projectRepo.createWithFirstStep({
      title: inboxItem.title,
      description: 'Годовая IT-конференция компании',
      firstStepTitle: 'Забронировать конференц-зал на 150 человек',
      approximatePlan: '1. Забронировать зал\n2. Пригласить спикеров\n3. Заказать кейтеринг',
      completionCriteria: 'Конференция успешно проведена, получены отзывы участников',
      sourceTaskId: inboxItem.id,
    });

    // Исходная задача из корзины удалена
    expect(taskRepo.getById(inboxItem.id)).toBeNull();

    // 3. Первый шаг сразу отправляется на «Мне?» -> Да -> «Сейчас?» -> Нет -> Календарь
    const q1 = GTDStateMachine.transition('FOR_ME', 'YES');
    expect(q1.nextQuestion).toBe('IS_NOW');

    const q2 = GTDStateMachine.transition('IS_NOW', 'NO');
    expect(q2.nextQuestion).toBe('CHOOSE_LATER');

    const q3 = GTDStateMachine.transition('CHOOSE_LATER', 'CHOOSE_CALENDAR');
    expect(q3.nextQuestion).toBe('CALENDAR_FORM');

    const q4 = GTDStateMachine.transition('CALENDAR_FORM', 'SUBMIT_CALENDAR', {
      scheduledDate: '2026-11-20',
      scheduledTime: '11:00',
    });
    expect(q4.isCompletedItem).toBe(true);

    // Обновляем первый шаг
    const finalFirstStep = taskRepo.update(firstStep.id, q4.taskUpdates!);
    expect(finalFirstStep.destination).toBe('calendar');
    expect(finalFirstStep.scheduled_date).toBe('2026-11-20');
    expect(finalFirstStep.scheduled_time).toBe('11:00');
    expect(finalFirstStep.project_id).toBe(project.id); // Связь с проектом надежно сохранена!
  });

  it('Scenario 3: Crash / Pause and Resume Recovery', () => {
    const task = taskRepo.create({ title: 'Подготовить отчет' });
    const session = sessionRepo.createSession(task.id, 'ACTIONABLE');

    // Прошли 2 вопроса и внезапно закрыли приложение на вопросе «Сейчас?»
    sessionRepo.pushHistory(session.id, 'ACTIONABLE', 'YES', { nextQuestion: 'FOR_ME' });
    sessionRepo.pushHistory(session.id, 'FOR_ME', 'YES', { nextQuestion: 'IS_NOW' });
    sessionRepo.updateSession(session.id, { current_question: 'IS_NOW', status: 'paused' });

    // Имитация повторного открытия приложения:
    const resumedSession = sessionRepo.getActiveSession();
    expect(resumedSession).not.toBeNull();
    expect(resumedSession?.id).toBe(session.id);
    expect(resumedSession?.current_task_id).toBe(task.id);
    expect(resumedSession?.current_question).toBe('IS_NOW');
  });
});
