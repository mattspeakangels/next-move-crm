// Simulazione giornaliera del laboratorio (logica pura, nessun Firebase): il "piano" di una
// giornata lavorativa di un'azienda fittizia. Email in arrivo da clienti e prospect, risposte
// dei colleghi, nuovi prospect dal sito, opportunità che nascono e avanzano, rumore.
// Stesso spazio + stesso giorno + stessi dati di partenza → stesso piano.
// Testata in tests/lab-sim.test.mjs.
import type { LabEmail, Mailbox, MailAddress } from './labMailCore';

export const SIM_VERSION = 1;
const HOUR = 3600_000;
const MIN = 60_000;

export interface SimContact { id: string; company: string; status: 'cliente' | 'potenziale'; email: string; contactName: string; ownerUid: string | null }
export interface SimDeal { id: string; contactId: string; stage: string; ownerUid: string | null; value: number }
export interface SimMember { uid: string; displayName: string; role: string }

export interface SimLabel {
  customerId: string | null; dealId: string | null; type: string;
  kind: 'richiesta' | 'aggiornamento' | 'nessuna';
  actor: { role: string; uid: string | null } | null;
}

export type SimEmail = Omit<LabEmail, 'id'> & { simDay: string; labSim: true };

export type PlanEvent =
  | { id: string; at: number; kind: 'email'; email: SimEmail; label: SimLabel }
  | { id: string; at: number; kind: 'contact'; contact: Record<string, unknown> }
  | { id: string; at: number; kind: 'deal-new'; deal: Record<string, unknown> }
  | { id: string; at: number; kind: 'deal-update'; dealId: string; updates: Record<string, unknown> };

export interface DayPlan { version: number; day: string; events: PlanEvent[]; summary: Record<string, number> }

export interface PlanInput {
  wid: string;
  day: string; // AAAA-MM-GG (ora locale)
  dayStart: number; // mezzanotte locale del giorno, in ms
  contacts: SimContact[];
  deals: SimDeal[];
  mailboxes: Mailbox[];
  members: SimMember[];
}

// ─── casualità deterministica ────────────────────────────────────────────────

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function makeRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: (p: number) => next() < p,
    pick: <T,>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
  };
}
type Rng = ReturnType<typeof makeRng>;

// ─── testi ───────────────────────────────────────────────────────────────────

const PRODUCTS = ['polo in piquet', 'felpe con zip', 'giacche softshell', 'pantaloni da lavoro multitasche', 'gilet alta visibilità', 'scarpe antinfortunistiche S3', 't-shirt in cotone', 'pile leggeri', 'giubbotti invernali imbottiti'];
const HELLO = ['Buongiorno', 'Salve', 'Buongiorno,', 'Gentili signori'];
const BYE = ['Cordiali saluti', 'Grazie, saluti', 'Buona giornata', 'Saluti'];

type ClientType = 'offerta' | 'sollecito' | 'ordine' | 'personalizzazione' | 'reclamo' | 'informazioni';

const CLIENT_TEMPLATES: { type: ClientType; actor: string; subject: (r: Rng) => string; body: (r: Rng) => string; reply: string }[] = [
  { type: 'offerta', actor: 'commerciale', subject: r => r.pick(['Richiesta offerta', 'Richiesta preventivo', 'Quotazione articoli']),
    body: r => `vorremmo ricevere la vostra migliore offerta per ${r.int(2, 8) * 10} ${r.pick(PRODUCTS)} e ${r.int(1, 5) * 10} ${r.pick(PRODUCTS)}, taglie dalla S alla XXL.`,
    reply: 'grazie per la richiesta. Vi preparo l\'offerta e ve la invio entro domani.' },
  { type: 'sollecito', actor: 'customer_service', subject: r => r.pick(['Sollecito consegna', 'Notizie consegna', 'Aggiornamento?']),
    body: r => r.pick(['a che punto è la nostra consegna? Ci servirebbe entro venerdì.', 'non abbiamo ancora ricevuto la merce, potete verificare?', 'avete novità sull\'offerta che vi avevamo chiesto?']),
    reply: 'ho verificato: la merce parte domani, vi giro il tracking appena disponibile.' },
  { type: 'ordine', actor: 'customer_service', subject: r => `Ordine n. ${r.int(100, 999)}/${new Date().getFullYear()}`,
    body: () => 'confermiamo l\'ordine come da vostra ultima offerta. In allegato il PDF firmato.',
    reply: 'confermiamo la ricezione dell\'ordine, vi aggiorniamo alla spedizione.' },
  { type: 'personalizzazione', actor: 'personalizzazione', subject: r => r.pick(['Logo su capi', 'Ricamo logo aziendale', 'Modifica rendering']),
    body: r => r.pick(['vi mando il logo da ricamare sul petto a sinistra. Ci mandate un rendering?', 'il logo nel rendering è un po\' grande, potete ridurlo del 20%?', 'il colore del logo deve essere più scuro, ci mandate una nuova versione?']),
    reply: 'ricevuto, vi mandiamo il rendering aggiornato in giornata.' },
  { type: 'reclamo', actor: 'customer_service', subject: r => r.pick(['Capi difettosi', 'Taglie sbagliate', 'Problema con la consegna']),
    body: r => r.pick(['abbiamo ricevuto la merce ma alcuni capi hanno le cuciture aperte. Come procediamo?', 'le taglie consegnate non corrispondono all\'ordine.', 'manca un collo della spedizione.']),
    reply: 'ci scusiamo per il disagio. Apriamo subito la pratica di reso e vi mandiamo la sostituzione.' },
];

