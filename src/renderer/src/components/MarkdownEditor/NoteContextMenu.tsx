import React, { useEffect, useRef, useState } from 'react';
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
  SquareCode,
  Search
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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

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

  // Динамический расчёт положения: выше или ниже курсора в зависимости от высоты экрана
  const menuWidth = 216;
  const menuHeight = 350;
  const showAbove = y + menuHeight > window.innerHeight;
  const top = showAbove
    ? Math.max(12, y - menuHeight)
    : Math.min(y, window.innerHeight - menuHeight - 12);
  const left = Math.min(Math.max(12, x), window.innerWidth - menuWidth - 16);

  const q = searchQuery.toLowerCase().trim();

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
  }) => {
    if (q && !label.toLowerCase().includes(q) && !(shortcut && shortcut.toLowerCase().includes(q))) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => {
          onClick();
          onClose();
        }}
        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer text-left ${
          active 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' 
            : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#252525]'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'}`} />
          <span className="truncate">{label}</span>
        </div>
        {shortcut && (
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 ml-1.5 shrink-0">{shortcut}</span>
        )}
      </button>
    );
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-54 bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-fadeIn select-none flex flex-col"
    >
      {/* Поиск действия */}
      <div className="px-1 pt-0.5 pb-1 border-b border-zinc-100 dark:border-zinc-800">
        <div className="relative flex items-center">
          <Search className="w-3 h-3 absolute left-2 text-zinc-400" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-6 pr-2 py-1 text-[11px] rounded-lg bg-zinc-100 dark:bg-[#252528] border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Компактный прокручиваемый слайдер с элементами */}
      <div className="max-h-[300px] overflow-y-auto space-y-0.5 pr-0.5">
        {/* Undo / Redo */}
        {(!q || 'отменить'.includes(q) || 'повторить'.includes(q)) && (
          <div className="flex items-center space-x-1 pb-1 border-b border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => { onUndo(); onClose(); }}
              className="flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#252525] transition-colors cursor-pointer"
              title="Отменить"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Отмена</span>
            </button>
            <button
              type="button"
              onClick={() => { onRedo(); onClose(); }}
              className="flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#252525] transition-colors cursor-pointer"
              title="Повторить"
            >
              <RotateCw className="w-3 h-3" />
              <span>Повтор</span>
            </button>
          </div>
        )}

        {/* Formatting */}
        <div className="space-y-0.5 pt-0.5">
          <Item icon={Bold} label="Жирный" shortcut="Ctrl+B" active={activeFormats.bold} onClick={onToggleBold} />
          <Item icon={Italic} label="Курсив" shortcut="Ctrl+I" active={activeFormats.italic} onClick={onToggleItalic} />
          <Item icon={UnderlineIcon} label="Подчёркнутый" shortcut="Ctrl+U" active={activeFormats.underline} onClick={onToggleUnderline} />
          <Item icon={Strikethrough} label="Зачёркнутый" shortcut="Ctrl+Shift+X" active={activeFormats.strike} onClick={onToggleStrike} />
          <Item icon={Code} label="Встроенный код" active={activeFormats.code} onClick={onToggleCode} />
        </div>

        {!q && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}

        {/* Headings */}
        <div className="space-y-0.5">
          <Item icon={Heading1} label="Заголовок 1 (H1)" active={activeFormats.h1} onClick={() => onSetHeading(1)} />
          <Item icon={Heading2} label="Заголовок 2 (H2)" active={activeFormats.h2} onClick={() => onSetHeading(2)} />
          <Item icon={Heading3} label="Заголовок 3 (H3)" active={activeFormats.h3} onClick={() => onSetHeading(3)} />
          <Item icon={Pilcrow} label="Обычный текст" active={activeFormats.paragraph} onClick={onSetParagraph} />
        </div>

        {!q && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}

        {/* Blocks */}
        <div className="space-y-0.5">
          <Item icon={List} label="Маркированный список" active={activeFormats.bulletList} onClick={onToggleBulletList} />
          <Item icon={ListOrdered} label="Нумерованный список" active={activeFormats.orderedList} onClick={onToggleOrderedList} />
          <Item icon={Quote} label="Цитата" active={activeFormats.blockquote} onClick={onToggleBlockquote} />
          <Item icon={FileCode} label="Блок кода" active={activeFormats.codeBlock} onClick={onToggleCodeBlock} />
          <Item icon={Minus} label="Разделитель" onClick={onInsertHorizontalRule} />
        </div>

        {!q && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}

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
              className="w-full flex items-center space-x-2 px-2.5 py-1 rounded-lg text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
            >
              <Minus className="w-3 h-3" />
              <span>Удалить ссылку</span>
            </button>
          )}
          {onInsertFootnote && (
            <Item icon={SquareCode} label="Сноска [^1]" onClick={onInsertFootnote} />
          )}
        </div>
      </div>
    </div>
  );
};
