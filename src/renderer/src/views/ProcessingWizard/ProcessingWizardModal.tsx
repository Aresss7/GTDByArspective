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
  Layers,
  HelpCircle
} from 'lucide-react';
import { Task, GTDQuestionId, Project } from '@shared/types';
import { GTDStateMachine } from '@domain/gtd/stateMachine';
import { GTDAnswer } from '@domain/gtd/types';

interface ProcessingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  inboxTasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
  onCreateProjectRequested?: (sourceTask: Task) => void;
}

export const ProcessingWizardModal: React.FC<ProcessingWizardModalProps> = ({
  isOpen,
  onClose,
  inboxTasks,
  projects,
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

  // Инициализация задачи и сессии при открытии
  useEffect(() => {
    if (!isOpen) return;

    const initWizard = async () => {
      // Пытаемся восстановить сессию из IPC если доступно
      if (window.gtdApi) {
        try {
          const activeSession = await window.gtdApi.getActiveSession();
          if (activeSession) {
            const task = await window.gtdApi.getTaskById(activeSession.current_task_id);
            if (task && task.destination === 'inbox' && task.status === 'active') {
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
  }, [isOpen, inboxTasks]);

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
      const result = GTDStateMachine.transition(currentQuestion, answer, payload);

      if (result.isCompletedItem && result.taskUpdates) {
        // Сохраняем изменения задачи в базе данных
        if (window.gtdApi) {
          await window.gtdApi.updateTask(currentTask.id, result.taskUpdates);
          if (sessionId) {
            await window.gtdApi.completeSession(sessionId);
          }
        } else {
          // Локальный режим для dev-тестов
          Object.assign(currentTask, result.taskUpdates);
        }

        await onTaskUpdated();

        // Сброс полей ввода
        setDelegatedTo('');
        setWaitingFor('');
        setCheckDate('');
        setScheduledDate('');
        setScheduledTime('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-white w-full max-w-3xl h-[85vh] max-h-[720px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Верхняя навигационная панель мастера */}
        <header className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            {historyStack.length > 0 && (
              <button
                onClick={handleStepBack}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
                title="Вернуться к предыдущему вопросу"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
            )}
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Обработка корзины • Шаг {progress.step} из {progress.total}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {currentTask && (
              <span className="text-xs font-medium text-slate-400">
                Осталось задач: {inboxTasks.length}
              </span>
            )}
            <button
              onClick={handlePause}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Приостановить</span>
            </button>
          </div>
        </header>

        {/* Прогресс-бар в шапке */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-sky-600 h-1 transition-all duration-300"
            style={{ width: `${(progress.step / progress.total) * 100}%` }}
          />
        </div>

        {/* Центральное рабочее тело */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-between">
          {!currentTask ? (
            // Экран успешного завершения разбора
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Корзина полностью разобрана!</h3>
              <p className="text-sm text-slate-500 max-w-md mb-6">
                Отличная работа! Все задачи распределены по соответствующим разделам и готовы к выполнению.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-sm transition-all"
              >
                Вернуться к делам
              </button>
            </div>
          ) : (
            <>
              {/* Карточка текущей задачи */}
              <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-xl mb-6 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-600 mb-1 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Текущая задача для обработки</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800 leading-snug">{currentTask.title}</h2>
                {currentTask.notes && (
                  <p className="text-xs text-slate-600 mt-2 bg-white/70 p-3 rounded-lg border border-slate-200/50">
                    {currentTask.notes}
                  </p>
                )}
              </div>

              {/* Интерактивная область активного вопроса */}
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto w-full my-auto py-4">
                <h3 className="text-2xl font-bold text-slate-800 mb-8 leading-tight">
                  {questionTitle}
                </h3>

                {/* 1. Бинарные вопросы: ACTIONABLE, FOR_ME, IS_NOW, IS_SINGLE_STEP */}
                {['ACTIONABLE', 'FOR_ME', 'IS_NOW', 'IS_SINGLE_STEP'].includes(currentQuestion) && (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button
                      onClick={() => handleStepAnswer('YES')}
                      className="py-5 px-6 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 hover:bg-emerald-500 text-emerald-800 hover:text-white font-bold text-lg shadow-sm transition-all active:scale-[0.98]"
                    >
                      Да
                    </button>
                    <button
                      onClick={() => handleStepAnswer('NO')}
                      className="py-5 px-6 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-700 text-slate-700 hover:text-white font-bold text-lg shadow-sm transition-all active:scale-[0.98]"
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
                      className="p-6 rounded-xl border-2 border-slate-200 hover:border-rose-400 bg-white hover:bg-rose-50/50 text-left transition-all group"
                    >
                      <Trash2 className="w-8 h-8 text-rose-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-slate-800 text-base mb-1">Мусор</h4>
                      <p className="text-xs text-slate-500">
                        Задача неактуальна и не требует сохранения информации.
                      </p>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('CHOOSE_NOTES')}
                      className="p-6 rounded-xl border-2 border-slate-200 hover:border-sky-400 bg-white hover:bg-sky-50/50 text-left transition-all group"
                    >
                      <FileText className="w-8 h-8 text-sky-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-slate-800 text-base mb-1">Заметки</h4>
                      <p className="text-xs text-slate-500">
                        Действия не требуется, но справочная информация полезна на будущее.
                      </p>
                    </button>
                  </div>
                )}

                {/* 3. Форма делегирования */}
                {currentQuestion === 'DELEGATE_FORM' && (
                  <div className="w-full bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Кому поручено дело? <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={delegatedTo}
                        onChange={(e) => setDelegatedTo(e.target.value)}
                        placeholder="Имя, должность или контакт..."
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Ожидаемый результат
                      </label>
                      <input
                        type="text"
                        value={waitingFor}
                        onChange={(e) => setWaitingFor(e.target.value)}
                        placeholder="Что конкретно должен предоставить ответственный..."
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Дата проверки выполнения (необязательно)
                      </label>
                      <input
                        type="date"
                        value={checkDate}
                        onChange={(e) => setCheckDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() =>
                        handleStepAnswer('SUBMIT_DELEGATION', {
                          delegatedTo: delegatedTo.trim(),
                          waitingFor: waitingFor.trim(),
                          checkDate: checkDate || undefined,
                        })
                      }
                      disabled={!delegatedTo.trim()}
                      className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white font-semibold text-sm transition-all"
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
                      className="p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/50 text-left transition-all group"
                    >
                      <Calendar className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-slate-800 text-base mb-1">Календарь</h4>
                      <p className="text-xs text-slate-500">
                        Дело привязано к конкретному дню или времени позже этой недели.
                      </p>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('CHOOSE_SOMEDAY')}
                      className="p-6 rounded-xl border-2 border-slate-200 hover:border-purple-500 bg-white hover:bg-purple-50/50 text-left transition-all group"
                    >
                      <Clock className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-slate-800 text-base mb-1">Когда-нибудь потом</h4>
                      <p className="text-xs text-slate-500">
                        Идея или задача без жесткого срока. Вернуться при следующем обзоре.
                      </p>
                    </button>
                  </div>
                )}

                {/* 5. Форма календаря */}
                {currentQuestion === 'CALENDAR_FORM' && (
                  <div className="w-full bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                          Дата выполнения <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                          Время (необязательно)
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleStepAnswer('SUBMIT_CALENDAR', {
                          scheduledDate,
                          scheduledTime: scheduledTime || undefined,
                        })
                      }
                      disabled={!scheduledDate}
                      className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white font-semibold text-sm transition-all"
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
                      className="w-full py-4 px-6 rounded-xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-500 text-emerald-800 hover:text-white font-bold text-base flex items-center justify-center space-x-2 transition-all shadow-sm"
                    >
                      <Zap className="w-5 h-5" />
                      <span>Да, выполнить сейчас</span>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('DEFER_TO_NEXT_ACTIONS')}
                      className="w-full py-4 px-6 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-base flex items-center justify-center space-x-2 transition-all"
                    >
                      <span>Добавить в текущие действия</span>
                    </button>
                    <p className="text-xs text-slate-500 mt-2">
                      Выберите «Добавить в текущие действия», если дело занимает больше 2 минут, или занимает 2 минуты, но вы не можете сделать его прямо сейчас.
                    </p>
                  </div>
                )}

                {/* 7. Экран непосредственного выполнения двухминутного действия */}
                {currentQuestion === 'DO_TWO_MINUTES' && (
                  <div className="space-y-4 w-full">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
                      Сделайте действие прямо сейчас, не откладывая. Как только завершите, нажмите «Выполнено».
                    </div>

                    <button
                      onClick={() => handleStepAnswer('COMPLETE_ACTION')}
                      className="w-full py-5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg flex items-center justify-center space-x-2 shadow-md transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Выполнено</span>
                    </button>

                    <button
                      onClick={() => handleStepAnswer('DEFER_TO_NEXT_ACTIONS')}
                      className="w-full py-3 px-4 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors"
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
