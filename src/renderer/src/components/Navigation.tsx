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
  Sparkles
} from 'lucide-react';
import { TaskDestination } from '@shared/types';

export type NavigationTab = TaskDestination | 'projects' | 'completed';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  inboxCount: number;
  onStartProcessing: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  inboxCount,
  onStartProcessing,
}) => {
  const navItems = [
    { id: 'next_actions', label: 'Текущие действия', icon: CheckSquare },
    { id: 'inbox', label: 'Корзина ГТД', icon: Inbox, count: inboxCount },
    { id: 'projects', label: 'Проекты', icon: FolderKanban },
    { id: 'calendar', label: 'Календарь', icon: Calendar },
    { id: 'waiting_for', label: 'Делегирование и ожидание', icon: UserCheck },
    { id: 'someday', label: 'Когда-нибудь потом', icon: Clock },
    { id: 'notes', label: 'Заметки', icon: FileText },
    { id: 'completed', label: 'Завершённые', icon: CheckCircle2 },
    { id: 'trash', label: 'Мусор', icon: Trash2 },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 shrink-0 select-none">
      {/* Логотип и заголовок */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            ГТД
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm leading-tight">Система ГТД</h1>
            <p className="text-xs text-slate-400">By Arspective</p>
          </div>
        </div>
      </div>

      {/* Быстрое действие: Разобрать корзину */}
      <div className="p-3">
        <button
          onClick={onStartProcessing}
          disabled={inboxCount === 0}
          className={`w-full py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 text-sm font-medium transition-all shadow-sm ${
            inboxCount > 0
              ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer active:scale-[0.98]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Разобрать корзину</span>
          {inboxCount > 0 && (
            <span className="bg-sky-400/30 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
              {inboxCount}
            </span>
          )}
        </button>
      </div>

      {/* Основной список навигации */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavigationTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Футер навигации */}
      <div className="p-3 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
        <span>Windows Desktop</span>
        <span className="text-slate-400">v1.0.0</span>
      </div>
    </aside>
  );
};
