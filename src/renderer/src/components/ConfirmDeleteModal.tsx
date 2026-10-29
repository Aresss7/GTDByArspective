import React, { useEffect } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  isPermanent?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  isPermanent = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn select-none p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#222222] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-700 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isPermanent 
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}>
              {isPermanent ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {isPermanent ? 'Удалить навсегда?' : 'Переместить в Мусор?'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isPermanent 
                  ? 'Элемент будет удалён без возможности восстановления' 
                  : 'Задачу можно будет восстановить из раздела «Мусор»'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 bg-zinc-50 dark:bg-[#191919] rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            {title}
          </p>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Отмена (Esc)
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            {isPermanent ? 'Удалить навсегда' : 'Переместить в Мусор'}
          </button>
        </div>
      </div>
    </div>
  );
};
