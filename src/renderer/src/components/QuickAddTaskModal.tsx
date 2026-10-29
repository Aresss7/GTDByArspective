import React, { useState } from 'react';
import { X, Calendar, UserCheck, Clock, CheckSquare, Inbox } from 'lucide-react';
import { TaskDestination, Task, Project } from '@shared/types';

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task> & { title: string }) => Promise<void>;
  projects: Project[];
}

export const QuickAddTaskModal: React.FC<QuickAddTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [destination, setDestination] = useState<TaskDestination>('inbox');
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
      setDestination('inbox');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-semibold text-slate-800">Добавить новую задачу</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Название задачи */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Название задачи <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Заметки */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Заметки или описание
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительные детали (необязательно)..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Место назначения */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Куда поместить задачу?
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDestination('inbox')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-left ${
                  destination === 'inbox'
                    ? 'border-sky-500 bg-sky-50 text-sky-800 font-medium ring-1 ring-sky-500'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Inbox className="w-4 h-4 text-sky-600" />
                <span>Корзина ГТД (по умолч.)</span>
              </button>

              <button
                type="button"
                onClick={() => setDestination('next_actions')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-left ${
                  destination === 'next_actions'
                    ? 'border-sky-500 bg-sky-50 text-sky-800 font-medium ring-1 ring-sky-500'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Текущие действия</span>
              </button>

              <button
                type="button"
                onClick={() => setDestination('calendar')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-left ${
                  destination === 'calendar'
                    ? 'border-sky-500 bg-sky-50 text-sky-800 font-medium ring-1 ring-sky-500'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Календарь</span>
              </button>

              <button
                type="button"
                onClick={() => setDestination('waiting_for')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-left ${
                  destination === 'waiting_for'
                    ? 'border-sky-500 bg-sky-50 text-sky-800 font-medium ring-1 ring-sky-500'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>Делегирование / Ожидание</span>
              </button>

              <button
                type="button"
                onClick={() => setDestination('someday')}
                className={`col-span-2 flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-left ${
                  destination === 'someday'
                    ? 'border-sky-500 bg-sky-50 text-sky-800 font-medium ring-1 ring-sky-500'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Когда-нибудь потом</span>
              </button>
            </div>
          </div>

          {/* Дополнительные поля в зависимости от назначения */}
          {destination === 'calendar' && (
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Дата выполнения <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Время (необязательно)
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {destination === 'waiting_for' && (
            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Кому поручено дело?</label>
                <input
                  type="text"
                  value={delegatedTo}
                  onChange={(e) => setDelegatedTo(e.target.value)}
                  placeholder="Имя или контакт..."
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Ожидаемый результат</label>
                <input
                  type="text"
                  value={waitingFor}
                  onChange={(e) => setWaitingFor(e.target.value)}
                  placeholder="Что конкретно ожидается..."
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Дата проверки выполнения</label>
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {/* Привязка к существующему проекту */}
          {projects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Привязать к проекту (необязательно)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Без проекта (самостоятельная задача)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              {isSubmitting ? 'Сохранение...' : 'Добавить задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
