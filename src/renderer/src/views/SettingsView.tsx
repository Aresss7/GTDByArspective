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
  AlertCircle
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { useToast } from '../components/ToastNotification';

interface SettingsViewProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onOpenSync: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkMode,
  onToggleTheme,
  language,
  onChangeLanguage,
  onOpenSync,
}) => {
  const t = translations[language];
  const { showToast } = useToast();

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    checked: boolean;
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion?: string;
    releaseName?: string;
    releaseUrl?: string;
  } | null>(null);

  const handleCheckUpdate = async () => {
    if (!window.gtdApi?.checkUpdate) return;
    setCheckingUpdate(true);
    try {
      const res = await window.gtdApi.checkUpdate();
      setUpdateInfo({
        checked: true,
        hasUpdate: res.hasUpdate,
        currentVersion: res.currentVersion,
        latestVersion: res.latestVersion,
        releaseName: res.releaseName,
        releaseUrl: res.releaseUrl,
      });

      if (res.hasUpdate) {
        showToast(`Доступна новая версия ${res.latestVersion}!`, 'info');
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

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => { if (isDarkMode) onToggleTheme(); }}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              !isDarkMode
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#252525] font-bold shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-zinc-900 dark:text-zinc-100">{t.themeLight}</span>
            </div>
            {!isDarkMode && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => { if (!isDarkMode) onToggleTheme(); }}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              isDarkMode
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-[#252525] font-bold shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-zinc-900 dark:text-zinc-100">{t.themeDark}</span>
            </div>
            {isDarkMode && (
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
              <span>Обновления приложения</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Проверка новых релизов и версий программы на GitHub
            </p>
          </div>

          <button
            type="button"
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? 'Проверка...' : 'Проверить обновления'}</span>
          </button>
        </div>

        {updateInfo?.checked && (
          <div className="pt-2">
            {updateInfo.hasUpdate ? (
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-sky-950 dark:text-sky-200">
                      Доступна новая версия: {updateInfo.latestVersion}
                    </h4>
                    <p className="text-[11px] text-sky-800 dark:text-sky-300 mt-0.5">
                      {updateInfo.releaseName || 'Доступны новые функции и улучшения.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenReleaseUrl(updateInfo.releaseUrl)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  <span>Скачать с GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
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
          <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">1.1.0</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span>{t.aboutDeveloper}</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Arspective</span>
        </div>
      </div>
    </div>
  );
};
