import React from 'react';
import { Sparkles, Download, X, ExternalLink } from 'lucide-react';

interface UpdateBannerProps {
  version: string;
  releaseName?: string;
  onGoToSettings: () => void;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  version,
  releaseName,
  onGoToSettings,
  onDismiss,
}) => {
  return (
    <div className="bg-sky-600 dark:bg-sky-700 text-white px-4 py-2 flex items-center justify-between text-xs select-none shadow-md shrink-0 animate-fadeIn z-40">
      <div className="flex items-center space-x-2 truncate mr-3">
        <Sparkles className="w-4 h-4 text-sky-200 shrink-0" />
        <span className="font-semibold truncate">
          Доступна новая версия {version}!
        </span>
        {releaseName && (
          <span className="hidden sm:inline text-sky-100 truncate opacity-90">
            ({releaseName})
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          onClick={onGoToSettings}
          className="px-3 py-1 bg-white text-sky-800 rounded-lg font-bold hover:bg-sky-50 transition-colors shadow-xs cursor-pointer flex items-center space-x-1"
        >
          <Download className="w-3 h-3" />
          <span>Обновить</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/20 text-sky-200 hover:text-white transition-colors cursor-pointer"
          title="Скрыть уведомление"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
