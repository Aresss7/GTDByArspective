import React, { useState } from 'react';
import { FileText, Plus, Trash2, Search } from 'lucide-react';
import { Task } from '@shared/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

interface NotesViewProps {
  tasks: Task[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  tasks,
  onTaskUpdated,
  onOpenAddTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<Task | null>(null);
  const noteItems = tasks.filter((t) => t.destination === 'notes' && t.status === 'active' && !t.deleted_at);

  const filteredNotes = noteItems.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.notes && n.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleConfirmDelete = async () => {
    if (!window.gtdApi || !noteToDelete) return;
    try {
      await window.gtdApi.deleteTask(noteToDelete.id, false);
      setNoteToDelete(null);
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по заметкам..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-xs focus:outline-none transition-all"
          />
        </div>

        <button
          onClick={onOpenAddTask}
          className="flex items-center space-x-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Создать заметку</span>
        </button>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            {searchQuery ? 'Ничего не найдено' : 'Раздел заметок пуст'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            Сюда попадает полезная справочная информация из корзины, не требующая действий.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="p-5 bg-white dark:bg-[#222222] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-all flex flex-col justify-between group"
            >
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">{note.title}</h4>
                {note.notes && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {note.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                <span>{new Date(note.created_at).toLocaleDateString('ru-RU')}</span>
                <button
                  onClick={() => setNoteToDelete(note)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Удалить заметку"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
