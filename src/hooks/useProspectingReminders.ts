import { useEffect } from 'react';
import { useStore } from '../store/useStore';

// Notifica (browser Notification API) quando ci sono tocchi di prospecting scaduti/da
// fare oggi. Funziona solo mentre l'app è aperta in una scheda (nessun backend di push
// è disponibile in questo progetto): un controllo all'avvio + uno ogni 15 minuti mentre
// resta aperta, con al massimo una notifica al giorno per non essere invadenti.
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const LAST_NOTIFY_KEY = 'nm_prospect_last_notify_day';

function checkAndNotify() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const { prospectingTracks, contacts } = useStore.getState();
  const now = Date.now();
  const dueTracks = Object.values(prospectingTracks).filter(
    t => t.stato === 'attiva' && t.dataProssimoTocco <= now
  );
  if (dueTracks.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(LAST_NOTIFY_KEY) === today) return;

  const companies = dueTracks.map(t => contacts[t.contactId]?.company).filter((c): c is string => !!c);
  const shown = companies.slice(0, 3).join(', ');
  const extra = companies.length > 3 ? ` e altri ${companies.length - 3}` : '';

  new Notification('Prospecting: tocchi da fare oggi', {
    body: `${dueTracks.length} tocc${dueTracks.length === 1 ? 'o' : 'hi'} in scadenza — ${shown}${extra}`,
    tag: 'nm-prospecting-reminder',
  });
  localStorage.setItem(LAST_NOTIFY_KEY, today);
}

export function useProspectingReminders() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    checkAndNotify();
    const interval = setInterval(checkAndNotify, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function requestProspectingNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return Promise.resolve('denied');
  return Notification.requestPermission();
}
