import Database from 'better-sqlite3';

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
