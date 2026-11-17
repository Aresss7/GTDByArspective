import React from 'react';
import { TEXT_COLORS, BG_COLORS } from './colorPalette';

interface ColorPickerMenuProps {
  mode: 'text' | 'bg';
  onSelectColor: (color: string) => void;
  onClose?: () => void;
  isEn?: boolean;
}

export const ColorPickerMenu: React.FC<ColorPickerMenuProps> = ({
  mode,
  onSelectColor,
  onClose,
  isEn = false,
}) => {
  const options = mode === 'text' ? TEXT_COLORS : BG_COLORS;
  const title = mode === 'text'
    ? (isEn ? 'Text color' : 'Цвет текста')
    : (isEn ? 'Highlight color' : 'Цвет фона текста');

  return (
    <div
      onMouseDown={(e) => {
        // Предотвращаем сброс выделения текста при любых действиях в подменю
        e.preventDefault();
        e.stopPropagation();
      }}
      className="w-52 bg-white dark:bg-[#1f1f21] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/90 rounded-2xl shadow-2xl p-1.5 select-none space-y-1 text-xs font-sans animate-fadeIn max-h-[340px] overflow-y-auto scrollbar-thin"
    >
      <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 px-2 py-1 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800/80">
        {title}
      </div>
      <div className="space-y-0.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={() => {
              onSelectColor(mode === 'text' ? opt.color : opt.bgColor);
              onClose?.();
            }}
            className="w-full flex items-center space-x-2.5 px-2 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-left group"
          >
            {mode === 'text' ? (
              <div
                className="w-5 h-5 rounded-md border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-bold text-xs shrink-0"
                style={{ color: opt.previewColor }}
              >
                A
              </div>
            ) : (
              <div
                className="w-5 h-5 rounded-md border border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: opt.previewColor === 'transparent' ? 'transparent' : opt.previewColor,
                }}
              >
                {opt.id === 'default' && (
                  <span className="text-[10px] text-zinc-400">✕</span>
                )}
              </div>
            )}
            <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
              {isEn ? opt.labelEn : opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
