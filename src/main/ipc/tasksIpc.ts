import { ipcMain } from 'electron';
import { TaskRepository } from '../../storage/repositories/taskRepository';
import { getDatabase } from '../../storage/database';
import { Task, TaskDestination } from '../../shared/types';
import { SyncServer } from '../sync/syncServer';

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
    const res = getRepo().create(data);
    SyncServer.getInstance().broadcastChange();
    return res;
  });

  ipcMain.handle('tasks:update', async (_, id: string, updates: Partial<Task>) => {
    const res = getRepo().update(id, updates);
    SyncServer.getInstance().broadcastChange();
    return res;
  });

  ipcMain.handle('tasks:delete', async (_, id: string, permanent?: boolean) => {
    const res = getRepo().delete(id, permanent);
    SyncServer.getInstance().broadcastChange();
    return res;
  });
}
