import React, { useEffect } from 'react';
import { Pin, X } from 'lucide-react';
import { Language } from '../i18n/translations';

interface PinLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export const PinLimitModal: React.FC<PinLimitModalProps> = ({
  isOpen,
  onClose,
  language = 'ru',
}) => {
  const isEn = language === 'en';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1f1f1f] text-zinc-900 dark:text-zinc-100 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center space-y-4 relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия в углу */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={isEn ? 'Close' : 'Закрыть'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Иконка булавки */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-500 shadow-sm mt-1">
          <Pin className="w-7 h-7 fill-amber-500" />
        </div>

        {/* Тексты */}
        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
            {isEn ? 'Note Pin Limit' : 'Лимит закрепления'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[280px]">
            {isEn
              ? 'You can pin a maximum of 4 notes simultaneously. Please unpin a note to pin this one.'
              : 'Можно закрепить не более 4 заметок одновременно. Открепите одну из заметок, чтобы закрепить новую.'}
          </p>
        </div>

        {/* Кнопка подтверждения */}
        <div className="pt-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {isEn ? 'Got it' : 'Понятно'}
          </button>
        </div>
      </div>
    </div>
  );
};
