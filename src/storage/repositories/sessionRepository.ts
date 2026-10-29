import Database from 'better-sqlite3';
import { ProcessingSession, ProcessingHistoryStep, GTDQuestionId } from '../../shared/types';

export class SessionRepository {
  constructor(private db: Database.Database) {}

  getActiveSession(): ProcessingSession | null {
    const stmt = this.db.prepare(
      "SELECT * FROM processing_sessions WHERE status IN ('in_progress', 'paused') ORDER BY updated_at DESC LIMIT 1"
    );
    const row = stmt.get() as any;
    if (!row) return null;
    return {
      ...row,
      context_data: row.context_data ? JSON.parse(row.context_data) : undefined,
    };
  }

  createSession(taskId: string, initialQuestion: GTDQuestionId = 'ACTIONABLE'): ProcessingSession {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO processing_sessions (id, current_task_id, current_question, status, created_at, updated_at)
      VALUES (?, ?, ?, 'in_progress', ?, ?)
    `);

    stmt.run(id, taskId, initialQuestion, now, now);

    return {
      id,
      current_task_id: taskId,
      current_question: initialQuestion,
      status: 'in_progress',
      created_at: now,
      updated_at: now,
    };
  }

  updateSession(
    sessionId: string,
    updates: {
      current_question?: GTDQuestionId;
      status?: 'in_progress' | 'paused' | 'completed';
      context_data?: Record<string, any>;
    }
  ): ProcessingSession {
    const now = new Date().toISOString();
    const current = this.getSessionById(sessionId);
    if (!current) throw new Error(`Session ${sessionId} not found`);

    const newQuestion = updates.current_question ?? current.current_question;
    const newStatus = updates.status ?? current.status;
    const newContext = updates.context_data
      ? JSON.stringify(updates.context_data)
      : current.context_data
      ? JSON.stringify(current.context_data)
      : null;

    const stmt = this.db.prepare(`
      UPDATE processing_sessions
      SET current_question = ?, status = ?, context_data = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(newQuestion, newStatus, newContext, now, sessionId);

    return {
      ...current,
      current_question: newQuestion,
      status: newStatus,
      context_data: updates.context_data ?? current.context_data,
      updated_at: now,
    };
  }

  getSessionById(id: string): ProcessingSession | null {
    const stmt = this.db.prepare('SELECT * FROM processing_sessions WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      ...row,
      context_data: row.context_data ? JSON.parse(row.context_data) : undefined,
    };
  }

  pushHistory(
    sessionId: string,
    question: GTDQuestionId,
    answerChosen: string,
    snapshot: Record<string, any>
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO processing_steps_history (session_id, question, answer_chosen, snapshot_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(sessionId, question, answerChosen, JSON.stringify(snapshot), new Date().toISOString());
  }

  popHistory(sessionId: string): ProcessingHistoryStep | null {
    const tx = this.db.transaction(() => {
      const getLatest = this.db.prepare(`
        SELECT * FROM processing_steps_history
        WHERE session_id = ?
        ORDER BY id DESC
        LIMIT 1
      `);
      const row = getLatest.get(sessionId) as ProcessingHistoryStep | undefined;
      if (!row) return null;

      const deleteStmt = this.db.prepare('DELETE FROM processing_steps_history WHERE id = ?');
      deleteStmt.run(row.id);
      return row;
    });

    return tx();
  }

  deleteSession(sessionId: string): void {
    const stmt = this.db.prepare('DELETE FROM processing_sessions WHERE id = ?');
    stmt.run(sessionId);
  }
}
