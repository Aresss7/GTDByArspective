import { app, BrowserWindow, nativeImage, NativeImage } from 'electron';
import path from 'path';
import fs from 'fs';

// Установка постоянного AppUserModelId сразу при запуске процесса для сохранения закрепления на панели задач Windows
app.setAppUserModelId('com.arspective.gtd');

import { initDatabase, closeDatabase } from '../storage/database';
import { registerTasksIpc } from './ipc/tasksIpc';
import { registerProjectsIpc } from './ipc/projectsIpc';
import { registerProcessingIpc } from './ipc/processingIpc';
import { registerSystemIpc } from './ipc/systemIpc';
import { registerSyncIpc } from './ipc/syncIpc';
import { registerPreviewIpc } from './ipc/previewIpc';
import { initNotificationService, stopNotificationService } from './notifications';
import { SyncServer } from './sync/syncServer';
import { createAppTray, loadCloseAction, getCloseAction, isAppQuitting, setAppQuitting } from './tray';

let mainWindow: BrowserWindow | null = null;

// Проверка единого экземпляра приложения
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

export function resolveAppIcon(): NativeImage | undefined {
  const possiblePaths = [
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'GTD.ico'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(__dirname, '../../build/GTD.ico'),
    path.join(__dirname, '../../build/icon.ico'),
    path.join(__dirname, '../../build/icon.png'),
    path.join(app.getAppPath(), 'build/GTD.ico'),
    path.join(app.getAppPath(), 'build/icon.ico'),
    path.join(app.getAppPath(), 'build/icon.png'),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          return img;
        }
      }
    } catch {}
  }
  return undefined;
}

function createWindow() {
  const appIcon = resolveAppIcon();

  mainWindow = new BrowserWindow({
    title: 'Arspective GTD',
    icon: appIcon,
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

  if (appIcon) {
    mainWindow.setIcon(appIcon);
  }

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    try {
      fs.appendFileSync(path.join(app.getPath('userData'), 'renderer-debug.log'), `[Level ${level}] ${message} at ${sourceId}:${line}\n`);
    } catch {}
    console.error(`[Renderer Log] ${message} (${sourceId}:${line})`);
  });

  const devServerUrl = process.env['VITE_DEV_SERVER_URL'];
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Перехват закрытия окна: сворачивание в трей при активной настройке
  mainWindow.on('close', (event) => {
    if (!isAppQuitting() && getCloseAction() === 'tray') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Установка постоянного AppUserModelId для сохранения закрепления на панели задач Windows
  app.setAppUserModelId('com.arspective.gtd');

  // Загружаем настройки приложения
  loadCloseAction();

  // Инициализация базы данных и запуск миграций
  initDatabase();

  // Регистрация защищенных IPC обработчиков
  registerTasksIpc();
  registerProjectsIpc();
  registerProcessingIpc();
  registerSystemIpc();
  registerSyncIpc();
  registerPreviewIpc();
  initNotificationService();

  // Запуск локального сервера синхронизации в домашней сети
  SyncServer.getInstance().start().catch((err) => {
    console.warn('[SyncServer] Auto-start warning:', err);
  });

  createWindow();

  if (mainWindow) {
    createAppTray(mainWindow);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (mainWindow) {
        createAppTray(mainWindow);
      }
    } else if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', async () => {
  setAppQuitting(true);
  stopNotificationService();
  await SyncServer.getInstance().stop();
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (getCloseAction() !== 'tray' && process.platform !== 'darwin') {
    app.quit();
  }
});
