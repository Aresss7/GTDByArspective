import React, { useState } from 'react';
import { Plus, FolderKanban, Search } from 'lucide-react';
import { Project, Task } from '@shared/types';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ProjectContextMenu } from '../components/ProjectContextMenu';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { useToast } from '../components/ToastNotification';
import { Language, translations } from '../i18n/translations';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onOpenCreateProject: () => void;
  onRefreshData: () => Promise<void>;
  onProcessTask?: (task: Task) => void;
  searchQuery?: string;
  language?: Language;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  onOpenCreateProject,
  onRefreshData,
  onProcessTask,
  searchQuery = '',
  language = 'ru',
}) => {
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const t = translations[language] || translations.ru;
  const isEn = language === 'en';

  // Контекстное меню ПКМ
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuProject, setContextMenuProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const { showToast } = useToast();

  const effectiveSearch = localSearch.trim() || searchQuery.trim();

  const filteredProjects = projects.filter((p) => {
    let matchFilter = true;
    if (filter === 'active') matchFilter = p.status === 'active';
    else if (filter === 'completed') matchFilter = p.status === 'completed';

    if (!matchFilter) return false;

    if (effectiveSearch) {
      const q = effectiveSearch.toLowerCase();
      const inTitle = p.title.toLowerCase().includes(q);
      const inDesc = Boolean(p.description && p.description.toLowerCase().includes(q));
      const inCriteria = Boolean(p.completion_criteria && p.completion_criteria.toLowerCase().includes(q));
      return inTitle || inDesc || inCriteria;
    }

    return true;
  });

  const handleContextMenu = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuProject(project);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleToggleStatus = async (project: Project) => {
    if (!window.gtdApi) return;
    try {
      const isCompleted = project.status === 'completed';
      const newStatus = isCompleted ? 'active' : 'completed';
      await window.gtdApi.updateProject(project.id, {
        status: newStatus,
      });
      await onRefreshData();
      showToast(
        isCompleted
          ? (isEn ? 'Project reactivated' : 'Проект возвращён в работу')
          : (isEn ? 'Project completed' : 'Проект успешно завершён'),
        isCompleted ? 'restore' : 'success'
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!window.gtdApi || !projectToDelete) return;
    try {
      await window.gtdApi.deleteProject(projectToDelete.id);
      showToast(
        isEn
          ? `Project "${projectToDelete.title}" moved to trash`
          : `Проект «${projectToDelete.title}» перемещён в корзину`,
        'info'
      );
      setProjectToDelete(null);
      await onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Панель поиска */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t.projectsSearchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
          />
        </div>
      </div>

      {/* Панель фильтров статуса */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-[#222222] p-1 rounded-2xl text-xs font-bold border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'active' 
                ? 'bg-white dark:bg-[#303030] text-zinc-900 dark:text-white shadow-xs' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {t.projectsFilterActive} ({projects.filter((p) => p.status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'completed' 
                ? 'bg-white dark:bg-[#303030] text-zinc-900 dark:text-white shadow-xs' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {t.projectsFilterCompleted} ({projects.filter((p) => p.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'all' 
                ? 'bg-white dark:bg-[#303030] text-zinc-900 dark:text-white shadow-xs' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {t.projectsFilterAll} ({projects.length})
          </button>
        </div>
      </div>

      {/* Сетка проектов */}
      {filteredProjects.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-xs">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            {filter === 'completed' ? t.projectsEmptyCompletedTitle : t.projectsEmptyActiveTitle}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
            {t.projectsEmptyDesc}
          </p>
          <button
            onClick={onOpenCreateProject}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-full text-xs font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-[#282828] hover:bg-zinc-200 dark:hover:bg-[#303030] border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.projectsCreateBtn}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => {
            const projectSteps = tasks.filter((t) => t.project_id === project.id);
            const completedCount = projectSteps.filter((t) => t.status === 'completed').length;
            const progressPercent =
              projectSteps.length > 0 ? Math.round((completedCount / projectSteps.length) * 100) : 0;
            const firstStep = projectSteps.find((t) => t.id === project.first_step_task_id);

            return (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                onContextMenu={(e) => handleContextMenu(e, project)}
                className="p-6 bg-white dark:bg-[#222222] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 transition-colors">
                      {project.title}
                    </h4>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        project.status === 'completed'
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      }`}
                    >
                      {project.status === 'completed' ? (isEn ? 'Completed' : 'Завершён') : (isEn ? 'Active' : 'В работе')}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">{project.description}</p>
                  )}

                  {project.completion_criteria && (
                    <div className="text-[11px] text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-[#191919] p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-3">
                      <strong>{isEn ? 'Criteria:' : 'Критерий:'}</strong> {project.completion_criteria}
                    </div>
                  )}

                  {firstStep && (
                    <div className="text-xs bg-zinc-50 dark:bg-[#191919] p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-3">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 block mb-0.5">
                        {isEn ? '1st Step:' : '1-й шаг:'}
                      </span>
                      <span className={firstStep.status === 'completed' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200 font-semibold'}>
                        {firstStep.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Прогресс шагов */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 font-semibold">
                    <span>{isEn ? 'Completed:' : 'Выполнено:'}</span>
                    <span>
                      {completedCount} / {projectSteps.length} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-[#191919] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        project.status === 'completed' ? 'bg-zinc-400 dark:bg-zinc-600' : 'bg-zinc-900 dark:bg-white'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно карточки проекта */}
      <ProjectDetailModal
        projectId={selectedProjectId}
        isOpen={Boolean(selectedProjectId)}
        onClose={() => setSelectedProjectId(null)}
        onProjectUpdated={onRefreshData}
        onProcessStep={(step) => {
          setSelectedProjectId(null);
          onProcessTask?.(step);
        }}
      />

      {/* ПКМ меню для проектов */}
      <ProjectContextMenu
        project={contextMenuProject}
        position={contextMenuPos}
        onClose={() => setContextMenuPos(null)}
        onEdit={(proj) => setSelectedProjectId(proj.id)}
        onDelete={(proj) => setProjectToDelete(proj)}
        onToggleStatus={handleToggleStatus}
      />

      {/* Модальное окно подтверждения удаления проекта */}
      <ConfirmDeleteModal
        isOpen={Boolean(projectToDelete)}
        title={projectToDelete?.title || ''}
        description="Проект будет перемещён в раздел «Мусор». Привязанные задачи сохранятся."
        confirmText="Удалить в корзину"
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
