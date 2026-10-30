import { ipcMain } from 'electron';
import { ProjectRepository } from '../../storage/repositories/projectRepository';
import { getDatabase } from '../../storage/database';
import { ProjectStatus, Project } from '../../shared/types';

export function registerProjectsIpc(): void {
  const getRepo = () => new ProjectRepository(getDatabase());

  ipcMain.handle('projects:getAll', async (_, status?: ProjectStatus) => {
    return getRepo().getAll(status);
  });

  ipcMain.handle('projects:getTrash', async () => {
    return getRepo().getTrash();
  });

  ipcMain.handle('projects:restore', async (_, id: string) => {
    return getRepo().restore(id);
  });

  ipcMain.handle('projects:getById', async (_, id: string) => {
    return getRepo().getProjectWithSteps(id);
  });

  ipcMain.handle('projects:create', async (_, data: {
    title: string;
    description?: string;
    firstStepTitle: string;
    approximatePlan?: string;
    completionCriteria?: string;
    sourceTaskId?: string;
  }) => {
    return getRepo().createWithFirstStep(data);
  });

  ipcMain.handle('projects:update', async (_, id: string, updates: Partial<Project>) => {
    return getRepo().update(id, updates);
  });

  ipcMain.handle('projects:delete', async (_, id: string, permanent?: boolean) => {
    return getRepo().delete(id, permanent);
  });
}
