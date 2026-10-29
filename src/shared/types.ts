// Common types shared between Electron Main and Renderer

export type TaskDestination =
  | 'inbox'
  | 'next_actions'
  | 'calendar'
  | 'waiting_for'
  | 'someday'
  | 'notes'
  | 'trash';

export type TaskStatus = 'active' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  notes?: string;
  destination: TaskDestination;
  status: TaskStatus;
  project_id?: string | null;
  project_order?: number;
  due_date?: string | null;       // YYYY-MM-DD
  due_time?: string | null;       // HH:mm
  scheduled_date?: string | null; // YYYY-MM-DD
  scheduled_time?: string | null; // HH:mm
  delegated_to?: string | null;
  waiting_for?: string | null;
  check_date?: string | null;     // YYYY-MM-DD
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  deleted_at?: string | null;
}

export type ProjectStatus = 'active' | 'completed' | 'archived' | 'on_hold';

export interface Project {
  id: string;
  title: string;
  description?: string;
  first_step_task_id?: string | null;
  approximate_plan?: string;
  completion_criteria?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export type GTDQuestionId =
  | 'ACTIONABLE'          // «С этим надо что-то делать?»
  | 'CHOOSE_NOT_ACTIONABLE' // Выбор: Мусор или Заметки
  | 'FOR_ME'              // «Мне?»
  | 'DELEGATE_FORM'       // Форма делегирования
  | 'IS_NOW'              // «Сейчас?» (в пределах недели)
  | 'CHOOSE_LATER'        // Выбор: Календарь или Когда-нибудь потом
  | 'CALENDAR_FORM'       // Форма выбора даты и времени
  | 'IS_SINGLE_STEP'      // «Одношаговая?»
  | 'CREATE_PROJECT_FORM' // Создание проекта и первого шага
  | 'IS_TWO_MINUTES'      // «Можно сделать за 2 минуты?»
  | 'DO_TWO_MINUTES';     // Экран непосредственного выполнения

export interface ProcessingSession {
  id: string;
  current_task_id: string;
  current_question: GTDQuestionId;
  status: 'in_progress' | 'paused' | 'completed';
  context_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProcessingHistoryStep {
  id?: number;
  session_id: string;
  question: GTDQuestionId;
  answer_chosen: string;
  snapshot_json: string;
  created_at: string;
}

// IPC API definition
export interface GtdApi {
  // Tasks
  getTasksByDestination: (destination: TaskDestination) => Promise<Task[]>;
  getAllTasks: () => Promise<Task[]>;
  getTaskById: (id: string) => Promise<Task | null>;
  createTask: (data: Partial<Task> & { title: string }) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string, permanent?: boolean) => Promise<boolean>;
  
  // Projects
  getProjects: (status?: ProjectStatus) => Promise<Project[]>;
  getProjectById: (id: string) => Promise<{ project: Project; steps: Task[] } | null>;
  createProject: (data: {
    title: string;
    description?: string;
    firstStepTitle: string;
    approximatePlan?: string;
    completionCriteria?: string;
    sourceTaskId?: string;
  }) => Promise<{ project: Project; firstStep: Task }>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<boolean>;

  // Processing session
  getActiveSession: () => Promise<ProcessingSession | null>;
  startSession: (taskId?: string) => Promise<ProcessingSession | null>;
  saveStepAnswer: (sessionId: string, question: GTDQuestionId, answer: string, payload?: any) => Promise<ProcessingSession>;
  stepBack: (sessionId: string) => Promise<ProcessingSession | null>;
  pauseSession: (sessionId: string) => Promise<boolean>;
  completeSession: (sessionId: string) => Promise<boolean>;

  // System
  getAppVersion: () => Promise<string>;
  createBackup: () => Promise<string>;
  restoreBackup: (filePath: string) => Promise<boolean>;
}

declare global {
  interface Window {
    gtdApi: GtdApi;
  }
}
