import React, { useState, useEffect } from 'react';
import { X, Smartphone, Wifi, Copy, Check, RefreshCw, ShieldCheck } from 'lucide-react';
import { SyncPairingSession } from '@shared/types';

interface SyncPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicePaired?: () => void;
}

export const SyncPairingModal: React.FC<SyncPairingModalProps> = ({
  isOpen,
  onClose,
  onDevicePaired,
}) => {
  const [session, setSession] = useState<SyncPairingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopiedPin, setIsCopiedPin] = useState(false);
  const [isCopiedUrl, setIsCopiedUrl] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(600);

  // Загрузка новой сессии сопряжения
  const loadNewPairingSession = async () => {
    if (!window.gtdApi) return;
    setIsLoading(true);
    try {
      const data = await window.gtdApi.createPairingSession();
      setSession(data);
      setTimeLeft(600);
    } catch (e) {
      console.error('Failed to create pairing session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNewPairingSession();
    } else {
      setSession(null);
    }
  }, [isOpen]);

  // Таймер обратного отсчёта действия кода (10 минут)
  useEffect(() => {
    if (!isOpen || !session) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, session]);

  // Периодическая проверка: если телефон подключился, уведомляем пользователя
  useEffect(() => {
    if (!isOpen || !window.gtdApi) return;
    let initialCount = -1;

    const checkInterval = setInterval(async () => {
      try {
        const devices = await window.gtdApi.getPairedDevices();
        if (initialCount === -1) {
          initialCount = devices.length;
        } else if (devices.length > initialCount) {
          // Появилось новое устройство!
          onDevicePaired?.();
        }
      } catch (e) {
        // Игнорируем сетевые сбои
      }
    }, 2500);

    return () => clearInterval(checkInterval);
  }, [isOpen, onDevicePaired]);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyPin = async () => {
    if (!session) return;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(session.pinCode);
      setIsCopiedPin(true);
      setTimeout(() => setIsCopiedPin(false), 2000);
    }
  };

  const serverUrl = session ? `http://${session.serverIp}:${session.serverPort}` : '';
  const handleCopyUrl = async () => {
    if (!serverUrl) return;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(serverUrl);
      setIsCopiedUrl(true);
      setTimeout(() => setIsCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn select-none p-4">
      <div 
        className="bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна */}
        <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-[#222222]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Подключение телефона</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Локальная связь по Wi-Fi</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Тело */}
        <div className="p-6 space-y-5">
          {isLoading || !session ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-zinc-400" />
              <p className="text-xs text-zinc-400">Создание безопасного ключа сопряжения...</p>
            </div>
          ) : (
            <>
              {/* Пошаговая инструкция */}
              <div className="p-3 bg-zinc-50 dark:bg-[#222222] rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <Wifi className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>1. Подключите оба устройства к одной Wi-Fi сети</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>2. Отсканируйте QR-код в Android-приложении</span>
                </div>
              </div>

              {/* QR-код в чистой белой рамке */}
              <div className="flex flex-col items-center justify-center">
                <div className="p-3 bg-white rounded-3xl shadow-md border border-zinc-200 inline-block">
                  <img 
                    src={session.qrPayload} 
                    alt="Синхронизация QR-код" 
                    className="w-56 h-56 rounded-2xl block" 
                  />
                </div>

                <div className="mt-3 flex items-center space-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Действителен ещё:</span>
                  <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {formatTime(timeLeft)}
                  </span>
                  {timeLeft === 0 && (
                    <button
                      onClick={loadNewPairingSession}
                      className="text-xs text-indigo-600 dark:text-indigo-400 underline font-semibold ml-1 cursor-pointer"
                    >
                      Обновить
                    </button>
                  )}
                </div>
              </div>

              {/* Альтернативный ввод PIN-кода */}
              <div className="space-y-1 text-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[11px] text-zinc-400">Или введите 6-значный код вручную на телефоне:</p>
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl font-black font-mono tracking-widest text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-[#222222] px-4 py-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                    {session.pinCode.slice(0, 3)} {session.pinCode.slice(3)}
                  </span>
                  <button
                    onClick={handleCopyPin}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-[#222222] hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                    title="Скопировать PIN-код"
                  >
                    {isCopiedPin ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* IP-адрес сервера */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span>Адрес сервера: <code className="font-mono text-zinc-600 dark:text-zinc-300">{serverUrl}</code></span>
                <button
                  onClick={handleCopyUrl}
                  className="hover:text-zinc-700 dark:hover:text-zinc-200 underline cursor-pointer"
                >
                  {isCopiedUrl ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Подвал */}
        <footer className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-[#222222]/60">
          <button
            onClick={loadNewPairingSession}
            disabled={isLoading}
            className="flex items-center space-x-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Сгенерировать новый код</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            Закрыть
          </button>
        </footer>
      </div>
    </div>
  );
};
