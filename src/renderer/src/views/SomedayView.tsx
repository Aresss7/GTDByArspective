import React from 'react';
import { Clock, ArrowRight, Trash2, Plus, Edit2 } from 'lucide-react';
import { Task, Project } from '@shared/types';

interface SomedayViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
  onTaskContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onEditTask?: (task: Task) => void;
}

export const SomedayView: React.FC<SomedayViewProps> = ({
  tasks,
  projects,
  onTaskUpdated,
  onOpenAddTask,
  onTaskContextMenu,
  onEditTask,
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
    if (!confirm(`Удалить задачу «${task.title}»?`)) return;
    try {
      await window.gtdApi.deleteTask(task.id, true);
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Идеи и долгосрочные желания • Кликните <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px]">ПКМ</kbd> для меню задачи.
        </p>
        <button
          onClick={onOpenAddTask}
          className="flex items-center space-x-2 px-5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить идею</span>
        </button>
      </div>

      {somedayTasks.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
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
              onContextMenu={(e) => onTaskContextMenu?.(e, task)}
              className="p-4 bg-white dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between group hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-context-menu"
            >
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{task.title}</h4>
                {task.notes && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{task.notes}</p>}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleActivate(task)}
                  className="px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
                  title="Перевести в Текущие действия"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>В работу</span>
                </button>

                {onEditTask && (
                  <button
                    onClick={() => onEditTask(task)}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-[#2c2c2c] hover:bg-zinc-200 dark:hover:bg-[#353535] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    title="Редактировать (или нажмите ПКМ)"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleMoveToTrash(task)}
                  className="p-2 rounded-xl bg-zinc-100 dark:bg-[#2c2c2c] text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Удалить (или нажмите ПКМ)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
