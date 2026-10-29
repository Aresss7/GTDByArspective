import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderKanban, 
  CheckCircle2, 
  Plus, 
  Calendar, 
  UserCheck, 
  CheckSquare, 
  Trash2,
  ListTodo,
  FileCheck
} from 'lucide-react';
import { Project, Task } from '@shared/types';

interface ProjectDetailModalProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: () => Promise<void>;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onProjectUpdated,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<Task[]>([]);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState('');

  const loadProjectData = async () => {
    if (!projectId || !window.gtdApi) return;
    try {
      const data = await window.gtdApi.getProjectById(projectId);
      if (data) {
        setProject(data.project);
        setSteps(data.steps);
        setPlanDraft(data.project.approximate_plan || '');
      }
    } catch (e) {
      console.error('Failed to load project details:', e);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectData();
    }
  }, [isOpen, projectId]);

  if (!isOpen || !project) return null;

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim() || !window.gtdApi) return;

    try {
      await window.gtdApi.createTask({
        title: newStepTitle.trim(),
        project_id: project.id,
        destination: 'next_actions',
        status: 'active',
      });
      setNewStepTitle('');
      await loadProjectData();
      await onProjectUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStep = async (step: Task) => {
    if (!window.gtdApi) return;
    const newStatus = step.status === 'completed' ? 'active' : 'completed';
    try {
      await window.gtdApi.updateTask(step.id, { status: newStatus });
      await loadProjectData();
      await onProjectUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProjectStatus = async () => {
    if (!window.gtdApi) return;
    const newStatus = project.status === 'completed' ? 'active' : 'completed';
    try {
      await window.gtdApi.updateProject(project.id, { status: newStatus });
      await loadProjectData();
      await onProjectUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePlan = async () => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateProject(project.id, { approximate_plan: planDraft });
      setIsEditingPlan(false);
      await loadProjectData();
    } catch (err) {
      console.error(err);
    }
  };

  const completedStepsCount = steps.filter((s) => s.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка проекта */}
        <header className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-850/60">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
              project.status === 'completed' 
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                : 'bg-indigo-100 dark:bg-purple-950/60 text-indigo-700 dark:text-purple-300'
            }`}>
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight">{project.title}</h2>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  project.status === 'completed' 
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' 
                    : 'bg-indigo-100 dark:bg-purple-950/60 text-indigo-800 dark:text-purple-300'
                }`}>
                  {project.status === 'completed' ? 'Завершен' : 'В работе'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Шагов выполнено: {completedStepsCount} из {steps.length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleProjectStatus}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                project.status === 'completed'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{project.status === 'completed' ? 'Вернуть в работу' : 'Завершить проект'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Тело карточки проекта */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.description && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
                  Описание
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{project.description}</p>
              </div>
            )}

            {project.completion_criteria && (
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200/60 dark:border-amber-900/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center space-x-1 mb-1">
                  <FileCheck className="w-4 h-4" />
                  <span>Критерии завершения</span>
                </span>
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-semibold">
                  {project.completion_criteria}
                </p>
              </div>
            )}
          </div>

          {/* Примерный план */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center space-x-1.5">
                <ListTodo className="w-4 h-4" />
                <span>Примерный план действий</span>
              </span>
              <button
                onClick={() => {
                  if (isEditingPlan) handleSavePlan();
                  else setIsEditingPlan(true);
                }}
                className="text-xs font-bold text-indigo-600 dark:text-purple-400 hover:text-indigo-700 cursor-pointer"
              >
                {isEditingPlan ? 'Сохранить план' : 'Редактировать план'}
              </button>
            </div>

            {isEditingPlan ? (
              <textarea
                rows={4}
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            ) : (
              <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                {project.approximate_plan || 'Примерный план не задан.'}
              </pre>
            )}
          </div>

          {/* Связанные действия (шаги проекта) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Шаги и действия проекта ({steps.length})
              </h3>
            </div>

            {/* Быстрое добавление нового шага */}
            <form onSubmit={handleAddStep} className="flex items-center space-x-2">
              <input
                type="text"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                placeholder="Добавить следующий шаг проекта..."
                className="flex-1 px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-xs focus:outline-none transition-all placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={!newStepTitle.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:opacity-50 text-white rounded-full text-xs font-bold flex items-center space-x-1 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </form>

            {/* Список шагов */}
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                    step.status === 'completed'
                      ? 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <input
                      type="checkbox"
                      checked={step.status === 'completed'}
                      onChange={() => handleToggleStep(step)}
                      className="w-5 h-5 rounded-full border-zinc-300 dark:border-zinc-600 text-indigo-600 dark:text-purple-500 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <span className={step.status === 'completed' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'font-semibold'}>
                        {step.title}
                      </span>
                      {step.id === project.first_step_task_id && (
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-purple-950/60 text-indigo-700 dark:text-purple-300 border border-indigo-200 dark:border-purple-800 font-bold">
                          1-й шаг
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {step.destination === 'next_actions' && (
                      <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                        <CheckSquare className="w-3 h-3" />
                        <span>Текущие</span>
                      </span>
                    )}
                    {step.destination === 'calendar' && (
                      <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                        <Calendar className="w-3 h-3" />
                        <span>{step.scheduled_date}</span>
                      </span>
                    )}
                    {step.destination === 'waiting_for' && (
                      <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold">
                        <UserCheck className="w-3 h-3" />
                        <span>{step.delegated_to || 'Ожидание'}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
