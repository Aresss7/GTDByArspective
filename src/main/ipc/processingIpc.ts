import { ipcMain } from 'electron';
import { SessionRepository } from '../../storage/repositories/sessionRepository';
import { TaskRepository } from '../../storage/repositories/taskRepository';
import { getDatabase } from '../../storage/database';
import { GTDQuestionId } from '../../shared/types';

export function registerProcessingIpc(): void {
  const getSessionRepo = () => new SessionRepository(getDatabase());
  const getTaskRepo = () => new TaskRepository(getDatabase());

  ipcMain.handle('processing:getActiveSession', async () => {
    return getSessionRepo().getActiveSession();
  });

  ipcMain.handle('processing:startSession', async (_, taskId?: string) => {
    const sessionRepo = getSessionRepo();
    const existing = sessionRepo.getActiveSession();
    if (existing) return existing;

    let targetTaskId = taskId;
    if (!targetTaskId) {
      const inboxTasks = getTaskRepo().getByDestination('inbox');
      if (inboxTasks.length === 0) return null;
      targetTaskId = inboxTasks[0].id;
    }

    return sessionRepo.createSession(targetTaskId, 'ACTIONABLE');
  });

  ipcMain.handle(
    'processing:saveStepAnswer',
    async (_, sessionId: string, question: GTDQuestionId, answer: string, payload?: any) => {
      const sessionRepo = getSessionRepo();
      sessionRepo.pushHistory(sessionId, question, answer, payload || {});
      return sessionRepo.updateSession(sessionId, {
        current_question: payload?.nextQuestion || question,
        context_data: payload,
      });
    }
  );

  ipcMain.handle('processing:stepBack', async (_, sessionId: string) => {
    const sessionRepo = getSessionRepo();
    const lastHistory = sessionRepo.popHistory(sessionId);
    if (!lastHistory) return sessionRepo.getSessionById(sessionId);

    return sessionRepo.updateSession(sessionId, {
      current_question: lastHistory.question,
      context_data: lastHistory.snapshot_json ? JSON.parse(lastHistory.snapshot_json) : undefined,
    });
  });

  ipcMain.handle('processing:pauseSession', async (_, sessionId: string) => {
    const sessionRepo = getSessionRepo();
    sessionRepo.updateSession(sessionId, { status: 'paused' });
    return true;
  });

  ipcMain.handle('processing:completeSession', async (_, sessionId: string) => {
    const sessionRepo = getSessionRepo();
    sessionRepo.deleteSession(sessionId);
    return true;
  });
}
