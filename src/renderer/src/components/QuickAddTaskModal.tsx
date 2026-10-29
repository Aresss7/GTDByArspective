import React, { useState, useEffect } from 'react';
import { X, Calendar, UserCheck, Clock, CheckSquare, Inbox, FileText } from 'lucide-react';
import { TaskDestination, Task, Project } from '@shared/types';

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task> & { title: string }) => Promise<void>;
  projects: Project[];
  defaultDestination?: TaskDestination;
}

export const QuickAddTaskModal: React.FC<QuickAddTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  defaultDestination = 'inbox',
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [destination, setDestination] = useState<TaskDestination>(defaultDestination);
  const [projectId, setProjectId] = useState<string>('');
  
  // Календарь
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Дедлайн
  const [dueDate, setDueDate] = useState('');

  // Делегирование
  const [delegatedTo, setDelegatedTo] = useState('');
  const [waitingFor, setWaitingFor] = useState('');
  const [checkDate, setCheckDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Обновляем место назначения при открытии на основе контекста активной вкладки
  useEffect(() => {
    if (isOpen) {
      setDestination(defaultDestination);
      if (defaultDestination === 'calendar' && !scheduledDate) {
        setScheduledDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, defaultDestination]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        notes: notes.trim() || undefined,
        destination,
        status: 'active',
        project_id: projectId || undefined,
        scheduled_date: destination === 'calendar' ? scheduledDate || undefined : undefined,
        scheduled_time: destination === 'calendar' ? scheduledTime || undefined : undefined,
        due_date: dueDate || undefined,
        delegated_to: destination === 'waiting_for' ? delegatedTo || undefined : undefined,
        waiting_for: destination === 'waiting_for' ? waitingFor || undefined : undefined,
        check_date: destination === 'waiting_for' ? checkDate || undefined : undefined,
      });

      // Сброс формы
      setTitle('');
      setNotes('');
      setProjectId('');
      setScheduledDate('');
      setScheduledTime('');
      setDueDate('');
      setDelegatedTo('');
      setWaitingFor('');
      setCheckDate('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const destinationOptions = [
    { id: 'next_actions', label: 'Текущие действия', icon: CheckSquare, color: 'text-emerald-500' },
    { id: 'inbox', label: 'Корзина ГТД', icon: Inbox, color: 'text-indigo-500' },
    { id: 'calendar', label: 'Календарь', icon: Calendar, color: 'text-blue-500' },
    { id: 'waiting_for', label: 'Делегирование / Ожидание', icon: UserCheck, color: 'text-amber-500' },
    { id: 'someday', label: 'Когда-нибудь потом', icon: Clock, color: 'text-purple-500' },
    { id: 'notes', label: 'Заметки', icon: FileText, color: 'text-teal-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200/80 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок Material 3 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Новая задача</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {destination === 'next_actions' ? 'Добавление в «Текущие действия»' : 
               destination === 'calendar' ? 'Запланировать событие в Календарь' :
               destination === 'waiting_for' ? 'Делегированное поручение' :
               destination === 'someday' ? 'Идея в «Когда-нибудь потом»' :
               destination === 'notes' ? 'Новая заметка' : 'Быстрая запись во входящие'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Название задачи */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Название <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что необходимо сделать?"
              className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-sm focus:outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
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
              placeholder="Детали, контекст, ссылки (необязательно)..."
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-xs focus:outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none"
            />
          </div>

          {/* Место назначения - Material 3 Expressive Chips */}
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
                    className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 dark:border-purple-400 bg-indigo-50 dark:bg-purple-950/40 text-indigo-900 dark:text-purple-200 font-semibold shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-purple-400' : opt.color}`} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Поля календаря */}
          {destination === 'calendar' && (
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Дата выполнения <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Время (необязательно)
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Поля делегирования */}
          {destination === 'waiting_for' && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Кому поручено дело? <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={delegatedTo}
                  onChange={(e) => setDelegatedTo(e.target.value)}
                  placeholder="Имя, должность или контакт..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Ожидаемый результат</label>
                <input
                  type="text"
                  value={waitingFor}
                  onChange={(e) => setWaitingFor(e.target.value)}
                  placeholder="Что конкретно ожидается..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Дата проверки</label>
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Привязка к проекту */}
          {projects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Привязать к проекту (необязательно)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent text-xs text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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

          {/* Кнопки действий */}
          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isSubmitting ? 'Сохранение...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
