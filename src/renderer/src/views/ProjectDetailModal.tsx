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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка проекта */}
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
            }`}>
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-800">{project.title}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  project.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                }`}>
                  {project.status === 'completed' ? 'Завершен' : 'В работе'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Шагов выполнено: {completedStepsCount} из {steps.length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleProjectStatus}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                project.status === 'completed'
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{project.status === 'completed' ? 'Вернуть в работу' : 'Завершить проект'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Тело карточки проекта */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Описание и критерии завершения */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.description && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Описание
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">{project.description}</p>
              </div>
            )}

            {project.completion_criteria && (
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center space-x-1 mb-1">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Критерии завершения</span>
                </span>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  {project.completion_criteria}
                </p>
              </div>
            )}
          </div>

          {/* Примерный план */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <ListTodo className="w-3.5 h-3.5" />
                <span>Примерный план действий</span>
              </span>
              <button
                onClick={() => {
                  if (isEditingPlan) handleSavePlan();
                  else setIsEditingPlan(true);
                }}
                className="text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                {isEditingPlan ? 'Сохранить план' : 'Редактировать план'}
              </button>
            </div>

            {isEditingPlan ? (
              <textarea
                rows={4}
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            ) : (
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                {project.approximate_plan || 'Примерный план не задан.'}
              </pre>
            )}
          </div>

          {/* Связанные действия (шаги проекта) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
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
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newStepTitle.trim()}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить</span>
              </button>
            </form>

            {/* Список шагов */}
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    step.status === 'completed'
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={step.status === 'completed'}
                      onChange={() => handleToggleStep(step)}
                      className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div>
                      <span className={step.status === 'completed' ? 'line-through' : 'font-medium'}>
                        {step.title}
                      </span>
                      {step.id === project.first_step_task_id && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                          1-й шаг
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {step.destination === 'next_actions' && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                        <CheckSquare className="w-3 h-3" />
                        <span>Текущие</span>
                      </span>
                    )}
                    {step.destination === 'calendar' && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                        <Calendar className="w-3 h-3" />
                        <span>{step.scheduled_date}</span>
                      </span>
                    )}
                    {step.destination === 'waiting_for' && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
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
