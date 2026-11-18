import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  ArrowLeft, 
  Copy, 
  Check, 
  Save, 
  Calendar, 
  Clock, 
  Pin,
  X,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
  GripVertical,
  Undo2,
  Redo2
} from 'lucide-react';
import { Task } from '@shared/types';
import { matchesSearch } from '@shared/searchEngine';
import { formatDateDDMMYYYY } from '@shared/dateUtils';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { PinLimitModal } from '../components/PinLimitModal';
import { NoteCardContextMenu } from '../components/NoteCardContextMenu';
import { MarkdownNoteEditor, MarkdownPreview, MarkdownNoteEditorRef } from '../components/MarkdownEditor';
import { Language, translations } from '../i18n/translations';
import { useToast } from '../components/ToastNotification';

interface NotesViewProps {
  tasks: Task[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
  language?: Language;
  autoSaveNotesOnExit?: boolean;
}

export const NotesView: React.FC<NotesViewProps> = ({
  tasks,
  onTaskUpdated,
  onOpenAddTask,
  language = 'ru',
  autoSaveNotesOnExit = true,
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Task | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Task | null>(null);
  
  const t = translations[language] || translations.ru;
  const isEn = language === 'en';
  
  // Состояния редактирования для открытой страницы заметки
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Закреплённые заметки (до 4 заметок одновременно)
  const [isPinLimitOpen, setIsPinLimitOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MarkdownNoteEditorRef>(null);

  // Контекстное меню ПКМ для карточки заметки
  const [contextMenuNote, setContextMenuNote] = useState<Task | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleNoteContextMenu = (e: React.MouseEvent, note: Task) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuNote(note);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleCopyNoteFromList = async (note: Task) => {
    const textToCopy = `${note.title}\n\n${note.notes || ''}`.trim();
    if (navigator.clipboard && textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      showToast(isEn ? 'Note copied to clipboard' : 'Текст заметки скопирован', 'success');
    }
  };

  // Поиск внутри открытой заметки (Ctrl+F)
  const [inNoteSearchOpen, setInNoteSearchOpen] = useState(false);
  const [inNoteQuery, setInNoteQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const inNoteSearchInputRef = useRef<HTMLInputElement>(null);

  const noteItems = tasks.filter((t) => t.destination === 'notes' && t.status === 'active' && !t.deleted_at);

  const pinnedNotesCount = useMemo(() => {
    return noteItems.filter((n) => Boolean(n.is_pinned)).length;
  }, [noteItems]);

  // Переключение режима отображения: 'grid' (сетка) или 'list' (список)
  const [notesViewMode, setNotesViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('gtd-notes-view-mode');
      return saved === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleToggleViewMode = () => {
    const nextMode = notesViewMode === 'grid' ? 'list' : 'grid';
    setNotesViewMode(nextMode);
    try {
      localStorage.setItem('gtd-notes-view-mode', nextMode);
    } catch {}
  };

  // Однократная миграция старых закреплений из localStorage в SQLite
  useEffect(() => {
    try {
      const raw = localStorage.getItem('gtd-pinned-notes');
      if (raw && window.gtdApi) {
        const parsed: string[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const id of parsed) {
            const match = noteItems.find((n) => n.id === id);
            if (match && !match.is_pinned) {
              window.gtdApi.updateTask(id, { is_pinned: 1 }).catch(console.warn);
            }
          }
        }
        localStorage.removeItem('gtd-pinned-notes');
      }
    } catch {}
  }, []);

  const draftTitleRef = useRef(draftTitle);
  const draftContentRef = useRef(draftContent);
  const selectedNoteRef = useRef(selectedNote);

  draftTitleRef.current = draftTitle;
  draftContentRef.current = draftContent;
  selectedNoteRef.current = selectedNote;

  // Автосохранение при размонтировании (при смене раздела в боковом меню)
  useEffect(() => {
    return () => {
      const curNote = selectedNoteRef.current;
      const curTitle = draftTitleRef.current;
      const curContent = draftContentRef.current;
      if (
        autoSaveNotesOnExit &&
        curNote &&
        curTitle.trim() &&
        (curTitle !== curNote.title || curContent !== (curNote.notes || ''))
      ) {
        if (window.gtdApi) {
          window.gtdApi.updateTask(curNote.id, {
            title: curTitle.trim(),
            notes: curContent.trim() || undefined,
            position: 0,
          }).catch(console.error);
        }
      }
    };
  }, [autoSaveNotesOnExit]);

  const handleTogglePin = async (note: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyPinned = Boolean(note.is_pinned);
    if (isCurrentlyPinned) {
      if (window.gtdApi) {
        await window.gtdApi.updateTask(note.id, { is_pinned: 0 });
        await onTaskUpdated();
      }
    } else {
      // Подсчитываем только АКТИВНЫЕ заметки не в корзине
      const activePinnedCount = noteItems.filter((n) => Boolean(n.is_pinned)).length;
      if (activePinnedCount >= 4) {
        setIsPinLimitOpen(true);
        return;
      }
      if (window.gtdApi) {
        await window.gtdApi.updateTask(note.id, { is_pinned: 1 });
        await onTaskUpdated();
      }
    }
  };

  const filteredNotes = noteItems.filter((n) => matchesSearch(n, searchQuery));

  // Подсчёт общего количества вхождений подстроки внутри заметки
  const inNoteMatchesCount = useMemo(() => {
    if (!inNoteQuery.trim()) return 0;
    const full = (draftTitle + ' ' + draftContent).toLowerCase();
    const q = inNoteQuery.toLowerCase();
    let count = 0;
    let pos = 0;
    while ((pos = full.indexOf(q, pos)) !== -1) {
      count++;
      pos += q.length;
    }
    return count;
  }, [inNoteQuery, draftTitle, draftContent]);

  const handleQueryChange = (val: string) => {
    setInNoteQuery(val);
    setActiveMatchIndex(0);
  };

  const handleNextMatch = () => {
    if (inNoteMatchesCount <= 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % inNoteMatchesCount);
  };

  const handlePrevMatch = () => {
    if (inNoteMatchesCount <= 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + inNoteMatchesCount) % inNoteMatchesCount);
  };

  // Закреплённые активные заметки идут первыми в списке, новые/недавно отредактированные заметки идут сверху (после закреплённых), затем упорядоченные вручную
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      const aPin = Boolean(a.is_pinned) ? 1 : 0;
      const bPin = Boolean(b.is_pinned) ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      const posA = typeof a.position === 'number' && a.position > 0 ? a.position : null;
      const posB = typeof b.position === 'number' && b.position > 0 ? b.position : null;
      if (posA !== null && posB !== null) {
        return posA - posB;
      }
      if (posA === null && posB !== null) return -1;
      if (posA !== null && posB === null) return 1;
      const aTime = new Date(a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });
  }, [filteredNotes]);

