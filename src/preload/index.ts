import { contextBridge, ipcRenderer } from 'electron';
import { GtdApi, Task, Project, TaskDestination, ProjectStatus, GTDQuestionId } from '../shared/types';

const api: GtdApi = {
  // Tasks
  getTasksByDestination: (destination: TaskDestination) =>
    ipcRenderer.invoke('tasks:getByDestination', destination),
  getAllTasks: () =>
    ipcRenderer.invoke('tasks:getAll'),
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
  getProjectById: (id: string) =>
    ipcRenderer.invoke('projects:getById', id),
  createProject: (data) =>
    ipcRenderer.invoke('projects:create', data),
  updateProject: (id: string, updates: Partial<Project>) =>
    ipcRenderer.invoke('projects:update', id, updates),
  deleteProject: (id: string) =>
    ipcRenderer.invoke('projects:delete', id),

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

  // System
  getAppVersion: () =>
    ipcRenderer.invoke('system:getAppVersion'),
  createBackup: () =>
    ipcRenderer.invoke('system:createBackup'),
  restoreBackup: (filePath: string) =>
    ipcRenderer.invoke('system:restoreBackup', filePath),
};

contextBridge.exposeInMainWorld('gtdApi', api);
