import React, { useState, useRef, useEffect } from 'react';
import { FolderKanban, ChevronDown, Check, X, Search, MinusCircle, Plus } from 'lucide-react';
import { Project } from '@shared/types';
import { Language, translations } from '../i18n/translations';

interface ProjectSelectProps {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  language?: Language;
  isDarkMode?: boolean;
  className?: string;
  taskTitle?: string;
  onProjectCreated?: (newProject: Project) => void;
}

export const ProjectSelect: React.FC<ProjectSelectProps> = ({
  projects,
  value,
  onChange,
  language = 'ru',
  isDarkMode = false,
  className = '',
  taskTitle,
  onProjectCreated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const newProjectInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language] || translations.ru;
  const isEn = language === 'en';

  const selectedProject = projects.find((p) => p.id === value);

  // Отображаем только незавершённые и неудалённые проекты для выбора
  const activeProjects = projects.filter((p) => p.status !== 'completed' && !p.deleted_at);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreatingNew(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search or new project input on open/switch
  useEffect(() => {
    if (isOpen) {
      if (isCreatingNew) {
        setTimeout(() => newProjectInputRef.current?.focus(), 50);
      } else if (activeProjects.length >= 4) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchQuery('');
      setIsCreatingNew(false);
      setNewProjectTitle('');
    }
  }, [isOpen, isCreatingNew, activeProjects.length]);

  const handleCreateProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newProjectTitle.trim();
    if (!trimmed || isSavingProject) return;

    setIsSavingProject(true);
    try {
      if (window.gtdApi) {
        const stepTitle = taskTitle?.trim() || (isEn ? 'First Step' : 'Первый шаг');
        const res = await window.gtdApi.createProject({
          title: trimmed,
          firstStepTitle: stepTitle,
          completionCriteria: isEn ? 'Completion of all steps' : 'Выполнение всех шагов',
        });
        onChange(res.project.id);
        if (onProjectCreated) {
          onProjectCreated(res.project);
        }
        setIsCreatingNew(false);
        setNewProjectTitle('');
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSavingProject(false);
    }
  };

  const filteredProjects = activeProjects.filter((p) => {
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
          {/* Инлайн-создание нового проекта */}
          {isCreatingNew ? (
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 mb-1 space-y-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-500">
                {isEn ? 'New Project (Task will become Step 1)' : 'Новый проект (эта задача станет 1-м шагом)'}
              </span>
              <div className="flex items-center space-x-1.5">
                <input
                  ref={newProjectInputRef}
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateProject();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsCreatingNew(false);
                    }
                  }}
                  placeholder={isEn ? 'Project title...' : 'Название проекта...'}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-[#141414] border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCreateProject()}
                  disabled={!newProjectTitle.trim() || isSavingProject}
                  className="p-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
                  title={isEn ? 'Create project' : 'Создать проект'}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
                  title={isEn ? 'Cancel' : 'Отмена'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="px-1 pb-1 mb-1 border-b border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-purple-400 hover:bg-indigo-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer text-left"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{isEn ? '+ Create New Project' : '+ Новый проект (сделать 1-м шагом)'}</span>
              </button>
            </div>
          )}

          {/* Поле поиска, если активных проектов 4 и более */}
          {activeProjects.length >= 4 && !isCreatingNew && (
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
