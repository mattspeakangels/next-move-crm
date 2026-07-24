import {
  Lead,
  Sequence,
  SequenceTouch,
  LeadSequence,
  LeadEmailDraft,
  VisitaFreddoEsito,
  Contact,
  Deal,
} from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const SILENZIO_CAP_GIORNI = 10;

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function compilaTemplate(template: string | undefined, lead: Lead, dettaglioVisita?: string): string {
  if (!template) return '';
  return template
    .replace(/\[Nome\]/g, lead.referente?.nome || 'Nome')
    .replace(/\[Azienda\]/g, lead.company)
    .replace(/\[Ferramenta\]/g, lead.company)
    .replace(/\[dettaglio_visita\]/g, dettaglioVisita || '');
}

// Tabella §4 della spec: esito della visita a freddo -> tocco di partenza della sequenza.
// 'parlato_influente_richiesta_email' anticipa anche una telefonata di verifica a G+12
// (oltre alla telefonata regolare G+18 già prevista dalla sequenza).
export function toccoIniziale(esito: VisitaFreddoEsito): number {
  switch (esito) {
    case 'nessuno_trovato':
      return 1;
    case 'parlato_influente_richiesta_email':
      return 1;
    case 'parlato_decisore':
      return 1;
    case 'appuntamento_fissato':
      // Appuntamento già fissato: non si avvia una sequenza di prospecting a freddo.
      return 0;
    default:
      return 1;
  }
}

export interface StartSequenceResult {
  leadSequence: LeadSequence;
  emailDrafts: LeadEmailDraft[];
}

// Avvia una sequenza per un lead subito dopo la registrazione di una visita a freddo.
// Genera SUBITO tutte le bozze email della sequenza (placeholder [giorno 1]/[giorno 2]
// lasciati intatti, il resto compilato), come richiesto dalla spec.
export function startSequenceForLead(
  lead: Lead,
  sequence: Sequence,
  dettaglioVisita?: string,
  now: number = Date.now(),
): StartSequenceResult {
  const leadSequence: LeadSequence = {
    id: uid('lseq'),
    leadId: lead.id,
    sequenceId: sequence.id,
    dataG0: now,
    toccoCorrente: 1,
    dataProssimoTocco: computeNextActionDeadline(sequence, now, 1),
    stato: 'attiva',
  };

  const emailDrafts: LeadEmailDraft[] = sequence.touches
    .filter(t => t.tipo === 'email')
    .map(t => ({
      id: uid('draft'),
      leadSequenceId: leadSequence.id,
      tocco: t.ordine,
      oggetto: compilaTemplate(t.oggettoTemplate, lead, dettaglioVisita),
      corpo: compilaTemplate(t.corpoTemplate, lead, dettaglioVisita),
      modificataAMano: false,
    }));

  return { leadSequence, emailDrafts };
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
  leadSequence: Partial<LeadSequence>;
  leadStatoProspecting?: Lead['statoProspecting'];
  completata: boolean;
}

// Avanza il tocco SOLO per silenzio scaduto (nessuna risposta ricevuta). Una risposta
// registrata sul lead deve sempre bloccare l'avanzamento a monte (vedi registraRisposta) —
// questa funzione presume che il chiamante l'abbia già verificato.
export function advanceTouch(sequence: Sequence, leadSequence: LeadSequence, now: number = Date.now()): AdvanceTouchResult {
  const prossimoTocco = leadSequence.toccoCorrente + 1;
  const ultimoTocco = sequence.touches.length;

  if (prossimoTocco > ultimoTocco) {
    return {
      leadSequence: { stato: 'completata' },
      completata: true,
    };
  }

  const giorniDiSilenzio = Math.floor((now - leadSequence.dataProssimoTocco) / DAY_MS);
  if (giorniDiSilenzio > SILENZIO_CAP_GIORNI) {
    // Silenzio troppo prolungato oltre la cadenza prevista: la sequenza resta comunque
    // attiva ma non si "recupera" oltre il cap — si applica comunque il tocco successivo.
  }

  return {
    leadSequence: {
      toccoCorrente: prossimoTocco,
      dataProssimoTocco: computeNextActionDeadline(sequence, leadSequence.dataG0, prossimoTocco),
    },
    completata: false,
  };
}

// Un lead in stato 'in_pausa' con dataRisveglio raggiunta rientra nella coda "Oggi"
// come nuovo ciclo da gestire.
export function wakeUpIfDue(leads: Lead[], now: number = Date.now()): Lead[] {
  return leads.filter(l => l.statoProspecting === 'in_pausa' && l.dataRisveglio !== undefined && l.dataRisveglio <= now);
}

export interface ConvertLeadResult {
  contact: Contact;
  deal: Deal;
}

// Converte un lead prospecting in Contact + Deal a fine funnel, preservando lo storico
// (le ProspectActivity restano collegate via leadId, non vengono duplicate in Activity).
export function convertLeadToDeal(lead: Lead, now: number = Date.now()): ConvertLeadResult {
  const contactId = uid('contact');
  const contact: Contact = {
    id: contactId,
    company: lead.company,
    contactName: lead.referente?.nome || '',
    role: lead.referente?.ruolo || '',
    email: lead.referente?.email || '',
    phone: lead.referente?.telefono || '',
    address: lead.address || '',
    city: lead.city || '',
    province: lead.province || '',
    sector: lead.settore,
    region: lead.region || '',
    status: 'potenziale',
    notes: `Convertito da prospecting (lead ${lead.id}, settore ${lead.settore}).`,
    createdAt: now,
    updatedAt: now,
  };

  const deal: Deal = {
    id: uid('deal'),
    contactId,
    value: 0,
    probability: 20,
    products: [],
    stage: 'lead',
    nextAction: 'Primo contatto post-conversione da prospecting',
    nextActionDeadline: now + DAY_MS,
    notes: `Convertito da prospecting (lead ${lead.id}, settore ${lead.settore}).`,
    createdAt: now,
    updatedAt: now,
  };

  return { contact, deal };
}

// Invariante trasversale della spec: nessun lead attivo può restare senza una
// dataProssimoTocco/dataRisveglio futura, tranne negli stati terminali.
export function hasValidNextAction(lead: Lead, leadSequence?: LeadSequence): boolean {
  if (lead.statoProspecting === 'convertito' || lead.statoProspecting === 'scartato') return true;
  if (lead.statoProspecting === 'in_pausa') return lead.dataRisveglio !== undefined;
  return !!leadSequence && leadSequence.stato === 'attiva' && !!leadSequence.dataProssimoTocco;
}
