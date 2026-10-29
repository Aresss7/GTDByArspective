import React, { useState } from 'react';
import { FileText, Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { Task } from '@shared/types';

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
  const noteItems = tasks.filter((t) => t.destination === 'notes' && t.status === 'active');

  const filteredNotes = noteItems.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.notes && n.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeleteNote = async (id: string) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.deleteTask(id, false);
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по заметкам..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <button
          onClick={onOpenAddTask}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Создать заметку</span>
        </button>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {searchQuery ? 'Ничего не найдено' : 'Раздел заметок пуст'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Сюда попадает полезная справочная информация из корзины, не требующая действий.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow transition-shadow flex flex-col justify-between group"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1.5">{note.title}</h4>
                {note.notes && (
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {note.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{new Date(note.created_at).toLocaleDateString('ru-RU')}</span>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Удалить заметку"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
