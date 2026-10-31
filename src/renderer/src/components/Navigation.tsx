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
  Settings
} from 'lucide-react';
import { TaskDestination } from '@shared/types';
import appLogo from '../assets/icon.png';
import { Language, translations } from '../i18n/translations';

export type NavigationTab = TaskDestination | 'projects' | 'completed' | 'sync' | 'settings';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  inboxCount: number;
  onStartProcessing: () => void;
  language?: Language;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  inboxCount,
  onStartProcessing,
  language = 'ru',
}) => {
  const t = translations[language];

  const navItems = [
    { id: 'next_actions', label: t.navNextActions, icon: CheckSquare },
    { id: 'inbox', label: t.navInbox, icon: Inbox, count: inboxCount },
    { id: 'projects', label: t.navProjects, icon: FolderKanban },
    { id: 'calendar', label: t.navCalendar, icon: Calendar },
    { id: 'waiting_for', label: t.navWaitingFor, icon: UserCheck },
    { id: 'someday', label: t.navSomeday, icon: Clock },
    { id: 'notes', label: t.navNotes, icon: FileText },
    { id: 'completed', label: t.navCompleted, icon: CheckCircle2 },
    { id: 'trash', label: t.navTrash, icon: Trash2 },
    { id: 'settings', label: t.navSettings, icon: Settings },
  ];

  return (
    <aside className="w-64 bg-zinc-50 dark:bg-[#191919] text-zinc-800 dark:text-zinc-200 flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 shrink-0 select-none transition-colors">
      {/* Быстрое действие: Разобрать корзину (Solid Button, No Gradients) */}
      <div className="px-4 pt-4 pb-3">
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
          <span>{t.cleanInbox}</span>
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

      {/* Футер: Версия приложения */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Arspective</span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">v1.3.6</span>
      </div>
    </aside>
  );
};
