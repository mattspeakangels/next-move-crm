import { setDoc, increment } from 'firebase/firestore';
import { docRef } from './paths';
import { sectionOf } from './navSections';
import type { NavView } from '../types';

// Contatore anonimo delle aperture per sezione (Blocco 6): un documento per mese e
// scheda nello spazio aziendale, senza chi l'ha aperta né quando. Lo leggono solo
// titolare e amministratori (regole Firestore).

/** Mese corrente in formato AAAA-MM (ora locale). */
export function usageMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Documento del contatore: id e campi scritti alla prima apertura. */
export function usageCounterDoc(view: NavView, date: Date = new Date()) {
  const month = usageMonth(date);
  // Lo schermo intero della mappa conta come Mappa
  const tab = view === 'map-full' ? 'map' : view;
  return { id: `${month}_${tab}`, fields: { section: sectionOf(tab), tab, month } };
}

/** Registra un'apertura. Non blocca mai l'app: senza spazio di lavoro o rete si ignora. */
export function recordSectionOpen(view: NavView): void {
  try {
    const { id, fields } = usageCounterDoc(view);
    setDoc(docRef('usage_counters', id), { ...fields, count: increment(1) }, { merge: true })
      .catch(err => console.warn('Contatore aperture non aggiornato:', err));
  } catch (err) {
    console.warn('Contatore aperture non disponibile:', err);
  }
}
