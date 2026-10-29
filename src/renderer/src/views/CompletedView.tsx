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
  const completedTasks = tasks.filter((t) => t.status === 'completed' && !t.deleted_at && t.destination !== 'trash');
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
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Архив успешно выполненных задач и реализованных проектов.
      </p>

      {/* Завершенные проекты */}
      {completedProjects.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Завершённые проекты ({completedProjects.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedProjects.map((p) => (
              <div
                key={p.id}
                className="p-5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">{p.title}</h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                    Завершён: {p.completed_at ? new Date(p.completed_at).toLocaleDateString('ru-RU') : 'Ранее'}
                  </p>
                </div>
                <button
                  onClick={() => handleReopenProject(p)}
                  className="px-3 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Вернуть в активные проекты"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Вернуть</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Завершенные задачи */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Выполненные действия ({completedTasks.length})
        </h3>

        {completedTasks.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-zinc-900/60">
            <CheckCircle2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Выполненных задач пока нет.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 line-through">{task.title}</h4>
                    {task.completed_at && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {new Date(task.completed_at).toLocaleString('ru-RU')}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleReopenTask(task)}
                  className="px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                  title="Вернуть задачу в активные"
                >
                  <RotateCcw className="w-3 h-3 text-indigo-600 dark:text-purple-400" />
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