  const draggedNoteIdRef = useRef<string | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);

  const handleReorderNotes = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId || !window.gtdApi) return;
    const fromIndex = sortedNotes.findIndex((n) => n.id === sourceId);
    const toIndex = sortedNotes.findIndex((n) => n.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...sortedNotes];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    try {
      await Promise.all(
        reordered.map((n, i) => {
          const newPos = (i + 1) * 1000;
          return window.gtdApi.updateTask(n.id, { position: newPos });
        })
      );
      await onTaskUpdated();
    } catch (e) {
      console.error('Failed to reorder notes:', e);
    }
  };

  // Синхронизация при открытии заметки
  const handleOpenNote = (note: Task) => {
    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.notes || '');
    setSaveSuccess(false);
  };

  // Закрытие страницы заметки с автосохранением
  const handleCloseNote = async () => {
    setIsFullscreen(false);
    if (selectedNote && (draftTitle !== selectedNote.title || draftContent !== (selectedNote.notes || ''))) {
      if (autoSaveNotesOnExit && draftTitle.trim()) {
        await handleSaveNote();
      }
    }
    setSelectedNote(null);
  };

  // Выход без сохранения изменений
  const handleExitWithoutSaving = () => {
    setIsFullscreen(false);
    draftTitleRef.current = '';
    draftContentRef.current = '';
    selectedNoteRef.current = null;
    setSelectedNote(null);
  };

  const lastSavedAtRef = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);

  // Сохранение изменений в заметке
  const handleSaveNote = async () => {
    const now = Date.now();
    if (!window.gtdApi || !selectedNote || !draftTitle.trim() || isSavingRef.current || now - lastSavedAtRef.current < 800) {
      return;
    }
    isSavingRef.current = true;
    lastSavedAtRef.current = now;
    setIsSaving(true);
    try {
      await window.gtdApi.updateTask(selectedNote.id, {
        title: draftTitle.trim(),
        notes: draftContent.trim() || undefined,
        position: 0,
      });
      setSaveSuccess(true);
      showToast(isEn ? 'Note saved' : 'Заметка сохранена', 'success');
      await onTaskUpdated();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 500);
    }
  };

  // Копирование текста заметки
  const handleCopyNote = async () => {
    const textToCopy = `${draftTitle}\n\n${draftContent}`.trim();
    if (navigator.clipboard && textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Удаление заметки
  const handleConfirmDelete = async () => {
    if (!window.gtdApi || !noteToDelete) return;
    try {
      await window.gtdApi.deleteTask(noteToDelete.id, false);
      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null);
      }
      setNoteToDelete(null);
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  // Горячая клавиша Escape для закрытия поиска в заметке, выхода из полноэкранного режима или возврата к списку
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inNoteSearchOpen) {
          e.preventDefault();
          setInNoteSearchOpen(false);
          setInNoteQuery('');
          return;
        }
        if (isFullscreen) {
          e.preventDefault();
          setIsFullscreen(false);
          return;
        }
        if (selectedNote && !noteToDelete) {
          handleCloseNote();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inNoteSearchOpen, isFullscreen, selectedNote, draftTitle, draftContent, noteToDelete]);

  // Горячая клавиша Ctrl+F / Cmd+F:
  // Если открыта заметка — открывает поиск внутри этой заметки.
  // Если на общем списке заметок — фокус общего поля поиска.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А')) {
        e.preventDefault();
        if (selectedNote) {
          setInNoteSearchOpen(true);
          setTimeout(() => {
            inNoteSearchInputRef.current?.focus();
            inNoteSearchInputRef.current?.select();
          }, 50);
        } else {
          setTimeout(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
          }, 50);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote]);

  // Горячая клавиша Ctrl+S / Cmd+S / Ctrl+Enter: сохранение заметки при редактировании
  useEffect(() => {
    if (!selectedNote) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isSaveKey = 
        (e.ctrlKey || e.metaKey) && 
        (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы' || e.code === 'KeyS' || 
         e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter');
      if (isSaveKey) {
        e.preventDefault();
        handleSaveNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote, draftTitle, draftContent]);

  // ЕСЛИ ОТКРЫТА СТРАНИЦА ЗАМЕТКИ
  if (selectedNote) {
    return (
      <div className={`w-full max-w-6xl mx-auto space-y-5 animate-fadeIn ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
        {/* Верхняя навигационная панель страницы заметки (скрыта в полноэкранном режиме) */}
        {!isFullscreen && (
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCloseNote}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-zinc-100 dark:bg-[#222222] hover:bg-zinc-200 dark:hover:bg-[#2b2b2b] text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer shadow-xs active:scale-95"
              title={isEn ? 'Back to all notes (Esc)' : 'Вернуться ко всем заметкам (Esc)'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.notesAll}</span>
            </button>
            <span className="text-xs text-zinc-400">|</span>
            <span className="text-xs text-zinc-400 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{t.notesCreated}: {formatDateDDMMYYYY(selectedNote.updated_at || selectedNote.created_at)}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Группа действий редактирования (Отмена, Повтор, Копировать, Сохранить) */}
            <div className="flex items-center bg-zinc-100 dark:bg-[#222222] p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-x-1 shadow-2xs">
              {/* Отмена */}
              <button
                type="button"
                onClick={() => editorRef.current?.undo()}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#2c2c2c] transition-all cursor-pointer shadow-2xs active:scale-90"
                title={isEn ? 'Undo (Ctrl+Z)' : 'Отменить (Ctrl+Z)'}
              >
                <Undo2 className="w-4 h-4" />
              </button>

              {/* Повтор */}
              <button
                type="button"
                onClick={() => editorRef.current?.redo()}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#2c2c2c] transition-all cursor-pointer shadow-2xs active:scale-90"
                title={isEn ? 'Redo (Ctrl+Y / Ctrl+Shift+Z)' : 'Повторить (Ctrl+Y / Ctrl+Shift+Z)'}
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700/80 mx-0.5" />

              {/* Копировать */}
              <button
                type="button"
                onClick={handleCopyNote}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#2c2c2c] transition-all cursor-pointer shadow-2xs active:scale-90"
                title={isCopied ? (isEn ? 'Copied!' : 'Скопировано!') : (isEn ? 'Copy text' : 'Скопировать текст')}
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Сохранить */}
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSaving || !draftTitle.trim()}
                className={`p-2 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-90 ${
                  saveSuccess
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-40'
                }`}
                title={
                  saveSuccess
                    ? (isEn ? 'Saved!' : 'Сохранено!')
                    : isSaving
                    ? (isEn ? 'Saving...' : 'Сохранение...')
                    : (isEn ? 'Save note (Ctrl+S)' : 'Сохранить заметку (Ctrl+S)')
                }
              >
                {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              </button>
            </div>

            {/* Кнопка выйти без сохранения */}
            <button
              type="button"
              onClick={handleExitWithoutSaving}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/40 dark:hover:border-rose-900 text-xs font-semibold text-zinc-600 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 transition-all cursor-pointer shadow-xs active:scale-95"
              title={isEn ? 'Discard changes and exit' : 'Выйти без сохранения изменений'}
            >
              <X className="w-3.5 h-3.5" />
              <span>{isEn ? 'Discard' : 'Выйти без сохранения'}</span>
            </button>
          </div>
        </div>
        )}

        {/* Панель поиска внутри заметки (Ctrl+F) — плавающая поверх контента, не уходит при листании */}
        {inNoteSearchOpen && (
          <div className="fixed top-12 right-6 sm:right-10 z-40 p-3 rounded-2xl bg-white/95 dark:bg-[#242426]/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-700/90 shadow-2xl animate-fadeIn flex items-center justify-between gap-3 max-w-sm sm:max-w-md w-[calc(100%-3rem)] sm:w-auto">
            <div className="flex items-center space-x-2.5 flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                ref={inNoteSearchInputRef}
                type="text"
                value={inNoteQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      handlePrevMatch();
                    } else {
                      handleNextMatch();
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setInNoteSearchOpen(false);
                    setInNoteQuery('');
                  }
                }}
                placeholder={isEn ? 'Find in note...' : 'Поиск в тексте заметки...'}
                className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none font-medium"
              />
            </div>

            <div className="flex items-center space-x-2 shrink-0 text-xs">
              <span className="text-[11px] text-zinc-400 font-mono">
                {inNoteQuery.trim()
                  ? inNoteMatchesCount > 0
                    ? `${activeMatchIndex + 1} из ${inNoteMatchesCount}`
                    : isEn
                      ? 'Not found'
                      : 'Не найдено'
                  : ''}
              </span>
              <button
                type="button"
                onClick={handlePrevMatch}
                disabled={!inNoteQuery.trim() || inNoteMatchesCount === 0}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
                title={isEn ? 'Previous (Shift+Enter)' : 'Предыдущее (Shift+Enter)'}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMatch}
                disabled={!inNoteQuery.trim() || inNoteMatchesCount === 0}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
                title={isEn ? 'Next (Enter)' : 'Следующее (Enter)'}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setInNoteSearchOpen(false);
                  setInNoteQuery('');
                }}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                title={isEn ? 'Close search (Esc)' : 'Закрыть поиск (Esc)'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Рабочая область заметки */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            isFullscreen
              ? 'fixed top-14 bottom-0 left-64 right-0 z-45 bg-white dark:bg-[#191919] p-6 md:p-8 flex flex-col overflow-hidden animate-fadeIn'
              : 'bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-4'
          }`}
        >
          {/* Редактируемый заголовок заметки */}
          {!isFullscreen && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                {t.notesTitleLabel}
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
                    e.preventDefault();
                    handleSaveNote();
                  }
                }}
                placeholder={t.notesTitlePlaceholder}
                className="w-full text-xl md:text-2xl font-black bg-transparent border-b border-zinc-200 dark:border-zinc-800 pb-2 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors placeholder:text-zinc-400"
              />
            </div>
          )}

          {/* Редактируемый текст заметки */}
          <div className={isFullscreen ? 'flex-1 flex flex-col min-h-0' : 'space-y-1.5 pt-1'}>
            <MarkdownNoteEditor
              ref={editorRef}
              value={draftContent}
              onChange={(val) => setDraftContent(val)}
              onSave={handleSaveNote}
              placeholder={t.notesContentPlaceholder}
              searchTerm={inNoteSearchOpen ? inNoteQuery : ''}
              activeMatchIndex={activeMatchIndex}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
            />
          </div>
        </div>

        {/* Модальное окно подтверждения удаления */}
        <ConfirmDeleteModal
          isOpen={Boolean(noteToDelete)}
          title={noteToDelete?.title || ''}
          description={isEn ? 'The note will be moved to Trash.' : 'Заметка будет перемещена в раздел «Мусор».'}
          confirmText={isEn ? 'Move to Trash' : 'Переместить в Мусор'}
          onClose={() => setNoteToDelete(null)}
          onConfirm={handleConfirmDelete}
        />

        {/* Модальное окно предупреждения о лимите закреплений */}
        <PinLimitModal
          isOpen={isPinLimitOpen}
          onClose={() => setIsPinLimitOpen(false)}
          language={language}
        />
      </div>
    );
  }

  // ОБЩИЙ СПИСОК ВСЕХ ЗАМЕТОК
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Панель поиска, индикатор закреплений и переключатель вида */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.notesSearchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
          />
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Закреплено: просто иконка и число x/4 */}
          <span 
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border flex items-center space-x-1.5 shadow-xs transition-colors ${
              pinnedNotesCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-zinc-100 dark:bg-[#222222] border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
            }`}
            title={isEn ? `Pinned notes: ${pinnedNotesCount}/4` : `Закреплено заметок: ${pinnedNotesCount}/4`}
          >
            <Pin className={`w-3.5 h-3.5 ${pinnedNotesCount > 0 ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'}`} />
            <span>{pinnedNotesCount}/4</span>
          </span>

          {/* Переключатель вида (справа от "закреплено") */}
          <button
            type="button"
            onClick={handleToggleViewMode}
            className="p-2 rounded-full bg-white dark:bg-[#222222] hover:bg-zinc-100 dark:hover:bg-[#2b2b2b] border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer shadow-xs active:scale-95"
            title={
              notesViewMode === 'grid'
                ? (isEn ? 'Switch to list view' : 'Переключить на список')
                : (isEn ? 'Switch to grid view' : 'Переключить на сетку')
            }
          >
            {notesViewMode === 'grid' ? (
              <List className="w-4 h-4" />
            ) : (
              <LayoutGrid className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {sortedNotes.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            {searchQuery ? t.notFoundTitle : t.notesEmpty}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            {searchQuery ? t.notFoundDesc : (isEn ? 'Use the «+» button or press Ctrl+N to create notes, checklists, or ideas.' : 'Нажмите кнопку «+» внизу или нажмите Ctrl+N, чтобы записать справочную информацию, чек-лист или идеи.')}
          </p>
        </div>
      ) : notesViewMode === 'grid' ? (
        /* Режим сетки (Grid) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedNotes.map((note, idx) => {
            const isPinned = Boolean(note.is_pinned);
            return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => {
                  draggedNoteIdRef.current = note.id;
                  e.dataTransfer.setData('text/plain', note.id);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggingNoteId(note.id);
                }}
                onDragEnd={() => {
                  draggedNoteIdRef.current = null;
                  setDraggingNoteId(null);
                  setDragOverNoteId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverNoteId !== note.id) {
                    setDragOverNoteId(note.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverNoteId === note.id) {
                    setDragOverNoteId(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const sourceId = draggedNoteIdRef.current || e.dataTransfer.getData('text/plain') || draggingNoteId;
                  draggedNoteIdRef.current = null;
                  setDraggingNoteId(null);
                  setDragOverNoteId(null);
                  if (sourceId && sourceId !== note.id) {
                    await handleReorderNotes(sourceId, note.id);
                  }
                }}
                onClick={() => handleOpenNote(note)}
                onContextMenu={(e) => handleNoteContextMenu(e, note)}
                className={`p-5 bg-white dark:bg-[#222222] rounded-3xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer ${
                  draggingNoteId === note.id ? 'opacity-40 scale-[0.99]' : ''
                } ${
                  dragOverNoteId === note.id
                    ? 'border-zinc-900 dark:border-white ring-2 ring-zinc-400 dark:ring-zinc-600'
                    : isPinned
                      ? 'border-amber-400/80 dark:border-amber-500/50 bg-amber-50/15 dark:bg-amber-950/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <div className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title={isEn ? 'Drag to reorder' : 'Перетащите для изменения порядка'}>
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      {isPinned && (
                        <span className="shrink-0 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center">
                          <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors line-clamp-2">
                        {note.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(note, e)}
                      className={`p-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                        isPinned
                          ? 'text-amber-500 bg-amber-100/70 dark:bg-amber-950/60'
                          : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      title={isPinned ? (isEn ? 'Unpin note' : 'Открепить заметку') : (isEn ? 'Pin note (up to 4)' : 'Закрепить заметку (до 4)')}
                    >
                      <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  {note.notes ? (
                    <MarkdownPreview content={note.notes} maxLines={4} className="mt-1" />
                  ) : (
                    <p className="text-xs text-zinc-400 italic">
                      {isEn ? 'Empty note. Click to add text.' : 'Пустая заметка. Нажмите, чтобы добавить текст.'}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                  <div className="flex items-center space-x-2">
                    <span>{formatDateDDMMYYYY(note.updated_at || note.created_at)}</span>
                    {isPinned && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        {isEn ? 'Pinned' : 'Закреплено'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium mr-1">
                      {isEn ? 'Open →' : 'Открыть →'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(note);
                      }}
                      className="p-1.5 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title={t.notesDeleteTrash}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Режим списка (List) */
        <div className="space-y-2">
          {sortedNotes.map((note, idx) => {
            const isPinned = Boolean(note.is_pinned);

            return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => {
                  draggedNoteIdRef.current = note.id;
                  e.dataTransfer.setData('text/plain', note.id);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggingNoteId(note.id);
                }}
                onDragEnd={() => {
                  draggedNoteIdRef.current = null;
                  setDraggingNoteId(null);
                  setDragOverNoteId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverNoteId !== note.id) {
                    setDragOverNoteId(note.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverNoteId === note.id) {
                    setDragOverNoteId(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const sourceId = draggedNoteIdRef.current || e.dataTransfer.getData('text/plain') || draggingNoteId;
                  draggedNoteIdRef.current = null;
                  setDraggingNoteId(null);
                  setDragOverNoteId(null);
                  if (sourceId && sourceId !== note.id) {
                    await handleReorderNotes(sourceId, note.id);
                  }
                }}
                onClick={() => handleOpenNote(note)}
                onContextMenu={(e) => handleNoteContextMenu(e, note)}
                className={`px-4 py-3 bg-white dark:bg-[#222222] rounded-2xl border shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${
                  draggingNoteId === note.id ? 'opacity-40 scale-[0.99]' : ''
                } ${
                  dragOverNoteId === note.id
                    ? 'border-zinc-900 dark:border-white ring-2 ring-zinc-400 dark:ring-zinc-600'
                    : isPinned
                      ? 'border-amber-400/80 dark:border-amber-500/50 bg-amber-50/15 dark:bg-amber-950/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0 mr-4">
                  <div className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title={isEn ? 'Drag to reorder' : 'Перетащите для изменения порядка'}>
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  {isPinned && (
                    <span className="shrink-0 text-amber-500">
                      <Pin className="w-3.5 h-3.5 fill-amber-500" />
                    </span>
                  )}
                  <div className="flex items-baseline space-x-3 min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors truncate shrink-0 max-w-[280px] sm:max-w-[360px]">
                      {note.title}
                    </h4>
                    {note.notes && (
                      <MarkdownPreview
                        content={note.notes}
                        maxLines={1}
                        className="hidden sm:inline-block truncate max-w-[320px] md:max-w-[420px] !space-y-0 text-xs text-zinc-400 dark:text-zinc-500"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden md:inline">
                    {formatDateDDMMYYYY(note.updated_at || note.created_at)}
                  </span>
                  {isPinned && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hidden sm:inline">
                      {isEn ? 'Pinned' : 'Закреплено'}
                    </span>
                  )}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(note, e)}
                      className={`p-1.5 rounded-full transition-all cursor-pointer ${
                        isPinned
                          ? 'text-amber-500 bg-amber-100/70 dark:bg-amber-950/60'
                          : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      title={isPinned ? (isEn ? 'Unpin note' : 'Открепить заметку') : (isEn ? 'Pin note (up to 4)' : 'Закрепить заметку (до 4)')}
                    >
                      <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(note);
                      }}
                      className="p-1.5 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title={t.notesDeleteTrash}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      <ConfirmDeleteModal
        isOpen={Boolean(noteToDelete)}
        title={noteToDelete?.title || ''}
        description="Заметка будет перемещена в раздел «Мусор»."
        confirmText="Удалить в корзину"
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Модальное окно предупреждения о лимите закреплений */}
      <PinLimitModal
        isOpen={isPinLimitOpen}
        onClose={() => setIsPinLimitOpen(false)}
        language={language}
      />

      {/* Контекстное меню ПКМ для карточки заметки */}
      <NoteCardContextMenu
        note={contextMenuNote}
        position={contextMenuPos}
        onClose={() => {
          setContextMenuPos(null);
          setContextMenuNote(null);
        }}
        onOpen={handleOpenNote}
        onTogglePin={handleTogglePin}
        onCopy={handleCopyNoteFromList}
        onDelete={(note) => setNoteToDelete(note)}
        language={language}
      />
    </div>
  );
};
