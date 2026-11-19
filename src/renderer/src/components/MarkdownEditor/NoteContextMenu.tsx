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
  SquareCode,
  Search,
  CheckSquare,
  Palette,
  Highlighter,
  ChevronRight
} from 'lucide-react';
import { ColorPickerMenu } from './ColorPickerMenu';
import { Language } from '../../i18n/translations';

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
    taskList?: boolean;
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
  onToggleTaskList?: () => void;
  onInsertHorizontalRule: () => void;
  onInsertOrEditLink: () => void;
  onRemoveLink?: () => void;
  onInsertFootnote?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectTextColor?: (color: string) => void;
  onSelectBgColor?: (bgColor: string) => void;
  activeTextColor?: string | null;
  activeBgColor?: string | null;
  language?: Language;
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
  onToggleTaskList,
  onInsertHorizontalRule,
  onInsertOrEditLink,
  onRemoveLink,
  onInsertFootnote,
  onUndo,
  onRedo,
  onSelectTextColor,
  onSelectBgColor,
  activeTextColor,
  activeBgColor,
  language = 'ru',
}) => {
  const isEn = language === 'en';
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeColorSubmenu, setActiveColorSubmenu] = useState<'text' | 'bg' | null>(null);

  // Сброс подменю при каждом закрытии
  useEffect(() => {
    if (!isOpen) {
      setActiveColorSubmenu(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (menuRef.current && target && menuRef.current.contains(target)) {
        return;
      }
      onClose();
    };
    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      // Не закрывать меню, если скроллится список внутри самого контекстного меню
      if (menuRef.current && target && (menuRef.current === target || menuRef.current.contains(target))) {
        return;
      }
      onClose();
    };
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

  // Если контекстное меню близко к правому краю, открываем подменю цветов СЛЕВА
  const openOnLeft = left + menuWidth + 215 > window.innerWidth;
  const showSubmenuAbove = top + 340 > window.innerHeight;

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
        onMouseDown={(e) => {
          // Защита от сброса выделения в редакторе при клике на кнопки форматирования
          e.preventDefault();
          e.stopPropagation();
        }}
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
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onWheel={(e) => e.stopPropagation()}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 flex items-start space-x-1.5 animate-fadeIn select-none"
    >
      <div className="w-56 bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 space-y-1 flex flex-col">
        {/* Поиск действия */}
        <div className="px-1 pt-0.5 pb-1 border-b border-zinc-100 dark:border-zinc-800">
          <div className="relative flex items-center">
            <Search className="w-3 h-3 absolute left-2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search action...' : 'Поиск...'}
              className="w-full pl-6 pr-2 py-1 text-[11px] rounded-lg bg-zinc-100 dark:bg-[#252528] border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
        </div>

      {/* Компактный прокручиваемый слайдер с элементами */}
      <div 
        className="max-h-[300px] overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin"
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Undo / Redo */}
        {(!q || 'undo'.includes(q) || 'redo'.includes(q) || 'отменить'.includes(q) || 'повторить'.includes(q)) && (
          <div className="flex items-center space-x-1 pb-1 border-b border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => { onUndo(); onClose(); }}
              className="flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#252525] transition-colors cursor-pointer"
              title={isEn ? 'Undo' : 'Отменить'}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isEn ? 'Undo' : 'Отмена'}</span>
            </button>
            <button
              type="button"
              onClick={() => { onRedo(); onClose(); }}
              className="flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#252525] transition-colors cursor-pointer"
              title={isEn ? 'Redo' : 'Повторить'}
            >
              <RotateCw className="w-3 h-3" />
              <span>{isEn ? 'Redo' : 'Повтор'}</span>
            </button>
          </div>
        )}

        {/* Formatting */}
        <div className="space-y-0.5 pt-0.5">
          <Item icon={Bold} label={isEn ? 'Bold' : 'Жирный'} shortcut="Ctrl+B" active={activeFormats.bold} onClick={onToggleBold} />
          <Item icon={Italic} label={isEn ? 'Italic' : 'Курсив'} shortcut="Ctrl+I" active={activeFormats.italic} onClick={onToggleItalic} />
          <Item icon={UnderlineIcon} label={isEn ? 'Underline' : 'Подчёркнутый'} shortcut="Ctrl+U" active={activeFormats.underline} onClick={onToggleUnderline} />
          <Item icon={Strikethrough} label={isEn ? 'Strikethrough' : 'Зачёркнутый'} shortcut="Ctrl+Shift+X" active={activeFormats.strike} onClick={onToggleStrike} />
          <Item icon={Code} label={isEn ? 'Inline code' : 'Встроенный код'} active={activeFormats.code} onClick={onToggleCode} />
        </div>

        {/* Colors (отдельно цвет текста и цвет фона) */}
        {(onSelectTextColor || onSelectBgColor) && (
          <>
            <div className="space-y-0.5 pt-0.5">
              {onSelectTextColor && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => setActiveColorSubmenu(activeColorSubmenu === 'text' ? null : 'text')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer text-left font-medium ${
                    activeColorSubmenu === 'text'
                      ? 'bg-zinc-100 dark:bg-[#2c2c2c] text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#252525]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Palette 
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        activeTextColor && activeTextColor !== 'inherit' && activeTextColor !== 'default'
                          ? ''
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                      style={{
                        color: activeTextColor && activeTextColor !== 'inherit' && activeTextColor !== 'default'
                          ? activeTextColor
                          : undefined
                      }}
                    />
                    <span>{isEn ? 'Text color' : 'Цвет текста'}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${activeColorSubmenu === 'text' ? (openOnLeft ? '-rotate-180' : 'rotate-90') : ''}`} />
                </button>
              )}
              {onSelectBgColor && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => setActiveColorSubmenu(activeColorSubmenu === 'bg' ? null : 'bg')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer text-left font-medium ${
                    activeColorSubmenu === 'bg'
                      ? 'bg-zinc-100 dark:bg-[#2c2c2c] text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#252525]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Highlighter 
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        activeBgColor && activeBgColor !== 'transparent' && activeBgColor !== 'default'
                          ? ''
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                      style={{
                        color: activeBgColor && activeBgColor !== 'transparent' && activeBgColor !== 'default'
                          ? activeBgColor
                          : undefined
                      }}
                    />
                    <span>{isEn ? 'Highlight color' : 'Цвет фона текста'}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${activeColorSubmenu === 'bg' ? (openOnLeft ? '-rotate-180' : 'rotate-90') : ''}`} />
                </button>
              )}
            </div>
            {!q && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}
          </>
        )}

        {!q && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}

        {/* Headings */}
        <div className="space-y-0.5">
          <Item icon={Heading1} label={isEn ? 'Heading 1 (H1)' : 'Заголовок 1 (H1)'} active={activeFormats.h1} onClick={() => onSetHeading(1)} />
          <Item icon={Heading2} label={isEn ? 'Heading 2 (H2)' : 'Заголовок 2 (H2)'} active={activeFormats.h2} onClick={() => onSetHeading(2)} />
          <Item icon={Heading3} label={isEn ? 'Heading 3 (H3)' : 'Заголовок 3 (H3)'} active={activeFormats.h3} onClick={() => onSetHeading(3)} />
          <Item icon={Pilcrow} label={isEn ? 'Normal text' : 'Обычный текст'} active={activeFormats.paragraph} onClick={onSetParagraph} />
        </div>

        {!q && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}

        {/* Blocks */}
        <div className="space-y-0.5">
          {onToggleTaskList && (
            <Item icon={CheckSquare} label={isEn ? 'Task list' : 'Список с чекбоксами'} active={activeFormats.taskList} onClick={onToggleTaskList} />
          )}
          <Item icon={List} label={isEn ? 'Bullet list' : 'Маркированный список'} active={activeFormats.bulletList} onClick={onToggleBulletList} />
          <Item icon={ListOrdered} label={isEn ? 'Numbered list' : 'Нумерованный список'} active={activeFormats.orderedList} onClick={onToggleOrderedList} />
          <Item icon={Quote} label={isEn ? 'Quote' : 'Цитата'} active={activeFormats.blockquote} onClick={onToggleBlockquote} />
          <Item icon={FileCode} label={isEn ? 'Code block' : 'Блок кода'} active={activeFormats.codeBlock} onClick={onToggleCodeBlock} />
          <Item icon={Minus} label={isEn ? 'Divider' : 'Разделитель'} onClick={onInsertHorizontalRule} />
        </div>

        {!q && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}

        {/* Links & Footnotes */}
        <div className="space-y-0.5">
          <Item 
            icon={Link2} 
            label={isLinkSelected ? (isEn ? 'Edit link' : 'Изменить ссылку') : (isEn ? 'Insert link' : 'Вставить ссылку')} 
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
              <span>{isEn ? 'Remove link' : 'Удалить ссылку'}</span>
            </button>
          )}
          {onInsertFootnote && (
            <Item icon={SquareCode} label={isEn ? 'Footnote [^1]' : 'Сноска [^1]'} onClick={onInsertFootnote} />
          )}
        </div>
      </div>
      </div>

      {/* Подменю выбора цвета (открывается слева или справа в зависимости от свободного места) */}
      {activeColorSubmenu && (
        <div
          style={{
            position: 'absolute',
            ...(openOnLeft ? { right: '100%', marginRight: '6px' } : { left: '100%', marginLeft: '6px' }),
            ...(showSubmenuAbove ? { bottom: 0 } : { top: 0 }),
          }}
        >
          <ColorPickerMenu
            mode={activeColorSubmenu}
            isEn={isEn}
            onSelectColor={(color) => {
              if (activeColorSubmenu === 'text') {
                onSelectTextColor?.(color);
              } else {
                onSelectBgColor?.(color);
              }
              onClose();
            }}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
};
