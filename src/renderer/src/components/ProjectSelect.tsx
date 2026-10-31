import React, { useState, useRef, useEffect } from 'react';
import { FolderKanban, ChevronDown, Check, X, Search, MinusCircle } from 'lucide-react';
import { Project } from '@shared/types';
import { Language, translations } from '../i18n/translations';

interface ProjectSelectProps {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  language?: Language;
  isDarkMode?: boolean;
  className?: string;
}

export const ProjectSelect: React.FC<ProjectSelectProps> = ({
  projects,
  value,
  onChange,
  language = 'ru',
  isDarkMode = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language] || translations.ru;
  const isEn = language === 'en';

  const selectedProject = projects.find((p) => p.id === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && projects.length >= 4) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, projects.length]);

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    return p.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Кнопка-триггер селектора */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 text-xs text-zinc-900 dark:text-zinc-100 transition-all focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 cursor-pointer text-left select-none shadow-xs group"
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
          <FolderKanban
            className={`w-4 h-4 shrink-0 transition-colors ${
              selectedProject
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
            }`}
          />
          <span className="truncate font-medium">
            {selectedProject
              ? selectedProject.title
              : (isEn ? 'Without project (standalone action)' : 'Без проекта (самостоятельное действие)')}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0 text-zinc-400 dark:text-zinc-500">
          {selectedProject && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              title={isEn ? 'Clear project' : 'Очистить выбор'}
              className="p-1 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-zinc-700 dark:text-zinc-200' : ''}`}
          />
        </div>
      </button>

      {/* Выпадающее современное меню */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Поле поиска, если проектов 4 и более */}
          {projects.length >= 4 && (
            <div className="px-2 pt-1 pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isEn ? 'Search project...' : 'Поиск проекта...'}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-[#141414] border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Список вариантов */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
            {/* Опция «Без проекта» */}
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                !value
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-[#252528] hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0 mr-2">
                <MinusCircle className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span className="truncate">
                  {isEn ? 'Without project (standalone action)' : 'Без проекта (самостоятельное действие)'}
                </span>
              </div>
              {!value && <Check className="w-3.5 h-3.5 shrink-0 text-zinc-900 dark:text-white ml-2" />}
            </button>

            {/* Проекты */}
            {filteredProjects.map((p) => {
              const isSelected = p.id === value;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-[#252528] hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 mr-2">
                    <FolderKanban className="w-3.5 h-3.5 shrink-0 text-amber-500/90 dark:text-amber-400" />
                    <span className="truncate">{p.title}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-zinc-900 dark:text-white ml-2" />}
                </button>
              );
            })}

            {filteredProjects.length === 0 && searchQuery && (
              <div className="px-3 py-4 text-center text-xs text-zinc-400">
                {isEn ? 'No projects found' : 'Проекты не найдены'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
