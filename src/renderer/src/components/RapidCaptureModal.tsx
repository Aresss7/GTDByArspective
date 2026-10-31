import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CornerDownLeft, 
  Inbox, 
  CheckSquare, 
  Calendar, 
  UserCheck, 
  Clock, 
  FileText, 
  ChevronDown 
} from 'lucide-react';
import { TaskDestination } from '@shared/types';
import { DefaultCaptureTabSetting } from '../views/SettingsView';

interface RapidCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (title: string, destination: TaskDestination) => Promise<void>;
  currentTab: string;
  defaultCaptureSetting?: DefaultCaptureTabSetting;
}

const DESTINATION_META: Record<TaskDestination, { label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }> = {
  inbox: { label: 'Корзина ГТД', shortLabel: 'Корзину', icon: Inbox },
  next_actions: { label: 'Следующие действия', shortLabel: '«Следующие действия»', icon: CheckSquare },
  calendar: { label: 'Календарь', shortLabel: '«Календарь»', icon: Calendar },
  waiting_for: { label: 'Ожидание', shortLabel: '«Ожидание»', icon: UserCheck },
  someday: { label: 'Когда-нибудь', shortLabel: '«Когда-нибудь»', icon: Clock },
  notes: { label: 'Заметки', shortLabel: '«Заметки»', icon: FileText },
};

const ALL_DESTINATIONS: TaskDestination[] = [
  'inbox',
  'next_actions',
  'calendar',
  'waiting_for',
  'someday',
  'notes',
];

export const RapidCaptureModal: React.FC<RapidCaptureModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  currentTab,
  defaultCaptureSetting = 'inbox',
}) => {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState<TaskDestination>('inbox');
  const [tab2Destination, setTab2Destination] = useState<TaskDestination>('next_actions');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastCount, setToastCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Вычисляем контекстную вторую вкладку
  const getContextualSecondaryTab = (): TaskDestination => {
    if (
      currentTab === 'next_actions' ||
      currentTab === 'calendar' ||
      currentTab === 'waiting_for' ||
      currentTab === 'someday' ||
      currentTab === 'notes'
    ) {
      return currentTab as TaskDestination;
    }
    return 'next_actions';
  };

  // Инициализация при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setToastCount(0);
      setShowMoreMenu(false);

      const secondary = getContextualSecondaryTab();
      setTab2Destination(secondary);

      // Определение начального назначения по настройкам
      if (defaultCaptureSetting === 'current_menu') {
        if (
          currentTab === 'next_actions' ||
          currentTab === 'calendar' ||
          currentTab === 'waiting_for' ||
          currentTab === 'someday' ||
          currentTab === 'notes'
        ) {
          setDestination(currentTab as TaskDestination);
        } else {
          setDestination('inbox');
        }
      } else {
        setDestination('inbox');
      }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, currentTab, defaultCaptureSetting]);

  // Закрытие меню "Ещё" при клике вне его
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  // Обработка клавиши Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMoreMenu) {
          setShowMoreMenu(false);
          return;
        }
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showMoreMenu]);

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
      showToast(`✓ Сохранено в ${DESTINATION_META[destination].shortLabel}: "${trimmed.length > 25 ? trimmed.slice(0, 25) + '...' : trimmed}"`);
      setTitle('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Rapid capture error:', err);
      showToast('Ошибка при сохранении задачи');
    }
  };

  const handleSelectOtherDestination = (dest: TaskDestination) => {
    setTab2Destination(dest);
    setDestination(dest);
    setShowMoreMenu(false);
    inputRef.current?.focus();
  };

  const Tab2Icon = DESTINATION_META[tab2Destination].icon;

  // Опции для выпадающего меню "Ещё" (все, кроме Корзины и текущей второй вкладки)
  const otherDestinations = ALL_DESTINATIONS.filter(
    (d) => d !== 'inbox' && d !== tab2Destination
  );

  return (
    <>
      {/* Всплывающее ненавязчивое уведомление о сохранении */}
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
          className="bg-white dark:bg-[#1f1f1f] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Верхняя строка: переключатель вкладками + кнопка закрытия */}
          <div className="flex items-center justify-between gap-3">
            {/* Ровный переключатель вкладок */}
            <div className="flex-1 flex items-center p-1 bg-zinc-100 dark:bg-[#141414] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 gap-1 relative">
              {/* Таб 1: Добавить в корзину */}
              <button
                type="button"
                onClick={() => {
                  setDestination('inbox');
                  inputRef.current?.focus();
                }}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer ${
                  destination === 'inbox'
                    ? 'bg-white dark:bg-[#282828] text-zinc-900 dark:text-zinc-100 font-bold shadow-xs border border-zinc-200/90 dark:border-zinc-700'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 font-medium'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Добавить в корзину</span>
              </button>

              {/* Таб 2: В текущий раздел (например, В «Следующие действия») */}
              <button
                type="button"
                onClick={() => {
                  setDestination(tab2Destination);
                  inputRef.current?.focus();
                }}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer ${
                  destination === tab2Destination
                    ? 'bg-white dark:bg-[#282828] text-zinc-900 dark:text-zinc-100 font-bold shadow-xs border border-zinc-200/90 dark:border-zinc-700'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 font-medium'
                }`}
              >
                <Tab2Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">В {DESTINATION_META[tab2Destination].shortLabel}</span>
              </button>

              {/* Кнопка "Ещё ▾" для быстрого выбора любого другого раздела */}
              <div className="relative shrink-0" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowMoreMenu((prev) => !prev)}
                  className={`flex items-center space-x-1 py-2 px-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                    showMoreMenu || (destination !== 'inbox' && destination !== tab2Destination)
                      ? 'bg-white dark:bg-[#282828] text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-xs'
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'
                  }`}
                  title="Выбрать другой раздел"
                >
                  <span>Ещё</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Выпадающее меню остальных разделов */}
                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl py-1.5 z-30 animate-fadeIn">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Другие разделы
                    </div>
                    {otherDestinations.map((d) => {
                      const Icon = DESTINATION_META[d].icon;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleSelectOtherDestination(d)}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Icon className="w-3.5 h-3.5 text-zinc-500" />
                          <span>В {DESTINATION_META[d].shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Кнопка закрытия модалки */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Закрыть (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Форма ввода */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                {destination === 'inbox'
                  ? 'Быстрая фиксация мысли в Корзину:'
                  : `Быстрая фиксация в ${DESTINATION_META[destination].shortLabel}:`}
              </label>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Что нужно сделать? Напишите сюда..."
                className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-[#141414] border border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-400 text-sm focus:outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
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
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {destination === 'inbox'
                    ? 'Сохранить в корзину'
                    : `Сохранить в ${DESTINATION_META[destination].shortLabel}`}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
