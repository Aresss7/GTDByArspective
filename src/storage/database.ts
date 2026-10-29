import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrations/runner';

let dbInstance: Database.Database | null = null;
let activeDbPath: string | null = null;

export function getDatabasePath(): string {
  if (activeDbPath) {
    return activeDbPath;
  }

  // Проверяем, запущен ли код внутри Electron
  try {
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      const userDataDir = app.getPath('userData');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      activeDbPath = path.join(userDataDir, 'gtd.db');
      return activeDbPath;
    }
  } catch {
    // Вне Electron (например, при тестировании или миграциях)
  }

  // Резервный путь для разработки/тестов
  const defaultDir = path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  activeDbPath = path.join(defaultDir, 'gtd.db');
  return activeDbPath;
}

export function initDatabase(dbPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const resolvedPath = dbPath || getDatabasePath();
  activeDbPath = resolvedPath;
  const db = new Database(resolvedPath);

  runMigrations(db);
  dbInstance = db;
  return db;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
