import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

// Ogni quanto chiedere al server se c'è una nuova versione (oltre al check
// automatico al ritorno in foreground). iOS non controlla da solo: lo forziamo.
const UPDATE_CHECK_MS = 20 * 60 * 1000; // 20 minuti

// Se l'utente non interagisce, l'update si applica comunque da solo dopo
// questo tempo: un telefono lasciato aperto su una versione vecchia non deve
// restare bloccato lì (causa di crash quando il backend cambia formato dati).
const AUTO_APPLY_MS = 15 * 1000;

/**
 * Banner che compare quando un nuovo deploy è disponibile (service worker in
 * attesa). Mostra "Aggiorna" per farlo subito, ma si applica comunque da solo
 * dopo AUTO_APPLY_MS per evitare che i telefoni restino su versioni stale.
 * Richiede registerType: 'prompt' in vite.config.ts.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
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

  useEffect(() => {
    if (!needRefresh) return;
    const timer = setTimeout(() => updateServiceWorker(true), AUTO_APPLY_MS);
    return () => clearTimeout(timer);
  }, [needRefresh, updateServiceWorker]);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed left-3 right-3 z-[9999] mx-auto flex max-w-md items-center gap-3 rounded-panel border border-line bg-surface p-4 shadow-panel dark:border-line dark:bg-surface"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-accent-soft dark:bg-accent-soft/30">
        <RefreshCw size={18} className="text-accent dark:text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground dark:text-foreground">Nuova versione disponibile</p>
        <p className="text-xs text-muted">Si applica automaticamente tra pochi secondi</p>
      </div>
      <button
        onClick={() => updateServiceWorker(true)}
        className="flex-shrink-0 rounded-md bg-action px-4 py-2 text-sm font-semibold uppercase tracking-wide text-action-foreground transition-all hover:bg-action-hover"
      >
        Aggiorna
      </button>
    </div>
  );
}

export default UpdateBanner;
