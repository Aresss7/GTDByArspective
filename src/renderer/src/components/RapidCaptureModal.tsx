import React, { useState, useEffect, useRef } from 'react';
import { X, CornerDownLeft } from 'lucide-react';
import { TaskDestination } from '@shared/types';

interface RapidCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (title: string, destination: TaskDestination) => Promise<void>;
  currentTab: string;
}

export const RapidCaptureModal: React.FC<RapidCaptureModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  currentTab,
}) => {
  const [title, setTitle] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastCount, setToastCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Определяем место назначения по умолчанию
  const getDestination = (): TaskDestination => {
    if (currentTab === 'next_actions') return 'next_actions';
    if (currentTab === 'someday') return 'someday';
    if (currentTab === 'notes') return 'notes';
    return 'inbox';
  };

  const destination = getDestination();

  // Фокусировка при открытии
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setToastCount(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Обработка клавиш Escape и Enter на уровне модалки
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      await onSaveTask(trimmed, destination);
      const nextCount = toastCount + 1;
      setToastCount(nextCount);
      showToast(`✓ Сохранено: "${trimmed.length > 25 ? trimmed.slice(0, 25) + '...' : trimmed}"`);
      setTitle('');
      // Сохраняем фокус в поле ввода для следующей задачи!
      inputRef.current?.focus();
    } catch (err) {
      console.error('Rapid capture error:', err);
      showToast('Ошибка при сохранении задачи');
    }
  };

  const getDestinationLabel = () => {
    switch (destination) {
      case 'next_actions':
        return 'Текущие действия';
      case 'someday':
        return 'Когда-нибудь потом';
      case 'notes':
        return 'Заметки';
      default:
        return 'Корзина ГТД';
    }
  };

  return (
    <>
      {/* Всплывающее ненавязчивое уведомление о сохранении без подтверждения */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[70] px-5 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold shadow-2xl flex items-center space-x-2 transition-all duration-200 border border-zinc-700/50 dark:border-zinc-300">
          <span>{toastMessage}</span>
          {toastCount > 1 && (
            <span className="bg-zinc-700 dark:bg-zinc-200 text-white dark:text-zinc-900 px-2 py-0.5 rounded-full text-[10px]">
              всего: {toastCount}
            </span>
          )}
        </div>
      )}

      {/* Модальное окно быстрого ввода */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-[#222222] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-700 p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-bold tracking-tight">Быстрая запись задачи</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Назначение: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{getDestinationLabel()}</span> • Нажимайте Enter для непрерывного ввода
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Закрыть (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Что нужно сделать? Введите и нажмите Enter..."
                className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-[#191919] border border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-400 text-sm focus:outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center space-x-1">
                <span>Enter — сохранить и следующая</span>
                <CornerDownLeft className="w-3 h-3 inline" />
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Отменить (Esc)
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
