import React, { useState, useEffect } from 'react';
import { X, Calendar, UserCheck, Clock, CheckSquare, Inbox, FileText } from 'lucide-react';
import { TaskDestination, Task, Project } from '@shared/types';
import { CustomDatePicker } from './CustomDatePicker';

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
  const todayStr = new Date().toISOString().split('T')[0];

  // Обновляем место назначения при открытии на основе контекста активной вкладки
  useEffect(() => {
    if (isOpen) {
      setDestination(defaultDestination);
      if (defaultDestination === 'calendar' && !scheduledDate) {
        setScheduledDate(todayStr);
      }
    }
  }, [isOpen, defaultDestination, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    // Валидация дат: нельзя создавать задачи раньше сегодняшней даты!
    if (destination === 'calendar' && scheduledDate && scheduledDate < todayStr) {
      alert('Дата выполнения в календаре не может быть раньше сегодняшнего дня.');
      return;
    }
    if (dueDate && dueDate < todayStr) {
      alert('Крайний срок (дедлайн) не может быть раньше сегодняшнего дня.');
      return;
    }
    if (destination === 'waiting_for' && checkDate && checkDate < todayStr) {
      alert('Дата проверки делегированного дела не может быть раньше сегодняшнего дня.');
      return;
    }

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
    { id: 'next_actions', label: 'Текущие действия', icon: CheckSquare },
    { id: 'inbox', label: 'Корзина ГТД', icon: Inbox },
    { id: 'calendar', label: 'Календарь', icon: Calendar },
    { id: 'waiting_for', label: 'Делегирование / Ожидание', icon: UserCheck },
    { id: 'someday', label: 'Когда-нибудь потом', icon: Clock },
    { id: 'notes', label: 'Заметки', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn select-none p-4">
      <div 
        className="bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Новая задача</h2>
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
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Название задачи */}
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
              placeholder="Что необходимо сделать?"
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Заметки / Описание в стиле "Примерный план действий" */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {destination === 'notes' ? 'Текст заметки' : 'Описание / Контекст'}
              </label>
              <span className="text-[11px] text-zinc-400">
                {destination === 'notes' ? 'Справочный материал' : 'План, детали или ссылки'}
              </span>
            </div>
            <textarea
              rows={destination === 'notes' ? 5 : 3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                destination === 'notes'
                  ? 'Введите текст заметки, важные мысли, ссылки, чек-листы...'
                  : '1. Детали или примерный план действий...\n2. Полезные ссылки или критерии...'
              }
              className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 resize-y min-h-[85px] leading-relaxed font-sans"
            />
          </div>

          {/* Место назначения - монохромные чипы */}
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

          {/* Поля календаря (с проверкой min={todayStr}) */}
          {destination === 'calendar' && (
            <div className="p-4 bg-zinc-50 dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Дата выполнения <span className="text-zinc-400">*</span>
                  </label>
                  <CustomDatePicker
                    value={scheduledDate}
                    onChange={setScheduledDate}
                    minDate={todayStr}
                    placeholder="Выберите дату"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Время (необязательно)
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

          {/* Поля делегирования */}
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
                  <CustomDatePicker
                    value={checkDate}
                    onChange={setCheckDate}
                    minDate={todayStr}
                    placeholder="Дата проверки"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Привязка к существующему проекту */}
          {projects.length > 0 && destination !== 'notes' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                Относится к проекту (необязательно)
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

          {/* Кнопки действий */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
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
              Сохранить задачу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
