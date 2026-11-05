import { app, BrowserWindow, Tray, Menu, nativeImage, NativeImage } from 'electron';
import path from 'path';
import fs from 'fs';

export type WindowCloseAction = 'tray' | 'quit';

let currentCloseAction: WindowCloseAction = 'tray';
let isQuitting = false;
let appTray: Tray | null = null;

function getSettingsFilePath(): string {
  try {
    return path.join(app.getPath('userData'), 'app-settings.json');
  } catch {
    return path.join(process.cwd(), 'app-settings.json');
  }
}

export function loadCloseAction(): WindowCloseAction {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (data.windowCloseAction === 'quit' || data.windowCloseAction === 'tray') {
        currentCloseAction = data.windowCloseAction;
      }
    }
  } catch (err) {
    console.warn('[Tray] Failed to read app-settings.json:', err);
  }
  return currentCloseAction;
}

export function setCloseAction(action: WindowCloseAction): void {
  currentCloseAction = action;
  try {
    const filePath = getSettingsFilePath();
    let data: Record<string, any> = {};
    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {}
    }
    data.windowCloseAction = action;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Tray] Failed to save app-settings.json:', err);
  }
}

export function getCloseAction(): WindowCloseAction {
  return currentCloseAction;
}

export function isAppQuitting(): boolean {
  return isQuitting;
}

export function setAppQuitting(val: boolean): void {
  isQuitting = val;
}

function resolveTrayIcon(): NativeImage {
  const possiblePaths = [
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, '../../build/icon.ico'),
    path.join(__dirname, '../../build/GTD.ico'),
    path.join(__dirname, '../../build/icon.png'),
    path.join(process.resourcesPath, 'build/icon.ico'),
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'build/icon.png'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(app.getAppPath(), 'build/icon.ico'),
    path.join(app.getAppPath(), 'build/icon.png'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) {
        return img;
      }
    }
  }

  // Fallback: empty image or default
  return nativeImage.createEmpty();
}

export function createAppTray(mainWindow: BrowserWindow): Tray {
  if (appTray) {
    return appTray;
  }

  const icon = resolveTrayIcon();
  appTray = new Tray(icon);
  appTray.setToolTip('Arspective GTD');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть Arspective GTD',
      click: () => {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        setAppQuitting(true);
        app.quit();
      },
    },
  ]);

  appTray.setContextMenu(contextMenu);

  appTray.on('click', () => {
    if (mainWindow.isVisible()) {
      if (mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.focus();
      }
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  appTray.on('double-click', () => {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  return appTray;
}

export function destroyAppTray(): void {
  if (appTray) {
    appTray.destroy();
    appTray = null;
  }
}
