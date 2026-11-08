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
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSelectHour = (h: string) => {
    const nextVal = `${h}:${selectedMinute}`;
    onChange(nextVal);
  };

  const handleSelectMinute = (m: string) => {
    const nextVal = `${selectedHour}:${m}`;
    onChange(nextVal);
  };

  const handleSetPreset = (preset: string) => {
    onChange(preset);
    setIsOpen(false);
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
    onChange(`${h}:${m}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Кнопка открытия пикера */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all select-none ${
          disabled ? 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-[#191919]' :
          isOpen
            ? 'border-purple-500 bg-white dark:bg-[#191919] ring-2 ring-purple-500/20 shadow-xs'
            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#191919] hover:border-zinc-400 dark:hover:border-zinc-600'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Clock className={`w-3.5 h-3.5 shrink-0 ${value ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'}`} />
          <span className={`font-mono text-xs ${value ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
            {value || placeholder}
          </span>
        </div>

        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Очистить время"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Выпадающая панель времени */}
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
                    ? 'bg-purple-600 text-white font-bold'
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
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
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
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
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
              {value && (
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
                className="px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
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
