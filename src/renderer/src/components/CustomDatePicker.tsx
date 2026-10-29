import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  minDate?: string; // 'YYYY-MM-DD'
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  minDate,
  placeholder = 'Выберите дату',
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Парсинг текущего значения или установка на сегодня
  const parseDate = (str: string): Date => {
    if (!str) return new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d || 1);
  };

  const selectedDate = value ? parseDate(value) : null;
  const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date());

  // Обновляем viewDate при открытии
  useEffect(() => {
    if (isOpen && value) {
      setViewDate(parseDate(value));
    }
  }, [isOpen, value]);

  // Закрытие при клике снаружи
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const formatDateKey = (year: number, month: number, day: number): string => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (dayStr: string, isDisabled: boolean) => {
    if (isDisabled) return;
    onChange(dayStr);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleSetTomorrow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomStr = formatDateKey(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    onChange(tomStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Построение сетки календаря
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Коррекция дня недели для России (0 = Пн, 6 = Вс)
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const totalDays = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const days: Array<{
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isDisabled: boolean;
    isToday: boolean;
    isSelected: boolean;
  }> = [];

  const now = new Date();
  const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  // Дни предыдущего месяца
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const dateStr = formatDateKey(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), d);
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isDisabled: Boolean(minDate && dateStr < minDate),
      isToday: dateStr === todayStr,
      isSelected: dateStr === value,
    });
  }

  // Дни текущего месяца
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = formatDateKey(year, month, d);
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      isDisabled: Boolean(minDate && dateStr < minDate),
      isToday: dateStr === todayStr,
      isSelected: dateStr === value,
    });
  }

  // Дни следующего месяца до завершения сетки (кратно 7)
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const dateStr = formatDateKey(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), d);
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isDisabled: Boolean(minDate && dateStr < minDate),
      isToday: dateStr === todayStr,
      isSelected: dateStr === value,
    });
  }

  // Форматирование выбранного значения для отображения
  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Кнопка-инпут выбора даты */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-zinc-100 dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-all select-none"
      >
        <div className="flex items-center space-x-2 truncate">
          <CalendarIcon className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className={displayValue ? 'font-medium' : 'text-zinc-400'}>
            {displayValue || placeholder}
          </span>
        </div>

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Очистить дату"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Всплывающий календарь в стиле Material 3 */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 p-3.5 bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-700 rounded-3xl shadow-xl w-72 select-none animate-fadeIn">
          {/* Шапка календаря: Месяц/Год и стрелки */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {MONTH_NAMES[month]} {year}
            </h4>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                title="Предыдущий месяц"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                title="Следующий месяц"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEK_DAYS.map((wd) => (
              <span key={wd} className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 py-0.5">
                {wd}
              </span>
            ))}
          </div>

          {/* Сетка дней */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((item, idx) => {
              let cellClass = 'h-8 rounded-full flex items-center justify-center text-xs transition-colors cursor-pointer ';

              if (item.isSelected) {
                cellClass += 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs';
              } else if (item.isDisabled) {
                cellClass += 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-40';
              } else if (item.isToday) {
                cellClass += 'border border-zinc-400 dark:border-zinc-500 font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#2a2a2a]';
              } else if (item.isCurrentMonth) {
                cellClass += 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#2a2a2a]';
              } else {
                cellClass += 'text-zinc-400 dark:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-[#252525]';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => handleSelectDay(item.dateStr, item.isDisabled)}
                  className={cellClass}
                >
                  {item.dayNum}
                </button>
              );
            })}
          </div>

          {/* Быстрые пресеты */}
          <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors cursor-pointer"
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={handleSetTomorrow}
                className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors cursor-pointer"
              >
                Завтра
              </button>
            </div>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-zinc-400 hover:text-rose-500 transition-colors font-medium cursor-pointer"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
