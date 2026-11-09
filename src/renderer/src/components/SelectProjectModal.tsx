import React, { useState, useEffect, useRef } from 'react';
import { FolderKanban, Search, X } from 'lucide-react';
import { Project } from '@shared/types';

interface SelectProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

export const SelectProjectModal: React.FC<SelectProjectModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSelectProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Сброс поиска и фокус на поле ввода при открытии
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Закрытие по клавише Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Фильтруем только существующие активные проекты (не удалённые и не завершённые)
  const activeProjects = projects.filter(
    (p) => p.status === 'active' && !p.deleted_at
  );

  // Поиск проектов по названию
  const filteredProjects = activeProjects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок модального окна */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Выберите проект
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Привязать задачу к существующему активному проекту
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Поле поиска проектов */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию проекта..."
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-purple-500 dark:focus:border-purple-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Список проектов */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar min-h-[140px] max-h-72">
          {activeProjects.length === 0 ? (
            <div className="py-8 text-center">
              <FolderKanban className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Нет активных проектов
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Сначала создайте проект или ответьте «Нет» для создания нового
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Проекты не найдены
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Попробуйте изменить поисковый запрос
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project)}
                className="w-full p-3 rounded-2xl text-left border border-zinc-200/60 dark:border-zinc-800/80 hover:border-purple-500/50 bg-white dark:bg-zinc-850 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {project.title}
                    </div>
                    {project.description && (
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {project.description}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-2 py-0.5 rounded-lg bg-purple-100/60 dark:bg-purple-900/40">
                  Выбрать
                </span>
              </button>
            ))
          )}
        </div>

        {/* Нижняя панель с кнопкой Отмена */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