const PROSPECT_TEMPLATES: { subject: string; body: (r: Rng) => string }[] = [
  { subject: 'Richiesta informazioni', body: () => 'stiamo cercando un nuovo fornitore di abbigliamento da lavoro. Potete mandarci un catalogo?' },
  { subject: 'Contatto dal sito', body: r => `abbiamo visto il vostro sito: ci interessano ${r.pick(PRODUCTS)} per circa ${r.int(2, 9) * 10} dipendenti.` },
  { subject: 'Cerchiamo un fornitore', body: () => 'un collega ci ha dato il vostro contatto. Fate anche la personalizzazione con il logo?' },
  { subject: 'Richiesta preventivo', body: r => `ci servirebbe un preventivo per ${r.int(1, 5) * 10} ${r.pick(PRODUCTS)}.` },
];

const NOISE: { from: MailAddress; subject: string; body: string }[] = [
  { from: { name: 'TessilNews', email: 'news@tessilnews.it' }, subject: 'TessilNews — il punto della settimana', body: 'Il punto settimanale sul mercato dei tessuti tecnici.' },
  { from: { name: 'Corriere Rapido Nord', email: 'noreply@corrierarapidonord.it' }, subject: 'La tua spedizione è in consegna', body: 'La spedizione sarà consegnata oggi tra le 9 e le 13.' },
  { from: { name: 'Portale Acquisti PA', email: 'noreply@portaleacquistipa.it' }, subject: 'Nuovo bando pubblicato nella tua categoria', body: 'È stato pubblicato un nuovo avviso nella tua categoria merceologica.' },
  { from: { name: 'Portale Fatture', email: 'notifiche@portalefatture.it' }, subject: 'Ricevuta di consegna fattura elettronica', body: 'La fattura è stata consegnata al destinatario.' },
  { from: { name: 'Fiera Lavoro Sicuro', email: 'newsletter@fieralavorosicuro.it' }, subject: 'Le novità della fiera', body: 'Scopri gli espositori e prenota il tuo ingresso gratuito.' },
];

const FIRST = ['Marco', 'Giulia', 'Luca', 'Francesca', 'Andrea', 'Chiara', 'Matteo', 'Sara', 'Davide', 'Elena', 'Paolo', 'Laura'];
const LAST = ['Bellandi', 'Castelli', 'Pedrazzi', 'Zanardi', 'Guarnieri', 'Tironi', 'Ravasio', 'Colombi', 'Brivio', 'Gritti', 'Bertoli', 'Mangili'];
const PRE = ['Officine Meccaniche', 'Costruzioni', 'Impianti Elettrici', 'Logistica', 'Carpenteria', 'Autotrasporti', 'Termoidraulica', 'Serramenti'];
const TOWNS = ['Valdarena', 'Montebrisa', 'Roccalta', 'Borgoselva', 'Pietrafonte', 'Collebruno', 'Fontechiara', 'Riomarino'];

const STAGE_NEXT: Record<string, string> = { lead: 'qualificato', qualificato: 'proposta', proposta: 'negoziazione' };
export const STAGE_PROB: Record<string, number> = { lead: 10, qualificato: 25, proposta: 40, negoziazione: 60, 'chiuso-vinto': 100, 'chiuso-perso': 0 };
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

// ─── piano del giorno ────────────────────────────────────────────────────────

