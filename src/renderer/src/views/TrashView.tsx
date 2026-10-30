import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, FolderKanban, CheckSquare, Search } from 'lucide-react';
import { Task, Project } from '@shared/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { useToast } from '../components/ToastNotification';

interface TrashViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
}

export const TrashView: React.FC<TrashViewProps> = ({ tasks, projects, onTaskUpdated }) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [trashProjects, setTrashProjects] = useState<Project[]>([]);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type?: 'task' | 'project' | 'all';
    targetId?: string;
    title: string;
  }>({
    isOpen: false,
    title: '',
  });

  const loadTrashProjects = async () => {
    if (window.gtdApi?.getTrashProjects) {
      try {
        const deletedProjs = await window.gtdApi.getTrashProjects();
        setTrashProjects(deletedProjs);
      } catch (e) {
        console.error('Failed to load trash projects:', e);
      }
    }
  };

  useEffect(() => {
    loadTrashProjects();
  }, [tasks, projects]);

  const allTrashTasks = tasks.filter((t) => t.destination === 'trash' || t.deleted_at != null);

  const q = searchQuery.toLowerCase().trim();
  const trashTasks = allTrashTasks.filter((t) => {
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || Boolean(t.notes && t.notes.toLowerCase().includes(q));
  });

  const filteredTrashProjects = trashProjects.filter((p) => {
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || Boolean(p.description && p.description.toLowerCase().includes(q));
  });

  const totalTrashCount = allTrashTasks.length + trashProjects.length;

  const handleRestoreTask = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateTask(task.id, {
        destination: 'inbox',
        deleted_at: null,
        status: 'active',
      });
      await onTaskUpdated();
      await loadTrashProjects();
      showToast(`Задача «${task.title}» восстановлена в «Корзина ГТД»`, 'restore');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestoreProject = async (project: Project) => {
    if (!window.gtdApi?.restoreProject) return;
    try {
      await window.gtdApi.restoreProject(project.id);
      await onTaskUpdated();
      await loadTrashProjects();
      showToast(`Проект «${project.title}» успешно восстановлен`, 'restore');
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!window.gtdApi) return;
    try {
      if (deleteModalState.type === 'all') {
        for (const item of allTrashTasks) {
          await window.gtdApi.deleteTask(item.id, true);
        }
        for (const proj of trashProjects) {
          await window.gtdApi.deleteProject(proj.id, true);
        }
      } else if (deleteModalState.type === 'task' && deleteModalState.targetId) {
        await window.gtdApi.deleteTask(deleteModalState.targetId, true);
      } else if (deleteModalState.type === 'project' && deleteModalState.targetId) {
        await window.gtdApi.deleteProject(deleteModalState.targetId, true);
      }

      setDeleteModalState({ isOpen: false, title: '' });
      await onTaskUpdated();
      await loadTrashProjects();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="space-y-6 w-full max-w-6xl mx-auto animate-fadeIn">
        {/* Панель поиска и очистки в стиле NotesView */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по удалённым задачам и проектам..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
            />
          </div>

          {totalTrashCount > 0 && (
            <button
              onClick={() =>
                setDeleteModalState({
                  isOpen: true,
                  type: 'all',
                  title: `Все ${totalTrashCount} удалённых элементов (задачи и проекты)`,
                })
              }
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-full border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить мусор</span>
            </button>
          )}
        </div>

        <div className="pb-1">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Удалённые задачи, проекты и отклонённые мысли • Вы можете восстановить их или стереть навсегда.
          </p>
        </div>

        {totalTrashCount === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-xs">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Раздел «Мусор» пуст</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
              Здесь будут отображаться удалённые задачи и проекты.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Удаленные Проекты */}
            {filteredTrashProjects.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Удалённые проекты ({filteredTrashProjects.length})
                </div>
                {filteredTrashProjects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 bg-white dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-4">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-[#282828] text-zinc-400 flex items-center justify-center shrink-0">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-zinc-600 dark:text-zinc-300 line-through truncate">
                          {project.title}
                        </h4>
                        {project.description && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleRestoreProject(project)}
                        className="px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                        title="Восстановить проект"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                        <span>Восстановить проект</span>
                      </button>

                      <button
                        onClick={() =>
                          setDeleteModalState({
                            isOpen: true,
                            type: 'project',
                            targetId: project.id,
                            title: project.title,
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

            {/* Удаленные Задачи */}
            {trashTasks.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Удалённые задачи ({trashTasks.length})
                </div>
                {trashTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-white dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-4">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-[#282828] text-zinc-400 flex items-center justify-center shrink-0">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 line-through truncate">
                          {task.title}
                        </h4>
                        {task.notes && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1">{task.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleRestoreTask(task)}
                        className="px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                        title="Восстановить задачу"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                        <span>Восстановить</span>
                      </button>

                      <button
                        onClick={() =>
                          setDeleteModalState({
                            isOpen: true,
                            type: 'task',
                            targetId: task.id,
                            title: task.title,
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
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        isPermanent={true}
        onClose={() => setDeleteModalState({ isOpen: false, title: '' })}
        onConfirm={handleConfirmPermanentDelete}
      />
    </>
  );
};
