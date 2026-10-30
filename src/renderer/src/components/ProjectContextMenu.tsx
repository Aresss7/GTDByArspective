import React, { useEffect, useRef } from 'react';
import { 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  FolderKanban
} from 'lucide-react';
import { Project } from '@shared/types';

interface ProjectContextMenuProps {
  project: Project | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onToggleStatus: (project: Project) => void;
}

export const ProjectContextMenu: React.FC<ProjectContextMenuProps> = ({
  project,
  position,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
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

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [position, onClose]);

  if (!position || !project) return null;

  const menuWidth = 220;
  const menuHeight = 150;
  const left = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const top = Math.min(position.y, window.innerHeight - menuHeight - 10);

  const isCompleted = project.status === 'completed';

  return (
    <div
      ref={menuRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-50 w-56 bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 space-y-1 animate-fadeIn select-none"
    >
      <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
        <div className="flex items-center space-x-2">
          <FolderKanban className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {project.title}
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          onToggleStatus(project);
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282828] transition-colors cursor-pointer text-left"
      >
        {isCompleted ? (
          <>
            <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
            <span>Вернуть в работу</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Завершить проект</span>
          </>
        )}
      </button>

      <button
        onClick={() => {
          onEdit(project);
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282828] transition-colors cursor-pointer text-left"
      >
        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
        <span>Редактировать проект</span>
      </button>

      <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

      <button
        onClick={() => {
          onDelete(project);
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Удалить в корзину</span>
      </button>
    </div>
  );
};
