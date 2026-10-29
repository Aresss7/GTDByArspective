import React from 'react';
import { UserCheck, Calendar, CheckCircle2, ArrowRight, Plus } from 'lucide-react';
import { Task, Project } from '@shared/types';

interface WaitingForViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
}

export const WaitingForView: React.FC<WaitingForViewProps> = ({
  tasks,
  projects,
  onTaskUpdated,
  onOpenAddTask,
}) => {
  const waitingTasks = tasks.filter((t) => t.destination === 'waiting_for' && t.status === 'active');
  const todayStr = new Date().toISOString().split('T')[0];

  const handleMarkDone = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateTask(task.id, { status: 'completed' });
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveToNextActions = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateTask(task.id, { destination: 'next_actions' });
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Задачи, выполнение которых поручено другим людям или зависит от внешних ответов.
        </p>
        <button
          onClick={onOpenAddTask}
          className="flex items-center space-x-2 px-5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Делегировать задачу</span>
        </button>
      </div>

      {waitingTasks.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Нет дел на ожидании</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            Когда вы поручаете задачу коллеге или ждете ответ, направляйте задачу сюда.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {waitingTasks.map((task) => {
            const isCheckDue = task.check_date && task.check_date <= todayStr;
            const project = task.project_id ? projects.find((p) => p.id === task.project_id) : null;

            return (
              <div
                key={task.id}
                className={`p-5 bg-white dark:bg-zinc-900 rounded-3xl border shadow-sm flex items-start justify-between transition-all ${
                  isCheckDue 
                    ? 'border-amber-300 dark:border-amber-700 ring-2 ring-amber-300/30' 
                    : 'border-zinc-200/80 dark:border-zinc-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{task.delegated_to || 'Делегировано'}</span>
                    </span>
                    {project && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        📂 {project.title}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{task.title}</h4>

                  {task.waiting_for && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <strong>Ожидаемый результат:</strong> {task.waiting_for}
                    </p>
                  )}

                  {task.check_date && (
                    <div className="flex items-center space-x-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span className={isCheckDue ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-zinc-500 dark:text-zinc-400'}>
                        Дата проверки: {task.check_date} {isCheckDue && '⚠️ Пора проверить статус!'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-4">
                  <button
                    onClick={() => handleMoveToNextActions(task)}
                    className="px-3.5 py-2 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Вернуть в свои текущие действия"
                  >
                    <span>В текущие</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleMarkDone(task)}
                    className="px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Получено</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
