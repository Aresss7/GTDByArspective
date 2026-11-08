import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, X, AlertCircle } from 'lucide-react';
import { Task } from '@shared/types';
import { CustomDatePicker } from './CustomDatePicker';
import { CustomTimePicker } from './CustomTimePicker';
import { TaskReminderPicker } from './TaskReminderPicker';
import { Language } from '../i18n/translations';

interface ScheduleTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (taskId: string, scheduledDate: string, scheduledTime?: string, reminderOffset?: number | null) => Promise<void>;
  language?: Language;
}

export const ScheduleTaskModal: React.FC<ScheduleTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSchedule,
  language = 'ru',
}) => {
  const isEn = language === 'en';
  const todayStr = new Date().toISOString().split('T')[0];

  const [scheduledDate, setScheduledDate] = useState(todayStr);
  const [scheduledTime, setScheduledTime] = useState('');
  const [reminderOffset, setReminderOffset] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task && isOpen) {
      setScheduledDate(task.scheduled_date || todayStr);
      setScheduledTime(task.scheduled_time || '');
      setReminderOffset(task.reminder_offset !== undefined ? task.reminder_offset : null);
      setError('');
    }
  }, [task, isOpen, todayStr]);

  // Закрытие по Escape и сохранение по Ctrl+Enter
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e as any);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, scheduledDate, scheduledTime]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!scheduledDate) {
      setError(isEn ? 'Please choose a date for the calendar.' : 'Пожалуйста, выберите дату для календаря.');
      return;
    }
    if (scheduledDate < todayStr) {
      setError(isEn ? 'Scheduled date cannot be earlier than today.' : 'Дата выполнения не может быть раньше сегодняшнего дня.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSchedule(task.id, scheduledDate, scheduledTime || undefined, reminderOffset);
      onClose();
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Failed to schedule task' : 'Не удалось запланировать задачу'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isEn ? 'Schedule in Calendar' : 'Запланировать в Календарь'}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isEn ? 'Assign date and time for execution' : 'Укажите дату и время выполнения'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Отображение названия задачи */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-2xl border border-zinc-200/70 dark:border-zinc-700/60">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">
              {isEn ? 'Task' : 'Задача'}
            </span>
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
              {task.title}
            </p>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/60">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Дата выполнения (обязательно) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              {isEn ? 'Scheduled Date' : 'Дата выполнения'} <span className="text-rose-500">*</span>
            </label>
            <CustomDatePicker
              value={scheduledDate}
              onChange={(d) => {
                setScheduledDate(d);
                setError('');
              }}
              minDate={todayStr}
              placeholder={isEn ? 'Select date...' : 'Выберите дату...'}
            />
          </div>

          {/* Время (необязательно) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              {isEn ? 'Time (optional)' : 'Время (необязательно)'}
            </label>
            <CustomTimePicker
              value={scheduledTime}
              onChange={setScheduledTime}
            />
          </div>

          {/* Напоминание / Уведомление */}
          <TaskReminderPicker
            reminderOffset={reminderOffset}
            onChange={setReminderOffset}
            language={language}
          />

          {/* Кнопки */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-400">Ctrl + Enter для сохранения</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Отмена'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !scheduledDate}
                className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isEn ? 'Schedule' : 'Запланировать'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
