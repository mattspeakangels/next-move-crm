import { useSyncExternalStore } from 'react';
import { useStore, type StoreState } from '../store/useStore';
import { buildDemoData } from '../data/demoData';

// Modalità dimostrazione (visita guidata): l'app mostra l'azienda di esempio al
// posto dei dati veri. Mentre è attiva:
//  - la sincronizzazione con il cloud è ferma (useFirestoreSync controlla isDemoActive),
//  - il salvataggio locale (IndexedDB) è sospeso,
// quindi nulla dei dati di esempio, né le modifiche fatte durante la visita,
// arriva allo spazio aziendale. All'uscita tornano esattamente i dati di prima.
// Se l'app viene chiusa a metà visita, al riavvio si ricaricano i dati veri.

/** Tutte le collezioni di dati dello store (le stesse sincronizzate col cloud). */
export const DEMO_COLLECTIONS = ['customerCommunications', 'customerRequests', 'contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions', 'checkIns', 'todos', 'targets', 'sequences', 'prospectingTracks', 'prospectEmailDrafts', 'prospectHistory', 'groups', 'strategicFocuses'] as const;
type DemoKey = typeof DEMO_COLLECTIONS[number];
type Snapshot = Pick<StoreState, DemoKey>;

let active = false;
let saved: Snapshot | null = null;
let savedStorage: ReturnType<typeof useStore.persist.getOptions>['storage'] | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export function isDemoActive(): boolean { return active; }

export function enterDemo(now = Date.now()): void {
  if (active) return;
  const state = useStore.getState();
  saved = Object.fromEntries(DEMO_COLLECTIONS.map(k => [k, state[k]])) as Snapshot;
  savedStorage = useStore.persist.getOptions().storage;
  useStore.persist.setOptions({ storage: noopStorage });
  active = true; // prima di toccare lo store: il sync smette subito di scrivere
  const empty = Object.fromEntries(DEMO_COLLECTIONS.map(k => [k, {}])) as Snapshot;
  // le sequenze di prospecting sono modelli, non dati dei clienti: restano quelle vere
  useStore.setState({ ...empty, sequences: saved.sequences, ...buildDemoData(now) });
  notify();
}

export function exitDemo(): void {
  if (!active) return;
  if (saved) useStore.setState(saved); // ancora "attivo": il sync non scrive nemmeno questo
  if (savedStorage) useStore.persist.setOptions({ storage: savedStorage });
  saved = null;
  savedStorage = undefined;
  active = false;
  notify();
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

/** True mentre l'app mostra i dati di esempio. */
export function useDemoMode(): boolean {
  return useSyncExternalStore(subscribe, isDemoActive, isDemoActive);
}
