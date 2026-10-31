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
  FileCheck,
  Edit2,
  Check,
  Inbox,
  Play
} from 'lucide-react';
import { Project, Task } from '@shared/types';
import { TaskContextMenu } from '../components/TaskContextMenu';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { Checkbox } from '../components/Checkbox';

interface ProjectDetailModalProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: () => Promise<void>;
  onProcessStep?: (step: Task) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onProjectUpdated,
  onProcessStep,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<Task[]>([]);
  const [newStepTitle, setNewStepTitle] = useState('');
  
  // Редактирование плана
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState('');

  // Редактирование конкретного шага
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepTitle, setEditingStepTitle] = useState('');

  // Контекстное меню ПКМ для задач
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null);
  const [deleteStepTarget, setDeleteStepTarget] = useState<Task | null>(null);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);

  // Редактирование данных проекта (заголовок, описание, критерии)
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectTitleDraft, setProjectTitleDraft] = useState('');
  const [projectDescDraft, setProjectDescDraft] = useState('');
  const [projectCriteriaDraft, setProjectCriteriaDraft] = useState('');

  const loadProjectData = async () => {
    if (!projectId || !window.gtdApi) return;
    try {
      const data = await window.gtdApi.getProjectById(projectId);
      if (data) {
        setProject(data.project);
        setSteps(data.steps);
        setPlanDraft(data.project.approximate_plan || '');
        setProjectTitleDraft(data.project.title);
        setProjectDescDraft(data.project.description || '');
        setProjectCriteriaDraft(data.project.completion_criteria || '');
      }
    } catch (e) {
      console.error('Failed to load project details:', e);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectData();
      setIsEditingPlan(false);
      setIsEditingProject(false);
      setEditingStepId(null);
      setContextMenuPos(null);
    }
  }, [isOpen, projectId]);

  if (!isOpen || !project) return null;

  // Добавление шага (сохраняем в корзину для возможности разобрать)
  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim() || !window.gtdApi) return;

    try {
      await window.gtdApi.createTask({
        title: newStepTitle.trim(),
        project_id: project.id,
        destination: 'inbox',
        status: 'active',
      });
      setNewStepTitle('');
      await loadProjectData();
      await onProjectUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Переключение статуса выполнения шага
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

  // Начало редактирования шага
  const handleStartEditStep = (step: Task) => {
    setEditingStepId(step.id);
    setEditingStepTitle(step.title);
  };

  // Сохранение отредактированного шага
  const handleSaveEditStep = async (stepId: string) => {
    if (!window.gtdApi || !editingStepTitle.trim()) return;
    try {
      await window.gtdApi.updateTask(stepId, { title: editingStepTitle.trim() });
      setEditingStepId(null);
      await loadProjectData();
      await onProjectUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Удаление шага
  const handleDeleteStep = (step: Task) => {
    setDeleteStepTarget(step);
  };

  const handleConfirmDeleteStep = async () => {
    if (!window.gtdApi || !deleteStepTarget) return;
    const step = deleteStepTarget;

    try {
      await window.gtdApi.deleteTask(step.id, false);
      if (project.first_step_task_id === step.id) {
        const remainingSteps = steps.filter((s) => s.id !== step.id);
        const nextFirstStep = remainingSteps.length > 0 ? remainingSteps[0].id : null;
        await window.gtdApi.updateProject(project.id, { first_step_task_id: nextFirstStep });
      }
      setDeleteStepTarget(null);
      await loadProjectData();
      await onProjectUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Переключение статуса проекта (завершен / активен)
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

  // Сохранение примерного плана
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

  // Сохранение настроек проекта (заголовок, описание, критерии)
  const handleSaveProjectDetails = async () => {
    if (!window.gtdApi || !projectTitleDraft.trim()) return;
    try {
      await window.gtdApi.updateProject(project.id, {
        title: projectTitleDraft.trim(),
        description: projectDescDraft.trim() || null,
        completion_criteria: projectCriteriaDraft.trim() || null,
      });
      setIsEditingProject(false);
      await loadProjectData();
      await onProjectUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Удаление проекта
  const handleDeleteProject = () => {
    setIsDeleteProjectOpen(true);
  };

  const handleConfirmDeleteProject = async () => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.deleteProject(project.id);
      setIsDeleteProjectOpen(false);
      onClose();
      await onProjectUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const completedStepsCount = steps.filter((s) => s.status === 'completed').length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn select-none p-4">
        <div 
          className="bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Шапка проекта */}
          <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-[#222222]">
            <div className="flex items-center space-x-3.5 flex-1 min-w-0 mr-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                project.status === 'completed' 
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' 
                  : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
              }`}>
                <FolderKanban className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold tracking-tight truncate">{project.title}</h2>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    project.status === 'completed' 
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' 
                      : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  }`}>
                    {project.status === 'completed' ? 'Завершен' : 'В работе'}
                  </span>
                  <button
                    onClick={() => setIsEditingProject(!isEditingProject)}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
                    title="Редактировать проект"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Шагов выполнено: {completedStepsCount} из {steps.length}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleToggleProjectStatus}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  project.status === 'completed'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{project.status === 'completed' ? 'Вернуть в работу' : 'Завершить проект'}</span>
              </button>

              <button
                onClick={handleDeleteProject}
                className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Удалить проект"
              >
                <Trash2 className="w-4 h-4" />
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
            {/* Режим редактирования метаданных проекта */}
            {isEditingProject ? (
              <div className="p-4 bg-zinc-50 dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Редактирование проекта
                </h4>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Название проекта</label>
                  <input
                    type="text"
                    value={projectTitleDraft}
                    onChange={(e) => setProjectTitleDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Описание</label>
                  <textarea
                    rows={2}
                    value={projectDescDraft}
                    onChange={(e) => setProjectDescDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Критерии завершения</label>
                  <input
                    type="text"
                    value={projectCriteriaDraft}
                    onChange={(e) => setProjectCriteriaDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    onClick={() => setIsEditingProject(false)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveProjectDetails}
                    className="px-4 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Сохранить изменения
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.description && (
                  <div className="p-4 bg-zinc-50 dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
                      Описание
                    </span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{project.description}</p>
                  </div>
                )}

                {project.completion_criteria && (
                  <div className="p-4 bg-zinc-50 dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center space-x-1 mb-1">
                      <FileCheck className="w-4 h-4" />
                      <span>Критерии завершения</span>
                    </span>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-semibold">
                      {project.completion_criteria}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Примерный план */}
            <div className="p-4 bg-zinc-50 dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800">
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
                  className="text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:underline cursor-pointer"
                >
                  {isEditingPlan ? 'Сохранить план' : 'Редактировать план'}
                </button>
              </div>

            {isEditingPlan ? (
              <textarea
                rows={4}
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                className="w-full p-3 bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono focus:ring-1 focus:ring-zinc-500 focus:outline-none"
              />
            ) : (
              <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                {project.approximate_plan || 'Примерный план не задан.'}
              </pre>
            )}
          </div>

          {/* Связанные действия (шаги проекта) с редактированием и удалением */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Шаги и действия проекта ({steps.length}) • <span className="normal-case text-[11px] font-normal text-zinc-400">Кликните ПКМ по задаче для меню</span>
              </h3>
            </div>

            {/* Быстрое добавление нового шага */}
            <form onSubmit={handleAddStep} className="flex items-center space-x-2">
              <input
                type="text"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                placeholder="Добавить следующий шаг проекта..."
                className="flex-1 px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={!newStepTitle.trim()}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 rounded-full text-xs font-bold flex items-center space-x-1 shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </form>

            {/* Список шагов */}
            <div className="space-y-2">
              {steps.map((step) => {
                const isEditing = editingStepId === step.id;

                return (
                  <div
                    key={step.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenuPos({ x: e.clientX, y: e.clientY });
                      setContextMenuTask(step);
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-colors group cursor-context-menu ${
                      step.status === 'completed'
                        ? 'bg-zinc-50 dark:bg-[#191919] border-zinc-200 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500'
                        : 'bg-white dark:bg-[#222222] border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center space-x-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingStepTitle}
                          onChange={(e) => setEditingStepTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditStep(step.id);
                            if (e.key === 'Escape') setEditingStepId(null);
                          }}
                          autoFocus
                          className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#191919] border border-zinc-300 dark:border-zinc-600 text-xs focus:outline-none text-zinc-900 dark:text-zinc-100"
                        />
                        <button
                          onClick={() => handleSaveEditStep(step.id)}
                          className="p-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 cursor-pointer"
                          title="Сохранить"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingStepId(null)}
                          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 cursor-pointer"
                          title="Отмена"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-3.5 flex-1 min-w-0 mr-2">
                          <Checkbox
                            checked={step.status === 'completed'}
                            onChange={() => handleToggleStep(step)}
                            title="Отметить выполненным"
                          />
                          <div className="flex items-center space-x-2 truncate">
                            <span className={`truncate ${step.status === 'completed' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'font-semibold'}`}>
                              {step.title}
                            </span>
                            {step.id === project.first_step_task_id && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-bold shrink-0">
                                1-й шаг
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {step.destination === 'inbox' && (
                            <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold">
                              <Inbox className="w-3 h-3" />
                              <span>В корзине</span>
                            </span>
                          )}
                          {step.destination === 'next_actions' && (
                            <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold">
                              <CheckSquare className="w-3 h-3" />
                              <span>Текущие</span>
                            </span>
                          )}
                          {step.destination === 'calendar' && (
                            <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold">
                              <Calendar className="w-3 h-3" />
                              <span>{step.scheduled_date}</span>
                            </span>
                          )}
                          {step.destination === 'waiting_for' && (
                            <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold">
                              <UserCheck className="w-3 h-3" />
                              <span>{step.delegated_to || 'Ожидание'}</span>
                            </span>
                          )}

                          {/* Кнопка "Разобрать" для невыполненных шагов (особенно в корзине) */}
                          {onProcessStep && step.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onProcessStep(step);
                              }}
                              className="flex items-center space-x-1 px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                              title="Разобрать шаг по алгоритму ГТД"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Разобрать</span>
                            </button>
                          )}

                          {/* Явные кнопки редактирования и удаления задачи */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleStartEditStep(step)}
                              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                              title="Редактировать название (или нажмите ПКМ)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStep(step)}
                              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Удалить шаг (или нажмите ПКМ)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Контекстное меню ПКМ */}
    <TaskContextMenu
      task={contextMenuTask}
      position={contextMenuPos}
      onClose={() => setContextMenuPos(null)}
      onEdit={(t) => handleStartEditStep(t)}
      onDelete={(t) => handleDeleteStep(t)}
      onToggleStatus={(t) => handleToggleStep(t)}
      onProcess={onProcessStep ? (t) => { onClose(); onProcessStep(t); } : undefined}
    />

    {/* Красивое окно подтверждения удаления шага проекта */}
    <ConfirmDeleteModal
      isOpen={Boolean(deleteStepTarget)}
      title={deleteStepTarget?.title || ''}
      isPermanent={false}
      onClose={() => setDeleteStepTarget(null)}
      onConfirm={handleConfirmDeleteStep}
    />

    {/* Красивое окно подтверждения удаления проекта */}
    <ConfirmDeleteModal
      isOpen={isDeleteProjectOpen}
      title={project.title}
      isPermanent={true}
      onClose={() => setIsDeleteProjectOpen(false)}
      onConfirm={handleConfirmDeleteProject}
    />
  </>
  );
};
