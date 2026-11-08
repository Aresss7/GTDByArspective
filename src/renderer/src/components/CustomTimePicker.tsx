import React, { useState, useRef, useEffect } from 'react';
import { Clock, X } from 'lucide-react';

interface CustomTimePickerProps {
  value: string; // 'HH:mm' or ''
  onChange: (timeStr: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const PRESET_HOURS = ['09:00', '12:00', '15:00', '18:00', '21:00'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  placeholder = '--:--',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [textValue, setTextValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextValue(value || '');
  }, [value]);

  const [currentH, currentM] = value && value.includes(':')
    ? value.split(':')
    : ['', ''];

  const selectedHour = currentH || '12';
  const selectedMinute = currentM || '00';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9:]/g, '');
    if (raw.length > 5) raw = raw.slice(0, 5);

    // Автоматическая подстановка двоеточия после 2 цифр
    if (raw.length === 2 && !raw.includes(':') && !textValue.endsWith(':')) {
      raw = `${raw}:`;
    }

    setTextValue(raw);

    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(raw)) {
      onChange(raw);
    } else if (raw === '') {
      onChange('');
    }
  };

  const handleBlur = () => {
    if (!textValue) {
      onChange('');
      return;
    }
    // Поддержка ввода 4 слитных цифр (например 1830 -> 18:30)
    if (/^\d{4}$/.test(textValue)) {
      const h = textValue.slice(0, 2);
      const m = textValue.slice(2, 4);
      if (Number(h) <= 23 && Number(m) <= 59) {
        const formatted = `${h}:${m}`;
        setTextValue(formatted);
        onChange(formatted);
        return;
      }
    }
    // Поддержка 1 или 2 цифр (например "9" -> "09:00", "18" -> "18:00")
    if (/^\d{1,2}$/.test(textValue)) {
      const h = String(Math.min(23, Number(textValue))).padStart(2, '0');
      const formatted = `${h}:00`;
      setTextValue(formatted);
      onChange(formatted);
      return;
    }
    // Если формат невалидный, возвращаем исходное валидное значение
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(textValue)) {
      setTextValue(value || '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectHour = (h: string) => {
    const nextVal = `${h}:${selectedMinute}`;
    setTextValue(nextVal);
    onChange(nextVal);
  };

  const handleSelectMinute = (m: string) => {
    const nextVal = `${selectedHour}:${m}`;
    setTextValue(nextVal);
    onChange(nextVal);
  };

  const handleSetPreset = (preset: string) => {
    setTextValue(preset);
    onChange(preset);
    setIsOpen(false);
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
    const formatted = `${h}:${m}`;
    setTextValue(formatted);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTextValue('');
    onChange('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Поле ввода времени с клавиатуры и открытием панели по клику */}
      <div
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-[#191919]'
            : isOpen
            ? 'border-zinc-400 dark:border-zinc-500 bg-white dark:bg-[#191919] ring-2 ring-zinc-500/10 shadow-xs'
            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#191919] hover:border-zinc-400 dark:hover:border-zinc-600'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {/* Иконка часов сохраняет нейтральный цвет zinc-400 */}
          <Clock
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="w-3.5 h-3.5 shrink-0 text-zinc-400 cursor-pointer"
          />
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={textValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onFocus={() => !disabled && setIsOpen(true)}
            placeholder={placeholder}
            className="w-full bg-transparent border-none p-0 text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
          />
        </div>

        {textValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Очистить время"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Выпадающая панель быстрого выбора времени в монохромном стиле */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-[100] w-64 bg-white dark:bg-[#1c1c1c] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl p-3 animate-fadeIn select-none">
          {/* Быстрые пресеты */}
          <div className="flex items-center justify-between gap-1 pb-2.5 mb-2.5 border-b border-zinc-100 dark:border-zinc-800">
            {PRESET_HOURS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetPreset(preset)}
                className={`px-1.5 py-1 text-[10px] font-mono font-semibold rounded-lg transition-colors cursor-pointer ${
                  value === preset
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs'
                    : 'bg-zinc-100 dark:bg-[#252525] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#303030]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Колонки Часы и Минуты */}
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Часы */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                Часы
              </span>
              <div className="max-h-44 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {HOURS.map((h) => {
                  const isSel = currentH === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                        isSel
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282828]'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Минуты */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                Минуты
              </span>
              <div className="max-h-44 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {MINUTES.map((m) => {
                  const isSel = currentM === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                        isSel
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282828]'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Подвал */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
            <button
              type="button"
              onClick={handleSetNow}
              className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-[#252525] hover:bg-zinc-200 dark:hover:bg-[#303030] text-zinc-700 dark:text-zinc-300 font-semibold transition-colors cursor-pointer"
            >
              Сейчас
            </button>
            <div className="flex items-center space-x-2">
              {textValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-zinc-400 hover:text-rose-500 transition-colors font-medium cursor-pointer"
                >
                  Сбросить
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold shadow-xs transition-colors cursor-pointer"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