/** Volumi per giorno della settimana: pieno dal lunedì al venerdì, quasi nulla nel fine settimana. */
function volumes(weekday: number, r: Rng) {
  if (weekday === 0) return { client: r.int(0, 1), prospect: 0, newProspect: 0, noise: r.int(0, 2), advance: 0 };
  if (weekday === 6) return { client: r.int(0, 3), prospect: r.int(0, 1), newProspect: r.int(0, 1), noise: r.int(1, 3), advance: 0 };
  return { client: r.int(8, 14), prospect: r.int(2, 5), newProspect: r.int(1, 3), noise: r.int(4, 8), advance: r.int(2, 5) };
}

/** Un orario d'ufficio nel giorno (8:30-18:30 nei feriali, sparso nel fine settimana). */
function officeTime(dayStart: number, weekday: number, r: Rng): number {
  if (weekday === 0 || weekday === 6) return dayStart + r.int(9 * 60, 20 * 60) * MIN;
  return dayStart + r.int(8 * 60 + 30, 18 * 60 + 30) * MIN;
}

export function planDay(input: PlanInput): DayPlan {
  const { wid, day, dayStart, contacts, deals, mailboxes, members } = input;
  const r = makeRng(hashString(`${wid}|${day}|v${SIM_VERSION}`));
  const weekday = new Date(dayStart + 12 * HOUR).getDay();
  const v = volumes(weekday, r);
  const events: PlanEvent[] = [];
  let n = 0;
  const nextId = (p: string) => `sim-${day.replace(/-/g, '')}-${p}${String(++n).padStart(3, '0')}`;

  const info = mailboxes.find(m => m.kind === 'shared');
  const boxOf = (uid: string | null) => mailboxes.find(m => uid && m.uid === uid) ?? info;
  const byRole = (role: string) => members.filter(m => m.role === role);
  const colleague = (role: string): SimMember | undefined => {
    const list = role === 'commerciale' ? byRole('sales') : role === 'customer_service' ? byRole('customer_service') : role === 'personalizzazione' ? byRole('graphics') : [];
    return list.length ? r.pick(list) : undefined;
  };
  const domain = info?.address.split('@')[1] ?? 'azienda.it';
  const signature = (who: string, company: string) => `\n\n${r.pick(BYE)}\n${who}\n${company}`;

  const clients = contacts.filter(c => c.status === 'cliente' && c.email);
  const prospects = contacts.filter(c => c.status === 'potenziale' && c.email);
  const counts = { emailIn: 0, emailOut: 0, newProspects: 0, newDeals: 0, dealsAdvanced: 0, noise: 0 };

  const addReply = (inEv: Extract<PlanEvent, { kind: 'email' }>, responder: SimMember | undefined, text: string, dealId: string | null) => {
    if (!responder) return;
    const box = mailboxes.find(m => m.uid === responder.uid);
    if (!box) return;
    const at = inEv.at + r.int(20, 240) * MIN;
    if (at >= dayStart + 24 * HOUR) return;
    const id = nextId('o');
    const e = inEv.email;
    events.push({ id, at, kind: 'email', email: {
      threadId: e.threadId, inReplyTo: inEv.id, direction: 'out', date: new Date(at).toISOString(), dateMs: at,
      from: { name: responder.displayName, email: box.address }, to: [e.from], cc: [],
      subject: `R: ${e.subject}`, body: `Buongiorno,\n${text}${signature(responder.displayName, domain)}`,
      attachments: [], readBy: {}, simDay: day, labSim: true,
    }, label: { customerId: inEv.label.customerId, dealId, type: inEv.label.type, kind: 'aggiornamento', actor: { role: 'cliente', uid: null } } });
    counts.emailOut++;
  };

  // 1. Clienti che scrivono al loro commerciale (o al reparto giusto).
  for (let i = 0; i < v.client && clients.length; i++) {
    const c = r.pick(clients);
    const tpl = r.pick(CLIENT_TEMPLATES);
    const owner = members.find(m => m.uid === c.ownerUid);
    const handler = tpl.actor === 'commerciale' ? owner ?? colleague('commerciale') : colleague(tpl.actor) ?? owner;
    const box = boxOf(handler?.uid ?? null);
    if (!box) continue;
    const at = officeTime(dayStart, weekday, r);
    const id = nextId('i');
    let dealId: string | null = null;
    if (tpl.type === 'offerta' && r.chance(0.5)) {
      dealId = nextId('d');
      const value = r.int(8, 60) * 100;
      events.push({ id: dealId, at, kind: 'deal-new', deal: {
        id: dealId, contactId: c.id, value, probability: STAGE_PROB.lead, products: [r.pick(PRODUCTS)], stage: 'lead',
        nextAction: 'Preparare l\'offerta', nextActionDeadline: at + 2 * 24 * HOUR, nextActionType: 'invia-offerta', notes: `Richiesta via email: ${c.company}`,
        createdAt: at, updatedAt: at, createdBy: owner?.uid ?? null, updatedBy: owner?.uid ?? null, ownerUid: owner?.uid ?? null, labSim: true,
      } });
      counts.newDeals++;
    }
    const cc = handler && owner && handler.uid !== owner.uid ? mailboxes.filter(m => m.uid === owner.uid).map(m => ({ name: m.displayName, email: m.address })) : [];
    const ev: Extract<PlanEvent, { kind: 'email' }> = { id, at, kind: 'email', email: {
      threadId: `thr-${id}`, inReplyTo: null, direction: 'in', date: new Date(at).toISOString(), dateMs: at,
      from: { name: c.contactName || c.company, email: c.email }, to: [{ name: box.displayName, email: box.address }], cc,
      subject: tpl.subject(r), body: `${r.pick(HELLO)}\n${tpl.body(r)}${signature(c.contactName, c.company)}`,
      attachments: tpl.type === 'ordine' ? ['ordine.pdf'] : tpl.type === 'personalizzazione' && r.chance(0.5) ? ['logo.png'] : [],
      readBy: {}, simDay: day, labSim: true,
    }, label: { customerId: c.id, dealId, type: tpl.type, kind: 'richiesta', actor: { role: tpl.actor, uid: handler?.uid ?? null } } };
    events.push(ev);
    counts.emailIn++;
    if (r.chance(0.6)) addReply(ev, handler, tpl.reply, dealId);
  }

  // 2. Prospect già in anagrafica che si fanno vivi.
  for (let i = 0; i < v.prospect && prospects.length; i++) {
    const c = r.pick(prospects);
    const tpl = r.pick(PROSPECT_TEMPLATES);
    const owner = members.find(m => m.uid === c.ownerUid);
    const box = boxOf(owner?.uid ?? null);
    if (!box) continue;
    const at = officeTime(dayStart, weekday, r);
    const id = nextId('i');
    const ev: Extract<PlanEvent, { kind: 'email' }> = { id, at, kind: 'email', email: {
      threadId: `thr-${id}`, inReplyTo: null, direction: 'in', date: new Date(at).toISOString(), dateMs: at,
      from: { name: c.contactName || c.company, email: c.email }, to: [{ name: box.displayName, email: box.address }], cc: [],
      subject: tpl.subject, body: `${r.pick(HELLO)}\n${tpl.body(r)}${signature(c.contactName, c.company)}`,
      attachments: [], readBy: {}, simDay: day, labSim: true,
    }, label: { customerId: c.id, dealId: null, type: 'informazioni', kind: 'richiesta', actor: { role: 'commerciale', uid: owner?.uid ?? null } } };
    events.push(ev);
    counts.emailIn++;
    if (r.chance(0.5)) addReply(ev, owner ?? colleague('commerciale'), 'grazie per averci contattato. In allegato il catalogo, la chiamo domani per capire meglio le vostre esigenze.', null);
  }

  // 3. Nuovi prospect dal modulo del sito: nuova scheda + email alla casella generale.
  for (let i = 0; i < v.newProspect && info; i++) {
    const at = officeTime(dayStart, weekday, r);
    const first = r.pick(FIRST), last = r.pick(LAST);
    const company = `${r.pick(PRE)} ${r.pick(LAST)} ${r.pick(['Srl', 'Snc', 'Sas'])}`;
    const cid = nextId('p');
    const email = `${slug(first)}.${slug(last)}@${slug(company.replace(/ (Srl|Snc|Sas)$/, ''))}.it`;
    events.push({ id: cid, at, kind: 'contact', contact: {
      id: cid, company, customerType: 'end-user', contactName: `${first} ${last}`, role: 'Titolare', email, phone: `0${r.int(30, 39)} 555 ${r.int(1000, 9999)}`,
      city: r.pick(TOWNS), country: 'Italia', website: `www.${email.split('@')[1]}`, status: 'potenziale', segment: 'end-user', sector: 'industria', region: 'Lombardia',
      stakeholders: [], notes: 'Contatto arrivato dal modulo del sito.', ownerUid: null, labSim: true, createdAt: at, updatedAt: at, createdBy: null, updatedBy: null,
    } });
    counts.newProspects++;
    const tpl = r.pick(PROSPECT_TEMPLATES);
    const id = nextId('i');
    events.push({ id, at: at + MIN, kind: 'email', email: {
      threadId: `thr-${id}`, inReplyTo: null, direction: 'in', date: new Date(at + MIN).toISOString(), dateMs: at + MIN,
      from: { name: `${first} ${last}`, email }, to: [{ name: info.displayName, email: info.address }], cc: [],
      subject: `[Modulo sito] ${tpl.subject}`, body: `${r.pick(HELLO)}\n${tpl.body(r)}${signature(`${first} ${last}`, company)}`,
      attachments: [], readBy: {}, simDay: day, labSim: true,
    }, label: { customerId: cid, dealId: null, type: 'informazioni', kind: 'richiesta', actor: { role: 'commerciale', uid: null } } });
    counts.emailIn++;
  }

  // 4. Opportunità aperte che avanzano (o si chiudono).
  const open = deals.filter(d => !d.stage.startsWith('chiuso'));
  const touched = new Set<string>();
  for (let i = 0; i < v.advance && open.length; i++) {
    const d = r.pick(open);
    if (touched.has(d.id)) continue;
    touched.add(d.id);
    const at = officeTime(dayStart, weekday, r);
    const stage = d.stage === 'negoziazione' ? (r.chance(0.6) ? 'chiuso-vinto' : 'chiuso-perso') : STAGE_NEXT[d.stage] ?? 'qualificato';
    const closed = stage.startsWith('chiuso');
    events.push({ id: nextId('u'), at, kind: 'deal-update', dealId: d.id, updates: {
      stage, probability: STAGE_PROB[stage], updatedAt: at, updatedBy: d.ownerUid,
      nextAction: closed ? '' : stage === 'proposta' ? 'Inviare l\'offerta' : stage === 'negoziazione' ? 'Richiamare per la trattativa' : 'Fissare una visita',
      nextActionDeadline: at + r.int(2, 7) * 24 * HOUR, ...(closed ? { closedAt: at } : {}),
    } });
    counts.dealsAdvanced++;
  }

  // 5. Rumore: newsletter e notifiche a colleghi a caso.
  const personal = mailboxes.filter(m => m.kind === 'personal');
  for (let i = 0; i < v.noise && personal.length; i++) {
    const at = dayStart + r.int(6 * 60, 22 * 60) * MIN;
    const box = r.pick(personal);
    const tpl = r.pick(NOISE);
    const id = nextId('n');
    events.push({ id, at, kind: 'email', email: {
      threadId: null, inReplyTo: null, direction: 'in', date: new Date(at).toISOString(), dateMs: at,
      from: tpl.from, to: [{ name: box.displayName, email: box.address }], cc: [], subject: tpl.subject, body: tpl.body,
      attachments: [], readBy: {}, simDay: day, labSim: true,
    }, label: { customerId: null, dealId: null, type: 'newsletter', kind: 'nessuna', actor: null } });
    counts.noise++;
  }

  events.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return { version: SIM_VERSION, day, events, summary: counts };
}

/** Eventi del piano già "accaduti" e non ancora applicati. */
export function dueEvents(plan: DayPlan, applied: string[], now: number): PlanEvent[] {
  const done = new Set(applied);
  return plan.events.filter(e => e.at <= now && !done.has(e.id));
}

/** Giorno locale AAAA-MM-GG e la sua mezzanotte. */
export function localDay(ms: number): { day: string; start: number } {
  const d = new Date(ms);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const p = (x: number) => String(x).padStart(2, '0');
  return { day: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, start };
}

/** Giorni da simulare: dal giorno dopo l'ultimo completato fino a oggi, al massimo `max`. */
export function daysToRun(lastCompleteDay: string | null, now: number, max = 14): { day: string; start: number }[] {
  const today = localDay(now);
  const out: { day: string; start: number }[] = [];
  for (let i = max - 1; i >= 0; i--) {
    const d = localDay(today.start - i * 24 * HOUR + 12 * HOUR);
    if (!lastCompleteDay || d.day > lastCompleteDay || d.day === today.day) out.push(d);
  }
  return lastCompleteDay ? out : [today];
}
