import React from 'react';
import { 
  Inbox, 
  CheckSquare, 
  FolderKanban, 
  Calendar, 
  Clock, 
  UserCheck, 
  FileText, 
  CheckCircle2, 
  Trash2,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { TaskDestination } from '@shared/types';
import appLogo from '../assets/icon.png';

export type NavigationTab = TaskDestination | 'projects' | 'completed';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  inboxCount: number;
  onStartProcessing: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  inboxCount,
  onStartProcessing,
  isDarkMode,
  onToggleTheme,
}) => {
  const navItems = [
    { id: 'next_actions', label: 'Текущие действия', icon: CheckSquare },
    { id: 'inbox', label: 'Корзина ГТД', icon: Inbox, count: inboxCount },
    { id: 'projects', label: 'Проекты', icon: FolderKanban },
    { id: 'calendar', label: 'Календарь', icon: Calendar },
    { id: 'waiting_for', label: 'Делегирование / Ожидание', icon: UserCheck },
    { id: 'someday', label: 'Когда-нибудь потом', icon: Clock },
    { id: 'notes', label: 'Заметки', icon: FileText },
    { id: 'completed', label: 'Завершённые', icon: CheckCircle2 },
    { id: 'trash', label: 'Мусор', icon: Trash2 },
  ];

  return (
    <aside className="w-64 bg-zinc-50 dark:bg-[#191919] text-zinc-800 dark:text-zinc-200 flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 shrink-0 select-none transition-colors">
      {/* Логотип и брендинг Arspective GTD */}
      <div className="p-5 flex items-center space-x-3">
        <img 
          src={appLogo} 
          alt="Arspective Logo" 
          className="w-8 h-8 rounded-full object-contain shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-800" 
        />
        <div className="min-w-0">
          <h1 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-white leading-tight truncate">
            Arspective GTD
          </h1>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate">Система управления делами</p>
        </div>
      </div>

      {/* Быстрое действие: Разобрать корзину (Solid Button, No Gradients) */}
      <div className="px-4 pb-3">
        <button
          onClick={onStartProcessing}
          disabled={inboxCount === 0}
          className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold transition-all shadow-sm ${
            inboxCount > 0
              ? 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 cursor-pointer active:scale-95'
              : 'bg-zinc-200 dark:bg-[#252525] text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Разобрать корзину</span>
          {inboxCount > 0 && (
            <span className="bg-zinc-700 dark:bg-zinc-200 text-white dark:text-zinc-900 text-[10px] px-2 py-0.5 rounded-full font-black">
              {inboxCount}
            </span>
          )}
        </button>
      </div>

      {/* Список разделов с монохромными Active Pills */}
      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavigationTab)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-200 dark:bg-[#282828] text-zinc-950 dark:text-white font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#222222] hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <div className="flex items-center space-x-3.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? 'text-zinc-900 dark:text-white scale-105' : 'text-zinc-400 dark:text-zinc-500'
                }`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-200 dark:bg-[#282828] text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Футер: Переключатель темы и версия */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
        <button
          onClick={onToggleTheme}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-200/80 dark:bg-[#252525] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#303030] transition-colors cursor-pointer"
          title="Переключить тему (Светлая / Тёмная)"
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span className="text-[11px] font-medium">{isDarkMode ? 'Светлая' : 'Тёмная'}</span>
        </button>

        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">v1.1.0</span>
      </div>
    </aside>
  );
};
