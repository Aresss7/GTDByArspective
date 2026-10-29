import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, AlertCircle } from 'lucide-react';
import { Navigation, NavigationTab } from './components/Navigation';
import { QuickAddTaskModal } from './components/QuickAddTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ProcessingWizardModal } from './views/ProcessingWizard/ProcessingWizardModal';
import { ProjectsView } from './views/ProjectsView';
import { CalendarView } from './views/CalendarView';
import { WaitingForView } from './views/WaitingForView';
import { SomedayView } from './views/SomedayView';
import { NotesView } from './views/NotesView';
import { TrashView } from './views/TrashView';
import { CompletedView } from './views/CompletedView';
import { Task, Project } from '@shared/types';

export const App: React.FC = () => {
  // Стартовый экран по умолчанию — «Текущие действия»
  const [activeTab, setActiveTab] = useState<NavigationTab>('next_actions');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessingOpen, setIsProcessingOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectSourceTask, setProjectSourceTask] = useState<Task | null>(null);

  // Для передачи первого шага проекта на специальную обработку
  const [wizardInitialTask, setWizardInitialTask] = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Загрузка актуальных данных
  const refreshData = async () => {
    if (window.gtdApi) {
      try {
        const allTasks = await window.gtdApi.getAllTasks();
        const allProjects = await window.gtdApi.getProjects();
        setTasks(allTasks || []);
        setProjects(allProjects || []);
      } catch (e) {
        console.warn('API error during refresh:', e);
      }
    }
  };

  // Горячая клавиша Ctrl+N для быстрого добавления
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Первоначальная загрузка данных и проверка активной сессии
  useEffect(() => {
    refreshData().then(async () => {
      if (window.gtdApi) {
        try {
          const session = await window.gtdApi.getActiveSession();
          if (session && session.status === 'in_progress') {
            setIsProcessingOpen(true);
          }
        } catch (e) {
          console.warn('Session check failed:', e);
        }
      }
    });
  }, []);

  const handleSaveTask = async (taskData: Partial<Task> & { title: string }) => {
    if (window.gtdApi) {
      try {
        const newTask = await window.gtdApi.createTask(taskData);
        setTasks((prev) => [newTask, ...prev]);
        if (taskData.destination && taskData.destination !== 'inbox') {
          setActiveTab(taskData.destination);
        }
        return;
      } catch (err) {
        console.error('Failed to save via IPC:', err);
      }
    }

    const mockTask: Task = {
      id: 'task_' + Date.now(),
      title: taskData.title,
      notes: taskData.notes,
      destination: taskData.destination || 'inbox',
      status: 'active',
      project_id: taskData.project_id,
      scheduled_date: taskData.scheduled_date,
      scheduled_time: taskData.scheduled_time,
      due_date: taskData.due_date,
      delegated_to: taskData.delegated_to,
      waiting_for: taskData.waiting_for,
      check_date: taskData.check_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks((prev) => [mockTask, ...prev]);
    if (taskData.destination && taskData.destination !== 'inbox') {
      setActiveTab(taskData.destination);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'active' : 'completed';
    if (window.gtdApi) {
      try {
        await window.gtdApi.updateTask(task.id, { status: newStatus });
        await refreshData();
        return;
      } catch (e) {
        console.error('Failed to toggle status:', e);
      }
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
  };

  const handleCreateProjectFromWizard = (sourceTask: Task) => {
    setProjectSourceTask(sourceTask);
    setIsProcessingOpen(false);
    setIsCreateProjectOpen(true);
  };

  const handleProjectCreated = async (result: { project: Project; firstStep: Task }) => {
    await refreshData();
    setIsCreateProjectOpen(false);
    setProjectSourceTask(null);

    // Первый шаг проекта начинает обработку напрямую с вопроса «Мне?»
    setWizardInitialTask(result.firstStep);
    setIsProcessingOpen(true);
  };

  const inboxTasks = tasks.filter((t) => t.destination === 'inbox' && t.status === 'active');
  const currentViewTasks = tasks.filter((t) => {
    if (activeTab === 'projects') return false;
    if (activeTab === 'completed') return t.status === 'completed';
    return t.destination === activeTab && t.status === 'active';
  });

  const getTabTitle = () => {
    switch (activeTab) {
      case 'next_actions': return 'Текущие действия';
      case 'inbox': return 'Корзина ГТД';
      case 'projects': return 'Проекты';
      case 'calendar': return 'Календарь';
      case 'waiting_for': return 'Делегирование и ожидание';
      case 'someday': return 'Когда-нибудь потом';
      case 'notes': return 'Заметки';
      case 'completed': return 'Завершённые';
      case 'trash': return 'Мусор';
      default: return 'ГТД';
    }
  };

  const getTabCount = () => {
    if (activeTab === 'projects') return projects.filter(p => p.status === 'active').length;
    if (activeTab === 'completed') return tasks.filter(t => t.status === 'completed').length + projects.filter(p => p.status === 'completed').length;
    if (activeTab === 'trash') return tasks.filter(t => t.destination === 'trash' || t.deleted_at != null).length;
    return currentViewTasks.length;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Левая боковая панель навигации */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        inboxCount={inboxTasks.length}
        onStartProcessing={() => {
          setWizardInitialTask(null);
          setIsProcessingOpen(true);
        }}
      />

      {/* Основная рабочая область */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Верхняя шапка */}
        <header className="h-16 border-b border-slate-200 px-8 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-slate-800">{getTabTitle()}</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {getTabCount()}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Кнопка быстрого разбора корзины в шапке */}
            {inboxTasks.length > 0 && activeTab !== 'inbox' && (
              <button
                onClick={() => {
                  setWizardInitialTask(null);
                  setIsProcessingOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Разобрать корзину ({inboxTasks.length})</span>
              </button>
            )}

            {/* Единая кнопка «+ Добавить» */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Горячая клавиша: Ctrl+N"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          </div>
        </header>

        {/* Тело раздела */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {activeTab === 'projects' && (
            <ProjectsView
              projects={projects}
              tasks={tasks}
              onOpenCreateProject={() => {
                setProjectSourceTask(null);
                setIsCreateProjectOpen(true);
              }}
              onRefreshData={refreshData}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => setIsAddModalOpen(true)}
            />
          )}

          {activeTab === 'waiting_for' && (
            <WaitingForView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => setIsAddModalOpen(true)}
            />
          )}

          {activeTab === 'someday' && (
            <SomedayView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => setIsAddModalOpen(true)}
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              tasks={tasks}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => setIsAddModalOpen(true)}
            />
          )}

          {activeTab === 'trash' && (
            <TrashView
              tasks={tasks}
              onTaskUpdated={refreshData}
            />
          )}

          {activeTab === 'completed' && (
            <CompletedView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
            />
          )}

          {(activeTab === 'next_actions' || activeTab === 'inbox') && (
            currentViewTasks.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Здесь пока ничего нет</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  {activeTab === 'inbox'
                    ? 'Все входящие задачи разобраны. Нажмите «+ Добавить», чтобы записать новую мысль.'
                    : 'Список текущих действий чист. Разобрав корзину, вы наполните этот список.'}
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Создать задачу</span>
                </button>
              </div>
            ) : (
              <div className="max-w-4xl space-y-2.5">
                {currentViewTasks.map((task) => {
                  const parentProject = task.project_id
                    ? projects.find((p) => p.id === task.project_id)
                    : null;

                  return (
                    <div
                      key={task.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow transition-shadow flex items-start justify-between group"
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => handleToggleTaskStatus(task)}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4
                              className={`text-sm font-medium ${
                                task.status === 'completed'
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800'
                              }`}
                            >
                              {task.title}
                            </h4>
                            {parentProject && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                📂 {parentProject.title}
                              </span>
                            )}
                          </div>
                          {task.notes && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.notes}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-slate-500">
                            {task.scheduled_date && (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                📅 {task.scheduled_date} {task.scheduled_time || ''}
                              </span>
                            )}
                            {task.delegated_to && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                👤 {task.delegated_to}
                              </span>
                            )}
                            {task.waiting_for && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                Ожидается: {task.waiting_for}
                              </span>
                            )}
                            {task.due_date && (
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                ⏱ дедлайн: {task.due_date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </main>

      {/* Модальное окно быстрого добавления задачи */}
      <QuickAddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveTask}
        projects={projects}
      />

      {/* Модальное окно создания проекта */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => {
          setIsCreateProjectOpen(false);
          setProjectSourceTask(null);
        }}
        sourceTask={projectSourceTask}
        onProjectCreated={handleProjectCreated}
      />

      {/* Полноэкранный мастер обработки корзины ГТД */}
      <ProcessingWizardModal
        isOpen={isProcessingOpen}
        onClose={() => {
          setIsProcessingOpen(false);
          setWizardInitialTask(null);
        }}
        inboxTasks={inboxTasks}
        projects={projects}
        initialTask={wizardInitialTask}
        initialQuestion={wizardInitialTask ? 'FOR_ME' : 'ACTIONABLE'}
        onTaskUpdated={refreshData}
        onCreateProjectRequested={handleCreateProjectFromWizard}
      />
    </div>
  );
};

export default App;
