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

function getSettingsFilePath(): string {
  try {
    return path.join(app.getPath('userData'), 'notifications-settings.json');
  } catch {
    return path.join(process.cwd(), 'notifications-settings.json');
  }
}

export interface NotificationSettingsData {
  inboxReminderFrequency: 'off' | 'daily' | 'weekly';
  inboxReminderDay?: number; // 1 (Mon) - 7 (Sun)
  inboxReminderTime?: string; // HH:mm
}

export function loadNotificationSettings(): NotificationSettingsData {
  try {
    const file = getSettingsFilePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return {
    inboxReminderFrequency: 'off',
    inboxReminderDay: 1,
    inboxReminderTime: '18:00',
  };
}

export function saveNotificationSettings(settings: NotificationSettingsData): void {
  try {
    const file = getSettingsFilePath();
    fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Notifications] Failed to save settings:', err);
  }
}

interface NotificationState {
  lastDate: string;
  dailySummarySent: boolean;
  inboxReviewSent?: boolean;
  notifiedTaskTimes: Record<string, string>; // taskId -> timeString
  notifiedReminders?: Record<string, boolean>; // reminderKey -> boolean
}

function loadNotificationState(todayStr: string): NotificationState {
  try {
    const file = getStateFilePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const data: NotificationState = JSON.parse(raw);
      if (data.lastDate === todayStr) {
        if (!data.notifiedReminders) data.notifiedReminders = {};
        return data;
      }
    }
  } catch {}
  return {
    lastDate: todayStr,
    dailySummarySent: false,
    inboxReviewSent: false,
    notifiedTaskTimes: {},
    notifiedReminders: {},
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
    const nowEpoch = now.getTime();

    const state = loadNotificationState(todayStr);
    let stateModified = false;

    // 1. Индивидуальные напоминания задач по установленному reminder_offset (0, 10, 15, 30, 60, 120, 1440 минут)
    try {
      const tasksWithReminders = db.prepare(`
        SELECT id, title, scheduled_date, scheduled_time, due_date, due_time, reminder_offset
        FROM tasks
        WHERE status = 'active'
          AND destination != 'trash'
          AND deleted_at IS NULL
          AND reminder_offset IS NOT NULL
          AND (scheduled_date IS NOT NULL OR due_date IS NOT NULL)
      `).all() as Array<{
        id: string;
        title: string;
        scheduled_date?: string;
        scheduled_time?: string;
        due_date?: string;
        due_time?: string;
        reminder_offset: number;
      }>;

      for (const task of tasksWithReminders) {
        const targetDate = (task.scheduled_date || task.due_date)!;
        const targetTime = task.scheduled_time || task.due_time || '09:00';
        const [y, m, d] = targetDate.split('-').map(Number);
        const [hh, mm] = targetTime.split(':').map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) continue;

        const eventDate = new Date(y, m - 1, d, hh, mm, 0, 0);
        const notifyEpoch = eventDate.getTime() - (task.reminder_offset * 60 * 1000);
        const diffMin = Math.floor((nowEpoch - notifyEpoch) / 60000);

        const reminderKey = `${task.id}_${targetDate}_${targetTime}_${task.reminder_offset}`;
        if (diffMin >= 0 && diffMin <= 3 && !state.notifiedReminders?.[reminderKey]) {
          if (!state.notifiedReminders) state.notifiedReminders = {};
          state.notifiedReminders[reminderKey] = true;
          stateModified = true;

          let whenText = 'в момент события';
          if (task.reminder_offset === 0) whenText = 'прямо сейчас';
          else if (task.reminder_offset === 10) whenText = 'через 10 минут';
          else if (task.reminder_offset === 15) whenText = 'через 15 минут';
          else if (task.reminder_offset === 30) whenText = 'через 30 минут';
          else if (task.reminder_offset === 60) whenText = 'через 1 час';
          else if (task.reminder_offset === 120) whenText = 'через 2 часа';
          else if (task.reminder_offset === 1440) whenText = 'завтра (через 1 день)';
          else whenText = `через ${task.reminder_offset} мин`;

          showNativeNotification({
            title: 'Напоминание о задаче',
            body: `«${task.title}» (${whenText})`,
          });
        }
      }
    } catch (e) {
      console.warn('[Notifications] Error checking task reminder_offset:', e);
    }

    // 2. Напоминание о регулярном разборе корзины (Inbox Review)
    try {
      const notifSettings = loadNotificationSettings();
      if (notifSettings.inboxReminderFrequency && notifSettings.inboxReminderFrequency !== 'off') {
        let isToday = false;
        if (notifSettings.inboxReminderFrequency === 'daily') {
          isToday = true;
        } else if (notifSettings.inboxReminderFrequency === 'weekly') {
          const jsDay = now.getDay();
          const currentDay = jsDay === 0 ? 7 : jsDay;
          const targetDay = notifSettings.inboxReminderDay || 1;
          if (currentDay === targetDay) {
            isToday = true;
          }
        }

        if (isToday && !state.inboxReviewSent) {
          const targetTime = notifSettings.inboxReminderTime || '18:00';
          const [th, tm] = targetTime.split(':').map(Number);
          if (!isNaN(th) && !isNaN(tm)) {
            const targetMinutes = th * 60 + tm;
            if (curMinutesTotal >= targetMinutes && curMinutesTotal <= targetMinutes + 15) {
              const inboxRow = db.prepare(`
                SELECT count(*) as count
                FROM tasks
                WHERE destination = 'inbox'
                  AND status = 'active'
                  AND deleted_at IS NULL
              `).get() as { count: number } | undefined;
              const count = inboxRow?.count || 0;
              if (count > 0) {
                showNativeNotification({
                  title: 'Разбор корзины ГТД',
                  body: `В вашей корзине ${pluralizeTasks(count)}. Самое время навести порядок!`,
                });
                state.inboxReviewSent = true;
                stateModified = true;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Notifications] Error checking inbox review reminder:', e);
    }

    // 3. Выбираем активные задачи на сегодня (календарь, дедлайны или контрольные даты ожидания) без индивидуального reminder_offset
    const dueTasks = db.prepare(`
      SELECT id, title, scheduled_date, scheduled_time, due_date, due_time, destination, check_date, waiting_for
      FROM tasks
      WHERE status = 'active'
        AND destination != 'trash'
        AND deleted_at IS NULL
        AND reminder_offset IS NULL
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

    if (dueTasks.length > 0) {
      // 3.1 Задачи с точным временем без спец-напоминания (уведомляем заранее — за 0..15 минут)
      const timedTasks = dueTasks.filter((t) => t.scheduled_time || t.due_time);
      for (const task of timedTasks) {
        const timeStr = (task.scheduled_time || task.due_time)!;
        const [hours, mins] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(mins)) continue;

        const taskMinutesTotal = hours * 60 + mins;
        const diffMin = taskMinutesTotal - curMinutesTotal;

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

      // 3.2 Общая утренняя/дневная сводка задач на сегодня (отправляется строго один раз в день)
      if (!state.dailySummarySent) {
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

  ipcMain.handle('system:updateNotificationSettings', (_, settings: NotificationSettingsData) => {
    saveNotificationSettings(settings);
    checkReminders();
    return true;
  });

  ipcMain.handle('system:getNotificationSettings', () => {
    return loadNotificationSettings();
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
