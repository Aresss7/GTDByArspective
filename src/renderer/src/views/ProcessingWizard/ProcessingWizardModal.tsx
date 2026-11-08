import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Pause, 
  CheckCircle2, 
  Trash2, 
  FileText, 
  Calendar, 
  Clock, 
  UserCheck, 
  Zap, 
  Sparkles,
  SkipForward,
  X,
  FolderKanban,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Task, GTDQuestionId, Project } from '@shared/types';
import { GTDStateMachine } from '@domain/gtd/stateMachine';
import { GTDAnswer } from '@domain/gtd/types';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { CustomTimePicker } from '../../components/CustomTimePicker';

interface ProcessingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  inboxTasks: Task[];
  projects: Project[];
  initialTask?: Task | null;
  initialQuestion?: GTDQuestionId;
  onTaskUpdated: () => Promise<void>;
  onCreateProjectRequested?: (sourceTask: Task) => void;
}

export const ProcessingWizardModal: React.FC<ProcessingWizardModalProps> = ({
  isOpen,
  onClose,
  inboxTasks,
  projects,
  initialTask,
  initialQuestion,
  onTaskUpdated,
  onCreateProjectRequested,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<GTDQuestionId>('WHAT_IS_IT');
  const [historyStack, setHistoryStack] = useState<GTDQuestionId[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [skippedTaskIds, setSkippedTaskIds] = useState<string[]>([]);

  // Состояние поля заметок для шага «Что это?»
  const [taskNotes, setTaskNotes] = useState('');

  // Состояния для форм
  const [delegatedTo, setDelegatedTo] = useState('');
  const [waitingFor, setWaitingFor] = useState('');
  const [delegatedDate, setDelegatedDate] = useState(todayStr);
  const [checkDate, setCheckDate] = useState('');

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Состояния для формы создания проекта непосредственно внутри мастера
  const [projectTitleDraft, setProjectTitleDraft] = useState('');
  const [projectDescDraft, setProjectDescDraft] = useState('');
  const [projectFirstStepDraft, setProjectFirstStepDraft] = useState('');
  const [projectApproximatePlanDraft, setProjectApproximatePlanDraft] = useState('');
  const [projectCriteriaDraft, setProjectCriteriaDraft] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const isInitializedRef = useRef(false);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);

  // Инициализация задачи и сессии строго один раз при открытии модального окна
  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      setSkippedTaskIds([]);
      return;
    }

    if (isInitializedRef.current) {
      // Модальное окно уже открыто и шаг в процессе — не сбрасывать состояние при фоновом обновлении задач
      return;
    }
    isInitializedRef.current = true;

    const initWizard = async () => {
      // Если передан конкретный initialTask (по выбору пользователя или первый шаг проекта)
      if (initialTask) {
        setCurrentTask(initialTask);
        setTaskNotes(initialTask.notes || '');
        setCurrentQuestion(initialQuestion || (initialTask.project_id ? 'FOR_ME' : 'WHAT_IS_IT'));
        setHistoryStack([]);
        if (window.gtdApi) {
          try {
            const sess = await window.gtdApi.startSession(initialTask.id);
            if (sess) setSessionId(sess.id);
          } catch (e) {
            console.warn(e);
          }
        }
        return;
      }

      // При последовательном разборе корзины по порядку всегда начинаем с 1-го шага («Что это?»)
      const available = inboxTasks.filter((t) => !skippedTaskIds.includes(t.id));
      if (available.length > 0) {
        setCurrentTask(available[0]);
        setTaskNotes(available[0].notes || '');
        setCurrentQuestion('WHAT_IS_IT');
        setHistoryStack([]);
        if (window.gtdApi) {
          try {
            const sess = await window.gtdApi.startSession(available[0].id);
            if (sess) setSessionId(sess.id);
          } catch (e) {
            console.warn(e);
          }
        }
      } else {
        setCurrentTask(null);
      }
    };

    initWizard();
  }, [isOpen, initialTask?.id]);

  // Фокус на кнопку выбора при смене вопроса для удобной навигации Tab + Enter
  useEffect(() => {
    if (!isOpen || !currentTask) return;
    const timer = setTimeout(() => {
      primaryButtonRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen, currentQuestion, currentTask?.id]);

  // Предзаполнение данных проекта при переходе к созданию проекта из разбора
  useEffect(() => {
    if (currentQuestion === 'CREATE_PROJECT_FORM' && currentTask) {
      setProjectTitleDraft(currentTask.title);
      setProjectDescDraft(taskNotes || currentTask.notes || '');
      setProjectFirstStepDraft(''); // Первый шаг изначально пустой
      setProjectApproximatePlanDraft('');
      setProjectCriteriaDraft('');
    }
  }, [currentQuestion, currentTask?.id]);

  if (!isOpen) return null;

  const handleStepAnswer = async (answer: GTDAnswer, payload?: any) => {
    if (!currentTask) return;

    try {
      // Для первого шага проекта: если он на шаге IS_NOW отвечает YES,
      // мы пропускаем IS_SINGLE_STEP (так как он заведомо одношаговый)
      // и переходим сразу к IS_TWO_MINUTES!
      let result;
      if (currentTask.project_id && currentQuestion === 'IS_NOW' && answer === 'YES') {
        result = { nextQuestion: 'IS_TWO_MINUTES' as GTDQuestionId };
      } else {
        result = GTDStateMachine.transition(currentQuestion, answer, payload);
      }

      if (result.isCompletedItem && result.taskUpdates) {
        // Сохраняем изменения задачи в базе данных
        if (window.gtdApi) {
          await window.gtdApi.updateTask(currentTask.id, result.taskUpdates);
          if (sessionId) {
            await window.gtdApi.completeSession(sessionId);
          }
        } else {
          Object.assign(currentTask, result.taskUpdates);
        }

        await onTaskUpdated();

        // Сброс полей ввода
        setDelegatedTo('');
        setWaitingFor('');
        setDelegatedDate(todayStr);
        setCheckDate('');
        setScheduledDate('');
        setScheduledTime('');

        // Если это была обработка выбранной задачи или 1-го шага проекта
        if (initialTask && currentTask.id === initialTask.id) {
          onClose();
          return;
        }

        // Переходим к следующей задаче из корзины (исключая пропущенные в текущей сессии)
        const remaining = inboxTasks.filter((t) => t.id !== currentTask.id && !skippedTaskIds.includes(t.id));
        if (remaining.length > 0) {
          const next = remaining[0];
          setCurrentTask(next);
          setTaskNotes(next.notes || '');
          setCurrentQuestion('WHAT_IS_IT');
          setHistoryStack([]);
          if (window.gtdApi) {
            const newSess = await window.gtdApi.startSession(next.id);
            if (newSess) setSessionId(newSess.id);
          }
        } else {
          setCurrentTask(null);
        }
      } else if (result.nextQuestion !== 'COMPLETED') {
        // Если шаг вернул обновления задачи (например сохранение описания в «Что это?»)
        if (result.taskUpdates) {
          if (window.gtdApi) {
            await window.gtdApi.updateTask(currentTask.id, result.taskUpdates);
          }
          Object.assign(currentTask, result.taskUpdates);
          await onTaskUpdated();
        }

        // Переход к следующему вопросу внутри той же задачи
        setHistoryStack((prev) => [...prev, currentQuestion]);
        setCurrentQuestion(result.nextQuestion);

        if (window.gtdApi && sessionId) {
          await window.gtdApi.saveStepAnswer(sessionId, currentQuestion, answer, {
            nextQuestion: result.nextQuestion,
            payload,
          });
        }
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка при обработке шага');
    }
  };

  const handleSkipCurrentTask = async () => {
    if (!currentTask) return;
    const nextSkipped = [...skippedTaskIds, currentTask.id];
    setSkippedTaskIds(nextSkipped);

    // Сброс полей
    setDelegatedTo('');
    setWaitingFor('');
    setDelegatedDate(todayStr);
    setCheckDate('');
    setScheduledDate('');
    setScheduledTime('');

    const remaining = inboxTasks.filter((t) => t.id !== currentTask.id && !nextSkipped.includes(t.id));
    if (remaining.length > 0) {
      const next = remaining[0];
      setCurrentTask(next);
      setTaskNotes(next.notes || '');
      setCurrentQuestion('WHAT_IS_IT');
      setHistoryStack([]);
      if (window.gtdApi) {
        try {
          const newSess = await window.gtdApi.startSession(next.id);
          if (newSess) setSessionId(newSess.id);
        } catch (e) {
          console.warn(e);
        }
      }
    } else {
      setCurrentTask(null);
    }
  };

  const handleStepBack = async () => {
    if (historyStack.length === 0) return;
    const previousQuestion = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    setCurrentQuestion(previousQuestion);

    if (window.gtdApi && sessionId) {
      await window.gtdApi.stepBack(sessionId);
    }
  };

  const handlePause = async () => {
    if (window.gtdApi && sessionId) {
      await window.gtdApi.pauseSession(sessionId);
    }
    onClose();
  };

  const handleCreateProjectFromWizardStep = async () => {
    if (
      !currentTask ||
      !projectTitleDraft.trim() ||
      !projectFirstStepDraft.trim() ||
      !projectCriteriaDraft.trim() ||
      isCreatingProject
    ) {
      return;
    }

    setIsCreatingProject(true);
    try {
      if (window.gtdApi) {
        // Создаем проект в БД с привязкой текущей задачи в качестве 1-го шага
        const result = await window.gtdApi.createProject({
          title: projectTitleDraft.trim(),
          description: projectDescDraft.trim() || undefined,
          firstStepTitle: projectFirstStepDraft.trim(),
          approximatePlan: projectApproximatePlanDraft.trim() || undefined,
          completionCriteria: projectCriteriaDraft.trim(),
          existingTaskId: currentTask.id,
        });

        // После создания проекта первый шаг задачи направляется к вопросу «Делать мне?»
        const updatedTask: Task = {
          ...currentTask,
          title: projectFirstStepDraft.trim(),
          project_id: result.project.id,
          project_order: 1,
        };
        setCurrentTask(updatedTask);
        setHistoryStack((prev) => [...prev, 'CREATE_PROJECT_FORM']);
        setCurrentQuestion('FOR_ME');

        await onTaskUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка создания проекта');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const progress = GTDStateMachine.getStepNumber(currentQuestion, !!currentTask?.project_id);
  const questionTitle = GTDStateMachine.getQuestionTitle(currentQuestion);
  const currentProject = currentTask?.project_id ? projects.find((p) => p.id === currentTask.project_id) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-3xl h-[85vh] max-h-[720px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-colors">
        {/* Минималистичная верхняя навигационная панель мастера (скрыта, когда разбор завершён) */}
        {currentTask && (
          <>
            <header className="px-6 py-3 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/90 border-b border-zinc-200/50 dark:border-zinc-800/50">
              {/* Кнопка Назад */}
              <button
                onClick={handleStepBack}
                disabled={historyStack.length === 0}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  historyStack.length > 0
                    ? 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                    : 'invisible pointer-events-none'
                }`}
                title="Назад к предыдущему вопросу"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Центральная капсула с номером шага */}
              <div className="px-4 py-1.5 rounded-2xl bg-purple-100 dark:bg-[#2b173f] border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-[#c084fc] font-bold text-sm tracking-wide shadow-sm flex items-center justify-center">
                {progress.step}/{progress.total}
              </div>

              {/* Кнопка Закрыть / Приостановить */}
              <button
                onClick={handlePause}
                className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Приостановить и закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Тонкий фиолетовый индикатор прогресса под панелью */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-[2.5px] overflow-hidden">
              <div
                className="bg-purple-600 dark:bg-purple-500 h-[2.5px] transition-all duration-300"
                style={{ width: `${(progress.step / progress.total) * 100}%` }}
              />
            </div>
          </>
        )}

        {/* Центральное рабочее тело */}
        {!currentTask ? (
          // Экран успешного завершения разбора (верхняя панель скрыта)
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">Корзина полностью разобрана!</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
              Все задачи распределены по соответствующим разделам и готовы к выполнению.
            </p>
            <button
              ref={primaryButtonRef}
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer focus:ring-4 focus:ring-indigo-500/50 outline-none"
            >
              Вернуться к делам
            </button>
          </div>
        ) : currentQuestion === 'CREATE_PROJECT_FORM' ? (
          /* Экран создания проекта (в точности как на втором скриншоте: 1 слайдер, без двойных рамок) */
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 custom-scrollbar">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Новый проект</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Желаемый результат из нескольких действий</p>
            </div>

            {/* НАЗВАНИЕ ПРОЕКТА * */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Название проекта <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={projectTitleDraft}
                onChange={(e) => setProjectTitleDraft(e.target.value)}
                placeholder="Например: Запустить интернет-магазин"
                className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-sm focus:outline-none transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* ОПИСАНИЕ (НЕОБЯЗАТЕЛЬНО) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Описание (необязательно)
              </label>
              <textarea
                rows={2}
                value={projectDescDraft}
                onChange={(e) => setProjectDescDraft(e.target.value)}
                placeholder="Контекст или детали..."
                className="w-full px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-xs focus:outline-none resize-none placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* ПЕРВЫЙ СЛЕДУЮЩИЙ ШАГ * (в фиолетовой рамке) */}
            <div className="p-4 bg-indigo-50/60 dark:bg-purple-950/30 rounded-2xl border border-indigo-100 dark:border-purple-900/50 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-purple-200">
                Первый следующий шаг <span className="text-rose-500">*</span>
              </label>

              <div className="flex items-start space-x-2 text-xs text-indigo-900 dark:text-purple-200 bg-indigo-100/70 dark:bg-purple-900/40 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600 dark:text-purple-400 mt-0.5" />
                <span>
                  <strong>Правило ГТД:</strong> Первый шаг должен быть одним конкретным действием, которое можно выполнить без дополнительного разложения на несколько шагов.
                </span>
              </div>

              <input
                type="text"
                required
                value={projectFirstStepDraft}
                onChange={(e) => setProjectFirstStepDraft(e.target.value)}
                placeholder="Например: Запросить прайс-лист у поставщика"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-purple-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>

            {/* ПРИМЕРНЫЙ ПЛАН ДЕЙСТВИЙ */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Примерный план действий
              </label>
              <textarea
                rows={3}
                value={projectApproximatePlanDraft}
                onChange={(e) => setProjectApproximatePlanDraft(e.target.value)}
                placeholder="1. Найти варианты&#10;2. Сравнить условия..."
                className="w-full px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-xs focus:outline-none font-mono resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>

            {/* КРИТЕРИИ ЗАВЕРШЕНИЯ * */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Критерии завершения <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={projectCriteriaDraft}
                onChange={(e) => setProjectCriteriaDraft(e.target.value)}
                placeholder="Когда проект считается закрытым? (обязательно)"
                className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>

            {/* Кнопки действий */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleStepBack}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Отмена (Esc)
              </button>
              <button
                ref={primaryButtonRef}
                type="button"
                onClick={handleCreateProjectFromWizardStep}
                disabled={
                  !projectTitleDraft.trim() ||
                  !projectFirstStepDraft.trim() ||
                  !projectCriteriaDraft.trim() ||
                  isCreatingProject
                }
                className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 outline-none"
              >
                <span>{isCreatingProject ? 'Создание...' : 'Создать и обработать 1-й шаг'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-between">
            {/* Карточка текущей задачи Material 3 */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 rounded-3xl mb-6 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-purple-400 mb-1.5 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {currentTask.project_id ? (currentProject ? `Шаг проекта «${currentProject.title}»` : 'Шаг проекта') : 'Текущая задача для обработки'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{currentTask.title}</h2>
              {currentTask.notes && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 bg-white/70 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed custom-scrollbar">
                  {currentTask.notes}
                </div>
              )}
            </div>

            {/* Интерактивная область активного вопроса */}
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto w-full my-auto py-4">
              <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-8 leading-tight">
                {questionTitle}
              </h3>

                {/* 0. Вводный вопрос: «Что это?» */}
                {currentQuestion === 'WHAT_IS_IT' && (
                  <div className="w-full space-y-5 max-w-lg mx-auto text-left">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                      Разберись, что это, и добавь пояснение, если нужно.
                    </p>
                    <div>
                      <textarea
                        value={taskNotes}
                        onChange={(e) => setTaskNotes(e.target.value)}
                        placeholder="Пояснение, детали, ссылки или критерии..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 focus:outline-none resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        ref={primaryButtonRef}
                        onClick={() => {
                          const trimmed = taskNotes.trim();
                          const original = (currentTask.notes || '').trim();
                          const hasChanged = trimmed !== original;
                          handleStepAnswer('CONTINUE', {
                            notes: hasChanged ? (trimmed || undefined) : currentTask.notes,
                          });
                        }}
                        className="py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer text-center focus:ring-4 focus:ring-indigo-500/50 outline-none"
                      >
                        Продолжить
                      </button>
                      <button
                        onClick={() => handleStepAnswer('SKIP')}
                        className="py-3.5 px-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer text-center focus:ring-4 focus:ring-zinc-400 outline-none"
                      >
                        Пропустить
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. Бинарные вопросы: ACTIONABLE, FOR_ME, IS_NOW, IS_SINGLE_STEP */}
                {['ACTIONABLE', 'FOR_ME', 'IS_NOW', 'IS_SINGLE_STEP'].includes(currentQuestion) && (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button
                      ref={primaryButtonRef}
                      onClick={() => handleStepAnswer('YES')}
                      className="py-5 px-6 rounded-3xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white font-bold text-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 focus:ring-4 focus:ring-emerald-500/50 outline-none"
                    >
                      <span>Да</span>
                    </button>
                    <button
                      onClick={() => handleStepAnswer('NO')}
                      className="py-5 px-6 rounded-3xl border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-white font-bold text-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer focus:ring-4 focus:ring-zinc-400 dark:focus:ring-zinc-500 outline-none"
                    >
                      Нет
                    </button>
                  </div>
                )}

                {/* 2. Экран выбора: Мусор или Заметки */}
                {currentQuestion === 'CHOOSE_NOT_ACTIONABLE' && (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button
                      onClick={() => handleStepAnswer('CHOOSE_TRASH')}
                      className="p-6 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-rose-400 bg-white dark:bg-zinc-850 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-left transition-all group cursor-pointer"
                    >
                      <Trash2 className="w-8 h-8 text-rose-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-base mb-1">Мусор</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Задача неактуальна и не требует сохранения информации.
                      </p>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('CHOOSE_NOTES')}
                      className="p-6 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 bg-white dark:bg-zinc-850 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-left transition-all group cursor-pointer"
                    >
                      <FileText className="w-8 h-8 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-base mb-1">Заметки</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Действия не требуется, но справочная информация полезна на будущее.
                      </p>
                    </button>
                  </div>
                )}

                {/* 3. Форма делегирования */}
                {currentQuestion === 'DELEGATE_FORM' && (
                  <div className="w-full bg-zinc-50 dark:bg-zinc-800/60 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-700 space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                        Кому поручено дело? <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={delegatedTo}
                        onChange={(e) => setDelegatedTo(e.target.value)}
                        placeholder="Имя, должность или контакт..."
                        className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                        Ожидаемый результат
                      </label>
                      <input
                        type="text"
                        value={waitingFor}
                        onChange={(e) => setWaitingFor(e.target.value)}
                        placeholder="Что конкретно должен предоставить ответственный..."
                        className="w-full px-4 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                          Дата от
                        </label>
                        <CustomDatePicker
                          value={delegatedDate}
                          onChange={setDelegatedDate}
                          placeholder="Дата начала"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                          Дата проверки
                        </label>
                        <CustomDatePicker
                          value={checkDate}
                          onChange={setCheckDate}
                          minDate={todayStr}
                          placeholder="Выберите дату"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (checkDate && checkDate < todayStr) {
                          alert('Дата проверки не может быть раньше сегодняшнего дня.');
                          return;
                        }
                        handleStepAnswer('SUBMIT_DELEGATION', {
                          delegatedTo: delegatedTo.trim(),
                          waitingFor: waitingFor.trim(),
                          delegatedDate: delegatedDate || undefined,
                          checkDate: checkDate || undefined,
                        });
                      }}
                      disabled={!delegatedTo.trim()}
                      className="w-full py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Поместить в «Делегированные»
                    </button>
                  </div>
                )}

                {/* 4. Выбор: Календарь или Когда-нибудь потом */}
                {currentQuestion === 'CHOOSE_LATER' && (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button
                      onClick={() => handleStepAnswer('CHOOSE_CALENDAR')}
                      className="p-6 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-blue-500 bg-white dark:bg-zinc-850 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all group cursor-pointer"
                    >
                      <Calendar className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-base mb-1">Календарь</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Дело привязано к конкретному дню или времени позже этой недели.
                      </p>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('CHOOSE_SOMEDAY')}
                      className="p-6 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-purple-500 bg-white dark:bg-zinc-850 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-left transition-all group cursor-pointer"
                    >
                      <Clock className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-base mb-1">Когда-нибудь потом</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Идея или задача без жесткого срока. Вернуться при следующем обзоре.
                      </p>
                    </button>
                  </div>
                )}

                {/* 5. Форма календаря */}
                {currentQuestion === 'CALENDAR_FORM' && (
                  <div className="w-full bg-zinc-50 dark:bg-zinc-800/60 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-700 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                          Дата выполнения <span className="text-rose-500">*</span>
                        </label>
                        <CustomDatePicker
                          value={scheduledDate}
                          onChange={setScheduledDate}
                          minDate={todayStr}
                          placeholder="Выберите дату выполнения"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                          Время (необязательно)
                        </label>
                        <CustomTimePicker
                          value={scheduledTime}
                          onChange={setScheduledTime}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (scheduledDate && scheduledDate < todayStr) {
                          alert('Дата выполнения не может быть раньше сегодняшнего дня.');
                          return;
                        }
                        handleStepAnswer('SUBMIT_CALENDAR', {
                          scheduledDate,
                          scheduledTime: scheduledTime || undefined,
                        });
                      }}
                      disabled={!scheduledDate}
                      className="w-full py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Запланировать в Календарь
                    </button>
                  </div>
                )}

                {/* 6. Вопрос 5: «Можно сделать за 2 минуты?» */}
                {currentQuestion === 'IS_TWO_MINUTES' && (
                  <div className="space-y-3 w-full">
                    <button
                      ref={primaryButtonRef}
                      onClick={() => handleStepAnswer('DO_NOW')}
                      className="w-full py-4 px-6 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white font-bold text-base flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer focus:ring-4 focus:ring-emerald-500/50 outline-none"
                    >
                      <Zap className="w-5 h-5" />
                      <span>Да, выполнить сейчас</span>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('DEFER_TO_NEXT_ACTIONS')}
                      className="w-full py-4 px-6 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-base flex items-center justify-center space-x-2 transition-all cursor-pointer focus:ring-4 focus:ring-zinc-400 outline-none"
                    >
                      <span>Добавить в текущие действия</span>
                    </button>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      Выберите «Добавить в текущие действия», если дело занимает больше 2 минут, или занимает 2 минуты, но вы не можете сделать его прямо сейчас.
                    </p>
                  </div>
                )}

                {/* 7. Экран непосредственного выполнения двухминутного действия */}
                {currentQuestion === 'DO_TWO_MINUTES' && (
                  <div className="space-y-4 w-full">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm">
                      Сделайте действие прямо сейчас, не откладывая. Как только завершите, нажмите «Выполнено».
                    </div>

                    <button
                      ref={primaryButtonRef}
                      onClick={() => handleStepAnswer('COMPLETE_ACTION')}
                      className="w-full py-5 px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg flex items-center justify-center space-x-2 shadow-md transition-all active:scale-[0.98] cursor-pointer focus:ring-4 focus:ring-emerald-500/50 outline-none"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Выполнено</span>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('DEFER_TO_NEXT_ACTIONS')}
                      className="w-full py-3 px-4 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-xs transition-colors cursor-pointer focus:ring-4 focus:ring-zinc-400 outline-none"
                    >
                      Не удалось сделать сейчас — перенести в текущие действия
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
