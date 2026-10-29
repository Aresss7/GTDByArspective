import { ipcMain, app } from 'electron';
import { BackupManager } from '../../storage/backup/backupManager';

export function registerSystemIpc(): void {
  ipcMain.handle('system:getAppVersion', () => app.getVersion());

  ipcMain.handle('system:createBackup', async () => {
    return BackupManager.createBackup();
  });

  ipcMain.handle('system:restoreBackup', async (_, filePath: string) => {
    return BackupManager.restoreBackup(filePath);
  });
}
