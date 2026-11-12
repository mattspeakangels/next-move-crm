import type { NavView } from '../types';

// Menu principale a 6 voci + Impostazioni (Blocco 5). Ogni voce raggruppa una o più
// viste esistenti, mostrate come schede: le viste e i loro identificativi (NavView)
// restano gli stessi, quindi i collegamenti interni (es. goTo('offers')) continuano
// a funzionare e aprono la voce giusta con la scheda giusta.

export type SectionId = 'oggi' | 'clienti' | 'opportunita' | 'agenda' | 'mappa' | 'analisi' | 'impostazioni';

export interface NavTab { view: NavView; label: string }
export interface NavSection { id: SectionId; label: string; tabs: NavTab[] }

export const NAV_SECTIONS: NavSection[] = [
  { id: 'oggi', label: 'Oggi', tabs: [{ view: 'dashboard', label: 'Panoramica' }, { view: 'todo', label: 'Da fare' }] },
  { id: 'clienti', label: 'Clienti', tabs: [{ view: 'contacts', label: 'Clienti' }, { view: 'strategia', label: 'Gruppi e focus' }] },
  { id: 'opportunita', label: 'Opportunità', tabs: [{ view: 'deals', label: 'Pipeline' }, { view: 'offers', label: 'Offerte' }, { view: 'products', label: 'Catalogo' }] },
  { id: 'agenda', label: 'Agenda', tabs: [{ view: 'agenda', label: 'Calendario' }, { view: 'attivita', label: 'Diario' }] },
  { id: 'mappa', label: 'Mappa', tabs: [{ view: 'map', label: 'Mappa' }] },
  { id: 'analisi', label: 'Analisi', tabs: [{ view: 'analytics', label: 'Numeri' }, { view: 'storico', label: 'Storico vendite' }] },
  { id: 'impostazioni', label: 'Impostazioni', tabs: [{ view: 'settings', label: 'Impostazioni' }, { view: 'legal', label: 'Documenti legali' }] },
];

/** Voci del menu principale (Impostazioni sta a parte, in fondo vicino al profilo). */
export const MAIN_SECTION_IDS: SectionId[] = ['oggi', 'clienti', 'opportunita', 'agenda', 'mappa', 'analisi'];

// Viste senza una scheda propria ma raggiungibili da collegamenti interni
const EXTRA_VIEWS: Partial<Record<NavView, SectionId>> = {
  'map-full': 'mappa',
  prospecting: 'opportunita',
  assets: 'oggi', // non ha una vista propria: App mostra la Dashboard
};

export function getSection(id: SectionId): NavSection {
  const s = NAV_SECTIONS.find(x => x.id === id);
  if (!s) throw new Error(`Voce di menu sconosciuta: ${id}`);
  return s;
}

/** Voce di menu a cui appartiene una vista. */
export function sectionOf(view: NavView): SectionId {
  const hit = NAV_SECTIONS.find(s => s.tabs.some(t => t.view === view));
  return hit?.id ?? EXTRA_VIEWS[view] ?? 'oggi';
}

/** Vista principale della voce (la prima scheda): è anche l'id salvato nelle preferenze. */
export function primaryView(id: SectionId): NavView {
  return getSection(id).tabs[0].view;
}

/** Converte una lista di viste (preferenze salvate, anche del vecchio menu) in voci, senza doppioni. */
function toSections(views: readonly NavView[], allowed: readonly SectionId[]): SectionId[] {
  const out: SectionId[] = [];
  for (const v of views) {
    const s = sectionOf(v);
    if (allowed.includes(s) && !out.includes(s)) out.push(s);
  }
  return out;
}

/** Ordine delle voci del menu laterale: prima quelle ordinate dall'utente, poi le altre. */
export function orderMainSections(sidebarOrder: readonly NavView[] | undefined): SectionId[] {
  const ordered = toSections(sidebarOrder ?? [], MAIN_SECTION_IDS);
  return [...ordered, ...MAIN_SECTION_IDS.filter(s => !ordered.includes(s))];
}

export const MAX_FOOTER_SECTIONS = 4;
export const DEFAULT_FOOTER_SECTIONS: SectionId[] = ['oggi', 'opportunita', 'agenda', 'clienti'];

/** Voci della barra in basso su telefono (massimo 4, la quinta posizione è «Altro»). */
export function footerSections(footerTabs: readonly NavView[] | undefined): SectionId[] {
  const s = toSections(footerTabs ?? [], MAIN_SECTION_IDS).slice(0, MAX_FOOTER_SECTIONS);
  return s.length > 0 ? s : [...DEFAULT_FOOTER_SECTIONS];
}
