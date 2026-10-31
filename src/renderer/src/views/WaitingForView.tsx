import React, { useState } from 'react';
import { UserCheck, Calendar, CheckCircle2, ArrowRight, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Task, Project } from '@shared/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { Language, translations } from '../i18n/translations';

interface WaitingForViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
  onTaskContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onEditTask?: (task: Task) => void;
  language?: Language;
}

export const WaitingForView: React.FC<WaitingForViewProps> = ({
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

  const allWaitingTasks = tasks.filter((t) => t.destination === 'waiting_for' && t.status === 'active' && !t.deleted_at);

  const q = searchQuery.toLowerCase().trim();
  const waitingTasks = allWaitingTasks.filter((t) => {
    if (!q) return true;
    const inTitle = t.title.toLowerCase().includes(q);
    const inNotes = Boolean(t.notes && t.notes.toLowerCase().includes(q));
    const inPerson = Boolean(t.delegated_to && t.delegated_to.toLowerCase().includes(q));
    const inWaiting = Boolean(t.waiting_for && t.waiting_for.toLowerCase().includes(q));
    return inTitle || inNotes || inPerson || inWaiting;
  });

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
            placeholder={t.waitingForSearchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
          />
        </div>

        <button
          onClick={onOpenAddTask}
          className="flex items-center space-x-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.waitingForAddBtn}</span>
        </button>
      </div>

      <div className="pb-1">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t.waitingForHint}
        </p>
      </div>

      {waitingTasks.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            {searchQuery ? t.notFoundTitle : t.waitingForEmptyTitle}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            {searchQuery ? t.notFoundDesc : t.waitingForEmptyDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {waitingTasks.map((task) => {
            const isCheckDue = task.check_date ? task.check_date <= todayStr : false;
            const project = task.project_id ? projects.find((p) => p.id === task.project_id) : null;

            return (
              <div
                key={task.id}
                onContextMenu={(e) => onTaskContextMenu?.(e, task)}
                className={`p-5 bg-white dark:bg-[#222222] rounded-3xl border shadow-sm flex items-start justify-between transition-all cursor-context-menu hover:border-zinc-400 dark:hover:border-zinc-600 ${
                  isCheckDue 
                    ? 'border-amber-400 dark:border-amber-600' 
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0 mr-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#282828] text-zinc-800 dark:text-zinc-200 flex items-center space-x-1.5 border border-zinc-200 dark:border-zinc-700">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{task.delegated_to || t.waitingForDelegated}</span>
                    </span>
                    {project && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#282828] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        📂 {project.title}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{task.title}</h4>

                  {task.waiting_for && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-[#191919] p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      <strong>{t.waitingForExpectedResult}:</strong> {task.waiting_for}
                    </p>
                  )}

                  {task.check_date && (
                    <div className="flex items-center space-x-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span className={isCheckDue ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-500 dark:text-zinc-400'}>
                        {t.waitingForCheckDate}: {task.check_date} {isCheckDue && `⚠️ ${t.waitingForCheckDueAlert}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleMoveToNextActions(task)}
                    className="px-3.5 py-2 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                    title={t.waitingForMoveToNext}
                  >
                    <span>{t.waitingForMoveToNext}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleMarkDone(task)}
                    className="px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-sm"
                    title={t.markCompleted}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Done' : 'Получено'}</span>
                  </button>
                  {onEditTask && (
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] text-zinc-500 cursor-pointer"
                      title={t.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setTaskToDelete(task)}
                    className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 cursor-pointer"
                    title={t.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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
