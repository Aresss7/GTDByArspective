import React, { useEffect, useRef } from 'react';
import { FileText, Pin, Copy, Trash2 } from 'lucide-react';
import { Task } from '@shared/types';
import { Language } from '../i18n/translations';

interface NoteCardContextMenuProps {
  note: Task | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onOpen: (note: Task) => void;
  onTogglePin: (note: Task) => void;
  onCopy: (note: Task) => void;
  onDelete: (note: Task) => void;
  language?: Language;
}

export const NoteCardContextMenu: React.FC<NoteCardContextMenuProps> = ({
  note,
  position,
  onClose,
  onOpen,
  onTogglePin,
  onCopy,
  onDelete,
  language = 'ru',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isEn = language === 'en';

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

  if (!position || !note) return null;

  const menuWidth = 230;
  const menuHeight = 190;
  const left = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const top = Math.min(position.y, window.innerHeight - menuHeight - 10);

  const isPinned = Boolean(note.is_pinned);

  return (
    <div
      ref={menuRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-50 w-56 bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 space-y-1 animate-fadeIn select-none text-xs"
    >
      <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
        <div className="flex items-center space-x-2">
          <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {note.title}
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          onClose();
          onOpen(note);
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282828] transition-colors cursor-pointer text-left"
      >
        <FileText className="w-3.5 h-3.5 text-zinc-400" />
        <span>{isEn ? 'Open note' : 'Открыть заметку'}</span>
      </button>

      <button
        onClick={() => {
          onClose();
          onTogglePin(note);
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282828] transition-colors cursor-pointer text-left"
      >
        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'}`} />
        <span>{isPinned ? (isEn ? 'Unpin note' : 'Открепить заметку') : (isEn ? 'Pin note' : 'Закрепить заметку')}</span>
      </button>

      <button
        onClick={() => {
          onClose();
          onCopy(note);
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#282828] transition-colors cursor-pointer text-left"
      >
        <Copy className="w-3.5 h-3.5 text-zinc-400" />
        <span>{isEn ? 'Copy text' : 'Скопировать текст'}</span>
      </button>

      <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

      <button
        onClick={() => {
          onClose();
          onDelete(note);
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left font-medium"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>{isEn ? 'Move to Trash' : 'Переместить в Мусор'}</span>
      </button>
    </div>
  );
};
