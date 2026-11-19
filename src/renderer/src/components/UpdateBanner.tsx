import React, { useState, useEffect } from 'react';
import { Sparkles, Download, X, CheckCircle2, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Language } from '../i18n/translations';

interface UpdateBannerProps {
  version: string;
  releaseName?: string;
  downloadUrl?: string;
  fileName?: string;
  releaseUrl?: string;
  onDismiss: () => void;
  language?: Language;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  version,
  releaseName,
  downloadUrl,
  fileName,
  releaseUrl,
  onDismiss,
  language = 'ru',
}) => {
  const isEn = language === 'en';
  const [status, setStatus] = useState<'idle' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (window.gtdApi?.onDownloadProgress) {
      const unsubscribe = window.gtdApi.onDownloadProgress((progress: any) => {
        setDownloadPercent(progress?.percent || 0);
      });
      return unsubscribe;
    }
  }, []);

  const handleStartDownload = async () => {
    if (!downloadUrl) {
      if (releaseUrl && window.gtdApi?.openExternalUrl) {
        window.gtdApi.openExternalUrl(releaseUrl);
      }
      return;
    }

    if (!window.gtdApi?.downloadUpdate) return;

    setStatus('downloading');
    setDownloadPercent(0);
    setErrorMessage(null);

    try {
      const res = await window.gtdApi.downloadUpdate(downloadUrl, fileName);
      if (res?.success && res.filePath) {
        setDownloadedFilePath(res.filePath);
        setStatus('downloaded');
      } else {
        setStatus('error');
        setErrorMessage(res?.error || (isEn ? 'Failed to download update' : 'Не удалось скачать обновление'));
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e?.message || (isEn ? 'Download error' : 'Ошибка скачивания'));
    }
  };

  const handleInstallAndRestart = async () => {
    if (!downloadedFilePath || !window.gtdApi?.installUpdate) return;
    try {
      await window.gtdApi.installUpdate(downloadedFilePath);
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e?.message || (isEn ? 'Failed to launch installer' : 'Ошибка запуска установщика'));
    }
  };

  return (
    <div
      className={`relative px-4 py-2 flex items-center justify-between text-xs select-none shadow-md shrink-0 animate-fadeIn z-40 text-white transition-colors duration-300 ${
        status === 'downloaded'
          ? 'bg-emerald-600 dark:bg-emerald-700'
          : status === 'error'
          ? 'bg-rose-600 dark:bg-rose-700'
          : 'bg-sky-600 dark:bg-sky-700'
      }`}
    >
      {/* Тонкий анимированный индикатор прогресса внизу баннера */}
      {status === 'downloading' && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-white/50 transition-all duration-200"
          style={{ width: `${Math.max(5, downloadPercent)}%` }}
        />
      )}

      {/* Информация о версии / статусе */}
      <div className="flex items-center space-x-2 truncate mr-3">
        {status === 'downloading' ? (
          <>
            <Loader2 className="w-4 h-4 text-sky-200 animate-spin shrink-0" />
            <span className="font-semibold truncate">
              {isEn ? `Downloading update (${version})... ${downloadPercent}%` : `Скачивание обновления (${version})... ${downloadPercent}%`}
            </span>
          </>
        ) : status === 'downloaded' ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span className="font-semibold truncate">
              {isEn ? `Update ${version} ready to install!` : `Обновление ${version} готово к установке!`}
            </span>
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
            <span className="font-semibold truncate">
              {errorMessage || (isEn ? 'Update error' : 'Ошибка обновления')}
            </span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-sky-200 shrink-0" />
            <span className="font-semibold truncate">
              {isEn ? `New version ${version} available!` : `Доступна новая версия ${version}!`}
            </span>
            {releaseName && (
              <span className="hidden sm:inline text-sky-100 truncate opacity-90">
                ({releaseName})
              </span>
            )}
          </>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="flex items-center space-x-2 shrink-0">
        {status === 'idle' && (
          <button
            type="button"
            onClick={handleStartDownload}
            className="px-3 py-1 bg-white text-sky-800 rounded-lg font-bold hover:bg-sky-50 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isEn ? 'Update' : 'Обновить'}</span>
          </button>
        )}

        {status === 'downloading' && (
          <div className="px-2.5 py-1 bg-white/20 rounded-lg font-bold text-[11px] flex items-center space-x-1">
            <span>{downloadPercent}%</span>
          </div>
        )}

        {status === 'downloaded' && (
          <button
            type="button"
            onClick={handleInstallAndRestart}
            className="px-3 py-1 bg-white text-emerald-800 rounded-lg font-bold hover:bg-emerald-50 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center space-x-1.5 animate-pulse"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isEn ? 'Install & Restart' : 'Переустановить'}</span>
          </button>
        )}

        {status === 'error' && (
          <button
            type="button"
            onClick={handleStartDownload}
            className="px-3 py-1 bg-white text-rose-800 rounded-lg font-bold hover:bg-rose-50 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isEn ? 'Retry' : 'Повторить'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          title={isEn ? 'Dismiss notification' : 'Скрыть уведомление'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
