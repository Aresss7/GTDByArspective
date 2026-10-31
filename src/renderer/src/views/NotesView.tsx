import React, { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import { Task } from '@shared/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { MarkdownNoteEditor } from '../components/MarkdownEditor';
import { Language, translations } from '../i18n/translations';

interface NotesViewProps {
  tasks: Task[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
  language?: Language;
}

export const NotesView: React.FC<NotesViewProps> = ({
  tasks,
  onTaskUpdated,
  onOpenAddTask,
  language = 'ru',
}) => {
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

  const noteItems = tasks.filter((t) => t.destination === 'notes' && t.status === 'active' && !t.deleted_at);

  const filteredNotes = noteItems.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.notes && n.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Синхронизация при открытии заметки
  const handleOpenNote = (note: Task) => {
    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.notes || '');
    setSaveSuccess(false);
  };

  // Закрытие страницы заметки
  const handleCloseNote = async () => {
    // Если есть несохранённые изменения, сохраняем перед выходом
    if (selectedNote && (draftTitle !== selectedNote.title || draftContent !== (selectedNote.notes || ''))) {
      await handleSaveNote();
    }
    setSelectedNote(null);
  };

  // Сохранение изменений в заметке
  const handleSaveNote = async () => {
    if (!window.gtdApi || !selectedNote || !draftTitle.trim()) return;
    setIsSaving(true);
    try {
      await window.gtdApi.updateTask(selectedNote.id, {
        title: draftTitle.trim(),
        notes: draftContent.trim() || undefined,
      });
      setSaveSuccess(true);
      await onTaskUpdated();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      setIsSaving(false);
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

  // Горячая клавиша Escape для возврата к общему списку заметок
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNote && !noteToDelete) {
        handleCloseNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote, draftTitle, draftContent, noteToDelete]);

  // ЕСЛИ ОТКРЫТА СТРАНИЦА ЗАМЕТКИ
  if (selectedNote) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-5 animate-fadeIn">
        {/* Верхняя навигационная панель страницы заметки */}
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
              <span>{t.notesCreated}: {new Date(selectedNote.created_at).toLocaleDateString(isEn ? 'en-US' : 'ru-RU')}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Кнопка копирования */}
            <button
              onClick={handleCopyNote}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#282828] text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title={isEn ? 'Copy note text' : 'Скопировать текст заметки'}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? t.notesCopied : t.notesCopy}</span>
            </button>

            {/* Кнопка сохранения */}
            <button
              onClick={handleSaveNote}
              disabled={isSaving || !draftTitle.trim()}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saveSuccess ? t.notesSaved : isSaving ? t.notesSaving : t.notesSave}</span>
            </button>

            {/* Кнопка удаления в корзину */}
            <button
              onClick={() => setNoteToDelete(selectedNote)}
              className="p-2 rounded-2xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title={t.notesDeleteTrash}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Рабочая область заметки */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
          {/* Редактируемый заголовок заметки */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              {t.notesTitleLabel}
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder={t.notesTitlePlaceholder}
              className="w-full text-xl md:text-2xl font-black bg-transparent border-b border-zinc-200 dark:border-zinc-800 pb-2 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors placeholder:text-zinc-400"
            />
          </div>

          {/* Редактируемый текст заметки */}
          <div className="space-y-1.5 pt-1">
            <MarkdownNoteEditor
              value={draftContent}
              onChange={(val) => setDraftContent(val)}
              onSave={handleSaveNote}
              placeholder={t.notesContentPlaceholder}
            />
          </div>
        </div>

        {/* Модальное окно подтверждения удаления */}
        <ConfirmDeleteModal
          isOpen={Boolean(noteToDelete)}
          title={noteToDelete?.title || ''}
          description="Заметка будет перемещена в раздел «Мусор»."
          confirmText="Удалить в корзину"
          onClose={() => setNoteToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      </div>
    );
  }

  // ОБЩИЙ СПИСОК ВСЕХ ЗАМЕТОК
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Панель поиска */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.notesSearchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-xs focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
          />
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            {searchQuery ? t.notFoundTitle : t.notesEmpty}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            {searchQuery ? t.notFoundDesc : (isEn ? 'Click «Create Note» to record reference materials, checklists, or ideas.' : 'Кликните «Создать заметку», чтобы записать полезную справочную информацию, чек-лист или идеи.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleOpenNote(note)}
              className="p-5 bg-white dark:bg-[#222222] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors line-clamp-2">
                  {note.title}
                </h4>
                {note.notes ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {note.notes}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 italic">Пустая заметка. Нажмите, чтобы добавить текст.</p>
                )}
              </div>

              <div className="pt-3 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                <span>{new Date(note.created_at).toLocaleDateString('ru-RU')}</span>
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium mr-1">
                    Открыть →
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteToDelete(note);
                    }}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Удалить заметку"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
};
