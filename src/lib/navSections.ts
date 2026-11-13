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

// ─── Accesso per mansione ────────────────────────────────────────────────────
// Ogni mansione vede solo le voci (e le schede) del suo lavoro e parte dalla sua
// schermata. È un'organizzazione del menu, non un blocco di sicurezza: i dati
// condivisi restano leggibili da tutti i membri (regole Firestore).

/** Mansioni: stessi valori di WorkspaceRole (src/lib/workspace.ts). */
export type RoleKey = 'owner' | 'admin' | 'sales' | 'customer_service' | 'marketing' | 'accounting' | 'graphics' | 'bdr';

interface RoleAccess { sections: Partial<Record<SectionId, NavView[] | 'tutte'>>; home: NavView }

const ALL: RoleAccess['sections'] = { oggi: 'tutte', clienti: 'tutte', opportunita: 'tutte', agenda: 'tutte', mappa: 'tutte', analisi: 'tutte' };

export const ROLE_ACCESS: Record<RoleKey, RoleAccess> = {
  owner: { sections: ALL, home: 'dashboard' },
  admin: { sections: ALL, home: 'dashboard' },
  sales: { sections: ALL, home: 'dashboard' },
  bdr: { sections: ALL, home: 'dashboard' },
  customer_service: { sections: { clienti: 'tutte', agenda: 'tutte', opportunita: ['offers'] }, home: 'contacts' },
  marketing: { sections: { clienti: 'tutte', analisi: 'tutte', mappa: 'tutte' }, home: 'analytics' },
  accounting: { sections: { opportunita: ['offers'], analisi: 'tutte', clienti: ['contacts'] }, home: 'offers' },
  graphics: { sections: { clienti: ['contacts'], opportunita: ['offers'] }, home: 'contacts' },
};

function accessFor(role: string | null | undefined): RoleAccess {
  return ROLE_ACCESS[(role ?? 'owner') as RoleKey] ?? ROLE_ACCESS.sales;
}

/** Schede visibili di una voce per la mansione (Impostazioni sempre visibile). */
export function tabsFor(id: SectionId, role: string | null | undefined): NavTab[] {
  const tabs = getSection(id).tabs;
  if (id === 'impostazioni') return tabs;
  const rule = accessFor(role).sections[id];
  if (!rule) return [];
  return rule === 'tutte' ? tabs : tabs.filter(t => rule.includes(t.view));
}

/** Voci del menu principale visibili per la mansione. */
export function sectionsForRole(role: string | null | undefined): SectionId[] {
  return MAIN_SECTION_IDS.filter(id => tabsFor(id, role).length > 0);
}

/** True se la mansione può aprire la vista (le viste senza scheda seguono la loro voce). */
export function canOpenView(view: NavView, role: string | null | undefined): boolean {
  const id = sectionOf(view);
  const tabs = tabsFor(id, role);
  if (tabs.some(t => t.view === view)) return true;
  // map-full, prospecting, assets: seguono la scheda principale della loro voce
  return !getSection(id).tabs.some(t => t.view === view) && tabs.length > 0;
}

/** Schermata iniziale della mansione. */
export function homeView(role: string | null | undefined): NavView {
  return accessFor(role).home;
}
