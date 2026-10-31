import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Search, Check } from 'lucide-react';
import { Task, Project } from '@shared/types';
import { useToast } from '../components/ToastNotification';
import { Language, translations } from '../i18n/translations';

interface CompletedViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
  language?: Language;
}

export const CompletedView: React.FC<CompletedViewProps> = ({
  tasks,
  projects,
  onTaskUpdated,
  language = 'ru',
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const t = translations[language] || translations.ru;
  const isEn = language === 'en';

  const q = searchQuery.toLowerCase().trim();

  const allCompletedTasks = tasks.filter((t) => t.status === 'completed' && !t.deleted_at && t.destination !== 'trash');
  const allCompletedProjects = projects.filter((p) => p.status === 'completed' && !p.deleted_at);

  const completedTasks = allCompletedTasks.filter((t) => {
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || Boolean(t.notes && t.notes.toLowerCase().includes(q));
  });

  const completedProjects = allCompletedProjects.filter((p) => {
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || Boolean(p.description && p.description.toLowerCase().includes(q));
  });

  const getDestinationName = (destination: string) => {
    switch (destination) {
      case 'next_actions':
        return isEn ? '«Next Actions»' : '«Текущие действия»';
      case 'inbox':
        return isEn ? '«GTD Inbox»' : '«Корзина ГТД»';
      case 'calendar':
        return isEn ? '«Calendar»' : '«Календарь»';
      case 'waiting_for':
        return isEn ? '«Waiting For»' : '«Делегирование / Ожидание»';
      case 'someday':
        return isEn ? '«Someday / Maybe»' : '«Когда-нибудь потом»';
      case 'notes':
        return isEn ? '«Notes»' : '«Заметки»';
      default:
        return isEn ? 'task list' : 'список задач';
    }
  };

  const handleReopenTask = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateTask(task.id, {
        status: 'active',
        completed_at: null,
      });
      await onTaskUpdated();
      showToast(
        isEn
          ? `Task "${task.title}" restored to ${getDestinationName(task.destination)}`
          : `Задача «${task.title}» возвращена в ${getDestinationName(task.destination)}`,
        'restore'
      );
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
      showToast(
        isEn
          ? `Project "${project.title}" restored to Projects`
          : `Проект «${project.title}» возвращён в «Проекты»`,
        'restore'
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-fadeIn">
      {/* Панель поиска */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по выполненным..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
          />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {isEn ? 'Click the checked circle to restore an item.' : 'Нажмите на кружок с галочкой, чтобы вернуть в работу.'}
        </p>
      </div>

      {/* Завершенные проекты */}
      {completedProjects.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {isEn ? `Completed Projects (${completedProjects.length})` : `Завершённые проекты (${completedProjects.length})`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedProjects.map((p) => (
              <div
                key={p.id}
                className="p-5 bg-white dark:bg-[#222222] rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between group shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center space-x-3.5 flex-1 min-w-0 mr-4">
                  <button
                    type="button"
                    onClick={() => handleReopenProject(p)}
                    className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-80 flex items-center justify-center shrink-0 transition-all cursor-pointer group-hover:scale-105 active:scale-95 shadow-xs"
                    title={isEn ? 'Click to restore project' : 'Нажмите, чтобы вернуть проект в активные'}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-through truncate">
                      {p.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {isEn ? 'Completed:' : 'Завершён:'} {p.completed_at ? new Date(p.completed_at).toLocaleDateString(isEn ? 'en-US' : 'ru-RU') : (isEn ? 'Earlier' : 'Ранее')}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                  {isEn ? 'Completed' : 'Завершён'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Завершенные задачи */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {isEn ? `Completed Actions (${completedTasks.length})` : `Выполненные действия (${completedTasks.length})`}
        </h3>

        {completedTasks.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
            <CheckCircle2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {searchQuery ? t.notFoundDesc : (isEn ? 'No completed tasks yet.' : 'Выполненных задач пока нет.')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-white dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center space-x-3.5 flex-1 min-w-0 mr-4">
                  {/* Нажатие на кружок с галочкой возвращает задачу */}
                  <button
                    type="button"
                    onClick={() => handleReopenTask(task)}
                    className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-80 flex items-center justify-center shrink-0 transition-all cursor-pointer group-hover:scale-105 active:scale-95 shadow-xs"
                    title={isEn ? `Click to restore to ${getDestinationName(task.destination)}` : `Нажмите, чтобы вернуть в ${getDestinationName(task.destination)}`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 line-through truncate">
                      {task.title}
                    </h4>
                    {task.completed_at && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {new Date(task.completed_at).toLocaleString(isEn ? 'en-US' : 'ru-RU')}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                  {isEn ? 'Completed' : 'Выполнено'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
