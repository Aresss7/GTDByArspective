import React from 'react';
import { Clock, ArrowRight, Trash2, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { Task, Project } from '@shared/types';

interface SomedayViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdated: () => Promise<void>;
  onOpenAddTask: () => void;
}

export const SomedayView: React.FC<SomedayViewProps> = ({
  tasks,
  projects,
  onTaskUpdated,
  onOpenAddTask,
}) => {
  const somedayTasks = tasks.filter((t) => t.destination === 'someday' && t.status === 'active');

  const handleActivate = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.updateTask(task.id, { destination: 'next_actions' });
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveToTrash = async (task: Task) => {
    if (!window.gtdApi) return;
    try {
      await window.gtdApi.deleteTask(task.id, false);
      await onTaskUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Идеи, планы и долгосрочные желания, к которым вы планируете вернуться в будущем.
        </p>
        <button
          onClick={onOpenAddTask}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить идею</span>
        </button>
      </div>

      {somedayTasks.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Список «Когда-нибудь потом» пуст</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Записывайте сюда всё, что хотелось бы сделать, но не на этой неделе.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {somedayTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-purple-200 transition-all"
            >
              <div>
                <h4 className="text-sm font-medium text-slate-800">{task.title}</h4>
                {task.notes && <p className="text-xs text-slate-500 mt-0.5">{task.notes}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleActivate(task)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  title="Перевести в Текущие действия"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>В работу</span>
                </button>

                <button
                  onClick={() => handleMoveToTrash(task)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
