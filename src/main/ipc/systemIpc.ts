import { ipcMain, app, BrowserWindow, net, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
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
      const releaseName: string = (release.name || '').trim();
      const tagName: string = (release.tag_name || '').trim();

      // Extract version: prioritize release name first (e.g. "Arspective GTD 1.3.0" or "v1.3.0"), fallback to tag_name
      const extractedNameVersion = extractVersionString(releaseName);
      const extractedTagVersion = extractVersionString(tagName);
      const targetVersion = extractedNameVersion || extractedTagVersion || tagName;

      // Compare semantic versions
      const isNewer = compareVersions(targetVersion, currentVersion) > 0;

      // Find the downloadable .exe asset (Setup or executable)
      const assets = Array.isArray(release.assets) ? release.assets : [];
      const exeAsset = assets.find((a: any) => 
        a.name && a.name.toLowerCase().endsWith('.exe') && !a.name.toLowerCase().includes('portable')
      ) || assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.exe'));

      return {
        hasUpdate: isNewer,
        currentVersion,
        latestVersion: targetVersion,
        releaseName: releaseName || tagName,
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

      // Launch the downloaded setup .exe detached, then quit current app
      const child = spawn(filePath, [], {
        detached: true,
        stdio: 'ignore',
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
    if (win) win.close();
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
