import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Inbox, 
  CheckSquare, 
  Calendar, 
  UserCheck, 
  Clock, 
  FileText, 
  FolderKanban, 
  CornerDownLeft, 
  AlertCircle, 
  ArrowRight,
  ListPlus
} from 'lucide-react';
import { Task, Project, TaskDestination } from '@shared/types';
import { CustomDatePicker } from './CustomDatePicker';
import { DefaultCaptureTabSetting } from '../views/SettingsView';
import { Language } from '../i18n/translations';

interface UniversalAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  defaultCaptureSetting?: DefaultCaptureTabSetting;
  targetDestination?: TaskDestination | null;
  initialMode?: 'quick' | 'full';
  projects: Project[];
  onSaveTask: (taskData: Partial<Task> & { title: string }) => Promise<void>;
  onRapidSaveTask: (title: string, destination?: TaskDestination) => Promise<void>;
  onProjectCreated: (result: { project: Project; firstStep: Task }) => Promise<void>;
  sourceTask?: Task | null;
  language?: Language;
  isDarkMode?: boolean;
}

export const UniversalAddModal: React.FC<UniversalAddModalProps> = ({
  isOpen,
  onClose,
  currentTab,
  defaultCaptureSetting = 'inbox',
  targetDestination,
  initialMode,
  projects,
  onSaveTask,
  onRapidSaveTask,
  onProjectCreated,
  sourceTask,
  language = 'ru',
  isDarkMode = false,
}) => {
  const isEn = language === 'en';

  // Режим модального окна: 'quick' (быстрая фиксация в Корзину) или 'full' (полная форма раздела)
  const [modalMode, setModalMode] = useState<'quick' | 'full'>('quick');

  // Поле для быстрой фиксации
  const [rapidTitle, setRapidTitle] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastCount, setToastCount] = useState(0);

  // Поля подробной задачи
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [destination, setDestination] = useState<TaskDestination>('inbox');
  const [projectId, setProjectId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [delegatedTo, setDelegatedTo] = useState('');
  const [waitingFor, setWaitingFor] = useState('');
  const [checkDate, setCheckDate] = useState('');

  // Поля создания проекта
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectFirstStepTitle, setProjectFirstStepTitle] = useState('');
  const [projectPlan, setProjectPlan] = useState('');
  const [projectCriteria, setProjectCriteria] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const rapidInputRef = useRef<HTMLInputElement>(null);
  const fullInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const isProjectsTab = currentTab === 'projects' || Boolean(sourceTask);

  // Точное вычисление целевого назначения без ложных привязок к next_actions
  const getContextualDestination = (): TaskDestination => {
    if (targetDestination) return targetDestination;
    switch (currentTab) {
      case 'calendar': return 'calendar';
      case 'waiting_for': return 'waiting_for';
      case 'someday': return 'someday';
      case 'notes': return 'notes';
      case 'inbox': return 'inbox';
      case 'next_actions':
      default:
        return 'next_actions';
    }
  };

  // Название второй вкладки в зависимости от текущей страницы
  const getPageTabLabel = () => {
    switch (currentTab) {
      case 'projects':
        return isEn ? 'New Project' : 'Новый проект';
      case 'calendar':
        return isEn ? 'To «Calendar»' : 'В «Календарь»';
      case 'waiting_for':
        return isEn ? 'To «Waiting For»' : 'В «Ожидание»';
      case 'someday':
        return isEn ? 'To «Someday»' : 'В «Когда-нибудь»';
      case 'notes':
        return isEn ? 'To «Notes»' : 'В «Заметки»';
      case 'inbox':
        return isEn ? 'Detailed Task' : 'Подробная задача';
      case 'next_actions':
      default:
        return isEn ? 'To «Next Actions»' : 'В «Следующие действия»';
    }
  };

  const getPageTabIcon = () => {
    switch (currentTab) {
      case 'projects': return FolderKanban;
      case 'calendar': return Calendar;
      case 'waiting_for': return UserCheck;
      case 'someday': return Clock;
      case 'notes': return FileText;
      case 'inbox': return ListPlus;
      case 'next_actions':
      default:
        return CheckSquare;
    }
  };

  // Инициализация при открытии
  useEffect(() => {
    if (isOpen) {
      setRapidTitle('');
      setToastCount(0);
      setIsSubmitting(false);

      // Инициализация режима в зависимости от настроек
      if (initialMode) {
        setModalMode(initialMode);
      } else if (defaultCaptureSetting === 'current_menu') {
        setModalMode('full');
      } else {
        setModalMode('quick');
      }

      // Вычисление точного назначения
      const dest = getContextualDestination();
      setDestination(dest);

      setTaskTitle(sourceTask ? sourceTask.title : '');
      setTaskNotes(sourceTask?.notes || '');
      setProjectId('');
      setScheduledDate(dest === 'calendar' ? todayStr : '');
      setScheduledTime('');
      setDueDate('');
      setDelegatedTo('');
      setWaitingFor('');
      setCheckDate(dest === 'waiting_for' ? todayStr : '');

      // Сброс полей проекта
      setProjectTitle(sourceTask ? sourceTask.title : '');
      setProjectDescription(sourceTask?.notes || '');
      setProjectFirstStepTitle('');
      setProjectPlan('');
      setProjectCriteria('');

      setTimeout(() => {
        if (modalMode === 'quick') {
          rapidInputRef.current?.focus();
        } else {
          fullInputRef.current?.focus();
        }
      }, 50);
    }
  }, [isOpen, currentTab, defaultCaptureSetting, initialMode, targetDestination]);

  // Фокусировка при переключении вкладки
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (modalMode === 'quick') {
          rapidInputRef.current?.focus();
        } else {
          fullInputRef.current?.focus();
        }
      }, 50);
    }
  }, [modalMode]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Быстрое сохранение в Корзину
  const handleRapidSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = rapidTitle.trim();
    if (!trimmed || isSubmitting) return;

    try {
      await onRapidSaveTask(trimmed, 'inbox');
      const nextCount = toastCount + 1;
      setToastCount(nextCount);
      const text = isEn 
        ? `✓ Saved to Inbox: "${trimmed.length > 25 ? trimmed.slice(0, 25) + '...' : trimmed}"`
        : `✓ Сохранено в Корзину: "${trimmed.length > 25 ? trimmed.slice(0, 25) + '...' : trimmed}"`;
      showToast(text);
      setRapidTitle('');
      rapidInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      showToast(isEn ? 'Error saving task' : 'Ошибка при сохранении задачи');
    }
  };

  // Сохранение подробной задачи
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || isSubmitting) return;

    // Валидация дат
    if (destination === 'calendar' && scheduledDate && scheduledDate < todayStr) {
      alert(isEn ? 'Calendar date cannot be earlier than today.' : 'Дата выполнения в календаре не может быть раньше сегодняшнего дня.');
      return;
    }
    if (dueDate && dueDate < todayStr) {
      alert(isEn ? 'Due date cannot be earlier than today.' : 'Крайний срок (дедлайн) не может быть раньше сегодняшнего дня.');
      return;
    }
    if (destination === 'waiting_for' && checkDate && checkDate < todayStr) {
      alert(isEn ? 'Check date cannot be earlier than today.' : 'Дата проверки делегированного дела не может быть раньше сегодняшнего дня.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveTask({
        title: taskTitle.trim(),
        notes: taskNotes.trim() || undefined,
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
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Сохранение проекта
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectFirstStepTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (window.gtdApi) {
        const result = await window.gtdApi.createProject({
          title: projectTitle.trim(),
          description: projectDescription.trim() || undefined,
          firstStepTitle: projectFirstStepTitle.trim(),
          approximatePlan: projectPlan.trim() || undefined,
          completionCriteria: projectCriteria.trim() || undefined,
          sourceTaskId: sourceTask?.id,
        });

        await onProjectCreated(result);
        onClose();
      }
    } catch (err: any) {
      alert(err.message || (isEn ? 'Error creating project' : 'Ошибка создания проекта'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const destinationOptions = [
    { id: 'next_actions', label: isEn ? 'Next Actions' : 'Текущие действия', icon: CheckSquare },
    { id: 'inbox', label: isEn ? 'GTD Inbox' : 'Корзина ГТД', icon: Inbox },
    { id: 'calendar', label: isEn ? 'Calendar' : 'Календарь', icon: Calendar },
    { id: 'waiting_for', label: isEn ? 'Waiting For' : 'Делегирование / Ожидание', icon: UserCheck },
    { id: 'someday', label: isEn ? 'Someday / Maybe' : 'Когда-нибудь потом', icon: Clock },
    { id: 'notes', label: isEn ? 'Notes' : 'Заметки', icon: FileText },
  ];

  const PageIcon = getPageTabIcon();

  return (
    <>
      {/* Всплывающее ненавязчивое уведомление при быстром сохранении */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[70] px-5 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold shadow-2xl flex items-center space-x-2 border border-zinc-700/50 dark:border-zinc-300">
          <span>{toastMessage}</span>
          {toastCount > 1 && (
            <span className="bg-zinc-700 dark:bg-zinc-200 text-white dark:text-zinc-900 px-2 py-0.5 rounded-full text-[10px]">
              {isEn ? `total: ${toastCount}` : `всего: ${toastCount}`}
            </span>
          )}
        </div>
      )}

      {/* Оверлей и модальное окно: строгий монохром #191919 / #222222, без фиолетовых оттенков */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 select-none p-4"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-[#222222] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Верхняя строка: ровный переключатель вкладок + кнопка закрытия */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 gap-3">
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-[#191919] rounded-2xl border border-zinc-200 dark:border-zinc-700 gap-1">
              {/* Таб 1: Добавить в корзину */}
              <button
                type="button"
                onClick={() => setModalMode('quick')}
                className={`flex items-center space-x-1.5 py-1.5 px-3.5 rounded-xl text-xs transition-colors cursor-pointer ${
                  modalMode === 'quick'
                    ? 'bg-white dark:bg-[#282828] text-zinc-900 dark:text-zinc-100 font-bold shadow-xs border border-zinc-200/90 dark:border-zinc-700'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 shrink-0" />
                <span>{isEn ? 'Add to Inbox' : 'Добавить в корзину'}</span>
              </button>

              {/* Таб 2: В текущий раздел / Новый проект */}
              <button
                type="button"
                onClick={() => setModalMode('full')}
                className={`flex items-center space-x-1.5 py-1.5 px-3.5 rounded-xl text-xs transition-colors cursor-pointer ${
                  modalMode === 'full'
                    ? 'bg-white dark:bg-[#282828] text-zinc-900 dark:text-zinc-100 font-bold shadow-xs border border-zinc-200/90 dark:border-zinc-700'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
                }`}
              >
                <PageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{getPageTabLabel()}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title={isEn ? 'Close (Esc)' : 'Закрыть (Esc)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* КОНТЕНТ: Режим 1 — Быстрая фиксация в Корзину */}
          {modalMode === 'quick' && (
            <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
              <form onSubmit={handleRapidSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                    {isEn ? 'Quick capture thought to Inbox:' : 'Быстрая фиксация мысли в Корзину:'}
                  </label>
                  <input
                    ref={rapidInputRef}
                    type="text"
                    value={rapidTitle}
                    onChange={(e) => setRapidTitle(e.target.value)}
                    placeholder={isEn ? 'What needs to be done? Write here...' : 'Что нужно сделать? Напишите сюда...'}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-[#191919] border border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-400 text-sm focus:outline-none transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center space-x-1">
                    <span>{isEn ? 'Enter — save & next' : 'Enter — сохранить и следующая'}</span>
                    <CornerDownLeft className="w-3 h-3 inline" />
                  </span>

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
                      disabled={!rapidTitle.trim()}
                      className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                      {isEn ? 'Save to Inbox' : 'Сохранить в корзину'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* КОНТЕНТ: Режим 2 — Полная форма: Новый проект (строгий монохром) */}
          {modalMode === 'full' && isProjectsTab && (
            <form onSubmit={handleProjectSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <h3 className="text-base font-bold tracking-tight">
                  {isEn ? 'New Project' : 'Новый проект'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isEn ? 'Outcome requiring multiple action steps' : 'Желаемый результат из нескольких действий'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {isEn ? 'Project Title' : 'Название проекта'} <span className="text-zinc-400">*</span>
                </label>
                <input
                  ref={fullInputRef}
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder={isEn ? 'e.g. Launch online store' : 'Например: Запустить интернет-магазин'}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:border-zinc-500 transition-colors text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {isEn ? 'Description (optional)' : 'Описание (необязательно)'}
                </label>
                <textarea
                  rows={2}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder={isEn ? 'Context or details...' : 'Контекст или детали...'}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-zinc-500 transition-colors resize-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Плашка первого шага проекта: строгий монохром без фиолетового */}
              <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-[#282828] border border-zinc-200 dark:border-zinc-700 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  {isEn ? 'First Next Action' : 'Первый следующий шаг'} <span className="text-zinc-400">*</span>
                </label>
                <div className="flex items-start space-x-2 text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#1f1f1f] p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500" />
                  <p className="leading-relaxed">
                    <strong className="font-semibold">{isEn ? 'GTD Rule:' : 'Правило ГТД:'}</strong> {isEn ? 'The first step must be a single physical action you can complete right away without further decomposition.' : 'Первый шаг должен быть одним конкретным действием, которое можно выполнить без дополнительного разложения на несколько шагов.'}
                  </p>
                </div>
                <input
                  type="text"
                  required
                  value={projectFirstStepTitle}
                  onChange={(e) => setProjectFirstStepTitle(e.target.value)}
                  placeholder={isEn ? 'e.g. Request price list from supplier' : 'Например: Запросить прайс-лист у поставщика'}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-600 text-sm focus:outline-none focus:border-zinc-500 transition-colors text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {isEn ? 'Approximate Action Plan' : 'Примерный план действий'}
                </label>
                <textarea
                  rows={3}
                  value={projectPlan}
                  onChange={(e) => setProjectPlan(e.target.value)}
                  placeholder={isEn ? "1. Find options\n2. Compare conditions..." : "1. Найти варианты\n2. Сравнить условия..."}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-zinc-500 transition-colors font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {isEn ? 'Completion Criteria' : 'Критерии завершения'}
                </label>
                <input
                  type="text"
                  value={projectCriteria}
                  onChange={(e) => setProjectCriteria(e.target.value)}
                  placeholder={isEn ? 'When is this project considered done?' : 'Когда проект считается закрытым?'}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-zinc-500 transition-colors text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !projectTitle.trim() || !projectFirstStepTitle.trim()}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <span>{isEn ? 'Create & Process 1st Step' : 'Создать и обработать 1-й шаг'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* КОНТЕНТ: Режим 2 — Полная форма: Задача для любого раздела (строгий монохром) */}
          {modalMode === 'full' && !isProjectsTab && (
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <h3 className="text-base font-bold tracking-tight">
                  {isEn ? 'New Task' : 'Новая задача'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {destination === 'next_actions' ? (isEn ? 'Adding to «Next Actions»' : 'Добавление в «Текущие действия»') : 
                   destination === 'calendar' ? (isEn ? 'Schedule event in Calendar' : 'Запланировать событие в Календарь') :
                   destination === 'waiting_for' ? (isEn ? 'Delegated item' : 'Делегированное поручение') :
                   destination === 'someday' ? (isEn ? 'Idea for «Someday / Maybe»' : 'Идея в «Когда-нибудь потом»') :
                   destination === 'notes' ? (isEn ? 'New note' : 'Новая заметка') : (isEn ? 'Quick entry to Inbox' : 'Быстрая запись во входящие')}
                </p>
              </div>

              {/* Название задачи */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  {isEn ? 'Title' : 'Название'} <span className="text-zinc-400">*</span>
                </label>
                <input
                  ref={fullInputRef}
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder={isEn ? 'What needs to be done?' : 'Что необходимо сделать?'}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none transition-colors placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Описание / Контекст */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {destination === 'notes' ? (isEn ? 'Note Text' : 'Текст заметки') : (isEn ? 'Description / Context' : 'Описание / Контекст')}
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    {destination === 'notes' ? (isEn ? 'Reference material' : 'Справочный материал') : (isEn ? 'Plan, details, or links' : 'План, детали или ссылки')}
                  </span>
                </div>
                <textarea
                  rows={destination === 'notes' ? 4 : 2}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder={
                    destination === 'notes'
                      ? (isEn ? 'Enter note content, key ideas, links, checklists...' : 'Введите текст заметки, важные мысли, ссылки, чек-листы...')
                      : (isEn ? '1. Details or rough action plan...\n2. Useful links or criteria...' : '1. Детали или примерный план действий...\n2. Полезные ссылки или критерии...')
                  }
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none transition-colors placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 resize-y min-h-[70px] leading-relaxed"
                />
              </div>

              {/* Место назначения - монохромные чипы */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  {isEn ? 'Destination' : 'Место назначения'}
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
                        className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'border-zinc-900 dark:border-zinc-300 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-xs'
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

              {/* Поля календаря */}
              {destination === 'calendar' && (
                <div className="p-4 bg-zinc-50 dark:bg-[#191919] rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        {isEn ? 'Scheduled Date' : 'Дата выполнения'} <span className="text-zinc-400">*</span>
                      </label>
                      <CustomDatePicker
                        value={scheduledDate}
                        onChange={setScheduledDate}
                        minDate={todayStr}
                        placeholder={isEn ? 'Select date' : 'Выберите дату'}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        {isEn ? 'Time (optional)' : 'Время (необязательно)'}
                      </label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#222222] border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Поля делегирования */}
              {destination === 'waiting_for' && (
                <div className="p-4 bg-zinc-50 dark:bg-[#191919] rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {isEn ? 'Delegated to?' : 'Кому поручено дело?'} <span className="text-zinc-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={delegatedTo}
                      onChange={(e) => setDelegatedTo(e.target.value)}
                      placeholder={isEn ? 'Name, contact or colleague...' : 'Имя, контакт или коллега...'}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#222222] border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        {isEn ? 'Expected result' : 'Ожидаемый результат'}
                      </label>
                      <input
                        type="text"
                        value={waitingFor}
                        onChange={(e) => setWaitingFor(e.target.value)}
                        placeholder={isEn ? 'What is expected...' : 'Что ожидается...'}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#222222] border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        {isEn ? 'Check date' : 'Дата проверки'}
                      </label>
                      <CustomDatePicker
                        value={checkDate}
                        onChange={setCheckDate}
                        minDate={todayStr}
                        placeholder={isEn ? 'Check date' : 'Дата проверки'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Привязка к существующему проекту: строгий монохром, без системных аномалий */}
              {projects.length > 0 && destination !== 'notes' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    {isEn ? 'Project (optional)' : 'Относится к проекту (необязательно)'}
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                  >
                    <option value="" className="bg-white dark:bg-[#222222] text-zinc-900 dark:text-zinc-100">
                      {isEn ? 'Without project (standalone action)' : 'Без проекта (самостоятельное действие)'}
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-[#222222] text-zinc-900 dark:text-zinc-100">
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
                  {isEn ? 'Cancel' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !taskTitle.trim()}
                  className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isEn ? 'Save Task' : 'Сохранить задачу'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};
