import { ipcMain } from 'electron';
import { SyncServer } from '../sync/syncServer';
import { SyncRepository } from '../../storage/repositories/syncRepository';
import { getDatabase } from '../../storage/database';

export function registerSyncIpc(): void {
  const getRepo = () => new SyncRepository(getDatabase());
  const syncServer = SyncServer.getInstance();

  // Получение текущего состояния сервера
  ipcMain.handle('sync:getStatus', async () => {
    return syncServer.getStatus();
  });

  // Запуск сервера
  ipcMain.handle('sync:startServer', async () => {
    return syncServer.start();
  });

  // Остановка сервера
  ipcMain.handle('sync:stopServer', async () => {
    return syncServer.stop();
  });

  // Создание сессии сопряжения (QR-код и PIN)
  ipcMain.handle('sync:createPairingSession', async () => {
    // Убедимся, что сервер запущен
    await syncServer.start();
    return syncServer.createPairingSession();
  });

  // Список сопряжённых устройств
  ipcMain.handle('sync:getPairedDevices', async () => {
    return getRepo().getPairedDevices();
  });

  // Отзыв доступа устройства
  ipcMain.handle('sync:revokeDevice', async (_, deviceId: string) => {
    return getRepo().revokeDevice(deviceId);
  });
}
