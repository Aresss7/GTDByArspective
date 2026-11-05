import { ipcMain, app, BrowserWindow, net, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { BackupManager } from '../../storage/backup/backupManager';
import { getCloseAction, setCloseAction, WindowCloseAction } from '../tray';

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
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { hasUpdate: false, currentVersion, latestVersion: currentVersion };
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: any = await response.json();
      const releaseName: string = (release.name || '').trim();
      const tagName: string = (release.tag_name || '').trim();

      // Find the downloadable .exe asset (Setup or executable)
      const assets = Array.isArray(release.assets) ? release.assets : [];
      const exeAsset = assets.find((a: any) => 
        a.name && a.name.toLowerCase().endsWith('.exe') && !a.name.toLowerCase().includes('portable')
      ) || assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.exe'));

      // Extract version: prioritize release name first, then tag_name, then asset filename
      const extractedNameVersion = extractVersionString(releaseName);
      const extractedTagVersion = extractVersionString(tagName);
      const extractedAssetVersion = exeAsset ? extractVersionString(exeAsset.name) : null;
      const targetVersion = extractedNameVersion || extractedTagVersion || extractedAssetVersion || tagName;

      // Compare semantic versions
      const isNewer = compareVersions(targetVersion, currentVersion) > 0;

      return {
        hasUpdate: isNewer,
        currentVersion,
        latestVersion: targetVersion,
        releaseName: releaseName || tagName || (exeAsset ? exeAsset.name : ''),
        releaseNotes: release.body || '',
        releaseUrl: release.html_url || 'https://github.com/Aresss7/GTDByArspective/releases',
        downloadUrl: exeAsset ? exeAsset.browser_download_url : undefined,
        fileName: exeAsset ? exeAsset.name : undefined,
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

  // Download update in-app with progress reporting
  ipcMain.handle('system:downloadUpdate', async (event, downloadUrl: string, fileName?: string) => {
    const webContents = event.sender;
    const tempDir = app.getPath('temp');
    const safeFileName = fileName || `Arspective-GTD-Update-${Date.now()}.exe`;
    const targetFilePath = path.join(tempDir, safeFileName);

    try {
      const response = await net.fetch(downloadUrl, {
        headers: {
          'User-Agent': 'Arspective-GTD-App',
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed with HTTP ${response.status}`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      let receivedBytes = 0;

      const fileStream = fs.createWriteStream(targetFilePath);
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Readable stream not supported');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          receivedBytes += value.length;
          fileStream.write(Buffer.from(value));

          const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
          webContents.send('system:downloadProgress', {
            receivedBytes,
            totalBytes,
            percent,
          });
        }
      }

      fileStream.end();

      return {
        success: true,
        filePath: targetFilePath,
      };
    } catch (err: any) {
      console.error('[DownloadUpdate] Error downloading file:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  });

  // Install downloaded update and restart app
  ipcMain.handle('system:installUpdate', async (_, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Update installer file not found at ${filePath}`);
      }

      const appDir = path.dirname(process.execPath);
      const appExe = process.execPath;
      const exeName = path.basename(appExe);

      // Create a temporary batch runner that:
      // 1. Waits for current app instance to exit completely
      // 2. Runs the NSIS installer silently with --updated and --force-run to preserve shortcuts/pins
      // 3. Verifies if app restarted, and if not, launches it directly
      const tempDir = app.getPath('temp');
      const runnerPath = path.join(tempDir, `gtd-updater-${Date.now()}.cmd`);

      const cmdScript = `@echo off
chcp 65001 >nul
rem Wait for previous Electron process to terminate and release file locks
timeout /t 2 /nobreak >nul

rem Execute silent update with flags that guarantee shortcut preservation and auto-start
start /wait "" "${filePath}" /S --updated --force-run /D=${appDir}

rem Wait for installation to settle
timeout /t 1 /nobreak >nul

rem Ensure the application is started
tasklist /fi "imagename eq ${exeName}" 2>nul | find /i "${exeName}" >nul
if errorlevel 1 (
  start "" "${appExe}"
)

rem Self-delete runner script
del /f /q "%~f0" >nul 2>&1
`;

      fs.writeFileSync(runnerPath, cmdScript, 'utf8');

      // Launch runner detached
      const child = spawn('cmd.exe', ['/c', runnerPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();

      setTimeout(() => {
        app.quit();
      }, 500);

      return true;
    } catch (err: any) {
      console.error('[InstallUpdate] Error starting installer:', err);
      return false;
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
    if (win) {
      if (getCloseAction() === 'tray') {
        win.hide();
      } else {
        win.close();
      }
    }
  });

  ipcMain.handle('system:setWindowCloseAction', (_, action: WindowCloseAction) => {
    setCloseAction(action);
  });

  ipcMain.handle('system:getWindowCloseAction', () => {
    return getCloseAction();
  });
}

function extractVersionString(input: string): string | null {
  if (!input) return null;
  // Match patterns like "1.3.0", "v1.3", "2.0.1-beta" anywhere in the name
  const match = input.match(/(?:v|version\s*)?(\d+\.\d+(?:\.\d+)?)/i);
  return match ? match[1] : null;
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
