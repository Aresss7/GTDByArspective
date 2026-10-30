import React, { useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Underline as UnderlineIcon, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  Pilcrow, 
  Quote, 
  FileCode, 
  List, 
  ListOrdered, 
  Minus, 
  Link2, 
  RotateCcw, 
  RotateCw,
  ExternalLink,
  SquareCode
} from 'lucide-react';

export interface NoteContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  // State detection
  isVisualMode: boolean;
  hasSelection: boolean;
  isLinkSelected?: boolean;
  activeFormats?: {
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    underline?: boolean;
    code?: boolean;
    h1?: boolean;
    h2?: boolean;
    h3?: boolean;
    paragraph?: boolean;
    blockquote?: boolean;
    codeBlock?: boolean;
    bulletList?: boolean;
    orderedList?: boolean;
  };
  // Actions
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleStrike: () => void;
  onToggleUnderline: () => void;
  onToggleCode: () => void;
  onSetHeading: (level: 1 | 2 | 3) => void;
  onSetParagraph: () => void;
  onToggleBlockquote: () => void;
  onToggleCodeBlock: () => void;
  onToggleBulletList: () => void;
  onToggleOrderedList: () => void;
  onInsertHorizontalRule: () => void;
  onInsertOrEditLink: () => void;
  onRemoveLink?: () => void;
  onInsertFootnote?: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const NoteContextMenu: React.FC<NoteContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  isVisualMode,
  hasSelection,
  isLinkSelected,
  activeFormats = {},
  onToggleBold,
  onToggleItalic,
  onToggleStrike,
  onToggleUnderline,
  onToggleCode,
  onSetHeading,
  onSetParagraph,
  onToggleBlockquote,
  onToggleCodeBlock,
  onToggleBulletList,
  onToggleOrderedList,
  onInsertHorizontalRule,
  onInsertOrEditLink,
  onRemoveLink,
  onInsertFootnote,
  onUndo,
  onRedo,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Adjust position to stay on screen
  const menuWidth = 230;
  const menuHeight = 440;
  const left = Math.min(x, window.innerWidth - menuWidth - 16);
  const top = Math.min(y, window.innerHeight - menuHeight - 16);

  const Item = ({ 
    icon: Icon, 
    label, 
    shortcut, 
    active, 
    onClick 
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    label: string; 
    shortcut?: string; 
    active?: boolean; 
    onClick: () => void; 
  }) => (
    <button
      type="button"
      onClick={() => {
        onClick();
        onClose();
      }}
      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
        active 
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium' 
          : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#252525]'
      }`}
    >
      <div className="flex items-center space-x-2.5">
        <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'}`} />
        <span>{label}</span>
      </div>
      {shortcut && (
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{shortcut}</span>
      )}
    </button>
  );

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-56 bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 space-y-1 animate-fadeIn select-none"
    >
      {/* Undo / Redo */}
      <div className="flex items-center space-x-1 pb-1 border-b border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => { onUndo(); onClose(); }}
          className="flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#252525] transition-colors"
          title="Отменить"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Отмена</span>
        </button>
        <button
          type="button"
          onClick={() => { onRedo(); onClose(); }}
          className="flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#252525] transition-colors"
          title="Повторить"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Повтор</span>
        </button>
      </div>

      {/* Formatting */}
      <div className="space-y-0.5">
        <Item icon={Bold} label="Жирный" shortcut="Ctrl+B" active={activeFormats.bold} onClick={onToggleBold} />
        <Item icon={Italic} label="Курсив" shortcut="Ctrl+I" active={activeFormats.italic} onClick={onToggleItalic} />
        <Item icon={UnderlineIcon} label="Подчёркнутый" shortcut="Ctrl+U" active={activeFormats.underline} onClick={onToggleUnderline} />
        <Item icon={Strikethrough} label="Зачёркнутый" shortcut="Ctrl+Shift+X" active={activeFormats.strike} onClick={onToggleStrike} />
        <Item icon={Code} label="Встроенный код" active={activeFormats.code} onClick={onToggleCode} />
      </div>

      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

      {/* Headings */}
      <div className="space-y-0.5">
        <Item icon={Heading1} label="Заголовок 1" active={activeFormats.h1} onClick={() => onSetHeading(1)} />
        <Item icon={Heading2} label="Заголовок 2" active={activeFormats.h2} onClick={() => onSetHeading(2)} />
        <Item icon={Heading3} label="Заголовок 3" active={activeFormats.h3} onClick={() => onSetHeading(3)} />
        <Item icon={Pilcrow} label="Обычный текст" active={activeFormats.paragraph} onClick={onSetParagraph} />
      </div>

      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

      {/* Blocks */}
      <div className="space-y-0.5">
        <Item icon={List} label="Маркированный список" active={activeFormats.bulletList} onClick={onToggleBulletList} />
        <Item icon={ListOrdered} label="Нумерованный список" active={activeFormats.orderedList} onClick={onToggleOrderedList} />
        <Item icon={Quote} label="Цитата" active={activeFormats.blockquote} onClick={onToggleBlockquote} />
        <Item icon={FileCode} label="Блок кода" active={activeFormats.codeBlock} onClick={onToggleCodeBlock} />
        <Item icon={Minus} label="Разделитель" onClick={onInsertHorizontalRule} />
      </div>

      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

      {/* Links & Footnotes */}
      <div className="space-y-0.5">
        <Item 
          icon={Link2} 
          label={isLinkSelected ? "Изменить ссылку" : "Вставить ссылку"} 
          shortcut="Ctrl+K" 
          onClick={onInsertOrEditLink} 
        />
        {isLinkSelected && onRemoveLink && (
          <button
            type="button"
            onClick={() => { onRemoveLink(); onClose(); }}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Удалить ссылку</span>
          </button>
        )}
        {onInsertFootnote && (
          <Item icon={SquareCode} label="Сноска [^1]" onClick={onInsertFootnote} />
        )}
      </div>
    </div>
  );
};
