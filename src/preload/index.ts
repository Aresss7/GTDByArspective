import { contextBridge, ipcRenderer } from 'electron';
import { GtdApi, Task, Project, TaskDestination, ProjectStatus, GTDQuestionId } from '../shared/types';

const api: GtdApi = {
  // Tasks
  getTasksByDestination: (destination: TaskDestination) =>
    ipcRenderer.invoke('tasks:getByDestination', destination),
  getAllTasks: () =>
    ipcRenderer.invoke('tasks:getAll'),
  getTrashTasks: () =>
    ipcRenderer.invoke('tasks:getTrash'),
  getTaskById: (id: string) =>
    ipcRenderer.invoke('tasks:getById', id),
  createTask: (data: Partial<Task> & { title: string }) =>
    ipcRenderer.invoke('tasks:create', data),
  updateTask: (id: string, updates: Partial<Task>) =>
    ipcRenderer.invoke('tasks:update', id, updates),
  deleteTask: (id: string, permanent?: boolean) =>
    ipcRenderer.invoke('tasks:delete', id, permanent),

  // Projects
  getProjects: (status?: ProjectStatus) =>
    ipcRenderer.invoke('projects:getAll', status),
  getTrashProjects: () =>
    ipcRenderer.invoke('projects:getTrash'),
  restoreProject: (id: string) =>
    ipcRenderer.invoke('projects:restore', id),
  getProjectById: (id: string) =>
    ipcRenderer.invoke('projects:getById', id),
  createProject: (data) =>
    ipcRenderer.invoke('projects:create', data),
  updateProject: (id: string, updates: Partial<Project>) =>
    ipcRenderer.invoke('projects:update', id, updates),
  deleteProject: (id: string, permanent?: boolean) =>
    ipcRenderer.invoke('projects:delete', id, permanent),

  // Processing session
  getActiveSession: () =>
    ipcRenderer.invoke('processing:getActiveSession'),
  startSession: (taskId?: string) =>
    ipcRenderer.invoke('processing:startSession', taskId),
  saveStepAnswer: (sessionId: string, question: GTDQuestionId, answer: string, payload?: any) =>
    ipcRenderer.invoke('processing:saveStepAnswer', sessionId, question, answer, payload),
  stepBack: (sessionId: string) =>
    ipcRenderer.invoke('processing:stepBack', sessionId),
  pauseSession: (sessionId: string) =>
    ipcRenderer.invoke('processing:pauseSession', sessionId),
  completeSession: (sessionId: string) =>
    ipcRenderer.invoke('processing:completeSession', sessionId),

  // Sync
  getSyncStatus: () =>
    ipcRenderer.invoke('sync:getStatus'),
  startSyncServer: () =>
    ipcRenderer.invoke('sync:startServer'),
  stopSyncServer: () =>
    ipcRenderer.invoke('sync:stopServer'),
  createPairingSession: () =>
    ipcRenderer.invoke('sync:createPairingSession'),
  getPairedDevices: () =>
    ipcRenderer.invoke('sync:getPairedDevices'),
  revokeDevice: (deviceId: string) =>
    ipcRenderer.invoke('sync:revokeDevice', deviceId),

  // System
  getAppVersion: () =>
    ipcRenderer.invoke('system:getAppVersion'),
  createBackup: () =>
    ipcRenderer.invoke('system:createBackup'),
  restoreBackup: (filePath: string) =>
    ipcRenderer.invoke('system:restoreBackup', filePath),
  checkUpdate: () =>
    ipcRenderer.invoke('system:checkUpdate'),
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke('system:openExternalUrl', url),
  fetchLinkPreview: (url: string) =>
    ipcRenderer.invoke('system:fetchLinkPreview', url),

  // Window Controls
  minimizeWindow: () =>
    ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () =>
    ipcRenderer.invoke('window:toggleMaximize'),
  isWindowMaximized: () =>
    ipcRenderer.invoke('window:isMaximized'),
  closeWindow: () =>
    ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('gtdApi', api);
