import { Notification, ipcMain, BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../storage/database';

let reminderInterval: NodeJS.Timeout | null = null;

// Файл для сохранения истории отправленных уведомлений (не дублировать при перезапуске приложения)
function getStateFilePath(): string {
  try {
    return path.join(app.getPath('userData'), 'notifications-state.json');
  } catch {
    return path.join(process.cwd(), 'notifications-state.json');
  }
}

interface NotificationState {
  lastDate: string;
  dailySummarySent: boolean;
  notifiedTaskTimes: Record<string, string>; // taskId -> timeString
}

function loadNotificationState(todayStr: string): NotificationState {
  try {
    const file = getStateFilePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const data: NotificationState = JSON.parse(raw);
      if (data.lastDate === todayStr) {
        return data;
      }
    }
  } catch {}
  return {
    lastDate: todayStr,
    dailySummarySent: false,
    notifiedTaskTimes: {},
  };
}

function saveNotificationState(state: NotificationState): void {
  try {
    const file = getStateFilePath();
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Notifications] Failed to save state:', err);
  }
}

function getNotificationIconPath(): string {
  return path.join(__dirname, '../../build/GTD.ico');
}

/**
 * Показать нативное уведомление Windows
 */
export function showNativeNotification(options: {
  title: string;
  body: string;
  silent?: boolean;
  onClick?: () => void;
}): boolean {
  try {
    if (!Notification.isSupported()) {
      return false;
    }

    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent || false,
      icon: getNotificationIconPath(),
    });

    notification.on('click', () => {
      if (options.onClick) {
        options.onClick();
      } else {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const win = windows[0];
          if (!win.isVisible()) win.show();
          if (win.isMinimized()) win.restore();
          win.focus();
        }
      }
    });

    notification.show();
    return true;
  } catch (err) {
    console.error('[Notification] Failed to show native notification:', err);
    return false;
  }
}

function pluralizeTasks(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} задач`;
  if (mod10 === 1) return `${count} задача`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} задачи`;
  return `${count} задач`;
}

/**
 * Проверка напоминаний с агрегацией по времени и защитой от повторов при перезапуске
 */
export function checkReminders(): void {
  try {
    const db = getDatabase();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const curMinutesTotal = now.getHours() * 60 + now.getMinutes();

    const state = loadNotificationState(todayStr);

    // Выбираем активные задачи на сегодня (календарь, дедлайны или контрольные даты ожидания)
    const dueTasks = db.prepare(`
      SELECT id, title, scheduled_date, scheduled_time, due_date, due_time, destination, check_date, waiting_for
      FROM tasks
      WHERE status = 'active'
        AND destination != 'trash'
        AND deleted_at IS NULL
        AND (
          scheduled_date = ? OR
          due_date = ? OR
          check_date = ?
        )
      ORDER BY COALESCE(scheduled_time, due_time, '23:59') ASC
    `).all(todayStr, todayStr, todayStr) as Array<{
      id: string;
      title: string;
      scheduled_date?: string;
      scheduled_time?: string;
      due_date?: string;
      due_time?: string;
      destination: string;
      check_date?: string;
      waiting_for?: string;
    }>;

    if (dueTasks.length === 0) return;

    let stateModified = false;

    // 1. Проверяем задачи с точным временем (уведомляем заранее — за 0..15 минут до наступления)
    const timedTasks = dueTasks.filter((t) => t.scheduled_time || t.due_time);
    for (const task of timedTasks) {
      const timeStr = (task.scheduled_time || task.due_time)!;
      const [hours, mins] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(mins)) continue;

      const taskMinutesTotal = hours * 60 + mins;
      const diffMin = taskMinutesTotal - curMinutesTotal;

      // Уведомляем, если до задачи осталось от 0 до 15 минут, и для этого времени сегодня ещё не уведомляли
      if (diffMin >= 0 && diffMin <= 15 && state.notifiedTaskTimes[task.id] !== timeStr) {
        state.notifiedTaskTimes[task.id] = timeStr;
        stateModified = true;

        const timeNotice = diffMin === 0 ? 'прямо сейчас' : `через ${diffMin} мин`;
        const countNotice = dueTasks.length > 1 ? ` (всего на сегодня: ${pluralizeTasks(dueTasks.length)})` : '';
        
        showNativeNotification({
          title: 'Напоминание о задаче',
          body: `У вас «${task.title}» ${timeNotice}${countNotice}`,
        });
      }
    }

    // 2. Общая утренняя/дневная сводка задач на сегодня (отправляется строго один раз в день)
    if (!state.dailySummarySent && dueTasks.length > 0) {
      // Ищем ближайшую задачу по времени
      const nextTimed = timedTasks.find((t) => {
        const timeStr = (t.scheduled_time || t.due_time)!;
        const [h, m] = timeStr.split(':').map(Number);
        return (h * 60 + m) >= curMinutesTotal;
      });

      let summaryBody = `У вас ${pluralizeTasks(dueTasks.length)} на сегодня.`;
      if (nextTimed) {
        const timeStr = (nextTimed.scheduled_time || nextTimed.due_time)!;
        const [h, m] = timeStr.split(':').map(Number);
        const diff = (h * 60 + m) - curMinutesTotal;
        const timeNotice = diff > 0 ? `через ${diff} мин` : `в ${timeStr}`;
        summaryBody += ` Ближайшая: «${nextTimed.title}» (${timeNotice}).`;
      }

      showNativeNotification({
        title: 'Задачи на сегодня',
        body: summaryBody,
      });

      state.dailySummarySent = true;
      stateModified = true;
    }

    if (stateModified) {
      saveNotificationState(state);
    }
  } catch (err) {
    // Безопасный перехват в фоновом процессе
  }
}

/**
 * Инициализация службы уведомлений и IPC
 */
export function initNotificationService(): void {
  ipcMain.handle('system:showNotification', (_, options: { title: string; body: string; silent?: boolean }) => {
    return showNativeNotification(options);
  });

  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(checkReminders, 60 * 1000);

  // Первая проверка через 5 секунд после запуска
  setTimeout(checkReminders, 5000);
}

export function stopNotificationService(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}
