import React, { useState, useEffect } from 'react';
import { X, Calendar, UserCheck, Clock, CheckSquare, Inbox, FileText, Trash2 } from 'lucide-react';
import { Task, TaskDestination, Project } from '@shared/types';

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  projects: Project[];
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  projects,
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [destination, setDestination] = useState<TaskDestination>('inbox');
  const [projectId, setProjectId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [delegatedTo, setDelegatedTo] = useState('');
  const [waitingFor, setWaitingFor] = useState('');
  const [checkDate, setCheckDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || '');
      setNotes(task.notes || '');
      setDestination(task.destination || 'inbox');
      setProjectId(task.project_id || '');
      setScheduledDate(task.scheduled_date || '');
      setScheduledTime(task.scheduled_time || '');
      setDueDate(task.due_date || '');
      setDelegatedTo(task.delegated_to || '');
      setWaitingFor(task.waiting_for || '');
      setCheckDate(task.check_date || '');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    if (destination === 'calendar' && scheduledDate && scheduledDate < todayStr) {
      alert('Дата выполнения не может быть раньше сегодняшнего дня.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(task.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        destination,
        project_id: projectId || undefined,
        scheduled_date: destination === 'calendar' ? scheduledDate || undefined : undefined,
        scheduled_time: destination === 'calendar' ? scheduledTime || undefined : undefined,
        due_date: dueDate || undefined,
        delegated_to: destination === 'waiting_for' ? delegatedTo || undefined : undefined,
        waiting_for: destination === 'waiting_for' ? waitingFor || undefined : undefined,
        check_date: destination === 'waiting_for' ? checkDate || undefined : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm(`Удалить задачу «${task.title}»?`)) return;
    try {
      await onDelete(task.id);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const destinationOptions = [
    { id: 'next_actions', label: 'Текущие действия', icon: CheckSquare },
    { id: 'inbox', label: 'Корзина ГТД', icon: Inbox },
    { id: 'calendar', label: 'Календарь', icon: Calendar },
    { id: 'waiting_for', label: 'Делегирование / Ожидание', icon: UserCheck },
    { id: 'someday', label: 'Когда-нибудь потом', icon: Clock },
    { id: 'notes', label: 'Заметки', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn select-none p-4">
      <div 
        className="bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Редактирование задачи</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Изменение параметров и назначения дела
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Название */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Название <span className="text-zinc-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Заметки */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Описание или заметка
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none text-zinc-900 dark:text-zinc-100 resize-none"
            />
          </div>

          {/* Место назначения */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Место назначения
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {destinationOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = destination === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDestination(opt.id as TaskDestination)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-zinc-900 dark:border-zinc-300 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Календарь */}
          {destination === 'calendar' && (
            <div className="p-4 bg-zinc-50 dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Дата выполнения <span className="text-zinc-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Время
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Делегирование */}
          {destination === 'waiting_for' && (
            <div className="p-4 bg-zinc-50 dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Кому поручено дело? <span className="text-zinc-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={delegatedTo}
                  onChange={(e) => setDelegatedTo(e.target.value)}
                  placeholder="Имя, контакт или коллега..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Ожидаемый результат
                  </label>
                  <input
                    type="text"
                    value={waitingFor}
                    onChange={(e) => setWaitingFor(e.target.value)}
                    placeholder="Что ожидается..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Дата проверки
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Привязка к проекту */}
          {projects.length > 0 && destination !== 'notes' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                Относится к проекту
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200"
              >
                <option value="">Без проекта (самостоятельное действие)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📂 {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Кнопки */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-full text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
