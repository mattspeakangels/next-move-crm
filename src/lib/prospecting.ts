import {
  Sequence,
  SequenceTouch,
  ProspectingTrack,
  ProspectEmailDraft,
  ActivityOutcome,
  Contact,
  Deal,
} from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const SILENZIO_CAP_GIORNI = 10;

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function compilaTemplate(template: string | undefined, contact: Contact, dettaglioVisita?: string): string {
  if (!template) return '';
  return template
    .replace(/\[Nome\]/g, contact.contactName || 'Nome')
    .replace(/\[Azienda\]/g, contact.company)
    .replace(/\[Ferramenta\]/g, contact.company)
    .replace(/\[dettaglio_visita\]/g, dettaglioVisita || '');
}

// Tabella §4 della spec: esito della visita a freddo -> tocco di partenza della sequenza.
export function toccoIniziale(esito: ActivityOutcome): number {
  switch (esito) {
    case 'nessuno-trovato':
    case 'parlato-influente':
    case 'parlato-decisore':
      return 1;
    case 'appuntamento-fissato':
    case 'richiesta-offerta':
      // Appuntamento già fissato o offerta già richiesta: non si avvia una sequenza di prospecting a freddo.
      return 0;
    default:
      return 1;
  }
}

export interface StartSequenceResult {
  track: ProspectingTrack;
  emailDrafts: ProspectEmailDraft[];
}

// Avvia una sequenza per un Contact subito dopo la registrazione di una visita a freddo.
// Genera SUBITO tutte le bozze email della sequenza (placeholder [giorno 1]/[giorno 2]
// lasciati intatti, il resto compilato), come richiesto dalla spec.
export function startSequenceForContact(
  contact: Contact,
  sequence: Sequence,
  dettaglioVisita?: string,
  now: number = Date.now(),
): StartSequenceResult {
  const track: ProspectingTrack = {
    id: uid('track'),
    contactId: contact.id,
    sequenceId: sequence.id,
    dataG0: now,
    toccoCorrente: 1,
    dataProssimoTocco: computeNextActionDeadline(sequence, now, 1),
    stato: 'attiva',
  };

  const emailDrafts: ProspectEmailDraft[] = sequence.touches
    .filter(t => t.tipo === 'email')
    .map(t => ({
      id: uid('draft'),
      trackId: track.id,
      tocco: t.ordine,
      oggetto: compilaTemplate(t.oggettoTemplate, contact, dettaglioVisita),
      corpo: compilaTemplate(t.corpoTemplate, contact, dettaglioVisita),
      modificataAMano: false,
    }));

  return { track, emailDrafts };
}

// Calcola la data del prossimo tocco (offset dal G0, non dal tocco precedente:
// gli offset del manuale sono tutti "G+N dal primo contatto").
export function computeNextActionDeadline(sequence: Sequence, dataG0: number, toccoNumero: number): number {
  const touch = sequence.touches.find(t => t.ordine === toccoNumero);
  const offset = touch ? touch.offsetGiorni : 0;
  return dataG0 + offset * DAY_MS;
}

export function getTouch(sequence: Sequence, ordine: number): SequenceTouch | undefined {
  return sequence.touches.find(t => t.ordine === ordine);
}

export interface AdvanceTouchResult {
  track: Partial<ProspectingTrack>;
  completata: boolean;
}

// Avanza il tocco SOLO per silenzio scaduto (nessuna risposta ricevuta). Una risposta
// registrata deve sempre bloccare l'avanzamento a monte (contact.prospectingStato = 'risposto') —
// questa funzione presume che il chiamante l'abbia già verificato.
export function advanceTouch(sequence: Sequence, track: ProspectingTrack, now: number = Date.now()): AdvanceTouchResult {
  const prossimoTocco = track.toccoCorrente + 1;
  const ultimoTocco = sequence.touches.length;

  if (prossimoTocco > ultimoTocco) {
    return {
      track: { stato: 'completata' },
      completata: true,
    };
  }

  const giorniDiSilenzio = Math.floor((now - track.dataProssimoTocco) / DAY_MS);
  if (giorniDiSilenzio > SILENZIO_CAP_GIORNI) {
    // Silenzio troppo prolungato oltre la cadenza prevista: la sequenza resta comunque
    // attiva ma non si "recupera" oltre il cap — si applica comunque il tocco successivo.
  }

  return {
    track: {
      toccoCorrente: prossimoTocco,
      dataProssimoTocco: computeNextActionDeadline(sequence, track.dataG0, prossimoTocco),
    },
    completata: false,
  };
}

// Un prospect in stato 'in_pausa' con dataRisveglio raggiunta rientra nella coda "Oggi"
// come nuovo ciclo da gestire.
export function wakeUpIfDue(contacts: Contact[], now: number = Date.now()): Contact[] {
  return contacts.filter(
    c => c.prospectingStato === 'in_pausa' && c.prospectingDataRisveglio !== undefined && c.prospectingDataRisveglio <= now,
  );
}

export interface ConvertToLeadResult {
  deal: Deal;
  contactUpdates: Partial<Contact>;
}

// Converte un prospect a lead in pipeline: il Contact esiste già (nessuna duplicazione),
// si crea solo il Deal a stage 'lead' e si segna il Contact come convertito.
export function convertToLead(contact: Contact, now: number = Date.now()): ConvertToLeadResult {
  const deal: Deal = {
    id: uid('deal'),
    contactId: contact.id,
    value: 0,
    probability: 20,
    products: [],
    stage: 'lead',
    nextAction: 'Preparare offerta',
    nextActionDeadline: now + DAY_MS,
    notes: `Convertito da prospecting (richiesta offerta il ${new Date(now).toLocaleDateString('it-IT')}).`,
    createdAt: now,
    updatedAt: now,
  };

  const contactUpdates: Partial<Contact> = {
    prospectingStato: 'convertito',
    convertedToDealId: deal.id,
    updatedAt: now,
  };

  return { deal, contactUpdates };
}

// Invariante trasversale della spec: nessun prospect attivo può restare senza una
// dataProssimoTocco/dataRisveglio futura, tranne negli stati terminali.
export function hasValidNextAction(contact: Contact, track?: ProspectingTrack): boolean {
  if (contact.prospectingStato === 'convertito' || contact.prospectingStato === 'scartato') return true;
  if (contact.prospectingStato === 'in_pausa') return contact.prospectingDataRisveglio !== undefined;
  return !!track && track.stato === 'attiva' && !!track.dataProssimoTocco;
}
