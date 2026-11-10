import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { getDatabasePath, closeDatabase, initDatabase } from '../database';

export class BackupManager {
  static exportToFile(targetFilePath: string): string {
    const dbPath = getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file at ${dbPath} does not exist`);
    }

    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Удаляем файл, если он уже существует перед выполнением снимка
    if (fs.existsSync(targetFilePath)) {
      fs.unlinkSync(targetFilePath);
    }

    // Используем VACUUM INTO для мгновенного и надежного снимка SQLite
    const db = new Database(dbPath);
    try {
      db.prepare('VACUUM INTO ?').run(targetFilePath);
    } finally {
      db.close();
    }

    return targetFilePath;
  }

  static createBackup(targetDirectory?: string): string {
    const dbPath = getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file at ${dbPath} does not exist`);
    }

    const backupDir = targetDirectory || path.join(path.dirname(dbPath), 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `gtd-backup-${timestamp}.db`;
    const backupFilePath = path.join(backupDir, backupFileName);

    return this.exportToFile(backupFilePath);
  }

  static restoreBackup(backupFilePath: string): boolean {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file ${backupFilePath} not found`);
    }

    // Проверяем валидность файла бэкапа
    const testDb = new Database(backupFilePath, { readonly: true });
    try {
      const tableCheck = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").get();
      if (!tableCheck) {
        throw new Error('Invalid backup file: "tasks" table is missing');
      }
    } finally {
      testDb.close();
    }

    const currentDbPath = getDatabasePath();

    // Закрываем текущую БД перед перезаписью файла
    closeDatabase();

    // Копируем файл бэкапа на место рабочей БД
    fs.copyFileSync(backupFilePath, currentDbPath);

    // Удаляем WAL/SHM файлы если они существовали
    const walFile = `${currentDbPath}-wal`;
    const shmFile = `${currentDbPath}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    // Заново инициализируем базу и выполняем миграции
    initDatabase(currentDbPath);
    return true;
  }
}
