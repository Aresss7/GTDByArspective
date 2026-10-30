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
  deleted_at?: string | null;
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

// Sync Interfaces
export interface SyncDevice {
  id: string;
  deviceName: string;
  pairedAt: string;
  lastSyncedAt: string | null;
  isRevoked: boolean;
}

export interface SyncPairingSession {
  pairingId: string;
  pinCode: string;
  secretToken: string;
  qrPayload: string;
  serverIp: string;
  serverPort: number;
  expiresAt: string;
}

export interface SyncStatus {
  isRunning: boolean;
  serverIp: string;
  serverPort: number;
  pairedDevicesCount: number;
}

export interface SyncTombstone {
  entity_type: 'task' | 'project';
  entity_id: string;
  deleted_at: string;
}

export interface SyncPayload {
  protocolVersion: number;
  lastSyncedAt: string | null;
  clientChanges: {
    tasks: Task[];
    projects: Project[];
    tombstones: SyncTombstone[];
  };
}

export interface SyncResult {
  protocolVersion: number;
  syncedAt: string;
  serverChanges: {
    tasks: Task[];
    projects: Project[];
    tombstones: SyncTombstone[];
  };
  stats: {
    appliedTasks: number;
    appliedProjects: number;
    appliedTombstones: number;
    conflictsResolved: number;
  };
}

// IPC API definition
export interface GtdApi {
  // Tasks
  getTasksByDestination: (destination: TaskDestination) => Promise<Task[]>;
  getAllTasks: () => Promise<Task[]>;
  getTrashTasks: () => Promise<Task[]>;
  getTaskById: (id: string) => Promise<Task | null>;
  createTask: (data: Partial<Task> & { title: string }) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string, permanent?: boolean) => Promise<boolean>;
  
  // Projects
  getProjects: (status?: ProjectStatus) => Promise<Project[]>;
  getTrashProjects: () => Promise<Project[]>;
  restoreProject: (id: string) => Promise<Project | null>;
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
  deleteProject: (id: string, permanent?: boolean) => Promise<boolean>;

  // Processing session
  getActiveSession: () => Promise<ProcessingSession | null>;
  startSession: (taskId?: string) => Promise<ProcessingSession | null>;
  saveStepAnswer: (sessionId: string, question: GTDQuestionId, answer: string, payload?: any) => Promise<ProcessingSession>;
  stepBack: (sessionId: string) => Promise<ProcessingSession | null>;
  pauseSession: (sessionId: string) => Promise<boolean>;
  completeSession: (sessionId: string) => Promise<boolean>;

  // Sync
  getSyncStatus: () => Promise<SyncStatus>;
  startSyncServer: () => Promise<SyncStatus>;
  stopSyncServer: () => Promise<SyncStatus>;
  createPairingSession: () => Promise<SyncPairingSession>;
  getPairedDevices: () => Promise<SyncDevice[]>;
  revokeDevice: (deviceId: string) => Promise<boolean>;

  // Links & Preview
  fetchLinkPreview: (url: string) => Promise<LinkPreviewData>;
  openExternalUrl: (url: string) => Promise<boolean>;

  // System
  getAppVersion: () => Promise<string>;
  createBackup: () => Promise<string>;
  restoreBackup: (filePath: string) => Promise<boolean>;

  // Window Controls
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<boolean>;
  isWindowMaximized: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
}

declare global {
  interface Window {
    gtdApi: GtdApi;
  }
}
