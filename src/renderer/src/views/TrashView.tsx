import React from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { Task } from '@shared/types';

interface TrashViewProps {
  tasks: Task[];
  onTaskUpdated: () => Promise<void>;
}

export const TrashView: React.FC<TrashViewProps> = ({ tasks, onTaskUpdated }) => {
  const trashItems = tasks.filter((t) => t.destination === 'trash' || t.deleted_at != null);

  const handleRestore = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateTask(task.id, {
        destination: 'inbox',
        deleted_at: null,
        status: 'active',
      });
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.gtdApi) return;
    if (!confirm('Вы действительно хотите навсегда удалить этот элемент?')) return;
    try {
      await window.gtdApi.deleteTask(id, true);
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.gtdApi || trashItems.length === 0) return;
    if (!confirm(`Очистить корзину? Будет навсегда удалено ${trashItems.length} элементов.`)) return;
    try {
      for (const item of trashItems) {
        await window.gtdApi.deleteTask(item.id, true);
      }
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Удалённые задачи и элементы, отклонённые при обработке входящих.
        </p>

        {trashItems.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить мусор</span>
          </button>
        )}
      </div>

      {trashItems.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-zinc-900/60">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
            <Trash2 className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Корзина мусора пуста</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">Здесь нет отклонённых или удалённых задач.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {trashItems.map((task) => (
            <div
              key={task.id}
              className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between group"
            >
              <div>
                <h4 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 line-through">{task.title}</h4>
                {task.notes && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{task.notes}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRestore(task)}
                  className="px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                  title="Восстановить в корзину входящих"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-purple-400" />
                  <span>Восстановить</span>
                </button>

                <button
                  onClick={() => handlePermanentDelete(task.id)}
                  className="p-2 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Удалить навсегда"
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
