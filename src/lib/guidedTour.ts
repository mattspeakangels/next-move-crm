import type { NavView } from '../types';
import { canOpenView } from './navSections';

// Visita guidata: una sequenza di passi che apre davvero ogni schermata dell'app
// e la spiega con una scheda. I passi legati a una vista compaiono solo se la
// mansione dell'utente può aprirla (stesse regole del menu).

export interface TourStep {
  id: string;
  /** Vista da aprire durante il passo (assente = resta dove si trova). */
  view?: NavView;
  /** Cliente di esempio di cui aprire la scheda (la vista resta 'contacts'). */
  openContact?: string;
  /** Percorso mostrato sopra il titolo, es. "Oggi › Panoramica". */
  where?: string;
  title: string;
  body: string;
  tips?: string[];
  /** Elemento da evidenziare (selettore CSS), es. il pulsante del microfono. */
  target?: string;
}

// I testi citano i dati dell'azienda di esempio (src/data/demoData.ts) che l'app
// mostra durante la visita: se cambi uno, aggiorna l'altro.
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'benvenuto',
    title: 'Benvenuto in Syrio',
    body: 'Ti mostriamo l’app al lavoro con un’azienda di esempio: clienti, trattative, offerte e appuntamenti inventati, così vedi davvero a cosa serve ogni schermata. I tuoi dati non vengono toccati e tornano appena chiudi la visita.',
    tips: ['Usa «Avanti» e «Indietro» per muoverti (sul computer anche le frecce della tastiera)', 'Puoi cliccare e provare tutto: niente di quello che fai durante la visita viene salvato'],
  },
  {
    id: 'panoramica',
    view: 'dashboard',
    where: 'Oggi › Panoramica',
    title: 'La tua giornata a colpo d’occhio',
    body: 'Ogni mattina parti da qui: in alto clienti, opportunità aperte, valore della pipeline e offerte inviate; sotto i clienti da seguire con la prossima cosa da fare; a destra le scadenze delle trattative e la salute della pipeline.',
    tips: ['In rosso le cose in ritardo: Tecno Servizi aspetta il catalogo da ieri', 'Completi un’attività direttamente da qui, senza cambiare schermata'],
  },
  {
    id: 'da-fare',
    view: 'todo',
    where: 'Oggi › Da fare',
    title: 'Le cose da fare, in ordine di priorità',
    body: 'Offerte da preparare, schede tecniche da mandare, richiami e campionature, ognuna legata al suo cliente. Quando ne chiudi una scegli com’è andata (ordine, offerta richiesta, non interessato…).',
    tips: ['A fine anno, tra le completate, vedi quali attività hanno portato ordini', 'Esempio: il follow-up a Ferramenta Bianchi si è chiuso con un ordine'],
  },
  {
    id: 'clienti',
    view: 'contacts',
    where: 'Clienti',
    title: 'L’elenco dei clienti',
    body: 'Clienti e potenziali clienti, con ricerca e filtri per città, settore e tipo (rivenditore o cliente finale). Qui ce ne sono dieci, da Bergamo a Pavia.',
  },
  {
    id: 'scheda-cliente',
    view: 'contacts',
    openContact: 'demo-edilrossi',
    where: 'Clienti › Edil Rossi Costruzioni',
    title: 'Tutto su un cliente, in una pagina',
    body: 'Questa è la scheda di Edil Rossi Costruzioni: dati, sedi, referenti e note sempre aggiornati. Con «Storico» vedi ogni contatto avuto, le trattative (qui una da 12.400 € in negoziazione) e le offerte; con «In mappa» lo trovi sul territorio.',
    tips: ['Chiami, scrivi su WhatsApp o mandi un’email con un tocco, e il contatto finisce nel diario', 'Da qui crei un’offerta già intestata al cliente'],
  },
  {
    id: 'strategia',
    view: 'strategia',
    where: 'Clienti › Gruppi e focus',
    title: 'Dove concentrare le energie',
    body: 'Raggruppi i clienti dietro un obiettivo e scegli su chi puntare. Nell’esempio: il gruppo «Imprese edili Bergamo e Como» e il focus su Logistica Nord per chiudere il primo ordine entro il trimestre.',
  },
  {
    id: 'pipeline',
    view: 'deals',
    where: 'Opportunità › Pipeline',
    title: 'Le trattative, fase per fase',
    body: 'Ogni trattativa ha una fase, un valore, una probabilità e una prossima azione con scadenza. Qui le vedi in colonne: dal primo contatto fino a vinta o persa.',
    tips: ['Una trattativa senza prossima azione è una trattativa ferma', 'Quando ne perdi una, segni il motivo: Elettro Gamma è persa per il prezzo'],
  },
  {
    id: 'offerte',
    view: 'offers',
    where: 'Opportunità › Offerte',
    title: 'Preventivi e ordini',
    body: 'Componi l’offerta prendendo gli articoli dal catalogo, con quantità e sconti; la scarichi in PDF per il cliente e ne segui lo stato: bozza, inviata, accettata o rifiutata.',
    tips: ['Per ogni offerta inviata Syrio ti ricorda quando richiamare'],
  },
  {
    id: 'catalogo',
    view: 'products',
    where: 'Opportunità › Catalogo',
    title: 'Il catalogo prodotti',
    body: 'Gli articoli con codice, prezzo, taglie e colori che usi nelle offerte. Li aggiungi a mano oppure li importi da un file CSV o Excel.',
  },
  {
    id: 'agenda',
    view: 'agenda',
    where: 'Agenda › Calendario',
    title: 'Il calendario degli appuntamenti',
    body: 'Visite, chiamate, demo e call in vista mese, settimana o elenco; sotto il calendario gli appuntamenti del giorno scelto. Dopo un appuntamento lo chiudi con l’esito e, se serve, crei subito la cosa da fare successiva.',
    tips: ['Dai giorni con visite apri l’itinerario sulla mappa'],
  },
  {
    id: 'diario',
    view: 'attivita',
    where: 'Agenda › Diario',
    title: 'Il diario commerciale',
    body: 'Tutto quello che hai fatto, in ordine di tempo e con l’esito: la richiesta di offerta di Edil Rossi, l’ordine firmato da Ferramenta Bianchi, il no di Elettro Gamma. È la memoria del lavoro con ogni cliente.',
  },
  {
    id: 'mappa',
    view: 'map',
    where: 'Mappa',
    title: 'I clienti sul territorio',
    body: 'Vedi dove sono clienti e potenziali clienti, così pianifichi i giri per zona, e organizzi l’itinerario del giorno con le tappe nell’ordine giusto.',
  },
  {
    id: 'numeri',
    view: 'analytics',
    where: 'Analisi › Numeri',
    title: 'Come stai andando',
    body: 'Andamento mese per mese, pipeline per fase, motivi di perdita, top 10 clienti e prodotti, mix delle attività: i numeri per capire cosa funziona.',
  },
  {
    id: 'storico',
    view: 'storico',
    where: 'Analisi › Storico vendite',
    title: 'Lo storico delle vendite',
    body: 'Importi da Excel le vendite degli anni passati e le confronti con quelle di oggi: chi compra, cosa e quando, per sapere a chi proporre il riordino.',
  },
  {
    id: 'impostazioni',
    view: 'settings',
    where: 'Impostazioni',
    title: 'Il tuo spazio, come lo vuoi tu',
    body: 'Qui aggiorni l’app, inviti i colleghi con la loro mansione, colleghi la posta e personalizzi colori, testo e voci del menu.',
    tips: ['Se una novità non compare, premi «Cerca aggiornamenti» in cima a questa pagina', 'Da qui puoi rifare questa visita quando vuoi'],
  },
  {
    id: 'microfono',
    where: 'Sempre a portata di mano',
    title: 'Registra un’attività a voce',
    body: 'Il pulsante con il microfono c’è in ogni schermata: dici cosa hai fatto («ho chiamato Rossi, vuole le taglie entro venerdì, richiamare giovedì») e Syrio lo registra nel diario e crea le cose da fare.',
    target: '[data-tour="quicklog"]',
  },
  {
    id: 'fine',
    view: 'dashboard',
    title: 'Ora tocca a te',
    body: 'Chiudendo la visita i dati di esempio spariscono e tornano i tuoi. Comincia aggiungendo i tuoi clienti o importandoli da un file: il resto viene da sé. La visita resta sempre disponibile in Impostazioni.',
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
