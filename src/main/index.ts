import { app, BrowserWindow } from 'electron';
import path from 'path';

// Установка постоянного AppUserModelId сразу при запуске процесса для сохранения закрепления на панели задач Windows
app.setAppUserModelId('com.arspective.gtd');
import { initDatabase, closeDatabase } from '../storage/database';
import { registerTasksIpc } from './ipc/tasksIpc';
import { registerProjectsIpc } from './ipc/projectsIpc';
import { registerProcessingIpc } from './ipc/processingIpc';
import { registerSystemIpc } from './ipc/systemIpc';
import { registerSyncIpc } from './ipc/syncIpc';
import { registerPreviewIpc } from './ipc/previewIpc';
import { SyncServer } from './sync/syncServer';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Arspective GTD',
    icon: path.join(__dirname, '../../build/GTD.ico'),
    width: 1200,
    height: 800,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#191919',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  const devServerUrl = process.env['VITE_DEV_SERVER_URL'];
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Установка постоянного AppUserModelId для сохранения закрепления на панели задач Windows
  app.setAppUserModelId('com.arspective.gtd');

  // Инициализация базы данных и запуск миграций
  initDatabase();

  // Регистрация защищенных IPC обработчиков
  registerTasksIpc();
  registerProjectsIpc();
  registerProcessingIpc();
  registerSystemIpc();
  registerSyncIpc();
  registerPreviewIpc();

  // Запуск локального сервера синхронизации в домашней сети
  SyncServer.getInstance().start().catch((err) => {
    console.warn('[SyncServer] Auto-start warning:', err);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  await SyncServer.getInstance().stop();
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
