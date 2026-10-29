import { ipcMain } from 'electron';
import { TaskRepository } from '../../storage/repositories/taskRepository';
import { getDatabase } from '../../storage/database';
import { Task, TaskDestination } from '../../shared/types';

export function registerTasksIpc(): void {
  const getRepo = () => new TaskRepository(getDatabase());

  ipcMain.handle('tasks:getAll', async () => {
    return getRepo().getAll();
  });

  ipcMain.handle('tasks:getTrash', async () => {
    return getRepo().getTrash();
  });

  ipcMain.handle('tasks:getByDestination', async (_, destination: TaskDestination) => {
    return getRepo().getByDestination(destination);
  });

  ipcMain.handle('tasks:getById', async (_, id: string) => {
    return getRepo().getById(id);
  });

  ipcMain.handle('tasks:create', async (_, data: Partial<Task> & { title: string }) => {
    return getRepo().create(data);
  });

  ipcMain.handle('tasks:update', async (_, id: string, updates: Partial<Task>) => {
    return getRepo().update(id, updates);
  });

  ipcMain.handle('tasks:delete', async (_, id: string, permanent?: boolean) => {
    return getRepo().delete(id, permanent);
  });
}
