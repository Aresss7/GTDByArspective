import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/storage/migrations/runner';
import { SyncServer } from '../../src/main/sync/syncServer';
import { initDatabase, closeDatabase } from '../../src/storage/database';
import { TaskRepository } from '../../src/storage/repositories/taskRepository';
import { ProjectRepository } from '../../src/storage/repositories/projectRepository';
import { SyncRepository } from '../../src/storage/repositories/syncRepository';
import fs from 'fs';
import path from 'path';

describe('SyncServer HTTP API Integration Tests', () => {
  let testDbPath: string;
  let syncServer: SyncServer;
  const testPort = 52498;

  beforeAll(async () => {
    const testDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    testDbPath = path.join(testDir, 'test-sync-server.db');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    initDatabase(testDbPath);
    syncServer = SyncServer.getInstance();
    await syncServer.start(testPort);
  });

  afterAll(async () => {
    await syncServer.stop();
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('GET /api/v1/ping should return server health and version', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/v1/ping`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.server).toContain('Arspective GTD');
    expect(body.protocolVersion).toBe(1);
  });

  it('POST /api/v1/pair should pair device and return auth token', async () => {
    const session = await syncServer.createPairingSession();
    expect(session.pinCode).toBeDefined();
    expect(session.qrPayload).toContain('data:image/png;base64');

    // Клиент отправляет запрос на сопряжение
    const pairRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretToken: session.secretToken,
        deviceName: 'Pixel 9 Pro XL',
      }),
    });

    expect(pairRes.status).toBe(200);
    const pairBody = await pairRes.json();
    expect(pairBody.success).toBe(true);
    expect(pairBody.authToken).toBeDefined();
    expect(pairBody.deviceId).toBeDefined();

    // Повторное сопряжение с тем же кодом должно быть отклонено
    const reuseRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretToken: session.secretToken,
        deviceName: 'Another Device',
      }),
    });
    expect(reuseRes.status).toBe(401);
  });

  it('POST /api/v1/sync should require authorization token', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/v1/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolVersion: 1, lastSyncedAt: null, clientChanges: {} }),
    });

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/sync should perform full 2-way delta sync', async () => {
    const session = await syncServer.createPairingSession();
    const pairRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pinCode: session.pinCode,
        deviceName: 'Samsung Galaxy S24',
      }),
    });
    const { authToken, deviceId } = await pairRes.json();

    // 1. Создаём задачу на сервере (Windows)
    const taskRepo = new TaskRepository(initDatabase(testDbPath));
    const serverTask = taskRepo.create({
      title: 'Подготовить отчёт по проекту',
      destination: 'next_actions',
      notes: 'Собрать метрики за прошлый месяц',
    });

    // 2. Телефон отправляет свою задачу и запрашивает серверные изменения
    const clientTaskId = `task_android_${Date.now()}`;
    const clientNow = new Date().toISOString();
    const syncRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        protocolVersion: 1,
        lastSyncedAt: null,
        clientChanges: {
          tasks: [
            {
              id: clientTaskId,
              title: 'Купить зарядку Type-C',
              destination: 'inbox',
              status: 'active',
              created_at: clientNow,
              updated_at: clientNow,
            },
          ],
          projects: [],
          tombstones: [],
        },
      }),
    });

    expect(syncRes.status).toBe(200);
    const syncBody = await syncRes.json();

    // Проверяем, что задача с телефона сохранилась в базе Windows
    const savedFromClient = taskRepo.getById(clientTaskId);
    expect(savedFromClient).not.toBeNull();
    expect(savedFromClient?.title).toBe('Купить зарядку Type-C');

    // Проверяем, что задача с Windows передана в ответе на телефон
    const receivedServerTask = syncBody.serverChanges.tasks.find((t: any) => t.id === serverTask.id);
    expect(receivedServerTask).toBeDefined();
    expect(receivedServerTask.title).toBe('Подготовить отчёт по проекту');
  });

  it('should immediately reject sync when device access is revoked', async () => {
    const session = await syncServer.createPairingSession();
    const pairRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pinCode: session.pinCode,
        deviceName: 'Tablet to revoke',
      }),
    });
    const { authToken, deviceId } = await pairRes.json();

    // Отзываем доступ устройства в SyncRepository
    const syncRepo = new SyncRepository(initDatabase(testDbPath));
    syncRepo.revokeDevice(deviceId);

    // Запрос на синхронизацию должен вернуть 403 Forbidden
    const syncRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ protocolVersion: 1, lastSyncedAt: null, clientChanges: {} }),
    });

    expect(syncRes.status).toBe(403);
  });
});
