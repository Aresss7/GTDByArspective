import React, { useEffect, useRef } from 'react';
import { 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  RotateCcw, 
  Calendar,
  CheckSquare,
  Inbox,
  Clock,
  UserCheck,
  FileText
} from 'lucide-react';
import { Task, TaskDestination } from '@shared/types';

interface TaskContextMenuProps {
  task: Task | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onMoveToDestination?: (task: Task, destination: TaskDestination) => void;
}

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  task,
  position,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onMoveToDestination,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', onClose, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [position, onClose]);

  if (!task || !position) return null;

  const menuWidth = 240;
  const menuHeight = 380;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 10);

  const allDestinations: { id: TaskDestination; label: string; icon: any }[] = [
    { id: 'next_actions', label: 'Текущие действия', icon: CheckSquare },
    { id: 'inbox', label: 'Корзина ГТД', icon: Inbox },
    { id: 'calendar', label: 'Календарь (на сегодня)', icon: Calendar },
    { id: 'waiting_for', label: 'Делегирование / Ожидание', icon: UserCheck },
    { id: 'someday', label: 'Когда-нибудь потом', icon: Clock },
    { id: 'notes', label: 'Заметки', icon: FileText },
    { id: 'trash', label: 'Мусор', icon: Trash2 },
  ];

  return (
    <div
      ref={menuRef}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="fixed z-[100] w-60 bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl py-1.5 text-xs text-zinc-800 dark:text-zinc-200 select-none animate-fadeIn"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-3.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
        <p className="font-bold truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {task.title}
        </p>
      </div>

      <div className="py-1">
        {/* Редактировать */}
        <button
          onClick={() => {
            onClose();
            onEdit(task);
          }}
          className="w-full px-3.5 py-2 flex items-center space-x-2.5 hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] transition-colors text-left cursor-pointer font-medium"
        >
          <Edit3 className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
          <span>Редактировать задачу</span>
        </button>

        {/* Выполнить / Вернуть в работу */}
        <button
          onClick={() => {
            onClose();
            onToggleStatus(task);
          }}
          className="w-full px-3.5 py-2 flex items-center space-x-2.5 hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] transition-colors text-left cursor-pointer font-medium"
        >
          {task.status === 'completed' ? (
            <>
              <RotateCcw className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              <span>Вернуть в работу</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              <span>Отметить выполненной</span>
            </>
          )}
        </button>

        {/* Полное перемещение во все разделы ГТД */}
        {onMoveToDestination && (
          <div className="border-t border-b border-zinc-100 dark:border-zinc-800 my-1 py-1">
            <span className="px-3.5 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Переместить в раздел:
            </span>
            {allDestinations.map((dest) => {
              if (dest.id === task.destination) return null;
              const Icon = dest.icon;
              return (
                <button
                  key={dest.id}
                  onClick={() => {
                    onClose();
                    onMoveToDestination(task, dest.id);
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center space-x-2 hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] text-left cursor-pointer text-[11px]"
                >
                  <Icon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{dest.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Переместить в Мусор */}
        <button
          onClick={() => {
            onClose();
            onDelete(task);
          }}
          className="w-full px-3.5 py-2 flex items-center space-x-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer font-medium"
        >
          <Trash2 className="w-4 h-4" />
          <span>Переместить в Мусор</span>
        </button>
      </div>
    </div>
  );
};
