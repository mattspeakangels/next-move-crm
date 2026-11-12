import type { Activity, ActivityType } from '../types';

// Categorie mostrabili in Agenda. L'Agenda è il calendario degli appuntamenti:
// di base mostra solo quelli; chiamate, email, note e impegni d'ufficio si attivano dai filtri.
export type AgendaCategory = 'appuntamenti' | 'contatti' | 'note' | 'organizzazione';

export const AGENDA_CATEGORIES: { id: AgendaCategory; label: string; types: ActivityType[] }[] = [
  {
    id: 'appuntamenti',
    label: 'Appuntamenti',
    types: ['visita', 'visita-freddo', 'sopralluogo', 'demo', 'call-remota', 'formazione', 'fiera', 'giornata-banco', 'mini-fiera'],
  },
  { id: 'contatti', label: 'Chiamate ed email', types: ['chiamata', 'email'] },
  { id: 'note', label: 'Note', types: ['nota'] },
  { id: 'organizzazione', label: 'Ufficio e altro', types: ['smart-working', 'ufficio', 'manutenzione-auto'] },
];

export const DEFAULT_AGENDA_CATEGORIES: AgendaCategory[] = ['appuntamenti'];

export function categoryOf(type: ActivityType): AgendaCategory {
  return AGENDA_CATEGORIES.find(c => c.types.includes(type))?.id ?? 'note';
}

/**
 * True se l'attività va mostrata in Agenda con le categorie scelte.
 * Le azioni archiviate dalla Dashboard non sono appuntamenti: restano solo nello storico del cliente.
 */
export function isShownInAgenda(activity: Pick<Activity, 'type' | 'outcome'>, categories: readonly AgendaCategory[]): boolean {
  if (activity.outcome === 'archiviata') return false;
  return categories.includes(categoryOf(activity.type));
}

const STORAGE_KEY = 'syrio-agenda-categorie';

/** Legge le categorie scelte su questo dispositivo; se mancano o non sono valide, solo appuntamenti. */
export function loadAgendaCategories(): AgendaCategory[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(raw)) {
      const valid = raw.filter((c): c is AgendaCategory => AGENDA_CATEGORIES.some(x => x.id === c));
      if (valid.length) return valid;
    }
  } catch { /* storage non disponibile */ }
  return [...DEFAULT_AGENDA_CATEGORIES];
}

export function saveAgendaCategories(categories: AgendaCategory[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(categories)); } catch { /* storage non disponibile */ }
}
