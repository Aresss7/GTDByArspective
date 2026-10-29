import React from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
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
        <p className="text-xs text-slate-500">
          Удалённые задачи и элементы, отклонённые при обработке входящих.
        </p>

        {trashItems.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить мусор</span>
          </button>
        )}
      </div>

      {trashItems.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Корзина мусора пуста</h3>
          <p className="text-xs text-slate-500 max-w-sm">Здесь нет отклонённых или удалённых задач.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trashItems.map((task) => (
            <div
              key={task.id}
              className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group"
            >
              <div>
                <h4 className="text-sm font-medium text-slate-700 line-through">{task.title}</h4>
                {task.notes && <p className="text-xs text-slate-400 mt-0.5">{task.notes}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRestore(task)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 font-medium flex items-center space-x-1 cursor-pointer"
                  title="Восстановить в корзину входящих"
                >
                  <RotateCcw className="w-3 h-3 text-sky-600" />
                  <span>Восстановить</span>
                </button>

                <button
                  onClick={() => handlePermanentDelete(task.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
