import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Search, Check, FolderKanban, CheckSquare, FileCheck, Calendar, Filter } from 'lucide-react';
import { Task, Project } from '@shared/types';
import { matchesSearch } from '@shared/searchEngine';
import { useToast } from '../components/ToastNotification';
import { Language, translations } from '../i18n/translations';
import { ProjectDetailModal } from './ProjectDetailModal';
import { CustomDatePicker } from '../components/CustomDatePicker';

type DateFilterType = 'all' | 'today' | 'yesterday' | 'last7days' | 'custom';

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
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects'>('tasks');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Фильтрация по дням
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const t = translations[language] || translations.ru;
  const isEn = language === 'en';

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getItemDateStr = (item: { completed_at?: string | null; updated_at?: string; created_at?: string }): string | null => {
    const rawDate = item.completed_at || item.updated_at || item.created_at;
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    return formatLocalDate(d);
  };

  const matchesDateFilter = (item: { completed_at?: string | null; updated_at?: string; created_at?: string }): boolean => {
    if (dateFilter === 'all') return true;
    const itemDateStr = getItemDateStr(item);
    if (!itemDateStr) return false;

    const now = new Date();
    const todayStr = formatLocalDate(now);

    if (dateFilter === 'today') {
      return itemDateStr === todayStr;
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return itemDateStr === formatLocalDate(yesterday);
    }
    if (dateFilter === 'last7days') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const minStr = formatLocalDate(sevenDaysAgo);
      return itemDateStr >= minStr && itemDateStr <= todayStr;
    }
    if (dateFilter === 'custom') {
      if (customStartDate && itemDateStr < customStartDate) return false;
      if (customEndDate && itemDateStr > customEndDate) return false;
      return true;
    }
    return true;
  };

  const allCompletedTasks = tasks.filter((t) => t.status === 'completed' && !t.deleted_at && t.destination !== 'trash');
  const allCompletedProjects = projects.filter((p) => p.status === 'completed' && !p.deleted_at);

  const completedTasks = allCompletedTasks.filter((t) => matchesSearch(t, searchQuery) && matchesDateFilter(t));
  const completedProjects = allCompletedProjects.filter((p) => matchesSearch(p, searchQuery) && matchesDateFilter(p));

  const getDestinationName = (destination: string) => {
    switch (destination) {
      case 'next_actions':
        return isEn ? '«Next Actions»' : '«Текущие действия»';
      case 'inbox':
        return isEn ? '«GTD Inbox»' : '«Корзина ГТД»';
      case 'calendar':
        return isEn ? '«Calendar»' : '«Календарь»';
      case 'waiting_for':
        return isEn ? '«Waiting For»' : '«Делегированные»';
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
      {/* Верхняя строка: переключатель Задачи / Проекты и поиск */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Переключатель вкладок Задачи / Проекты */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isEn ? 'Tasks' : 'Задачи'} ({completedTasks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>{isEn ? 'Projects' : 'Проекты'} ({completedProjects.length})</span>
          </button>
        </div>

        {/* Панель поиска */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'projects' ? (isEn ? 'Search completed projects...' : 'Поиск завершённых проектов...') : t.completedSearchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
          />
        </div>
      </div>

      {/* Панель фильтрации по времени: За всё время, Сегодня, Вчера, Последние 7 дней, Выбрать отрезок */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
        <div className="flex items-center space-x-1.5 p-1 bg-zinc-100 dark:bg-[#1c1c1e] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <button
            type="button"
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-white font-bold shadow-xs border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {isEn ? 'All time' : 'За всё время'}
          </button>

          <button
            type="button"
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-white font-bold shadow-xs border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {isEn ? 'Today' : 'Сегодня'}
          </button>

          <button
            type="button"
            onClick={() => setDateFilter('yesterday')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              dateFilter === 'yesterday'
                ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-white font-bold shadow-xs border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {isEn ? 'Yesterday' : 'Вчера'}
          </button>

          <button
            type="button"
            onClick={() => setDateFilter('last7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              dateFilter === 'last7days'
                ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-white font-bold shadow-xs border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {isEn ? 'Last 7 days' : 'Последние 7 дней'}
          </button>

          <button
            type="button"
            onClick={() => setDateFilter('custom')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              dateFilter === 'custom'
                ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-white font-bold shadow-xs border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isEn ? 'Custom range' : 'Выбрать временной отрезок'}</span>
          </button>
        </div>

        {/* Поля выбора временного отрезка, если активен режим custom */}
        {dateFilter === 'custom' && (
          <div className="flex items-center space-x-2 animate-fadeIn">
            <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-[#1c1c1e] px-2.5 py-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium">{isEn ? 'From:' : 'От:'}</span>
              <CustomDatePicker
                value={customStartDate}
                onChange={setCustomStartDate}
                placeholder={isEn ? 'Start date' : 'Дата начала'}
                className="w-36"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-[#1c1c1e] px-2.5 py-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium">{isEn ? 'To:' : 'До:'}</span>
              <CustomDatePicker
                value={customEndDate}
                onChange={setCustomEndDate}
                placeholder={isEn ? 'End date' : 'Дата конца'}
                className="w-36"
              />
            </div>

            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
              >
                {isEn ? 'Reset' : 'Сбросить'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pb-1">
        <p>
          {isEn ? 'Click the checked icon to restore an item to active work.' : 'Нажмите на кружок с галочкой, чтобы вернуть элемент в работу.'}
        </p>
      </div>

      {/* Вкладка: Завершённые Проекты */}
      {activeTab === 'projects' && (
        <div className="space-y-3">
          {completedProjects.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
              <FolderKanban className="w-9 h-9 text-zinc-300 dark:text-zinc-600 mb-2.5" />
              <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                {searchQuery ? t.notFoundDesc : (isEn ? 'No completed projects' : 'Завершённых проектов пока нет')}
              </h4>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm">
                {isEn ? 'Projects you complete will be neatly archived here.' : 'Завершённые проекты будут аккуратно сохранены здесь с критериями и датой.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedProjects.map((p) => {
                const projectSteps = tasks.filter((t) => t.project_id === p.id);
                const firstStep = projectSteps.find((t) => t.id === p.first_step_task_id);

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className="p-5 bg-white dark:bg-[#222222] rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between group shadow-xs hover:border-zinc-400 dark:hover:border-zinc-600 transition-all space-y-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReopenProject(p);
                          }}
                          className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-80 flex items-center justify-center shrink-0 transition-all cursor-pointer group-hover:scale-105 active:scale-95 shadow-xs mt-0.5"
                          title={isEn ? 'Click to restore project' : 'Нажмите, чтобы вернуть проект в активные'}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-zinc-600 dark:text-zinc-300 leading-snug break-words">
                            {p.title}
                          </h4>
                          {p.description && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wider shrink-0">
                        {isEn ? 'Completed' : 'Завершён'}
                      </span>
                    </div>

                    {/* 1-й шаг проекта */}
                    {firstStep && (
                      <div className="text-xs bg-zinc-50 dark:bg-[#191919] p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 block mb-0.5">
                          {isEn ? '1st Step:' : '1-й шаг:'}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold break-words whitespace-pre-wrap leading-relaxed block">
                          {firstStep.title}
                        </span>
                      </div>
                    )}

                    {/* Критерий завершения и дата */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {p.completion_criteria && (
                        <div className="flex items-center space-x-1.5 text-zinc-600 dark:text-zinc-400 flex-1 min-w-0">
                          <FileCheck className="w-3.5 h-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                          <span className="truncate text-[11px] font-medium" title={p.completion_criteria}>
                            {p.completion_criteria}
                          </span>
                        </div>
                      )}
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono shrink-0 ml-auto">
                        {isEn ? 'Done:' : 'Завершён:'} {p.completed_at ? new Date(p.completed_at).toLocaleDateString(isEn ? 'en-US' : 'ru-RU') : (isEn ? 'Earlier' : 'Ранее')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Вкладка: Завершённые Задачи */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {completedTasks.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
              <CheckCircle2 className="w-9 h-9 text-zinc-300 dark:text-zinc-600 mb-2.5" />
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
                      <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                        {task.title}
                      </h4>
                      {task.completed_at && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
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
      )}
      {/* Модальное окно просмотра деталей завершённого проекта */}
      {selectedProjectId && (
        <ProjectDetailModal
          projectId={selectedProjectId}
          isOpen={Boolean(selectedProjectId)}
          onClose={() => setSelectedProjectId(null)}
          onProjectUpdated={onTaskUpdated}
        />
      )}
    </div>
  );
};
