import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Globe, 
  Smartphone, 
  Info,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Check,
  PlusCircle,
  Inbox,
  Layers,
  Monitor
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { useToast } from '../components/ToastNotification';

export type DefaultCaptureTabSetting = 'inbox' | 'current_menu';
export type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsViewProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  themeMode?: ThemeMode;
  onChangeThemeMode?: (mode: ThemeMode) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onOpenSync: () => void;
  defaultCaptureTab?: DefaultCaptureTabSetting;
  onChangeDefaultCaptureTab?: (setting: DefaultCaptureTabSetting) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkMode,
  onToggleTheme,
  themeMode = 'system',
  onChangeThemeMode,
  language,
  onChangeLanguage,
  onOpenSync,
  defaultCaptureTab = 'inbox',
  onChangeDefaultCaptureTab,
}) => {
  const t = translations[language];
  const { showToast } = useToast();

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);

  const [updateInfo, setUpdateInfo] = useState<{
    checked: boolean;
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion?: string;
    releaseName?: string;
    releaseUrl?: string;
    downloadUrl?: string;
    fileName?: string;
  } | null>(null);

  useEffect(() => {
    if (window.gtdApi?.onDownloadProgress) {
      const unsubscribe = window.gtdApi.onDownloadProgress((progress) => {
        setDownloadPercent(progress.percent);
      });
      return unsubscribe;
    }
  }, []);

  useEffect(() => {
    handleCheckUpdate();
  }, []);

  const handleCheckUpdate = async () => {
    if (!window.gtdApi?.checkUpdate) return;
    setCheckingUpdate(true);
    setDownloadedFilePath(null);
    setDownloadPercent(0);
    try {
      const res = await window.gtdApi.checkUpdate();
      setUpdateInfo({
        checked: true,
        hasUpdate: res.hasUpdate,
        currentVersion: res.currentVersion,
        latestVersion: res.latestVersion,
        releaseName: res.releaseName,
        releaseUrl: res.releaseUrl,
        downloadUrl: res.downloadUrl,
        fileName: res.fileName,
      });

      if (res.hasUpdate) {
        showToast(`Доступна новая версия: ${res.releaseName || res.latestVersion}!`, 'info');
      } else {
        showToast('У вас установлена актуальная версия', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Не удалось проверить обновления', 'info');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleStartDownload = async () => {
    if (!updateInfo?.downloadUrl || !window.gtdApi?.downloadUpdate) return;
    setDownloading(true);
    setDownloadPercent(0);
    try {
      const res = await window.gtdApi.downloadUpdate(updateInfo.downloadUrl, updateInfo.fileName);
      if (res.success && res.filePath) {
        setDownloadedFilePath(res.filePath);
        showToast('Обновление успешно скачано! Нажмите «Установить и перезапустить»', 'success');
      } else {
        showToast(`Ошибка скачивания: ${res.error || 'неизвестно'}`, 'info');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Ошибка скачивания: ${err.message}`, 'info');
    } finally {
      setDownloading(false);
    }
  };

  const handleInstallAndRestart = async () => {
    if (!downloadedFilePath || !window.gtdApi?.installUpdate) return;
    try {
      showToast('Запуск обновления и перезапуск приложения...', 'info');
      await window.gtdApi.installUpdate(downloadedFilePath);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenReleaseUrl = (url?: string) => {
    const targetUrl = url || 'https://github.com/Aresss7/GTDByArspective/releases';
    if (window.gtdApi?.openExternalUrl) {
      window.gtdApi.openExternalUrl(targetUrl);
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Шапка настроек */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-[#222222] flex items-center justify-center text-zinc-900 dark:text-zinc-100 shadow-xs">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              {t.settingsTitle}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.settingsSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Секция: Тема оформления */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <span>{t.appearanceSection}</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.themeLabel}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
          <button
            type="button"
            onClick={() => onChangeThemeMode ? onChangeThemeMode('system') : null}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              themeMode === 'system'
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#252525] font-bold shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Monitor className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-900 dark:text-zinc-100">{t.themeSystem}</span>
            </div>
            {themeMode === 'system' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeThemeMode ? onChangeThemeMode('light') : onToggleTheme()}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              themeMode === 'light'
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#252525] font-bold shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-zinc-900 dark:text-zinc-100">{t.themeLight}</span>
            </div>
            {themeMode === 'light' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeThemeMode ? onChangeThemeMode('dark') : onToggleTheme()}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              themeMode === 'dark'
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#252525] font-bold shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-zinc-900 dark:text-zinc-100">{t.themeDark}</span>
            </div>
            {themeMode === 'dark' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>
      </div>

      {/* Секция: Язык интерфейса */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Globe className="w-4 h-4 text-zinc-400" />
            <span>{t.languageSection}</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.languageLabel}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => onChangeLanguage('ru')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              language === 'ru'
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#252525] font-bold shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <span className="text-xs text-zinc-900 dark:text-zinc-100">Русский (RU)</span>
            {language === 'ru' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeLanguage('en')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              language === 'en'
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#252525] font-bold shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <span className="text-xs text-zinc-900 dark:text-zinc-100">English (EN)</span>
            {language === 'en' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>
      </div>

      {/* Секция: Быстрое добавление («+» / Ctrl+N) */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <PlusCircle className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span>{t.captureSection}</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.captureSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
          <button
            type="button"
            onClick={() => onChangeDefaultCaptureTab?.('inbox')}
            className={`flex items-start justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              defaultCaptureTab === 'inbox'
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#252525] shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center space-x-2">
                <Inbox className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {t.captureAlwaysInbox}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t.captureAlwaysInboxDesc}
              </p>
            </div>
            {defaultCaptureTab === 'inbox' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeDefaultCaptureTab?.('current_menu')}
            className={`flex items-start justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              defaultCaptureTab === 'current_menu'
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#252525] shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {t.captureCurrentMenu}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t.captureCurrentMenuDesc}
              </p>
            </div>
            {defaultCaptureTab === 'current_menu' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
            )}
          </button>
        </div>
      </div>

      {/* Секция: Синхронизация */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>{t.syncSection}</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
              {t.syncDescription}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onOpenSync}
            className="flex items-center justify-between w-full p-4 rounded-2xl bg-zinc-50 dark:bg-[#252525] hover:bg-zinc-100 dark:hover:bg-[#2a2a2a] border border-zinc-200 dark:border-zinc-700 text-left transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  {t.openSyncPanel}
                </span>
                <span className="text-[11px] text-zinc-400">
                  QR-код, PIN-код привязки и список авторизованных устройств
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Секция: Обновления с GitHub */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-sky-500" />
              <span>Обновления программы</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Автоматическая проверка и скачивание релизов из GitHub
            </p>
          </div>

          <button
            type="button"
            onClick={handleCheckUpdate}
            disabled={checkingUpdate || downloading}
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? 'Проверка...' : 'Проверить обновления'}</span>
          </button>
        </div>

        {updateInfo?.checked && (
          <div className="pt-2">
            {updateInfo.hasUpdate ? (
              <div className="p-5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-sky-950 dark:text-sky-200">
                        Доступно обновление: {updateInfo.releaseName || updateInfo.latestVersion}
                      </h4>
                      <p className="text-xs text-sky-800 dark:text-sky-300 mt-0.5">
                        Текущая версия: {updateInfo.currentVersion} • Новая версия: {updateInfo.latestVersion}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenReleaseUrl(updateInfo.releaseUrl)}
                    className="text-[11px] text-sky-700 dark:text-sky-400 hover:underline flex items-center space-x-1 shrink-0"
                    title="Открыть страницу релиза на GitHub"
                  >
                    <span>Страница релиза</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Скачивание и установка */}
                <div className="pt-2 border-t border-sky-200/60 dark:border-sky-800/60">
                  {downloadedFilePath ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span>Файл обновления готов к установке</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleInstallAndRestart}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                      >
                        Установить и перезапустить
                      </button>
                    </div>
                  ) : downloading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-sky-900 dark:text-sky-200 font-semibold">
                        <span className="flex items-center space-x-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                          <span>Скачивание обновления...</span>
                        </span>
                        <span>{downloadPercent}%</span>
                      </div>
                      <div className="w-full bg-sky-200 dark:bg-sky-900 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-sky-600 h-full transition-all duration-200 rounded-full"
                          style={{ width: `${downloadPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : updateInfo.downloadUrl ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-sky-800 dark:text-sky-300">
                        Файл: {updateInfo.fileName || 'Arspective GTD Setup.exe'}
                      </span>
                      <button
                        type="button"
                        onClick={handleStartDownload}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Скачать прямо в приложение</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-sky-800 dark:text-sky-300">
                        Прямой файл инсталлятора не найден в релизе.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenReleaseUrl(updateInfo.releaseUrl)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <span>Скачать вручную</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>У вас установлена последняя версия приложения ({updateInfo.currentVersion}).</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Секция: О приложении */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center space-x-2 text-zinc-800 dark:text-zinc-200 font-bold mb-1">
          <Info className="w-4 h-4" />
          <span>{t.aboutSection}</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
          <span>{t.aboutVersion}</span>
          <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">1.4.3</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span>{t.aboutDeveloper}</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Arspective</span>
        </div>
      </div>
    </div>
  );
};
