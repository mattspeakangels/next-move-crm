import type { NavView } from '../types';
import { canOpenView } from './navSections';

// Visita guidata: una sequenza di passi che apre davvero ogni schermata dell'app
// e la spiega con una scheda. I passi legati a una vista compaiono solo se la
// mansione dell'utente può aprirla (stesse regole del menu).

export interface TourStep {
  id: string;
  /** Vista da aprire durante il passo (assente = resta dove si trova). */
  view?: NavView;
  /** Percorso mostrato sopra il titolo, es. "Oggi › Panoramica". */
  where?: string;
  title: string;
  body: string;
  tips?: string[];
  /** Elemento da evidenziare (selettore CSS), es. il pulsante del microfono. */
  target?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'benvenuto',
    title: 'Benvenuto in Syrio',
    body: 'In un paio di minuti ti mostriamo come è fatta l’app: apriremo una per una le sezioni del menu e ti diremo a cosa servono. Puoi uscire quando vuoi e rifare la visita da Impostazioni.',
    tips: ['Usa «Avanti» e «Indietro» per muoverti (sul computer anche le frecce della tastiera)', 'La X in alto chiude la visita in qualsiasi momento'],
  },
  {
    id: 'panoramica',
    view: 'dashboard',
    where: 'Oggi › Panoramica',
    title: 'La tua giornata a colpo d’occhio',
    body: 'È la schermata da cui partire ogni mattina: cosa devi fare oggi, le trattative in calendario e lo stato di salute della pipeline.',
    tips: ['Il calendario a destra mostra le scadenze delle trattative', 'Da qui puoi completare un’attività senza cambiare schermata'],
  },
  {
    id: 'da-fare',
    view: 'todo',
    where: 'Oggi › Da fare',
    title: 'Le attività in ordine di priorità',
    body: 'Chiamate, visite, email e promemoria raggruppati per tipo e urgenza. Quando chiudi un’attività indichi com’è andata: a fine anno vedi quali attività hanno portato risultati.',
    tips: ['Spunta un’attività per chiuderla e scegliere l’esito'],
  },
  {
    id: 'clienti',
    view: 'contacts',
    where: 'Clienti',
    title: 'Tutti i tuoi clienti',
    body: 'L’anagrafica completa: apri un cliente per vedere contatti, storico delle attività, trattative e offerte collegate.',
    tips: ['Dalla scheda cliente chiami, scrivi su WhatsApp o mandi un’email con un tocco', 'Puoi creare un’offerta direttamente dalla scheda'],
  },
  {
    id: 'strategia',
    view: 'strategia',
    where: 'Clienti › Gruppi e focus',
    title: 'Dove concentrare le energie',
    body: 'Raggruppa i clienti per area, settore o potenziale e scegli quelli su cui puntare: ti aiuta a non disperdere tempo.',
  },
  {
    id: 'pipeline',
    view: 'deals',
    where: 'Opportunità › Pipeline',
    title: 'Le trattative, fase per fase',
    body: 'Ogni opportunità ha una fase, un valore e una prossima azione. Aggiorna la fase man mano che la trattativa avanza fino a vinta o persa.',
    tips: ['Una trattativa senza prossima azione è una trattativa ferma'],
  },
  {
    id: 'offerte',
    view: 'offers',
    where: 'Opportunità › Offerte',
    title: 'Preventivi e ordini',
    body: 'Prepara le offerte partendo dal catalogo, scaricale in PDF da inviare al cliente e segui quali sono state accettate.',
  },
  {
    id: 'catalogo',
    view: 'products',
    where: 'Opportunità › Catalogo',
    title: 'Il catalogo prodotti',
    body: 'Articoli e prezzi che usi nelle offerte. Puoi aggiungerli a mano oppure importarli da un file CSV o Excel.',
  },
  {
    id: 'agenda',
    view: 'agenda',
    where: 'Agenda › Calendario',
    title: 'Appuntamenti e visite',
    body: 'Il calendario della settimana con appuntamenti, chiamate e visite. I filtri in alto scelgono cosa mostrare.',
    tips: ['Da un giorno con visite puoi aprire l’itinerario sulla mappa'],
  },
  {
    id: 'diario',
    view: 'attivita',
    where: 'Agenda › Diario',
    title: 'Il diario commerciale',
    body: 'Tutto quello che hai fatto, in ordine di tempo: chiamate, incontri, email. È la memoria del tuo lavoro con ogni cliente.',
  },
  {
    id: 'mappa',
    view: 'map',
    where: 'Mappa',
    title: 'I clienti sul territorio',
    body: 'Vedi dove si trovano clienti e potenziali clienti e organizza l’itinerario del giorno con le tappe nell’ordine giusto.',
  },
  {
    id: 'numeri',
    view: 'analytics',
    where: 'Analisi › Numeri',
    title: 'Come stai andando',
    body: 'Fatturato, obiettivi, trattative vinte e perse, esito delle attività: i numeri che raccontano il tuo andamento commerciale.',
  },
  {
    id: 'storico',
    view: 'storico',
    where: 'Analisi › Storico vendite',
    title: 'Lo storico delle vendite',
    body: 'Importa le vendite degli anni passati per confrontarle con quelle di oggi e capire chi compra, cosa e quando.',
  },
  {
    id: 'impostazioni',
    view: 'settings',
    where: 'Impostazioni',
    title: 'Il tuo spazio, come lo vuoi tu',
    body: 'Qui aggiorni l’app, gestisci il team e le mansioni, colleghi la posta e personalizzi colori, testo e voci del menu.',
    tips: ['Se una novità non compare, premi «Cerca aggiornamenti» in cima a questa pagina', 'Da qui puoi rifare questa visita quando vuoi'],
  },
  {
    id: 'microfono',
    where: 'Sempre a portata di mano',
    title: 'Registra un’attività a voce',
    body: 'Il pulsante con il microfono è presente in ogni schermata: racconta cosa hai fatto («ho chiamato Rossi, richiamare giovedì») e Syrio lo registra per te.',
    target: '[data-tour="quicklog"]',
  },
  {
    id: 'fine',
    view: 'dashboard',
    title: 'Sei pronto!',
    body: 'Questa è la tua base di partenza. Buon lavoro: ogni volta che hai un dubbio trovi la visita guidata in Impostazioni.',
  },
];

/** Passi visibili per la mansione: si saltano le schermate che non può aprire. */
export function stepsForRole(role: string | null | undefined, steps: TourStep[] = TOUR_STEPS): TourStep[] {
  return steps.filter(s => !s.view || canOpenView(s.view, role));
}

const DONE_KEY = 'syrio_tour_done_v1';
export const START_TOUR_EVENT = 'syrio:start-tour';

export function isTourDone(): boolean {
  try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return true; }
}

export function markTourDone(): void {
  try { localStorage.setItem(DONE_KEY, '1'); } catch { /* storage non disponibile */ }
}

/** Avvia la visita da qualunque punto dell'app (es. Impostazioni). */
export function startGuidedTour(): void {
  window.dispatchEvent(new Event(START_TOUR_EVENT));
}
