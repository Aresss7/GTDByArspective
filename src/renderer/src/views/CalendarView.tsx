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

  // Задачи, запланированные на выбранную дату
  const scheduledTasks = tasks.filter((t) => t.scheduled_date && t.status === 'active');
  const tasksForSelectedDay = tasks.filter((t) => t.scheduled_date === selectedDateStr);

  // Не запланированные задачи (из корзины или текущих без даты)
  const unscheduledTasks = tasks.filter(
    (t) => !t.scheduled_date && t.status === 'active' && t.destination !== 'trash' && t.destination !== 'notes'
  );

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

    // В России неделя начинается с понедельника (0 = пн, 6 = вс)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDay.getDate();
    const gridCells = [];

    // Пустые ячейки до 1 числа
    for (let i = 0; i < startDayOfWeek; i++) {
      gridCells.push(null);
    }
    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      gridCells.push(new Date(year, month, day));
    }

    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Шапка дней недели */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-500 py-2.5">
          {weekDays.map((w, idx) => (
            <div key={idx} className={idx >= 5 ? 'text-rose-500' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* Сетка чисел */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[460px]">
          {gridCells.map((date, idx) => {
            if (!date) {
              return <div key={idx} className="bg-slate-50/40 p-2 min-h-[90px]" />;
            }

            const dateStr = formatDateKey(date);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDateStr;
            const dayTasks = tasks.filter((t) => t.scheduled_date === dateStr && t.status === 'active');

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={`p-2 min-h-[90px] cursor-pointer transition-colors flex flex-col justify-between ${
                  isSelected ? 'bg-sky-50/50 ring-2 ring-sky-500 ring-inset' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-sky-600 text-white font-bold'
                        : isSelected
                        ? 'bg-sky-100 text-sky-800'
                        : 'text-slate-700'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-700">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className="text-[10px] truncate px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100 font-medium"
                      title={t.title}
                    >
                      {t.scheduled_time ? `${t.scheduled_time} ` : ''}
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] text-slate-400 font-medium pl-1">
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
          const dayTasks = tasks.filter((t) => t.scheduled_date === dateStr && t.status === 'active');

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(d)}
              className={`p-3 bg-white rounded-xl border transition-all flex flex-col min-h-[300px] cursor-pointer ${
                isSelected
                  ? 'border-sky-500 ring-2 ring-sky-500/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">
                    {dayNames[idx]}
                  </span>
                  <span className={`text-base font-bold ${isToday ? 'text-sky-600' : 'text-slate-800'}`}>
                    {d.getDate()}
                  </span>
                </div>
                {isToday && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                    Сегодня
                  </span>
                )}
              </div>

              <div className="space-y-1.5 flex-1 overflow-y-auto">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRescheduleTask(t);
                      setNewDateInput(t.scheduled_date || '');
                      setNewTimeInput(t.scheduled_time || '');
                    }}
                    className="p-2 rounded-lg bg-sky-50/70 border border-sky-100 text-xs font-medium text-slate-800 hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    {t.scheduled_time && (
                      <span className="text-[10px] text-sky-700 font-bold block">
                        🕒 {t.scheduled_time}
                      </span>
                    )}
                    <span className="line-clamp-2">{t.title}</span>
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 max-w-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Расписание на день
            </span>
            <h3 className="text-xl font-bold text-slate-800">
              {selectedDate.toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800">
            Запланировано дел: {tasksForSelectedDay.length}
          </span>
        </div>

        {tasksForSelectedDay.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            На этот день дел не запланировано.
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasksForSelectedDay.map((task) => (
              <div
                key={task.id}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    {task.scheduled_time && (
                      <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                        {task.scheduled_time}
                      </span>
                    )}
                    <h4 className="text-sm font-semibold text-slate-800">{task.title}</h4>
                  </div>
                  {task.notes && <p className="text-xs text-slate-500 mt-1">{task.notes}</p>}
                </div>

                <button
                  onClick={() => {
                    setRescheduleTask(task);
                    setNewDateInput(task.scheduled_date || '');
                    setNewTimeInput(task.scheduled_time || '');
                  }}
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium px-2.5 py-1 rounded-lg hover:bg-sky-50 transition-colors"
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
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Сегодня
          </button>
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <h3 className="text-base font-bold text-slate-800 ml-2">
            {selectedDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h3>
        </div>

        {/* Переключатель режима: Месяц / Неделя / День */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'month' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'week' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'day' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              День
            </button>
          </div>

          <button
            onClick={onOpenAddTask}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Запланировать дело</span>
          </button>
        </div>
      </div>

      {/* Основная сетка выбранного режима */}
      {mode === 'month' && renderMonthGrid()}
      {mode === 'week' && renderWeekGrid()}
      {mode === 'day' && renderDayView()}

      {/* Панель задач на выбранную дату (для режима Месяц) */}
      {mode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h4 className="text-sm font-bold text-slate-800">
              Задачи на {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {tasksForSelectedDay.length}
            </span>
          </div>

          {tasksForSelectedDay.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">На эту дату задач не запланировано.</p>
          ) : (
            <div className="space-y-2">
              {tasksForSelectedDay.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    {task.scheduled_time && (
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                        {task.scheduled_time}
                      </span>
                    )}
                    <span className="font-semibold text-slate-800">{task.title}</span>
                    {task.due_date && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          isOverdue(task)
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Дедлайн: {task.due_date} {isOverdue(task) && '⚠️ Просрочено!'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setRescheduleTask(task);
                      setNewDateInput(task.scheduled_date || '');
                      setNewTimeInput(task.scheduled_time || '');
                    }}
                    className="text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Перенести задачу</h3>
            <p className="text-xs text-slate-600 font-medium">{rescheduleTask.title}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Новая дата</label>
                <input
                  type="date"
                  required
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Время (необязательно)</label>
                <input
                  type="time"
                  value={newTimeInput}
                  onChange={(e) => setNewTimeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setRescheduleTask(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveReschedule}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
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
