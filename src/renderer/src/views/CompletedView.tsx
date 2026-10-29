import React from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Task, Project } from '@shared/types';

interface CompletedViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
}

export const CompletedView: React.FC<CompletedViewProps> = ({
  tasks,
  projects,
  onTaskUpdated,
}) => {
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const completedProjects = projects.filter((p) => p.status === 'completed');

  const handleReopenTask = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateTask(task.id, {
        status: 'active',
        completed_at: null,
      });
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReopenProject = async (project: Project) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateProject(project.id, {
        status: 'active',
        completed_at: null,
      });
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <p className="text-xs text-slate-500">
        Архив успешно выполненных задач и реализованных проектов.
      </p>

      {/* Завершенные проекты */}
      {completedProjects.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Завершённые проекты ({completedProjects.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedProjects.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">{p.title}</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Завершён: {p.completed_at ? new Date(p.completed_at).toLocaleDateString('ru-RU') : 'Ранее'}
                  </p>
                </div>
                <button
                  onClick={() => handleReopenProject(p)}
                  className="px-2.5 py-1 rounded-lg border border-emerald-300 text-xs font-medium text-emerald-800 hover:bg-emerald-100 flex items-center space-x-1 cursor-pointer"
                  title="Вернуть в активные проекты"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Вернуть</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Завершенные задачи */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Выполненные действия ({completedTasks.length})
        </h3>

        {completedTasks.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs text-slate-400">Выполненных задач пока нет.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 line-through">{task.title}</h4>
                    {task.completed_at && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(task.completed_at).toLocaleString('ru-RU')}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleReopenTask(task)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 font-medium flex items-center space-x-1 cursor-pointer"
                  title="Вернуть задачу в активные"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Вернуть</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
