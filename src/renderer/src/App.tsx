import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Inbox as InboxIcon, Play, Edit2, Trash2, Search } from 'lucide-react';
import { Navigation, NavigationTab } from './components/Navigation';
import { UniversalAddModal } from './components/UniversalAddModal';
import { EditTaskModal } from './components/EditTaskModal';
import { TaskContextMenu } from './components/TaskContextMenu';
import { ProcessingWizardModal } from './views/ProcessingWizard/ProcessingWizardModal';
import { ProjectsView } from './views/ProjectsView';
import { CalendarView } from './views/CalendarView';
import { WaitingForView } from './views/WaitingForView';
import { SomedayView } from './views/SomedayView';
import { NotesView } from './views/NotesView';
import { TrashView } from './views/TrashView';
import { CompletedView } from './views/CompletedView';
import { SyncView } from './views/SyncView';
import { SettingsView } from './views/SettingsView';
import { WindowTitleBar } from './components/WindowTitleBar';
import { UpdateBanner } from './components/UpdateBanner';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { useToast } from './components/ToastNotification';
import { Checkbox } from './components/Checkbox';
import { Task, Project, TaskDestination } from '@shared/types';
import { Language, getStoredLanguage, setStoredLanguage, translations } from './i18n/translations';

export const App: React.FC = () => {
  const { showToast } = useToast();
  // Стартовый экран по умолчанию — «Текущие действия»
  const [activeTab, setActiveTab] = useState<NavigationTab>('next_actions');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [universalAddInitialMode, setUniversalAddInitialMode] = useState<'quick' | 'full' | undefined>(undefined);
  const [explicitDestination, setExplicitDestination] = useState<TaskDestination | null>(null);
  const [isProcessingOpen, setIsProcessingOpen] = useState(false);
  const [projectSourceTask, setProjectSourceTask] = useState<Task | null>(null);

  // Для передачи конкретной задачи на обработку (по выбору пользователя)
  const [wizardInitialTask, setWizardInitialTask] = useState<Task | null>(null);

  // Редактирование и контекстное меню ПКМ
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [nextActionsSearch, setNextActionsSearch] = useState('');
  const [inboxSearch, setInboxSearch] = useState('');
  const [availableUpdate, setAvailableUpdate] = useState<{
    version: string;
    releaseName?: string;
  } | null>(null);

  // Тема оформления: 'system' (по умолчанию), 'light' или 'dark'
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>(() => {
    return (localStorage.getItem('gtd-theme-mode') as 'system' | 'light' | 'dark') || 'system';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = (localStorage.getItem('gtd-theme-mode') as 'system' | 'light' | 'dark') || 'system';
    if (savedMode === 'dark') return true;
    if (savedMode === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const applyTheme = () => {
      let isDark = false;
      if (themeMode === 'system') {
        isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = themeMode === 'dark';
      }
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('gtd-theme-mode', themeMode);

    if (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeMode]);

  const handleThemeModeChange = (mode: 'system' | 'light' | 'dark') => {
    setThemeMode(mode);
  };

  const toggleTheme = () => {
    if (isDarkMode) {
      handleThemeModeChange('light');
    } else {
      handleThemeModeChange('dark');
    }
  };

  // Язык интерфейса
  const [language, setLanguage] = useState<Language>(() => {
    return getStoredLanguage();
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setStoredLanguage(lang);
  };

  // Настройка вкладки по умолчанию для быстрого добавления: 'inbox' (по умолчанию) или 'current_menu'
  const [defaultCaptureTab, setDefaultCaptureTab] = useState<'inbox' | 'current_menu'>(() => {
    return (localStorage.getItem('gtd-default-capture-tab') as 'inbox' | 'current_menu') || 'inbox';
  });

  const handleDefaultCaptureTabChange = (val: 'inbox' | 'current_menu') => {
    setDefaultCaptureTab(val);
    localStorage.setItem('gtd-default-capture-tab', val);
  };

  // Загрузка актуальных данных
  const refreshData = async () => {
    if (window.gtdApi) {
      try {
        const [allTasks, trashTasks, allProjects] = await Promise.all([
          window.gtdApi.getAllTasks(),
          window.gtdApi.getTrashTasks(),
          window.gtdApi.getProjects(),
        ]);
        setTasks([...(allTasks || []), ...(trashTasks || [])]);
        setProjects(allProjects || []);
      } catch (e) {
        console.warn('API error during refresh:', e);
      }
    }
  };

  // Открытие подробного модального окна добавления с контекстом текущей вкладки
  const openAddModal = (customDest?: TaskDestination) => {
    setExplicitDestination(customDest || null);
    setUniversalAddInitialMode('full');
    setIsAddModalOpen(true);
  };

  const openRapidAddModal = () => {
    setExplicitDestination(null);
    setUniversalAddInitialMode(undefined);
    setIsAddModalOpen(true);
  };

  // Горячая клавиша Ctrl+N для быстрого добавления задач
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isNKey = e.code === 'KeyN' || e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'т';
      if ((e.ctrlKey || e.metaKey) && isNKey) {
        e.preventDefault();
        openRapidAddModal();
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

  // Автоматическая проверка наличия обновлений при запуске приложения
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!window.gtdApi?.checkUpdate) return;
      try {
        const update = await window.gtdApi.checkUpdate();
        if (!isMounted) return;
        if (update && update.hasUpdate) {
          setAvailableUpdate({
            version: update.latestVersion || '',
            releaseName: update.releaseName,
          });
          showToast(`Доступно обновление: ${update.releaseName || update.latestVersion}!`, 'info', 6000);
        }
      } catch (e) {
        console.warn('Auto-update check on startup error:', e);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
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

  // Быстрое непрерывное сохранение из плюсика (в Корзину или выбранную вкладку)
  const handleRapidSaveTask = async (title: string, destination: TaskDestination = 'inbox') => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (window.gtdApi) {
      try {
        const newTask = await window.gtdApi.createTask({
          title,
          destination,
          status: 'active',
          scheduled_date: destination === 'calendar' ? todayStr : undefined,
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
      scheduled_date: destination === 'calendar' ? todayStr : undefined,
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

  // Контекстное меню ПКМ
  const handleTaskContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuTask(task);
  };

  // Сохранение изменений отредактированной задачи
  const handleSaveEditedTask = async (taskId: string, updates: Partial<Task>) => {
    if (window.gtdApi) {
      try {
        await window.gtdApi.updateTask(taskId, updates);
        await refreshData();
        return;
      } catch (e) {
        console.error('Failed to update task:', e);
      }
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
  };

  // Запрос на удаление задачи (открывает красивое окно подтверждения)
  const handleDeleteTask = (taskOrId: Task | string) => {
    if (typeof taskOrId === 'string') {
      const found = tasks.find((t) => t.id === taskOrId);
      if (found) {
        setTaskToDelete(found);
      }
    } else {
      setTaskToDelete(taskOrId);
    }
  };

  // Подтверждение перемещения в Мусор
  const handleConfirmSoftDelete = async () => {
    if (!taskToDelete) return;
    if (window.gtdApi) {
      try {
        await window.gtdApi.deleteTask(taskToDelete.id, false);
        await refreshData();
      } catch (e) {
        console.error('Failed to move task to trash:', e);
      }
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskToDelete.id ? { ...t, destination: 'trash' } : t))
      );
    }
    setTaskToDelete(null);
  };

  // Перемещение задачи в другое место назначения
  const handleMoveTaskDestination = async (task: Task, destination: TaskDestination) => {
    if (window.gtdApi) {
      try {
        const updates: Partial<Task> = { destination };
        if (destination === 'calendar' && !task.scheduled_date) {
          updates.scheduled_date = new Date().toISOString().split('T')[0];
        }
        await window.gtdApi.updateTask(task.id, updates);
        await refreshData();
        return;
      } catch (e) {
        console.error('Failed to move task:', e);
      }
    }
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
    setUniversalAddInitialMode('full');
    setIsAddModalOpen(true);
  };

  // Списки задач для разделов
  const allNextActions = tasks.filter((t) => t.destination === 'next_actions' && t.status === 'active' && !t.deleted_at);
  const nextActionsQ = nextActionsSearch.toLowerCase().trim();
  const nextActionsTasks = allNextActions.filter((t) => {
    if (!nextActionsQ) return true;
    return t.title.toLowerCase().includes(nextActionsQ) || Boolean(t.notes && t.notes.toLowerCase().includes(nextActionsQ));
  });

  const allInboxTasks = tasks.filter((t) => t.destination === 'inbox' && t.status === 'active' && !t.deleted_at);
  const inboxQ = inboxSearch.toLowerCase().trim();
  const inboxTasks = allInboxTasks.filter((t) => {
    if (!inboxQ) return true;
    return t.title.toLowerCase().includes(inboxQ) || Boolean(t.notes && t.notes.toLowerCase().includes(inboxQ));
  });

  const t = translations[language] || translations.ru;

  const getTabTitle = () => {
    switch (activeTab) {
      case 'next_actions':
        return t.navNextActions;
      case 'inbox':
        return t.navInbox;
      case 'projects':
        return t.navProjects;
      case 'calendar':
        return t.navCalendar;
      case 'waiting_for':
        return t.navWaitingFor;
      case 'someday':
        return t.navSomeday;
      case 'notes':
        return t.navNotes;
      case 'completed':
        return t.navCompleted;
      case 'trash':
        return t.navTrash;
      case 'sync':
        return t.navSync;
      case 'settings':
        return t.navSettings;
      default:
        return 'Arspective GTD';
    }
  };

  const getTabCount = () => {
    const t = translations[language];
    if (activeTab === 'projects') return `${projects.length} ${t.pcs}`;
    if (activeTab === 'sync') return t.wifiNetwork;
    if (activeTab === 'settings') return t.parameters;
    if (activeTab === 'inbox') return `${allInboxTasks.length} ${t.pcs}`;
    if (activeTab === 'next_actions') return `${allNextActions.length} ${t.pcs}`;
    return `${tasks.filter((t) => t.destination === activeTab && !t.deleted_at).length} ${t.pcs}`;
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Интегрированная верхняя панель приложения без строки поиска */}
        <WindowTitleBar 
          tabTitle={getTabTitle()} 
          tabCount={getTabCount()}
          language={language}
        />

        {/* Информационный баннер об обнаруженном обновлении */}
        {availableUpdate && (
          <UpdateBanner
            version={availableUpdate.version}
            releaseName={availableUpdate.releaseName}
            onGoToSettings={() => {
              setActiveTab('settings');
              setAvailableUpdate(null);
            }}
            onDismiss={() => setAvailableUpdate(null)}
          />
        )}

        <div className="flex flex-1 overflow-hidden relative">
          {/* Боковая панель навигации Arspective GTD */}
          <Navigation
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            inboxCount={allInboxTasks.length}
            onStartProcessing={() => {
              setWizardInitialTask(null);
              setIsProcessingOpen(true);
            }}
            language={language}
          />

        {/* Основная рабочая область */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#191919] transition-colors relative">
          {/* Тело раздела */}
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-[#191919] transition-colors pb-24">
          {activeTab === 'projects' && (
            <ProjectsView
              projects={projects}
              tasks={tasks}
              onOpenCreateProject={() => {
                setProjectSourceTask(null);
                setUniversalAddInitialMode('full');
                setIsAddModalOpen(true);
              }}
              onRefreshData={refreshData}
              onProcessTask={handleProcessSingleTask}
              language={language}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => openAddModal('calendar')}
              onTaskContextMenu={handleTaskContextMenu}
              language={language}
            />
          )}

          {activeTab === 'waiting_for' && (
            <WaitingForView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => openAddModal('waiting_for')}
              onTaskContextMenu={handleTaskContextMenu}
              onEditTask={setEditingTask}
              language={language}
            />
          )}

          {activeTab === 'someday' && (
            <SomedayView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => openAddModal('someday')}
              onTaskContextMenu={handleTaskContextMenu}
              onEditTask={setEditingTask}
              language={language}
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              tasks={tasks}
              onTaskUpdated={refreshData}
              onOpenAddTask={() => openAddModal('notes')}
              language={language}
            />
          )}

          {activeTab === 'trash' && (
            <TrashView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              language={language}
            />
          )}

          {activeTab === 'completed' && (
            <CompletedView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={refreshData}
              language={language}
            />
          )}

          {activeTab === 'sync' && (
            <SyncView onRefreshData={refreshData} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              themeMode={themeMode}
              onChangeThemeMode={handleThemeModeChange}
              language={language}
              onChangeLanguage={handleLanguageChange}
              onOpenSync={() => setActiveTab('sync')}
              defaultCaptureTab={defaultCaptureTab}
              onChangeDefaultCaptureTab={handleDefaultCaptureTabChange}
            />
          )}

          {/* Специальное представление для «Корзина ГТД»: разбор по выбору или по очереди */}
          {activeTab === 'inbox' && (
            allInboxTasks.length === 0 ? (
              <div className="w-full max-w-6xl mx-auto h-full min-h-[320px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-3.5 shadow-sm">
                  <InboxIcon className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">{t.inboxEmptyTitle}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
                  {t.inboxEmptyDesc}
                </p>
                <button
                  onClick={() => setIsRapidCaptureOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-[#282828] hover:bg-zinc-200 dark:hover:bg-[#323232] border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.inboxCaptureBtn}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 w-full max-w-6xl mx-auto">
                {/* Панель поиска и действий в стиле NotesView */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
                    <input
                      type="text"
                      value={inboxSearch}
                      onChange={(e) => setInboxSearch(e.target.value)}
                      placeholder={t.inboxSearchPlaceholder}
                      className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setWizardInitialTask(null);
                      setIsProcessingOpen(true);
                    }}
                    className="flex items-center space-x-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t.inboxProcessAll}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t.inboxHint}
                  </p>
                </div>

                {inboxTasks.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
                    <InboxIcon className="w-8 h-8 text-zinc-400 mb-2" />
                    <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t.notFoundTitle}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {t.notFoundDesc}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {inboxTasks.map((task) => {
                      const parentProject = task.project_id
                        ? projects.find((p) => p.id === task.project_id)
                        : null;

                      return (
                        <div
                          key={task.id}
                          onContextMenu={(e) => handleTaskContextMenu(e, task)}
                          className="p-4 bg-white dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-all flex items-center justify-between group cursor-context-menu"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{task.title}</h4>
                              {parentProject && (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#282828] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0">
                                  📂 {parentProject.title}
                                </span>
                              )}
                            </div>
                            {task.notes && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{task.notes}</p>
                            )}
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">
                              {t.inboxAddedAt}: {new Date(task.created_at).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU')}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {/* Кнопка выборочного разбора */}
                            <button
                              onClick={() => handleProcessSingleTask(task)}
                              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                              title={t.inboxProcessSingle}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{t.inboxProcessSingle}</span>
                            </button>

                            {/* Кнопки редактирования и удаления */}
                            <button
                              onClick={() => setEditingTask(task)}
                              className="p-2 rounded-xl bg-zinc-100 dark:bg-[#2c2c2c] hover:bg-zinc-200 dark:hover:bg-[#353535] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                              title={t.edit}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setTaskToDelete(task)}
                              className="p-2 rounded-xl bg-zinc-100 dark:bg-[#2c2c2c] hover:bg-rose-100 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title={t.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {/* Представление «Текущие действия» */}
          {activeTab === 'next_actions' && (
            <div className="space-y-4 w-full max-w-6xl mx-auto">
              {/* Панель поиска и добавления в стиле NotesView */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
                  <input
                    type="text"
                    value={nextActionsSearch}
                    onChange={(e) => setNextActionsSearch(e.target.value)}
                    placeholder={t.nextActionsSearchPlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
                  />
                </div>

                <button
                  onClick={() => openAddModal('next_actions')}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.nextActionsAddBtn}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t.nextActionsHint}
                </p>
              </div>

              {allNextActions.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-3.5 shadow-sm">
                    <CheckSquare className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">{t.nextActionsEmptyTitle}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
                    {t.nextActionsEmptyDesc}
                  </p>
                  <button
                    onClick={() => openAddModal('next_actions')}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.nextActionsAddBtn}</span>
                  </button>
                </div>
              ) : nextActionsTasks.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
                  <CheckSquare className="w-8 h-8 text-zinc-400 mb-2" />
                  <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t.notFoundTitle}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {t.notFoundDesc}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {nextActionsTasks.map((task) => {
                    const parentProject = task.project_id
                      ? projects.find((p) => p.id === task.project_id)
                      : null;

                    return (
                      <div
                        key={task.id}
                        onContextMenu={(e) => handleTaskContextMenu(e, task)}
                        className="p-4 bg-white dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-all flex items-start justify-between group cursor-context-menu"
                      >
                        <div className="flex items-start space-x-3.5 flex-1 min-w-0 mr-4">
                          <div className="pt-0.5">
                            <Checkbox
                              checked={task.status === 'completed'}
                              onChange={() => handleToggleTaskStatus(task)}
                              title="Отметить выполненным"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4
                                className={`text-sm font-semibold truncate ${
                                  task.status === 'completed'
                                    ? 'line-through text-zinc-400 dark:text-zinc-500'
                                    : 'text-zinc-900 dark:text-zinc-100'
                                }`}
                              >
                                {task.title}
                              </h4>
                              {parentProject && (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#282828] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0">
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

                        {/* Явные кнопки редактирования и удаления на карточке */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => setEditingTask(task)}
                            className="p-2 rounded-xl bg-zinc-100 dark:bg-[#2c2c2c] hover:bg-zinc-200 dark:hover:bg-[#353535] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                            title="Редактировать задачу (или нажмите ПКМ)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTaskToDelete(task)}
                            className="p-2 rounded-xl bg-zinc-100 dark:bg-[#2c2c2c] hover:bg-rose-100 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Удалить задачу (или нажмите ПКМ)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Самая нижняя кнопка добавления («+» / Ctrl+N) */}
        <button
          onClick={openRapidAddModal}
          className="fixed bottom-6 right-8 w-14 h-14 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xl flex items-center justify-center transition-colors cursor-pointer z-40 border border-zinc-700/20 dark:border-zinc-300/20"
          title="Добавить задачу / мысль (Ctrl+N)"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </main>
      </div>

      {/* Единое модальное окно добавления с ровными вкладками */}
      <UniversalAddModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setProjectSourceTask(null);
          setUniversalAddInitialMode(undefined);
          setExplicitDestination(null);
        }}
        currentTab={activeTab}
        defaultCaptureSetting={defaultCaptureTab}
        targetDestination={explicitDestination}
        initialMode={universalAddInitialMode}
        projects={projects}
        onSaveTask={handleSaveTask}
        onRapidSaveTask={handleRapidSaveTask}
        onProjectCreated={handleProjectCreated}
        sourceTask={projectSourceTask}
        language={language}
        isDarkMode={isDarkMode}
      />

      {/* Модальное окно редактирования задачи (по клику на карандаш или через ПКМ) */}
      <EditTaskModal
        task={editingTask}
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEditedTask}
        onDelete={handleDeleteTask}
        projects={projects}
        language={language}
        isDarkMode={isDarkMode}
      />

      {/* Контекстное меню ПКМ (правый клик мыши) */}
      <TaskContextMenu
        task={contextMenuTask}
        position={contextMenuPos}
        onClose={() => setContextMenuPos(null)}
        onEdit={(t) => setEditingTask(t)}
        onDelete={(t) => setTaskToDelete(t)}
        onToggleStatus={(t) => handleToggleTaskStatus(t)}
        onProcess={handleProcessSingleTask}
        onMoveToDestination={(t, dest) => handleMoveTaskDestination(t, dest)}
      />

      {/* Красивое всплывающее окно подтверждения удаления задачи */}
      <ConfirmDeleteModal
        isOpen={Boolean(taskToDelete)}
        title={taskToDelete?.title || ''}
        isPermanent={false}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmSoftDelete}
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
