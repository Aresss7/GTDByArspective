import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { initDatabase, closeDatabase } from '../../src/storage/database';
import { TaskRepository } from '../../src/storage/repositories/taskRepository';
import { BackupManager } from '../../src/storage/backup/backupManager';

describe('BackupManager', () => {
  const testDir = path.resolve(process.cwd(), '.test_backup_data');
  const dbFile = path.join(testDir, 'gtd.db');
  const backupDir = path.join(testDir, 'backups');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    initDatabase(dbFile);
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create a valid backup file and restore it', () => {
    const taskRepo = new TaskRepository(initDatabase(dbFile));
    taskRepo.create({ title: 'Задача перед бэкапом' });

    // Создаем резервную копию
    const backupFile = BackupManager.createBackup(backupDir);
    expect(fs.existsSync(backupFile)).toBe(true);

    // Добавляем ещё одну задачу после бэкапа
    taskRepo.create({ title: 'Задача после бэкапа' });
    expect(taskRepo.getAll().length).toBe(2);

    // Восстанавливаем из бэкапа
    const restored = BackupManager.restoreBackup(backupFile);
    expect(restored).toBe(true);

    // Проверяем состояние после восстановления
    const restoredRepo = new TaskRepository(initDatabase(dbFile));
    const tasks = restoredRepo.getAll();
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('Задача перед бэкапом');
  });
});
