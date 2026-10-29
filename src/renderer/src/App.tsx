import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Inbox as InboxIcon, Play } from 'lucide-react';
import { Navigation, NavigationTab } from './components/Navigation';
import { QuickAddTaskModal } from './components/QuickAddTaskModal';
import { RapidCaptureModal } from './components/RapidCaptureModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ProcessingWizardModal } from './views/ProcessingWizard/ProcessingWizardModal';
import { ProjectsView } from './views/ProjectsView';
import { CalendarView } from './views/CalendarView';
import { WaitingForView } from './views/WaitingForView';
import { SomedayView } from './views/SomedayView';
import { NotesView } from './views/NotesView';
import { TrashView } from './views/TrashView';
import { CompletedView } from './views/CompletedView';
import { Task, Project, TaskDestination } from '@shared/types';

export const App: React.FC = () => {
  // Стартовый экран по умолчанию — «Текущие действия»
  const [activeTab, setActiveTab] = useState<NavigationTab>('next_actions');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRapidCaptureOpen, setIsRapidCaptureOpen] = useState(false);
  const [modalDefaultDest, setModalDefaultDest] = useState<TaskDestination>('next_actions');
  const [isProcessingOpen, setIsProcessingOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectSourceTask, setProjectSourceTask] = useState<Task | null>(null);

  // Для передачи конкретной задачи на обработку (по выбору пользователя)
  const [wizardInitialTask, setWizardInitialTask] = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Тёмная тема
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('gtd-theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gtd-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gtd-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

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

  // Открытие подробного модального окна добавления с контекстом текущей вкладки
  const openAddModal = (customDest?: TaskDestination) => {
    if (customDest) {
      setModalDefaultDest(customDest);
    } else if (activeTab === 'next_actions') {
      setModalDefaultDest('next_actions');
    } else if (activeTab === 'calendar') {
      setModalDefaultDest('calendar');
    } else if (activeTab === 'waiting_for') {
      setModalDefaultDest('waiting_for');
    } else if (activeTab === 'someday') {
      setModalDefaultDest('someday');
    } else if (activeTab === 'notes') {
      setModalDefaultDest('notes');
    } else {
      setModalDefaultDest('inbox');
    }
    setIsAddModalOpen(true);
  };

  // Горячая клавиша Ctrl+N для быстрого непрерывного добавления задач
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsRapidCaptureOpen(true);
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
        if (taskData.destination && taskData.destination !== activeTab && activeTab !== 'inbox') {
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
  };

  // Быстрое сохранение из RapidCaptureModal (поддерживает цикл Enter -> Enter)
  const handleRapidSaveTask = async (title: string, destination: TaskDestination) => {
    if (window.gtdApi) {
      try {
        const newTask = await window.gtdApi.createTask({
          title,
          destination,
          status: 'active',
        });
        setTasks((prev) => [newTask, ...prev]);
        return;
      } catch (err) {
        console.error('Failed to rapid save via IPC:', err);
      }
    }

    const mockTask: Task = {
      id: 'task_' + Date.now(),
      title,
      destination,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks((prev) => [mockTask, ...prev]);
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'active' : 'completed';
    if (window.gtdApi) {
      try {
        await window.gtdApi.updateTask(task.id, { status: nextStatus });
        await refreshData();
        return;
      } catch (e) {
        console.error(e);
      }
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
  };

  // Обработка создания проекта (с переходом к первому шагу в визарде)
  const handleProjectCreated = async (result: { project: Project; firstStep: Task }) => {
    await refreshData();
    setWizardInitialTask(result.firstStep);
    setIsProcessingOpen(true);
  };

  // Запуск мастера обработки для конкретной выбранной задачи
  const handleProcessSingleTask = (task: Task) => {
    setWizardInitialTask(task);
    setIsProcessingOpen(true);
  };

  // Обработка перехода в создание проекта из мастера обработки
  const handleCreateProjectFromWizard = (task: Task) => {
    setIsProcessingOpen(false);
    setProjectSourceTask(task);
    setIsCreateProjectOpen(true);
  };

  // Фильтрация текущего списка задач
  const currentViewTasks = tasks.filter((t) => {
    if (activeTab === 'completed') return t.status === 'completed';
    if (activeTab === 'projects') return false;
    return t.destination === activeTab && t.status === 'active';
  });

  const inboxTasks = tasks.filter((t) => t.destination === 'inbox' && t.status === 'active');

  const getTabTitle = () => {
    switch (activeTab) {
      case 'next_actions':
        return 'Текущие действия';
      case 'inbox':
        return 'Корзина ГТД';
      case 'projects':
        return 'Проекты';
      case 'calendar':
        return 'Календарь';
      case 'waiting_for':
        return 'Делегирование / Ожидание';
      case 'someday':
        return 'Когда-нибудь потом';
      case 'notes':
        return 'Заметки';
      case 'completed':
        return 'Завершённые';
      case 'trash':
        return 'Мусор';
      default:
        return 'Задачи';
    }
  };

  const getTabCount = () => {
    if (activeTab === 'projects') return `${projects.length} шт.`;
    return `${currentViewTasks.length} шт.`;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Боковая панель навигации Arspective GTD */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        inboxCount={inboxTasks.length}
        onStartProcessing={() => {
          setWizardInitialTask(null);
          setIsProcessingOpen(true);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Основная рабочая область */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#191919] transition-colors relative">
        {/* Верхняя шапка: чистая, свободная, просторная */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 px-8 flex items-center justify-between shrink-0 bg-white dark:bg-[#191919]">
          <div className="flex items-center space-x-3.5">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{getTabTitle()}</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#252525] text-zinc-600 dark:text-zinc-400">
              {getTabCount()}
            </span>
          </div>

          <div className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:block">
            Нажмите <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-[#282828] border border-zinc-300 dark:border-zinc-700 text-[11px] font-mono">Ctrl+N</kbd> для быстрой записи
          </div>
        </header>

        {/* Тело раздела */}
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-[#191919] transition-colors pb-24">
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
              onOpenAddTask={() => openAddModal('calendar')}
            />
          )}

          {activeTab === 'waiting_for' && (
            <WaitingForView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => openAddModal('waiting_for')}
            />
          )}

          {activeTab === 'someday' && (
            <SomedayView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => openAddModal('someday')}
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              tasks={tasks}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => openAddModal('notes')}
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

          {/* Специальное представление для «Корзина ГТД»: разбор по выбору или по очереди */}
          {activeTab === 'inbox' && (
            inboxTasks.length === 0 ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-3.5 shadow-sm">
                  <InboxIcon className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">Корзина пуста</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
                  Все входящие мысли и задачи обработаны. Нажмите кнопку «+» внизу, чтобы записать новую мысль.
                </p>
                <button
                  onClick={() => setIsRapidCaptureOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-[#282828] hover:bg-zinc-200 dark:hover:bg-[#323232] border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Записать мысль в корзину</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Вы можете разобрать все задачи подряд либо выбрать конкретную задачу для обработки:
                  </p>
                  <button
                    onClick={() => {
                      setWizardInitialTask(null);
                      setIsProcessingOpen(true);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Разобрать по порядку</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {inboxTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 bg-white dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{task.title}</h4>
                        {task.notes && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{task.notes}</p>
                        )}
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">
                          Добавлено: {new Date(task.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>

                      {/* Кнопка выборочного разбора этой конкретной задачи */}
                      <button
                        onClick={() => handleProcessSingleTask(task)}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-[#2c2c2c] dark:hover:bg-[#353535] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ml-4"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Разобрать</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Представление «Текущие действия» */}
          {activeTab === 'next_actions' && (
            <div className="space-y-4 max-w-4xl">
              {/* Позиция кнопки добавления текущего действия на той же позиции, что и в других разделах */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Список конкретных ближайших действий, готовых к выполнению.
                </p>
                <button
                  onClick={() => openAddModal('next_actions')}
                  className="flex items-center space-x-2 px-5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить текущее действие</span>
                </button>
              </div>

              {currentViewTasks.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-3.5 shadow-sm">
                    <CheckSquare className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">Список текущих действий чист</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
                    Здесь находятся конкретные действия, готовые к выполнению.
                  </p>
                  <button
                    onClick={() => openAddModal('next_actions')}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Добавить действие</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentViewTasks.map((task) => {
                    const parentProject = task.project_id
                      ? projects.find((p) => p.id === task.project_id)
                      : null;

                    return (
                      <div
                        key={task.id}
                        className="p-4 bg-white dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-all flex items-start justify-between group"
                      >
                        <div className="flex items-start space-x-3.5">
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={() => handleToggleTaskStatus(task)}
                            className="mt-1 w-5 h-5 rounded-full border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4
                                className={`text-sm font-semibold ${
                                  task.status === 'completed'
                                    ? 'line-through text-zinc-400 dark:text-zinc-500'
                                    : 'text-zinc-900 dark:text-zinc-100'
                                }`}
                              >
                                {task.title}
                              </h4>
                              {parentProject && (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#282828] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  📂 {parentProject.title}
                                </span>
                              )}
                            </div>
                            {task.notes && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{task.notes}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                              {task.scheduled_date && (
                                <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#282828] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  📅 {task.scheduled_date} {task.scheduled_time || ''}
                                </span>
                              )}
                              {task.delegated_to && (
                                <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#282828] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  👤 {task.delegated_to}
                                </span>
                              )}
                              {task.waiting_for && (
                                <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#282828] text-zinc-600 dark:text-zinc-300">
                                  Ожидается: {task.waiting_for}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#282828] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold">
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
              )}
            </div>
          )}
        </div>

        {/* Самая нижняя кнопка добавления просто плюсиком (Floating Action Button) */}
        <button
          onClick={() => setIsRapidCaptureOpen(true)}
          className="fixed bottom-6 right-8 w-14 h-14 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer z-40 border border-zinc-700/20 dark:border-zinc-300/20"
          title="Быстрое добавление задач (Ctrl+N)"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </main>

      {/* Быстрое непрерывное добавление задач (Enter -> сохранить и следующая, Esc -> закрыть, всплывающее уведомление) */}
      <RapidCaptureModal
        isOpen={isRapidCaptureOpen}
        onClose={() => setIsRapidCaptureOpen(false)}
        onSaveTask={handleRapidSaveTask}
        currentTab={activeTab}
      />

      {/* Модальное окно подробного добавления задачи с контекстным назначением */}
      <QuickAddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveTask}
        projects={projects}
        defaultDestination={modalDefaultDest}
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
        initialQuestion={wizardInitialTask?.project_id ? 'FOR_ME' : 'ACTIONABLE'}
        onTaskUpdated={refreshData}
        onCreateProjectRequested={handleCreateProjectFromWizard}
      />
    </div>
  );
};

export default App;
