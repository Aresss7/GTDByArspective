import React, { useState } from 'react';
import { X, FolderKanban, AlertCircle, ArrowRight } from 'lucide-react';
import { Task, Project } from '@shared/types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTask?: Task | null;
  onProjectCreated: (result: { project: Project; firstStep: Task }) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  sourceTask,
  onProjectCreated,
}) => {
  const [title, setTitle] = useState(sourceTask ? sourceTask.title : '');
  const [description, setDescription] = useState(sourceTask ? sourceTask.notes || '' : '');
  const [firstStepTitle, setFirstStepTitle] = useState('');
  const [approximatePlan, setApproximatePlan] = useState('');
  const [completionCriteria, setCompletionCriteria] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (sourceTask) {
      setTitle(sourceTask.title);
      setDescription(sourceTask.notes || '');
    } else {
      setTitle('');
      setDescription('');
    }
    setFirstStepTitle('');
    setApproximatePlan('');
    setCompletionCriteria('');
  }, [sourceTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !firstStepTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (window.gtdApi) {
        const result = await window.gtdApi.createProject({
          title: title.trim(),
          description: description.trim() || undefined,
          firstStepTitle: firstStepTitle.trim(),
          approximatePlan: approximatePlan.trim() || undefined,
          completionCriteria: completionCriteria.trim() || undefined,
          sourceTaskId: sourceTask?.id,
        });

        await onProjectCreated(result);
        onClose();
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка создания проекта');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок Material 3 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-purple-950/60 text-indigo-700 dark:text-purple-300 flex items-center justify-center shadow-sm">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Новый проект</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Желаемый результат из нескольких действий</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              Название проекта <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Запустить интернет-магазин"
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-sm focus:outline-none transition-all placeholder:text-zinc-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              Описание (необязательно)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Контекст или детали..."
              className="w-full px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-xs focus:outline-none resize-none placeholder:text-zinc-400"
            />
          </div>

          {/* Блок первого шага с подсказкой */}
          <div className="p-4 bg-indigo-50/60 dark:bg-purple-950/30 rounded-2xl border border-indigo-100 dark:border-purple-900/50 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-purple-200">
              Первый следующий шаг <span className="text-rose-500">*</span>
            </label>
            
            <div className="flex items-start space-x-2 text-xs text-indigo-900 dark:text-purple-200 bg-indigo-100/70 dark:bg-purple-900/40 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600 dark:text-purple-400 mt-0.5" />
              <span>
                <strong>Правило ГТД:</strong> Первый шаг должен быть одним конкретным действием, которое можно выполнить без дополнительного разложения на несколько шагов.
              </span>
            </div>

            <input
              type="text"
              required
              value={firstStepTitle}
              onChange={(e) => setFirstStepTitle(e.target.value)}
              placeholder="Например: Запросить прайс-лист у поставщика"
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-purple-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              Примерный план действий
            </label>
            <textarea
              rows={3}
              value={approximatePlan}
              onChange={(e) => setApproximatePlan(e.target.value)}
              placeholder="1. Найти варианты&#10;2. Сравнить условия..."
              className="w-full px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-xs focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              Критерии завершения
            </label>
            <input
              type="text"
              value={completionCriteria}
              onChange={(e) => setCompletionCriteria(e.target.value)}
              placeholder="Когда проект считается закрытым?"
              className="w-full px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-transparent focus:border-indigo-500 dark:focus:border-purple-400 text-xs focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !firstStepTitle.trim() || isSubmitting}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              <span>Создать и обработать 1-й шаг</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
