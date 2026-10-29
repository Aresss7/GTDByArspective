import React from 'react';
import { UserCheck, Calendar, CheckCircle2, ArrowRight, AlertCircle, Plus } from 'lucide-react';
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
        <p className="text-xs text-slate-500">
          Задачи, выполнение которых поручено другим людям или зависит от внешних ответов.
        </p>
        <button
          onClick={onOpenAddTask}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Делегировать задачу</span>
        </button>
      </div>

      {waitingTasks.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Нет дел на ожидании</h3>
          <p className="text-xs text-slate-500 max-w-sm">
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
                className={`p-4 bg-white rounded-xl border shadow-sm flex items-start justify-between transition-all ${
                  isCheckDue ? 'border-amber-300 ring-1 ring-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center space-x-1">
                      <UserCheck className="w-3 h-3" />
                      <span>{task.delegated_to || 'Делегировано'}</span>
                    </span>
                    {project && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        📂 {project.title}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-800">{task.title}</h4>

                  {task.waiting_for && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <strong>Ожидаемый результат:</strong> {task.waiting_for}
                    </p>
                  )}

                  {task.check_date && (
                    <div className="flex items-center space-x-1 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className={isCheckDue ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                        Дата проверки: {task.check_date} {isCheckDue && '⚠️ Пора проверить статус!'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-4">
                  <button
                    onClick={() => handleMoveToNextActions(task)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center space-x-1 cursor-pointer"
                    title="Вернуть в свои текущие действия"
                  >
                    <span>В текущие</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleMarkDone(task)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
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
