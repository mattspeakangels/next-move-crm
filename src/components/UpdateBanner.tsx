import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

// Ogni quanto chiedere al server se c'è una nuova versione (oltre al check
// automatico al ritorno in foreground). iOS non controlla da solo: lo forziamo.
const UPDATE_CHECK_MS = 20 * 60 * 1000; // 20 minuti

/**
 * Banner che compare quando un nuovo deploy è disponibile (service worker in
 * attesa). Cliccando "Aggiorna" si attiva il nuovo SW e si ricarica l'app.
 * Richiede registerType: 'prompt' in vite.config.ts.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      // Controllo periodico + ogni volta che l'app torna in primo piano (chiave su iOS).
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed left-3 right-3 z-[9999] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
        <RefreshCw size={18} className="text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-gray-900 dark:text-white">Nuova versione disponibile</p>
        <p className="text-xs text-gray-400">Aggiorna per avere le ultime novità</p>
      </div>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Ignora aggiornamento"
        className="flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
      >
        <X size={16} />
      </button>
      <button
        onClick={() => updateServiceWorker(true)}
        className="flex-shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-indigo-700"
      >
        Aggiorna
      </button>
    </div>
  );
}

export default UpdateBanner;
