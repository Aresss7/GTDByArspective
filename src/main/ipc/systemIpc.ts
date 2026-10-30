import { ipcMain, app, BrowserWindow, net } from 'electron';
import { BackupManager } from '../../storage/backup/backupManager';

export function registerSystemIpc(): void {
  ipcMain.handle('system:getAppVersion', () => app.getVersion());

  ipcMain.handle('system:createBackup', async () => {
    return BackupManager.createBackup();
  });

  ipcMain.handle('system:restoreBackup', async (_, filePath: string) => {
    return BackupManager.restoreBackup(filePath);
  });

  // Check for updates via GitHub Releases API
  ipcMain.handle('system:checkUpdate', async () => {
    const currentVersion = app.getVersion();
    try {
      const response = await net.fetch('https://api.github.com/repos/Aresss7/GTDByArspective/releases/latest', {
        headers: {
          'User-Agent': 'Arspective-GTD-App',
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { hasUpdate: false, currentVersion, latestVersion: currentVersion };
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: any = await response.json();
      const latestTag: string = release.tag_name || '';
      const latestVersion = latestTag.replace(/^v/i, '');

      // Compare semantic versions
      const isNewer = compareVersions(latestVersion, currentVersion) > 0;

      return {
        hasUpdate: isNewer,
        currentVersion,
        latestVersion: latestTag,
        releaseName: release.name || latestTag,
        releaseNotes: release.body || '',
        releaseUrl: release.html_url || 'https://github.com/Aresss7/GTDByArspective/releases',
      };
    } catch (err: any) {
      console.warn('[CheckUpdate] Failed to fetch updates:', err.message);
      return {
        hasUpdate: false,
        currentVersion,
        error: err.message,
      };
    }
  });

  // Window frame controls
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.handle('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      return win.isMaximized();
    }
    return false;
  });

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
