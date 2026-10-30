import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import appLogo from '../assets/icon.png';

interface WindowTitleBarProps {
  tabTitle?: string;
  tabCount?: string;
}

export const WindowTitleBar: React.FC<WindowTitleBarProps> = ({
  tabTitle,
  tabCount,
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
      className="h-14 w-full bg-white dark:bg-[#191919] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between select-none z-50 shrink-0 transition-colors"
      style={{ WebkitAppRegion: 'drag' } as any}
      onDoubleClick={handleToggleMaximize}
    >
      {/* Левая секция: Логотип и брендинг Arspective GTD ровно над боковой панелью шириной w-64 */}
      <div 
        className="w-64 h-full px-5 flex items-center space-x-3 border-r border-zinc-200 dark:border-zinc-800 shrink-0"
      >
        <img 
          src={appLogo} 
          alt="Arspective Logo" 
          className="w-7 h-7 rounded-lg object-contain shrink-0 pointer-events-none" 
        />
        <div className="min-w-0 pointer-events-none">
          <h1 className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white leading-tight truncate">
            Arspective GTD
          </h1>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
            Система управления делами
          </p>
        </div>
      </div>

      {/* Центральная часть: Заголовок открытой вкладки и подсказки */}
      <div className="flex-1 flex items-center justify-between px-6 h-full min-w-0">
        <div 
          className="flex items-center space-x-3 shrink-0 pointer-events-none"
        >
          {tabTitle && (
            <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {tabTitle}
            </h2>
          )}
          {tabCount && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#252525] text-zinc-600 dark:text-zinc-400">
              {tabCount}
            </span>
          )}
        </div>

        <div className="text-xs text-zinc-400 dark:text-zinc-500 hidden md:block truncate px-4 pointer-events-none">
          Нажмите <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-[#282828] border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono">ПКМ</kbd> для меню • <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-[#282828] border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono">Ctrl+N</kbd> в корзину
        </div>
      </div>

      {/* Правая часть: Кнопки окна Windows */}
      <div 
        className="flex items-center h-full shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          type="button"
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#252525] transition-colors"
          title="Свернуть"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleToggleMaximize}
          className="w-12 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#252525] transition-colors"
          title={isMaximized ? "Восстановить" : "Развернуть"}
        >
          {isMaximized ? (
            <Copy className="w-3.5 h-3.5 rotate-180" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-zinc-500 hover:text-white dark:text-zinc-400 dark:hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 transition-colors"
          title="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
