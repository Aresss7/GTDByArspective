import React, { useState, useEffect } from 'react';
import { UserCheck, X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Task } from '@shared/types';
import { CustomDatePicker } from './CustomDatePicker';
import { Language } from '../i18n/translations';

interface DelegateTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onDelegate: (taskId: string, data: { delegated_to: string; waiting_for?: string; check_date?: string }) => Promise<void>;
  language?: Language;
}

export const DelegateTaskModal: React.FC<DelegateTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onDelegate,
  language = 'ru',
}) => {
  const isEn = language === 'en';
  const todayStr = new Date().toISOString().split('T')[0];

  const [delegatedTo, setDelegatedTo] = useState('');
  const [waitingFor, setWaitingFor] = useState('');
  const [checkDate, setCheckDate] = useState(todayStr);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task && isOpen) {
      setDelegatedTo(task.delegated_to || '');
      setWaitingFor(task.waiting_for || task.title || '');
      // Автозаполнение даты: берём дату задачи или сегодняшнюю дату
      setCheckDate(task.scheduled_date || task.check_date || task.due_date || todayStr);
      setError('');
    }
  }, [task, isOpen, todayStr]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegatedTo.trim()) {
      setError(isEn ? 'Please specify whom this task is delegated to.' : 'Укажите, кому делегирована задача.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onDelegate(task.id, {
        delegated_to: delegatedTo.trim(),
        waiting_for: waitingFor.trim() || undefined,
        check_date: checkDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Failed to delegate task' : 'Не удалось делегировать задачу'));
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
        className="bg-white dark:bg-[#1f1f1f] text-zinc-900 dark:text-zinc-100 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={isEn ? 'Close' : 'Закрыть'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Заголовок */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-purple-950/40 border border-indigo-200 dark:border-purple-800/80 flex items-center justify-center text-indigo-600 dark:text-purple-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 pr-6">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 truncate">
              {isEn ? 'Delegate Task' : 'Делегировать задачу'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {task.title}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Поле «Кому» */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isEn ? 'Delegated to (Who) *' : 'Кому делегировано *'}
            </label>
            <input
              type="text"
              autoFocus
              value={delegatedTo}
              onChange={(e) => {
                setDelegatedTo(e.target.value);
                if (error) setError('');
              }}
              placeholder={isEn ? 'e.g. John, Accounting Department...' : 'Например: Алексей, Бухгалтерия, Подрядчик...'}
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-[#282828] border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
            />
          </div>

          {/* Поле «Что ожидается» */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isEn ? 'What is expected / Deliverable' : 'Что ожидается / Результат'}
            </label>
            <input
              type="text"
              value={waitingFor}
              onChange={(e) => setWaitingFor(e.target.value)}
              placeholder={isEn ? 'e.g. Approved contract, report...' : 'Например: Согласованный договор, ответ на письмо...'}
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-[#282828] border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
            />
          </div>

          {/* Дата проверки / контроля с автозаполнением */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isEn ? 'Follow-up / Check Date' : 'Дата проверки / контроля'}
            </label>
            <CustomDatePicker
              value={checkDate}
              onChange={setCheckDate}
              placeholder={isEn ? 'Select check date' : 'Выберите дату контроля'}
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              {isEn ? 'Date is prefilled automatically and can be customized.' : 'Дата заполнена автоматически, вы можете изменить её при необходимости.'}
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Отмена'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (isEn ? 'Saving...' : 'Сохранение...') : (isEn ? 'Delegate' : 'Делегировать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
