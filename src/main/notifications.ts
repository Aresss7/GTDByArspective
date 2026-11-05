import { Notification, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { getDatabase } from '../storage/database';

let reminderInterval: NodeJS.Timeout | null = null;
const notifiedKeys = new Set<string>();

/**
 * Получить путь к иконке для уведомлений
 */
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

/**
 * Проверка напоминаний по расписанию (задачи на сегодня, сроки, контрольные даты)
 */
export function checkReminders(): void {
  try {
    const db = getDatabase();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const curHours = String(now.getHours()).padStart(2, '0');
    const curMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${curHours}:${curMinutes}`;

    // 1. Задачи календаря и сроки на сегодня
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

    for (const task of dueTasks) {
      // А. Запланированные задачи в календаре
      if (task.scheduled_date === todayStr) {
        const key = `${task.id}_scheduled_${todayStr}`;
        if (!notifiedKeys.has(key)) {
          if (!task.scheduled_time || task.scheduled_time <= currentTimeStr) {
            notifiedKeys.add(key);
            const timeInfo = task.scheduled_time ? ` в ${task.scheduled_time}` : '';
            showNativeNotification({
              title: 'Запланировано на сегодня',
              body: `${task.title}${timeInfo}`,
            });
          }
        }
      }

      // Б. Задачи с дедлайном (due_date)
      if (task.due_date === todayStr) {
        const key = `${task.id}_due_${todayStr}`;
        if (!notifiedKeys.has(key)) {
          if (!task.due_time || task.due_time <= currentTimeStr) {
            notifiedKeys.add(key);
            const timeInfo = task.due_time ? ` до ${task.due_time}` : '';
            showNativeNotification({
              title: 'Срок выполнения сегодня',
              body: `${task.title}${timeInfo}`,
            });
          }
        }
      }

      // В. Задачи в ожидании (check_date)
      if (task.check_date === todayStr && task.destination === 'waiting_for') {
        const key = `${task.id}_waiting_${todayStr}`;
        if (!notifiedKeys.has(key)) {
          notifiedKeys.add(key);
          const who = task.waiting_for ? ` от ${task.waiting_for}` : '';
          showNativeNotification({
            title: 'Контрольная дата ожидания',
            body: `Проверьте: «${task.title}»${who}`,
          });
        }
      }
    }
  } catch (err) {
    // В некоторых тестах база может быть закрыта
  }
}

/**
 * Инициализация службы уведомлений и IPC
 */
export function initNotificationService(): void {
  // IPC для вызова уведомлений из renderer-процесса
  ipcMain.handle('system:showNotification', (_, options: { title: string; body: string; silent?: boolean }) => {
    return showNativeNotification(options);
  });

  // Запуск фонового таймера проверки напоминаний (каждые 60 секунд)
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
