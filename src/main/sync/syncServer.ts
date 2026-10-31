import http from 'http';
import os from 'os';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { SyncRepository } from '../../storage/repositories/syncRepository';
import { getDatabase } from '../../storage/database';
import { SyncStatus, SyncPairingSession, SyncPayload, SyncResult } from '../../shared/types';

export class SyncServer {
  private static instance: SyncServer | null = null;
  private server: http.Server | null = null;
  private port: number = 52420;
  private isRunning: boolean = false;
  private eventClients: Set<http.ServerResponse> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): SyncServer {
    if (!SyncServer.instance) {
      SyncServer.instance = new SyncServer();
    }
    return SyncServer.instance;
  }

  // Определение локального IPv4 адреса компьютера в домашней Wi-Fi сети
  static getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    let candidate = '127.0.0.1';

    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;

      for (const net of netList) {
        // Пропускаем внутренние (loopback) и не-IPv4
        if (net.family === 'IPv4' && !net.internal) {
          // Предпочитаем типичные частные подсети 192.168.x.x, 10.x.x.x, 172.16-31.x.x
          if (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.')) {
            return net.address;
          }
          candidate = net.address;
        }
      }
    }
    return candidate;
  }

  private getRepo(): SyncRepository {
    return new SyncRepository(getDatabase());
  }

  // Запуск сервера синхронизации
  async start(port: number = 52420): Promise<SyncStatus> {
    if (this.isRunning && this.server) {
      return this.getStatus();
    }

    this.port = port;

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err: any) => {
        console.error('[SyncServer] Error:', err);
        if (err.code === 'EADDRINUSE') {
          // Если порт занят, пробуем следующий
          console.log(`[SyncServer] Port ${this.port} is busy, trying ${this.port + 1}`);
          this.port++;
          this.server?.listen(this.port);
        } else {
          this.isRunning = false;
          reject(err);
        }
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true;
        console.log(`[SyncServer] Running at http://${SyncServer.getLocalIpAddress()}:${this.port}`);

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          for (const client of this.eventClients) {
            try {
              client.write(': ping\n\n');
            } catch (e) {
              this.eventClients.delete(client);
            }
          }
        }, 20000);

        resolve(this.getStatus());
      });
    });
  }

  // Остановка сервера
  async stop(): Promise<SyncStatus> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const client of this.eventClients) {
      try {
        client.end();
      } catch (e) {}
    }
    this.eventClients.clear();

    if (!this.isRunning || !this.server) {
      this.isRunning = false;
      return this.getStatus();
    }

    return new Promise((resolve) => {
      this.server?.close(() => {
        this.isRunning = false;
        this.server = null;
        console.log('[SyncServer] Stopped');
        resolve(this.getStatus());
      });
    });
  }

  // Оповещение об изменении данных (для мгновенной синхронизации)
  broadcastChange(): void {
    // 1. Отправляем уведомление на подключённые клиенты (Android) по SSE
    const payload = `data: ${JSON.stringify({ type: 'sync_needed', timestamp: new Date().toISOString() })}\n\n`;
    for (const client of this.eventClients) {
      try {
        client.write(payload);
      } catch (err) {
        this.eventClients.delete(client);
      }
    }

    // 2. Оповещаем окна десктопного приложения Electron
    try {
      const { BrowserWindow } = require('electron');
      BrowserWindow.getAllWindows().forEach((win: any) => {
        if (!win.isDestroyed()) {
          win.webContents.send('data:changed');
        }
      });
    } catch (e) {
      // Игнорируем в окружении тестов
    }
  }

  // Текущий статус сервера
  getStatus(): SyncStatus {
    const devices = this.getRepo().getPairedDevices();
    const activeDevices = devices.filter((d) => !d.isRevoked);

    return {
      isRunning: this.isRunning,
      serverIp: SyncServer.getLocalIpAddress(),
      serverPort: this.port,
      pairedDevicesCount: activeDevices.length,
    };
  }

  // Создание сессии сопряжения (QR-код + 6-значный PIN)
  async createPairingSession(): Promise<SyncPairingSession> {
    const repo = this.getRepo();
    // Генерируем 6-значный PIN
    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Генерируем случайный секретный токен для QR-кода
    const secretToken = crypto.randomBytes(24).toString('hex');

    const session = repo.createPairingSession(pinCode, secretToken, 600); // 10 минут
    const ip = SyncServer.getLocalIpAddress();

    // Данные для QR-кода (JSON с параметрами подключения)
    const qrDataObj = {
      app: 'ArspectiveGTD',
      protocol: 1,
      ip,
      port: this.port,
      pin: pinCode,
      secret: secretToken,
    };
    const qrString = JSON.stringify(qrDataObj);

    // Генерируем изображение QR-кода в формате DataURL (PNG)
    const qrPayload = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#191919',
        light: '#ffffff',
      },
    });

    return {
      pairingId: session.id,
      pinCode,
      secretToken,
      qrPayload,
      serverIp: ip,
      serverPort: this.port,
      expiresAt: session.expiresAt,
    };
  }

  // Маршрутизация HTTP-запросов от Android-клиента
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Включаем CORS для локальной разработки и мобильных клиентов
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    try {
      // 1. Проверка доступности сервера: GET /api/v1/ping
      if (req.method === 'GET' && pathname === '/api/v1/ping') {
        this.sendJson(res, 200, {
          status: 'ok',
          server: 'Arspective GTD Sync Server',
          version: '1.0.0',
          protocolVersion: 1,
          serverTime: new Date().toISOString(),
        });
        return;
      }

      // 2. Первоначальное сопряжение: POST /api/v1/pair
      if (req.method === 'POST' && pathname === '/api/v1/pair') {
        const body = await this.readJsonBody(req);
        const { pinCode, secretToken, deviceName } = body;

        const keyToVerify = secretToken || pinCode;
        if (!keyToVerify) {
          this.sendJson(res, 400, { error: 'Missing pinCode or secretToken' });
          return;
        }

        const repo = this.getRepo();
        const valid = repo.verifyAndUsePairing(keyToVerify);
        if (!valid) {
          this.sendJson(res, 401, { error: 'Invalid or expired pairing code' });
          return;
        }

        // Генерируем постоянный криптографический ключ доступа для телефона
        const authToken = crypto.randomBytes(32).toString('hex');
        const device = repo.registerDevice(deviceName || 'Android Device', authToken);

        this.sendJson(res, 200, {
          success: true,
          deviceId: device.id,
          deviceName: device.deviceName,
          authToken,
          serverName: 'Arspective GTD',
        });
        return;
      }

      // Все последующие эндпоинты требуют авторизации по Bearer Token
      const authHeader = req.headers['authorization'];
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        this.sendJson(res, 401, { error: 'Unauthorized: Missing Bearer Token' });
        return;
      }

      const repo = this.getRepo();
      const authenticatedDevice = repo.authenticateDevice(token);

      if (!authenticatedDevice) {
        this.sendJson(res, 403, { error: 'Forbidden: Device is not authorized or access was revoked' });
        return;
      }

      // 3. Проверка статуса устройства: GET /api/v1/device/status
      if (req.method === 'GET' && pathname === '/api/v1/device/status') {
        this.sendJson(res, 200, {
          status: 'authorized',
          deviceId: authenticatedDevice.id,
          deviceName: authenticatedDevice.deviceName,
          lastSyncedAt: authenticatedDevice.lastSyncedAt,
        });
        return;
      }

      // 4. Двусторонняя инкрементальная синхронизация: POST /api/v1/sync
      if (req.method === 'POST' && pathname === '/api/v1/sync') {
        const body = (await this.readJsonBody(req)) as SyncPayload;
        const lastSyncedAt = body.lastSyncedAt || null;
        const clientChanges = body.clientChanges || { tasks: [], projects: [], tombstones: [] };

        // 1. Применяем изменения клиента на сервере
        const stats = repo.applyClientChanges(clientChanges, authenticatedDevice.id);

        // Если были изменения от мобильного клиента, уведомляем другие клиенты и Desktop UI
        if (
          stats.tasksCreated > 0 ||
          stats.tasksUpdated > 0 ||
          stats.projectsCreated > 0 ||
          stats.projectsUpdated > 0 ||
          stats.tombstonesApplied > 0
        ) {
          this.broadcastChange();
        }

        // 2. Получаем изменения с сервера, произошедшие после момента последней синхронизации клиента
        const serverChanges = repo.getChangesSince(lastSyncedAt);

        // 3. Отправляем дельту клиенту
        const syncTime = new Date().toISOString();
        const responseData: SyncResult = {
          protocolVersion: 1,
          syncedAt: syncTime,
          serverChanges,
          stats,
        };

        this.sendJson(res, 200, responseData);
        return;
      }

      // 5. Постоянный SSE-поток событий для Android: GET /api/v1/events
      if (req.method === 'GET' && pathname === '/api/v1/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        res.write(': connected\n\n');

        this.eventClients.add(res);

        req.on('close', () => {
          this.eventClients.delete(res);
        });
        return;
      }

      // Маршрут не найден
      this.sendJson(res, 404, { error: 'Not Found' });
    } catch (e: any) {
      console.error('[SyncServer] Request processing error:', e);
      this.sendJson(res, 500, { error: 'Internal Server Error', message: e.message });
    }
  }

  private readJsonBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
        if (data.length > 50 * 1024 * 1024) {
          // Лимит 50 МБ для предотвращения переполнения памяти
          req.destroy();
          reject(new Error('Payload Too Large'));
        }
      });
      req.on('end', () => {
        if (!data) return resolve({});
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: http.ServerResponse, statusCode: number, data: any): void {
    const payload = JSON.stringify(data);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
    });
    res.end(payload);
  }
}
