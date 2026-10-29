import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { Task, Project } from '@shared/types';

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
}

type CalendarMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  projects,
  onTaskUpdated,
  onOpenAddTask,
}) => {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const [newDateInput, setNewDateInput] = useState('');
  const [newTimeInput, setNewTimeInput] = useState('');

  // Форматирование даты в YYYY-MM-DD (локальное время)
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDateKey(new Date());
  const selectedDateStr = formatDateKey(selectedDate);

  // Навигация по датам
  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (mode === 'month') d.setMonth(d.getMonth() - 1);
    else if (mode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (mode === 'month') d.setMonth(d.getMonth() + 1);
    else if (mode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Перенос задачи на новую дату
  const handleSaveReschedule = async () => {
    if (!rescheduleTask || !newDateInput || !window.gtdApi) return;
    if (newDateInput < todayStr) {
      alert('Нельзя переносить задачу на прошедшую дату.');
      return;
    }
    try {
      await window.gtdApi.updateTask(rescheduleTask.id, {
        destination: 'calendar',
        scheduled_date: newDateInput,
        scheduled_time: newTimeInput || null,
      });
      setRescheduleTask(null);
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  // Выполнение / отмена выполнения задачи прямо из календаря
  const handleToggleTaskStatus = async (task: Task) => {
    if (!window.gtdApi) return;
    const newStatus = task.status === 'completed' ? 'active' : 'completed';
    try {
      await window.gtdApi.updateTask(task.id, { status: newStatus });
      await onTaskUpdated();
    } catch (e) {
      console.error('Failed to toggle status from calendar:', e);
    }
  };

  const tasksForSelectedDay = tasks.filter((t) => t.scheduled_date === selectedDateStr);

  // Проверка на просроченность
  const isOverdue = (task: Task): boolean => {
    if (!task.due_date || task.status === 'completed') return false;
    return task.due_date < todayStr;
  };

  // Генерация дней для вида "Месяц"
  const renderMonthGrid = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDay.getDate();
    const gridCells = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      gridCells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      gridCells.push(new Date(year, month, day));
    }

    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return (
      <div className="bg-white dark:bg-[#222222] rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Шапка дней недели */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1e1e1e] text-center text-xs font-bold text-zinc-500 dark:text-zinc-400 py-3">
          {weekDays.map((w, idx) => (
            <div key={idx} className={idx >= 5 ? 'text-zinc-400 dark:text-zinc-500' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* Сетка чисел */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-100 dark:divide-zinc-800/80 min-h-[460px]">
          {gridCells.map((date, idx) => {
            if (!date) {
              return <div key={idx} className="bg-zinc-50/40 dark:bg-[#191919] p-2 min-h-[90px]" />;
            }

            const dateStr = formatDateKey(date);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDateStr;
            const dayTasks = tasks.filter((t) => t.scheduled_date === dateStr);
            const activeDayTasks = dayTasks.filter((t) => t.status === 'active');

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={`p-2.5 min-h-[95px] cursor-pointer transition-colors flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-zinc-100 dark:bg-[#2a2a2a] ring-2 ring-zinc-900 dark:ring-zinc-400 ring-inset' 
                    : 'hover:bg-zinc-50 dark:hover:bg-[#252525]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isToday
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                        : isSelected
                        ? 'bg-zinc-200 dark:bg-[#353535] text-zinc-900 dark:text-white'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {activeDayTasks.length > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-purple-900/50 text-indigo-800 dark:text-purple-300">
                      {activeDayTasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className={`text-[10px] truncate px-2 py-0.5 rounded-lg border font-medium ${
                        t.status === 'completed'
                          ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 line-through border-transparent'
                          : 'bg-indigo-50 dark:bg-purple-950/50 text-indigo-900 dark:text-purple-200 border-indigo-200/50 dark:border-purple-800/50'
                      }`}
                      title={t.title}
                    >
                      {t.scheduled_time ? `${t.scheduled_time} ` : ''}
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium pl-1">
                      + ещё {dayTasks.length - 2}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Генерация дней для вида "Неделя"
  const renderWeekGrid = () => {
    const startOfWeek = new Date(selectedDate);
    let dayOfWeek = startOfWeek.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      weekDays.push(d);
    }

    const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((d, idx) => {
          const dateStr = formatDateKey(d);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDateStr;
          const dayTasks = tasks.filter((t) => t.scheduled_date === dateStr);

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(d)}
              className={`p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border transition-all flex flex-col min-h-[320px] cursor-pointer ${
                isSelected
                  ? 'border-indigo-500 dark:border-purple-400 ring-2 ring-indigo-500/20 dark:ring-purple-400/20 shadow-md'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="pb-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 block uppercase">
                    {dayNames[idx]}
                  </span>
                  <span className={`text-base font-extrabold ${isToday ? 'text-indigo-600 dark:text-purple-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                    {d.getDate()}
                  </span>
                </div>
                {isToday && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-purple-900/60 text-indigo-800 dark:text-purple-200">
                    Сегодня
                  </span>
                )}
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={(e) => e.stopPropagation()}
                    className={`p-2.5 rounded-xl border text-xs transition-all flex items-start space-x-2 ${
                      t.status === 'completed'
                        ? 'bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500'
                        : 'bg-indigo-50/70 dark:bg-purple-950/40 border-indigo-200/60 dark:border-purple-800/50 text-zinc-800 dark:text-zinc-200 shadow-sm'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={t.status === 'completed'}
                      onChange={() => handleToggleTaskStatus(t)}
                      className="mt-0.5 w-4 h-4 rounded-full border-zinc-300 dark:border-zinc-600 text-indigo-600 dark:text-purple-500 focus:ring-indigo-500 cursor-pointer"
                      title="Отметить выполненным"
                    />
                    <div className="flex-1 overflow-hidden">
                      {t.scheduled_time && (
                        <span className="text-[10px] text-indigo-700 dark:text-purple-300 font-bold block mb-0.5">
                          🕒 {t.scheduled_time}
                        </span>
                      )}
                      <span className={`line-clamp-2 ${t.status === 'completed' ? 'line-through' : 'font-medium'}`}>
                        {t.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Генерация вида "День"
  const renderDayView = () => {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4 max-w-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Расписание на день
            </span>
            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {selectedDate.toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-100 dark:bg-purple-900/60 text-indigo-800 dark:text-purple-200">
            Дел: {tasksForSelectedDay.length}
          </span>
        </div>

        {tasksForSelectedDay.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
            На этот день дел не запланировано.
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasksForSelectedDay.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-between group hover:shadow-sm transition-all"
              >
                <div className="flex items-center space-x-3.5">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleToggleTaskStatus(task)}
                    className="w-5 h-5 rounded-full border-zinc-300 dark:border-zinc-600 text-indigo-600 dark:text-purple-500 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      {task.scheduled_time && (
                        <span className="text-xs font-bold text-indigo-700 dark:text-purple-300 bg-indigo-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full">
                          {task.scheduled_time}
                        </span>
                      )}
                      <h4 className={`text-sm font-semibold ${
                        task.status === 'completed'
                          ? 'line-through text-zinc-400 dark:text-zinc-500'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}>
                        {task.title}
                      </h4>
                    </div>
                    {task.notes && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{task.notes}</p>}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setRescheduleTask(task);
                    setNewDateInput(task.scheduled_date || '');
                    setNewTimeInput(task.scheduled_time || '');
                  }}
                  className="text-xs text-indigo-600 dark:text-purple-400 hover:text-indigo-800 dark:hover:text-purple-300 font-semibold px-3 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Перенести
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Верхняя панель управления календарем */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Переключатель месяца/недели и кнопки вперед/назад */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-full text-xs font-bold transition-colors cursor-pointer"
          >
            Сегодня
          </button>
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <h3 className="text-base font-extrabold text-zinc-800 dark:text-zinc-100 ml-2 capitalize">
            {selectedDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h3>
        </div>

        {/* Переключатель режима: Месяц / Неделя / День */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setMode('month')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                mode === 'month' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setMode('week')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                mode === 'week' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setMode('day')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                mode === 'day' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              День
            </button>
          </div>

          <button
            onClick={onOpenAddTask}
            className="flex items-center space-x-2 px-5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Запланировать</span>
          </button>
        </div>
      </div>

      {/* Основная сетка выбранного режима */}
      {mode === 'month' && renderMonthGrid()}
      {mode === 'week' && renderWeekGrid()}
      {mode === 'day' && renderDayView()}

      {/* Панель задач на выбранную дату (для режима Месяц) */}
      {mode === 'month' && (
        <div className="bg-white dark:bg-[#222222] rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Задачи на {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h4>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {tasksForSelectedDay.length}
            </span>
          </div>

          {tasksForSelectedDay.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 py-3">На эту дату задач не запланировано.</p>
          ) : (
            <div className="space-y-2">
              {tasksForSelectedDay.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center space-x-3.5">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => handleToggleTaskStatus(task)}
                      className="w-5 h-5 rounded-full border-zinc-300 dark:border-zinc-600 text-indigo-600 dark:text-purple-500 focus:ring-indigo-500 cursor-pointer"
                      title="Выполнить задачу"
                    />
                    <div className="flex items-center space-x-2">
                      {task.scheduled_time && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-purple-900/60 text-indigo-800 dark:text-purple-200 font-bold">
                          {task.scheduled_time}
                        </span>
                      )}
                      <span className={`font-semibold ${
                        task.status === 'completed'
                          ? 'line-through text-zinc-400 dark:text-zinc-500'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}>
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOverdue(task)
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          Дедлайн: {task.due_date} {isOverdue(task) && '⚠️ Просрочено!'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setRescheduleTask(task);
                      setNewDateInput(task.scheduled_date || '');
                      setNewTimeInput(task.scheduled_time || '');
                    }}
                    className="text-indigo-600 dark:text-purple-400 hover:text-indigo-800 dark:hover:text-purple-300 font-bold cursor-pointer"
                  >
                    Перенести
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Модальное окно переноса даты задачи */}
      {rescheduleTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Перенести задачу</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{rescheduleTask.title}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Новая дата</label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Время (необязательно)</label>
                <input
                  type="time"
                  value={newTimeInput}
                  onChange={(e) => setNewTimeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setRescheduleTask(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveReschedule}
                className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
