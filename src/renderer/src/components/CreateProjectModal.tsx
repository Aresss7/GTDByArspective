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

  // Обновляем поля, если передан sourceTask
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Создание нового проекта</h2>
              <p className="text-xs text-slate-500">Желаемый результат, требующий нескольких действий</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Название проекта */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Название проекта <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Запустить магазин одежды, Сделать ремонт в гостиной..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Описание */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Описание (необязательно)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Контекст или важные детали проекта..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {/* Блок первого шага с обязательной подсказкой */}
          <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-100 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-sky-900">
              Первый следующий шаг <span className="text-rose-500">*</span>
            </label>
            
            <div className="flex items-start space-x-2 text-xs text-sky-800 bg-sky-100/60 p-2.5 rounded-lg border border-sky-200/60">
              <AlertCircle className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
              <span>
                <strong>Правило ГТД:</strong> Первый шаг должен быть одним конкретным действием, которое можно выполнить без дополнительного разложения на несколько шагов.
              </span>
            </div>

            <input
              type="text"
              required
              value={firstStepTitle}
              onChange={(e) => setFirstStepTitle(e.target.value)}
              placeholder="Например: Написать поставщику и запросить прайс-лист"
              className="w-full px-3.5 py-2.5 rounded-lg border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>

          {/* Примерный план */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Примерный план действий (ориентир)
            </label>
            <textarea
              rows={3}
              value={approximatePlan}
              onChange={(e) => setApproximatePlan(e.target.value)}
              placeholder="1. Найти поставщиков&#10;2. Сравнить цены и условия&#10;3. Подготовить каталог..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
          </div>

          {/* Критерии завершения */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Критерии завершения
            </label>
            <input
              type="text"
              value={completionCriteria}
              onChange={(e) => setCompletionCriteria(e.target.value)}
              placeholder="Когда проект считается завершенным? (например: Магазин опубликован и сделан 1-й заказ)"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Кнопки действий */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !firstStepTitle.trim() || isSubmitting}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
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
