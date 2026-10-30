import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface Migration {
  id: number;
  name: string;
  up: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: '001_initial_schema',
    up: (db: Database.Database) => {
      // Таблица проектов
      db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          first_step_task_id TEXT,
          approximate_plan TEXT,
          completion_criteria TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      `);

      // Таблица задач
      db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          notes TEXT,
          destination TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          project_id TEXT,
          project_order INTEGER DEFAULT 0,
          due_date TEXT,
          due_time TEXT,
          scheduled_date TEXT,
          scheduled_time TEXT,
          delegated_to TEXT,
          waiting_for TEXT,
          check_date TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          deleted_at TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_dest_status ON tasks(destination, status);
        CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
      `);

      // Таблица активных сессий разбора корзины
      db.exec(`
        CREATE TABLE IF NOT EXISTS processing_sessions (
          id TEXT PRIMARY KEY,
          current_task_id TEXT NOT NULL,
          current_question TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'in_progress',
          context_data TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (current_task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_status ON processing_sessions(status);
      `);

      // Таблица истории переходов в сессии (для кнопки «Назад» и отката)
      db.exec(`
        CREATE TABLE IF NOT EXISTS processing_steps_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          question TEXT NOT NULL,
          answer_chosen TEXT NOT NULL,
          snapshot_json TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (session_id) REFERENCES processing_sessions(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_history_session ON processing_steps_history(session_id);
      `);
    },
  },
  {
    id: 2,
    name: '002_sync_support',
    up: (db: Database.Database) => {
      // 1. Поле мягкого удаления для проектов (deleted_at)
      const projectCols = db.pragma('table_info(projects)') as Array<{ name: string }>;
      if (!projectCols.some((col) => col.name === 'deleted_at')) {
        db.exec('ALTER TABLE projects ADD COLUMN deleted_at TEXT;');
      }

      // 2. Журнал меток окончательного удаления (tombstones) для бесконфликтной синхронизации
      db.exec(`
        CREATE TABLE IF NOT EXISTS sync_tombstones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          deleted_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sync_tombstones_type_time ON sync_tombstones(entity_type, deleted_at);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_tombstones_entity ON sync_tombstones(entity_type, entity_id);
      `);

      // 3. Таблица сопряжённых доверенных устройств
      db.exec(`
        CREATE TABLE IF NOT EXISTS sync_devices (
          id TEXT PRIMARY KEY,
          device_name TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          paired_at TEXT NOT NULL,
          last_synced_at TEXT,
          revoked_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sync_devices_token ON sync_devices(token_hash);
      `);

      // 4. Временные сессии сопряжения (PIN + одноразовый секретный токен для QR-кода)
      db.exec(`
        CREATE TABLE IF NOT EXISTS sync_pairings (
          id TEXT PRIMARY KEY,
          pin_code TEXT NOT NULL,
          secret_token TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          used_at TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sync_pairings_pin ON sync_pairings(pin_code);
      `);
    },
  },
  {
    id: 3,
    name: '003_link_preview_cache',
    up: (db: Database.Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS link_preview_cache (
          url TEXT PRIMARY KEY,
          title TEXT,
          description TEXT,
          image_url TEXT,
          fetched_at TEXT NOT NULL
        );
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  // Включаем поддержку внешних ключей и WAL-режим для надежности
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT id FROM _migrations').all() as { id: number }[];
  const appliedIds = new Set(appliedRows.map((r) => r.id));

  const hasUnapplied = migrations.some((m) => !appliedIds.has(m.id));

  // Перед применением новых миграций к существующей базе создаём автоматический страховочный бэкап
  if (hasUnapplied && appliedIds.size > 0 && db.name && db.name !== ':memory:') {
    try {
      const backupDir = path.join(path.dirname(db.name), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `pre-migration-backup-${timestamp}.db`);
      db.prepare('VACUUM INTO ?').run(backupPath);
    } catch (e) {
      console.warn('Could not create pre-migration backup:', e);
    }
  }

  const insertMigration = db.prepare(
    'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)'
  );

  for (const migration of migrations) {
    if (!appliedIds.has(migration.id)) {
      const applyTx = db.transaction(() => {
        migration.up(db);
        insertMigration.run(migration.id, migration.name, new Date().toISOString());
      });
      applyTx();
    }
  }
}
