import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Task, GTDQuestionId, Project } from '@shared/types';
import { GTDStateMachine } from '@domain/gtd/stateMachine';
import { GTDAnswer } from '@domain/gtd/types';

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
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<GTDQuestionId>('ACTIONABLE');
  const [historyStack, setHistoryStack] = useState<GTDQuestionId[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Состояния для форм
  const [delegatedTo, setDelegatedTo] = useState('');
  const [waitingFor, setWaitingFor] = useState('');
  const [checkDate, setCheckDate] = useState('');

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  // Инициализация задачи и сессии при открытии
  useEffect(() => {
    if (!isOpen) return;

    const initWizard = async () => {
      // Если передан конкретный initialTask (по выбору пользователя или первый шаг проекта)
      if (initialTask) {
        setCurrentTask(initialTask);
        setCurrentQuestion(initialQuestion || (initialTask.project_id ? 'FOR_ME' : 'ACTIONABLE'));
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

      // Пытаемся восстановить активную сессию из IPC если доступно
      if (window.gtdApi) {
        try {
          const activeSession = await window.gtdApi.getActiveSession();
          if (activeSession) {
            const task = await window.gtdApi.getTaskById(activeSession.current_task_id);
            if (task && task.status === 'active') {
              setCurrentTask(task);
              setCurrentQuestion(activeSession.current_question);
              setSessionId(activeSession.id);
              return;
            }
          }
        } catch (e) {
          console.warn('Could not restore session:', e);
        }
      }

      // Если нет сохраненной сессии, берем первую задачу из входящих
      if (inboxTasks.length > 0) {
        setCurrentTask(inboxTasks[0]);
        setCurrentQuestion('ACTIONABLE');
        setHistoryStack([]);
        if (window.gtdApi) {
          try {
            const sess = await window.gtdApi.startSession(inboxTasks[0].id);
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
  }, [isOpen, initialTask, initialQuestion, inboxTasks]);

  if (!isOpen) return null;

  const handleStepAnswer = async (answer: GTDAnswer, payload?: any) => {
    if (!currentTask) return;

    // Особый случай: создание проекта при ответе «Нет» на «Одношаговая?»
    if (currentQuestion === 'IS_SINGLE_STEP' && answer === 'NO') {
      if (onCreateProjectRequested) {
        onCreateProjectRequested(currentTask);
        return;
      }
    }

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
        setCheckDate('');
        setScheduledDate('');
        setScheduledTime('');

        // Если это была обработка выбранной задачи или 1-го шага проекта
        if (initialTask && currentTask.id === initialTask.id) {
          onClose();
          return;
        }

        // Переходим к следующей задаче из корзины
        const remaining = inboxTasks.filter((t) => t.id !== currentTask.id);
        if (remaining.length > 0) {
          const next = remaining[0];
          setCurrentTask(next);
          setCurrentQuestion('ACTIONABLE');
          setHistoryStack([]);
          if (window.gtdApi) {
            const newSess = await window.gtdApi.startSession(next.id);
            if (newSess) setSessionId(newSess.id);
          }
        } else {
          setCurrentTask(null);
        }
      } else if (result.nextQuestion !== 'COMPLETED') {
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

  const progress = GTDStateMachine.getStepNumber(currentQuestion);
  const questionTitle = GTDStateMachine.getQuestionTitle(currentQuestion);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full max-w-3xl h-[85vh] max-h-[720px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-colors">
        {/* Верхняя навигационная панель мастера Material 3 */}
        <header className="px-8 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-800/40">
          <div className="flex items-center space-x-3">
            {historyStack.length > 0 && (
              <button
                onClick={handleStepBack}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Вернуться к предыдущему вопросу"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
            )}
            <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {currentTask?.project_id ? 'Первый шаг проекта' : 'Обработка задачи'} • Шаг {progress.step} из {progress.total}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentTask && !currentTask.project_id && !initialTask && (
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                Осталось: {inboxTasks.length}
              </span>
            )}
            <button
              onClick={handlePause}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Приостановить</span>
            </button>
          </div>
        </header>

        {/* Прогресс-бар */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5">
          <div
            className="bg-indigo-600 dark:bg-purple-500 h-1.5 transition-all duration-300"
            style={{ width: `${(progress.step / progress.total) * 100}%` }}
          />
        </div>

        {/* Центральное рабочее тело */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-between">
          {!currentTask ? (
            // Экран успешного завершения разбора
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">Корзина полностью разобрана!</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
                Все задачи распределены по соответствующим разделам и готовы к выполнению.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Вернуться к делам
              </button>
            </div>
          ) : (
            <>
              {/* Карточка текущей задачи Material 3 */}
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 rounded-3xl mb-6 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-purple-400 mb-1.5 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {currentTask.project_id ? 'Первый шаг проекта (одношаговое действие)' : 'Текущая задача для обработки'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{currentTask.title}</h2>
                {currentTask.notes && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 bg-white/70 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                    {currentTask.notes}
                  </p>
                )}
              </div>

              {/* Интерактивная область активного вопроса */}
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto w-full my-auto py-4">
                <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-8 leading-tight">
                  {questionTitle}
                </h3>

                {/* 1. Бинарные вопросы: ACTIONABLE, FOR_ME, IS_NOW, IS_SINGLE_STEP */}
                {['ACTIONABLE', 'FOR_ME', 'IS_NOW', 'IS_SINGLE_STEP'].includes(currentQuestion) && (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button
                      onClick={() => handleStepAnswer('YES')}
                      className="py-5 px-6 rounded-3xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white font-bold text-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Да
                    </button>
                    <button
                      onClick={() => handleStepAnswer('NO')}
                      className="py-5 px-6 rounded-3xl border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-white font-bold text-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer"
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
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                        Дата проверки выполнения
                      </label>
                      <input
                        type="date"
                        min={todayStr}
                        value={checkDate}
                        onChange={(e) => setCheckDate(e.target.value)}
                        className="w-full px-4 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
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
                          checkDate: checkDate || undefined,
                        });
                      }}
                      disabled={!delegatedTo.trim()}
                      className="w-full py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Поместить в «Делегирование и ожидание»
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
                        <input
                          type="date"
                          required
                          min={todayStr}
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                          Время (необязательно)
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                      onClick={() => handleStepAnswer('DO_NOW')}
                      className="w-full py-4 px-6 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white font-bold text-base flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer"
                    >
                      <Zap className="w-5 h-5" />
                      <span>Да, выполнить сейчас</span>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('DEFER_TO_NEXT_ACTIONS')}
                      className="w-full py-4 px-6 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-base flex items-center justify-center space-x-2 transition-all cursor-pointer"
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
                      onClick={() => handleStepAnswer('COMPLETE_ACTION')}
                      className="w-full py-5 px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg flex items-center justify-center space-x-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Выполнено</span>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('DEFER_TO_NEXT_ACTIONS')}
                      className="w-full py-3 px-4 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Не удалось сделать сейчас — перенести в текущие действия
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
