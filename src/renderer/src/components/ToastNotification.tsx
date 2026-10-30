import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, RotateCcw, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'restore';
  duration?: number;
}

interface ToastContextType {
  showToast: (text: string, type?: 'success' | 'info' | 'restore', duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'restore' = 'success', duration = 3000) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl bg-zinc-900/95 dark:bg-white/95 text-white dark:text-zinc-900 text-xs font-semibold shadow-2xl backdrop-blur-md border border-zinc-700/50 dark:border-zinc-300/50 animate-fadeIn"
          >
            {toast.type === 'restore' ? (
              <RotateCcw className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-sky-400 dark:text-sky-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            )}
            <span>{toast.text}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-zinc-800/10 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
