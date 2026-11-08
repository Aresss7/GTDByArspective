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

      // Hide all windows immediately so user has smooth experience
      const allWindows = BrowserWindow.getAllWindows();
      for (const win of allWindows) {
        try {
          win.hide();
        } catch {}
      }

      const appDir = path.dirname(process.execPath);
      const appExe = process.execPath;
      const exeName = path.basename(appExe);

      const cleanFilePath = filePath.replace(/"/g, '');
      const cleanAppDir = appDir.replace(/"/g, '');
      const cleanAppExe = appExe.replace(/"/g, '');
      const cleanExeName = exeName.replace(/"/g, '').replace(/'/g, "''");

      // On Windows: use wscript.exe (native Windows GUI host, zero console windows)
      // to execute the silent installer, wait for it, ensure app starts, and self-clean.
      if (process.platform === 'win32') {
        const tempDir = app.getPath('temp');
        const runnerPath = path.join(tempDir, `gtd-updater-${Date.now()}.vbs`);

        const vbsScript = `Option Explicit
On Error Resume Next
Dim WshShell, fso
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 1. Wait for current Electron instance to terminate and release file locks
WScript.Sleep 1500

' 2. Execute silent NSIS update completely hidden (0 = SW_HIDE, True = wait for completion)
WshShell.Run """${cleanFilePath}"" /S --updated --force-run /D=${cleanAppDir}", 0, True

' 3. Wait a moment for installation to settle
WScript.Sleep 1000

' 4. Ensure application is running, launch if needed
Dim objWMIService, colProcesses
Set objWMIService = GetObject("winmgmts:\\\\.\\root\\cimv2")
Set colProcesses = objWMIService.ExecQuery("Select * from Win32_Process Where Name = '${cleanExeName}'")
If colProcesses.Count = 0 Then
  WshShell.Run """${cleanAppExe}""", 1, False
End If

' 5. Clean up runner script silently in background
WshShell.Run "cmd /c ping 127.0.0.1 -n 2 >nul & del """ & WScript.ScriptFullName & """", 0, False
`;

        fs.writeFileSync(runnerPath, vbsScript, 'utf8');

        try {
          const child = spawn('wscript.exe', [runnerPath], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
          });
          child.unref();
        } catch (vbsErr) {
          console.warn('[InstallUpdate] wscript failed, falling back to direct spawn:', vbsErr);
          const fallback = spawn(cleanFilePath, ['/S', '--updated', '--force-run', `/D=${cleanAppDir}`], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
          });
          fallback.unref();
        }
      } else {
        const child = spawn(cleanFilePath, ['/S', '--updated', '--force-run', `/D=${cleanAppDir}`], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
      }

      setTimeout(() => {
        app.quit();
        setTimeout(() => {
          app.exit(0);
        }, 1000);
      }, 300);

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
