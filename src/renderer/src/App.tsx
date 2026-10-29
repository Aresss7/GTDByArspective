import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, AlertCircle } from 'lucide-react';
import { Navigation, NavigationTab } from './components/Navigation';
import { QuickAddTaskModal } from './components/QuickAddTaskModal';
import { Task, Project, TaskDestination } from '@shared/types';

export const App: React.FC = () => {
  // Стартовый экран по умолчанию — «Текущие действия»
  const [activeTab, setActiveTab] = useState<NavigationTab>('next_actions');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProcessingOpen, setIsProcessingOpen] = useState(false);

  // Горячая клавиша Ctrl+N / Cmd+N для быстрого добавления
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

  // Первоначальная загрузка данных через IPC или локальное состояние
  useEffect(() => {
    const loadInitialData = async () => {
      if (window.gtdApi) {
        try {
          const allTasks = await window.gtdApi.getAllTasks();
          const allProjects = await window.gtdApi.getProjects();
          setTasks(allTasks || []);
          setProjects(allProjects || []);
        } catch (e) {
          console.warn('API call failed or not yet initialized in main process:', e);
        }
      }
    };
    loadInitialData();
  }, []);

  const handleSaveTask = async (taskData: Partial<Task> & { title: string }) => {
    if (window.gtdApi) {
      try {
        const newTask = await window.gtdApi.createTask(taskData);
        setTasks((prev) => [newTask, ...prev]);
        // Если задача добавлена не в корзину, переключаем на соответствующий раздел
        if (taskData.destination && taskData.destination !== 'inbox') {
          setActiveTab(taskData.destination);
        }
        return;
      } catch (err) {
        console.error('Failed to save via IPC:', err);
      }
    }

    // Резервное локальное добавление (для dev-режима без IPC)
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
      case 'completed': return 'Завершённые задачи';
      case 'trash': return 'Мусор';
      default: return 'ГТД';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Левая боковая панель навигации */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        inboxCount={inboxTasks.length}
        onStartProcessing={() => setIsProcessingOpen(true)}
      />

      {/* Основная рабочая область */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Верхняя шапка */}
        <header className="h-16 border-b border-slate-200 px-8 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-slate-800">{getTabTitle()}</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {activeTab === 'projects' ? projects.length : currentViewTasks.length}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Кнопка быстрого разбора корзины в шапке */}
            {inboxTasks.length > 0 && activeTab !== 'inbox' && (
              <button
                onClick={() => setIsProcessingOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Разобрать корзину ({inboxTasks.length})</span>
              </button>
            )}

            {/* Единая кнопка «+ Добавить» */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
              title="Горячая клавиша: Ctrl+N"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          </div>
        </header>

        {/* Тело раздела */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {currentViewTasks.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Здесь пока ничего нет</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                {activeTab === 'inbox'
                  ? 'Все входящие задачи разобраны. Нажмите «+ Добавить», чтобы записать новую мысль.'
                  : activeTab === 'next_actions'
                  ? 'Список текущих действий чист. Разобрав корзину, вы наполните этот список.'
                  : 'Задачи для этого раздела отсутствуют.'}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать первую задачу</span>
              </button>
            </div>
          ) : (
            <div className="max-w-4xl space-y-2.5">
              {currentViewTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow transition-shadow flex items-start justify-between group"
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => {
                        const newStatus = task.status === 'completed' ? 'active' : 'completed';
                        setTasks((prev) =>
                          prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
                        );
                      }}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div>
                      <h4
                        className={`text-sm font-medium ${
                          task.status === 'completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-800'
                        }`}
                      >
                        {task.title}
                      </h4>
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
                        {task.due_date && (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            ⏱ дедлайн: {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  );
};

export default App;
