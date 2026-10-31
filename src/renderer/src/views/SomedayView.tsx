import React, { useState } from 'react';
import { Clock, ArrowRight, Trash2, Plus, Edit2, Search } from 'lucide-react';
import { Task, Project } from '@shared/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { Language, translations } from '../i18n/translations';

interface SomedayViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
  onTaskContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onEditTask?: (task: Task) => void;
  language?: Language;
}

export const SomedayView: React.FC<SomedayViewProps> = ({
  tasks,
  projects,
  onTaskUpdated,
  onOpenAddTask,
  onTaskContextMenu,
  onEditTask,
  language = 'ru',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const t = translations[language] || translations.ru;
  const isEn = language === 'en';

  const allSomedayTasks = tasks.filter((t) => t.destination === 'someday' && t.status === 'active' && !t.deleted_at);

  const q = searchQuery.toLowerCase().trim();
  const somedayTasks = allSomedayTasks.filter((t) => {
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || Boolean(t.notes && t.notes.toLowerCase().includes(q));
  });

  const handleActivate = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateTask(task.id, { destination: 'next_actions' });
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!window.gtdApi || !taskToDelete) return;
    try {
      await window.gtdApi.deleteTask(taskToDelete.id, false);
      setTaskToDelete(null);
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Панель поиска и добавления в стиле NotesView */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.somedaySearchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
          />
        </div>

        <button
          onClick={onOpenAddTask}
          className="flex items-center space-x-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.somedayAddBtn}</span>
        </button>
      </div>

      <div className="pb-1">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t.somedayHint}
        </p>
      </div>

      {somedayTasks.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            {searchQuery ? t.notFoundTitle : t.somedayEmptyTitle}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            {searchQuery ? t.notFoundDesc : t.somedayEmptyDesc}
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
                  title={t.somedayActivateBtn}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Activate' : 'В работу'}</span>
                </button>

                {onEditTask && (
                  <button
                    onClick={() => onEditTask(task)}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-[#2c2c2c] hover:bg-zinc-200 dark:hover:bg-[#353535] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    title={t.edit}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => setTaskToDelete(task)}
                  className="p-2 rounded-xl bg-zinc-100 dark:bg-[#2c2c2c] text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title={t.delete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(taskToDelete)}
        title={taskToDelete?.title || ''}
        description="Задача будет перемещена в раздел «Мусор»."
        confirmText="Удалить в корзину"
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
