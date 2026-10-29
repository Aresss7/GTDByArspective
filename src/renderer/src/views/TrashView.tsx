import React, { useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { Task } from '@shared/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

interface TrashViewProps {
  tasks: Task[];
  onTaskUpdated: () => Promise<void>;
}

export const TrashView: React.FC<TrashViewProps> = ({ tasks, onTaskUpdated }) => {
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    taskId?: string;
    taskTitle: string;
    isAll?: boolean;
  }>({
    isOpen: false,
    taskTitle: '',
  });

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

  const handleConfirmPermanentDelete = async () => {
    if (!window.gtdApi) return;
    try {
      if (deleteModalState.isAll) {
        for (const item of trashItems) {
          await window.gtdApi.deleteTask(item.id, true);
        }
      } else if (deleteModalState.taskId) {
        await window.gtdApi.deleteTask(deleteModalState.taskId, true);
      }
      setDeleteModalState({ isOpen: false, taskTitle: '' });
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="space-y-6 w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Удалённые задачи и отклонённые мысли • Вы можете восстановить их или стереть навсегда.
          </p>

          {trashItems.length > 0 && (
            <button
              onClick={() =>
                setDeleteModalState({
                  isOpen: true,
                  taskTitle: `Все ${trashItems.length} удалённых элементов`,
                  isAll: true,
                })
              }
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить мусор</span>
            </button>
          )}
        </div>

        {trashItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-xs">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Раздел «Мусор» пуст</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
              Здесь будут отображаться удалённые задачи.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {trashItems.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-white dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 line-through truncate">
                    {task.title}
                  </h4>
                  {task.notes && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1">{task.notes}</p>}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleRestore(task)}
                    className="px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                    title="Восстановить в корзину входящих"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                    <span>Восстановить</span>
                  </button>

                  <button
                    onClick={() =>
                      setDeleteModalState({
                        isOpen: true,
                        taskId: task.id,
                        taskTitle: task.title,
                        isAll: false,
                      })
                    }
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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

      {/* Красивое всплывающее подтверждение удаления вместо стандартного окна браузера */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.taskTitle}
        isPermanent={true}
        onClose={() => setDeleteModalState({ isOpen: false, taskTitle: '' })}
        onConfirm={handleConfirmPermanentDelete}
      />
    </>
  );
};
