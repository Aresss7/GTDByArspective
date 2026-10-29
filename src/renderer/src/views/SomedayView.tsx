import React from 'react';
import { Clock, ArrowRight, Trash2, Plus } from 'lucide-react';
import { Task, Project } from '@shared/types';

interface SomedayViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
}

export const SomedayView: React.FC<SomedayViewProps> = ({
  tasks,
  projects,
  onTaskUpdated,
  onOpenAddTask,
}) => {
  const somedayTasks = tasks.filter((t) => t.destination === 'someday' && t.status === 'active');

  const handleActivate = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateTask(task.id, { destination: 'next_actions' });
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveToTrash = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.deleteTask(task.id, false);
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Идеи, планы и долгосрочные желания, к которым вы планируете вернуться в будущем.
        </p>
        <button
          onClick={onOpenAddTask}
          className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить идею</span>
        </button>
      </div>

      {somedayTasks.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-zinc-900/60">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Список пуст</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            Записывайте сюда всё, что хотелось бы сделать, но не на этой неделе.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {somedayTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between group hover:border-purple-300 dark:hover:border-purple-800 transition-all"
            >
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{task.title}</h4>
                {task.notes && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{task.notes}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleActivate(task)}
                  className="px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
                  title="Перевести в Текущие действия"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>В работу</span>
                </button>

                <button
                  onClick={() => handleMoveToTrash(task)}
                  className="p-2 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
