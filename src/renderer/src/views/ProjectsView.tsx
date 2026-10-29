import React, { useState } from 'react';
import { Plus, FolderKanban, CheckCircle2, ListTodo, AlertCircle } from 'lucide-react';
import { Project, Task } from '@shared/types';
import { ProjectDetailModal } from './ProjectDetailModal';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onOpenCreateProject: () => void;
  onRefreshData: () => Promise<void>;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  onOpenCreateProject,
  onRefreshData,
}) => {
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    if (filter === 'active') return p.status === 'active';
    if (filter === 'completed') return p.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Панель фильтров и действий */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Активные ({projects.filter((p) => p.status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'completed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Завершённые ({projects.filter((p) => p.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Все ({projects.length})
          </button>
        </div>

        <button
          onClick={onOpenCreateProject}
          className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Новый проект</span>
        </button>
      </div>

      {/* Сетка проектов */}
      {filteredProjects.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {filter === 'completed' ? 'Нет завершённых проектов' : 'Нет активных проектов'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Проекты объединяют комплексные дела, требующие нескольких самостоятельных шагов.
          </p>
          <button
            onClick={onOpenCreateProject}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Создать проект</span>
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
                className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-base font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                      {project.title}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        project.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {project.status === 'completed' ? 'Завершен' : 'В работе'}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{project.description}</p>
                  )}

                  {project.completion_criteria && (
                    <div className="text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-200/50 mb-3">
                      <strong>Критерий:</strong> {project.completion_criteria}
                    </div>
                  )}

                  {firstStep && (
                    <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                        1-й шаг:
                      </span>
                      <span className={firstStep.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}>
                        {firstStep.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Прогресс шагов */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
                    <span>Выполнено шагов:</span>
                    <span>
                      {completedCount} / {projectSteps.length} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        project.status === 'completed' ? 'bg-emerald-500' : 'bg-sky-500'
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
      />
    </div>
  );
};
