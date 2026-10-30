import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import appLogo from '../assets/icon.png';

interface WindowTitleBarProps {
  title?: string;
}

export const WindowTitleBar: React.FC<WindowTitleBarProps> = ({
  title = 'Arspective GTD',
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (window.gtdApi?.isWindowMaximized) {
      window.gtdApi.isWindowMaximized().then((max) => {
        if (isMounted) setIsMaximized(max);
      });
    }

    const checkMaximized = () => {
      if (window.gtdApi?.isWindowMaximized) {
        window.gtdApi.isWindowMaximized().then((max) => {
          if (isMounted) setIsMaximized(max);
        });
      }
    };

    window.addEventListener('resize', checkMaximized);
    return () => {
      isMounted = false;
      window.removeEventListener('resize', checkMaximized);
    };
  }, []);

  const handleMinimize = () => {
    window.gtdApi?.minimizeWindow?.();
  };

  const handleToggleMaximize = async () => {
    if (window.gtdApi?.toggleMaximizeWindow) {
      const maximized = await window.gtdApi.toggleMaximizeWindow();
      setIsMaximized(maximized);
    }
  };

  const handleClose = () => {
    window.gtdApi?.closeWindow?.();
  };

  return (
    <header 
      className="h-9 w-full bg-zinc-100 dark:bg-[#151515] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between select-none z-50 shrink-0 transition-colors"
      style={{ WebkitAppRegion: 'drag' } as any}
      onDoubleClick={handleToggleMaximize}
    >
      {/* Левая часть: логотип и название */}
      <div 
        className="flex items-center space-x-2.5 px-3.5 h-full"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <img 
          src={appLogo} 
          alt="Arspective Logo" 
          className="w-4 h-4 rounded-md object-contain" 
        />
        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tracking-tight">
          {title}
        </span>
      </div>

      {/* Правая часть: кнопки сворачивания, разворачивания, закрытия */}
      <div 
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          type="button"
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-[#252525] transition-colors"
          title="Свернуть"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleToggleMaximize}
          className="w-11 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-[#252525] transition-colors"
          title={isMaximized ? "Восстановить" : "Развернуть"}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center text-zinc-500 hover:text-white dark:text-zinc-400 dark:hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 transition-colors"
          title="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
