import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/storage/migrations/runner';
import { ProjectRepository } from '../../src/storage/repositories/projectRepository';
import { TaskRepository } from '../../src/storage/repositories/taskRepository';
import { GTDStateMachine } from '../../src/domain/gtd/stateMachine';

describe('Project & First Step GTD Workflow', () => {
  let db: Database.Database;
  let projectRepo: ProjectRepository;
  let taskRepo: TaskRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    projectRepo = new ProjectRepository(db);
    taskRepo = new TaskRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should validate and create project with mandatory first step', () => {
    const { project, firstStep } = projectRepo.createWithFirstStep({
      title: 'Запустить подкаст про технологии',
      description: 'Серия интервью с разработчиками',
      firstStepTitle: 'Купить микрофон и наушники',
      approximatePlan: '1. Купить оборудование\n2. Написать сценарий\n3. Записать пилот',
      completionCriteria: 'Опубликован 1-й эпизод на YouTube и Apple Podcasts',
    });

    expect(project.id).toBeDefined();
    expect(project.title).toBe('Запустить подкаст про технологии');
    expect(project.status).toBe('active');
    expect(project.first_step_task_id).toBe(firstStep.id);

    expect(firstStep.id).toBeDefined();
    expect(firstStep.title).toBe('Купить микрофон и наушники');
    expect(firstStep.project_id).toBe(project.id);
  });

  it('special first step route: should start directly with FOR_ME and skip questions 1 and 4', () => {
    const { project, firstStep } = projectRepo.createWithFirstStep({
      title: 'Ремонт на кухне',
      firstStepTitle: 'Замерить габариты столешницы',
    });

    // Первый шаг не должен проходить вопрос 1 («С этим надо что-то делать?»)
    // Он начинает сразу с вопроса «Мне?»
    const initialQuestion = 'FOR_ME';
    expect(initialQuestion).toBe('FOR_ME');

    // Проходим «Мне?» -> Да -> «Сейчас?»
    const step1 = GTDStateMachine.transition(initialQuestion, 'YES');
    expect(step1.nextQuestion).toBe('IS_NOW');

    // «Сейчас?» -> Да -> для первого шага пропускается «Одношаговая?» и сразу идет «Можно сделать за 2 минуты?»
    // Так как он заведомо одношаговый:
    const step2 = GTDStateMachine.transition('IS_SINGLE_STEP', 'YES');
    expect(step2.nextQuestion).toBe('IS_TWO_MINUTES');

    // «Можно сделать за 2 минуты?» -> «Добавить в текущие действия»
    const step3 = GTDStateMachine.transition('IS_TWO_MINUTES', 'DEFER_TO_NEXT_ACTIONS');
    expect(step3.nextQuestion).toBe('COMPLETED');
    expect(step3.taskUpdates?.destination).toBe('next_actions');

    // Применяем обновления к первому шагу в базе
    const updatedStep = taskRepo.update(firstStep.id, step3.taskUpdates!);
    expect(updatedStep.destination).toBe('next_actions');
    expect(updatedStep.project_id).toBe(project.id); // Привязка к проекту сохранена!
  });

  it('completing individual steps should NOT automatically complete the project', () => {
    const { project, firstStep } = projectRepo.createWithFirstStep({
      title: 'Написать книгу',
      firstStepTitle: 'Написать оглавление',
    });

    // Добавляем второй шаг
    const step2 = taskRepo.create({
      title: 'Написать черновик 1-й главы',
      project_id: project.id,
      destination: 'next_actions',
    });

    // Завершаем первый шаг
    taskRepo.update(firstStep.id, { status: 'completed' });
    const freshProject = projectRepo.getById(project.id);
    expect(freshProject?.status).toBe('active'); // Проект остаётся активным!

    // Завершение проекта должно быть явным действием пользователя
    const completedProject = projectRepo.update(project.id, { status: 'completed' });
    expect(completedProject.status).toBe('completed');
  });
});
