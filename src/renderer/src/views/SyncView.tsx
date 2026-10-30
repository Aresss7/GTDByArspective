import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Smartphone, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Power, 
  Clock, 
  CheckCircle2, 
  Laptop, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { SyncStatus, SyncDevice } from '@shared/types';
import { SyncPairingModal } from '../components/SyncPairingModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

interface SyncViewProps {
  onRefreshData?: () => Promise<void>;
}

export const SyncView: React.FC<SyncViewProps> = ({ onRefreshData }) => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [devices, setDevices] = useState<SyncDevice[]>([]);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [deviceToRevoke, setDeviceToRevoke] = useState<SyncDevice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка состояния синхронизации и списка устройств
  const loadSyncData = async () => {
    if (!window.gtdApi) return;
    try {
      const [currentStatus, pairedDevices] = await Promise.all([
        window.gtdApi.getSyncStatus(),
        window.gtdApi.getPairedDevices(),
      ]);
      setStatus(currentStatus);
      setDevices(pairedDevices || []);
    } catch (e) {
      console.error('Failed to load sync data:', e);
    }
  };

  useEffect(() => {
    loadSyncData();
    const interval = setInterval(loadSyncData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Включение / выключение сервера
  const handleToggleServer = async () => {
    if (!window.gtdApi || !status) return;
    setIsLoading(true);
    try {
      if (status.isRunning) {
        const newStatus = await window.gtdApi.stopSyncServer();
        setStatus(newStatus);
      } else {
        const newStatus = await window.gtdApi.startSyncServer();
        setStatus(newStatus);
      }
    } catch (e) {
      console.error('Failed to toggle sync server:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Отзыв доступа устройства
  const handleConfirmRevoke = async () => {
    if (!window.gtdApi || !deviceToRevoke) return;
    try {
      await window.gtdApi.revokeDevice(deviceToRevoke.id);
      setDeviceToRevoke(null);
      await loadSyncData();
    } catch (e) {
      console.error('Failed to revoke device:', e);
    }
  };

  const activeDevices = devices.filter((d) => !d.isRevoked);
  const revokedDevices = devices.filter((d) => d.isRevoked);

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Верхняя статусная карточка сервера */}
      <div className="p-6 bg-white dark:bg-[#222222] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            status?.isRunning 
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' 
              : 'bg-zinc-200 dark:bg-[#2e2e2e] text-zinc-400'
          }`}>
            <Wifi className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Локальный сервер синхронизации</h3>
              {status?.isRunning ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Работает</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[11px] font-bold">
                  <span>Остановлен</span>
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Синхронизирует задачи и проекты напрямую с вашим телефоном через домашнюю Wi-Fi сеть. Без интернета и облаков.
            </p>

            {status?.isRunning && (
              <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 pt-1">
                Адрес в сети: <span className="font-bold underline decoration-dotted">http://{status.serverIp}:{status.serverPort}</span>
              </p>
            )}
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex items-center space-x-2.5 shrink-0 self-end md:self-center">
          <button
            onClick={handleToggleServer}
            disabled={isLoading}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs ${
              status?.isRunning
                ? 'border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#2c2c2c] text-zinc-700 dark:text-zinc-300'
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{status?.isRunning ? 'Остановить сервер' : 'Запустить сервер'}</span>
          </button>

          <button
            onClick={() => setIsPairingModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Подключить устройство</span>
          </button>
        </div>
      </div>

      {/* Список подключённых устройств */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Подключённые устройства ({activeDevices.length})
          </h4>
          <span className="text-[11px] text-zinc-400">
            Устройства автоматически обновляют задачи при входе в домашний Wi-Fi
          </span>
        </div>

        {activeDevices.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/60 dark:bg-[#222222]">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#282828] flex items-center justify-center text-zinc-400 mb-3 shadow-xs">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Нет подключённых мобильных устройств
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              Нажмите кнопку «Подключить устройство», чтобы вывести QR-код и связать Android-телефон с компьютером.
            </p>
            <button
              onClick={() => setIsPairingModalOpen(true)}
              className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Подключить телефон сейчас
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeDevices.map((device) => (
              <div
                key={device.id}
                className="p-5 bg-white dark:bg-[#222222] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between group hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
              >
                <div className="flex items-center space-x-3.5 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-[#2a2a2a] text-zinc-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {device.deviceName}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Доверенное
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Привязано: {new Date(device.pairedAt).toLocaleDateString('ru-RU')}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Синхронизация: {device.lastSyncedAt ? new Date(device.lastSyncedAt).toLocaleString('ru-RU') : 'Ожидает первого обмена'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDeviceToRevoke(device)}
                  className="px-3.5 py-1.5 rounded-full border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  title="Запретить устройству доступ"
                >
                  Отозвать
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Список отозванных устройств, если они были */}
      {revokedDevices.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Ранее отозванный доступ ({revokedDevices.length})
          </h4>
          <div className="space-y-2">
            {revokedDevices.map((dev) => (
              <div 
                key={dev.id}
                className="p-3 bg-zinc-50 dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400"
              >
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-zinc-400" />
                  <span className="line-through">{dev.deviceName}</span>
                  <span className="text-[10px] text-zinc-500">(доступ заблокирован)</span>
                </div>
                <span>{new Date(dev.pairedAt).toLocaleDateString('ru-RU')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Окно сопряжения с QR-кодом */}
      <SyncPairingModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        onDevicePaired={async () => {
          setIsPairingModalOpen(false);
          await loadSyncData();
          onRefreshData?.();
        }}
      />

      {/* Подтверждение отзыва доступа */}
      <ConfirmDeleteModal
        isOpen={Boolean(deviceToRevoke)}
        title={`Отозвать доступ для «${deviceToRevoke?.deviceName}»?`}
        description="Устройство будет немедленно лишено возможности отправлять и скачивать задачи на этот компьютер."
        confirmText="Отозвать доступ"
        onClose={() => setDeviceToRevoke(null)}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
};
