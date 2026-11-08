import React from 'react';
import { Bell } from 'lucide-react';

export interface TaskReminderPickerProps {
  reminderOffset?: number | null; // minutes before event: 0, 10, 15, 30, 60, 120, 1440 or null (disabled)
  onChange: (offset: number | null) => void;
  language?: string;
  className?: string;
}

const REMINDER_OPTIONS = [
  { offset: 0, labelRu: 'В момент события', labelEn: 'At time of event' },
  { offset: 10, labelRu: 'За 10 минут', labelEn: '10 min before' },
  { offset: 15, labelRu: 'За 15 минут', labelEn: '15 min before' },
  { offset: 30, labelRu: 'За 30 минут', labelEn: '30 min before' },
  { offset: 60, labelRu: 'За 1 час', labelEn: '1 hour before' },
  { offset: 120, labelRu: 'За 2 часа', labelEn: '2 hours before' },
  { offset: 1440, labelRu: 'За день', labelEn: '1 day before' },
];

export const TaskReminderPicker: React.FC<TaskReminderPickerProps> = ({
  reminderOffset,
  onChange,
  language = 'ru',
  className = '',
}) => {
  const isEn = language === 'en';
  const isEnabled = reminderOffset !== null && reminderOffset !== undefined;

  const handleToggle = () => {
    if (isEnabled) {
      onChange(null);
    } else {
      // По умолчанию при включении — «В момент события» (0 минут)
      onChange(0);
    }
  };

  const handleSelectOffset = (offset: number) => {
    onChange(offset);
  };

  return (
    <div className={`p-3.5 bg-zinc-50 dark:bg-[#1f1f1f] rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3 transition-colors ${className}`}>
      {/* Верхняя строка: Колокольчик, Заголовок и Переключатель */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Bell className={`w-4 h-4 shrink-0 transition-colors ${isEnabled ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'}`} />
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {isEn ? 'Notification / Reminder' : 'Уведомление / Напоминание'}
          </span>
        </div>

        {/* Переключатель */}
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          onClick={handleToggle}
          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
            isEnabled ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-700'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Список чипсов вариантов времени напоминания */}
      {isEnabled && (
        <div className="flex flex-wrap gap-1.5 pt-1 animate-fadeIn">
          {REMINDER_OPTIONS.map((opt) => {
            const isSelected = reminderOffset === opt.offset;
            return (
              <button
                key={opt.offset}
                type="button"
                onClick={() => handleSelectOffset(opt.offset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-white dark:bg-[#2a2a2a] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#333333]'
                }`}
              >
                {isEn ? opt.labelEn : opt.labelRu}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
