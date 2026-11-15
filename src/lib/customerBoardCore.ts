// "Attività con il cliente": lavagna con tutto lo storico di un cliente (logica pura).
// Raccoglie email, opportunità, offerte e attività e le organizza per reparto e nel tempo.
// Testata in tests/customer-board.test.mjs.
import type { LabEmail, Mailbox } from './labMailCore';

export type Department = 'commerciale' | 'customer_service' | 'personalizzazione' | 'generale';
export const DEPARTMENTS: Department[] = ['commerciale', 'customer_service', 'personalizzazione', 'generale'];
export const DEPARTMENT_LABEL: Record<Department, string> = {
  commerciale: 'Commerciale', customer_service: 'Customer service', personalizzazione: 'Personalizzazione', generale: 'Casella generale',
};

export interface BoardMember { uid: string; displayName: string; role: string }
export interface BoardDeal { id: string; stage: string; value: number; createdAt: number; closedAt?: number; notes?: string; offerRef?: string; products?: string[]; ownerUid?: string | null }
export interface BoardOffer { id: string; date: number; status: string; totalAmount: number }
export interface BoardActivity { id: string; type: string; date: number; outcome?: string; notes?: string; createdBy?: string }

export interface BoardInput {
  emails: LabEmail[];
  /** Tipo di ogni email (offerta, ordine, personalizzazione, reclamo...), se noto. */
  emailTypes: Record<string, string>;
  deals: BoardDeal[];
  offers: BoardOffer[];
  activities: BoardActivity[];
  mailboxes: Mailbox[];
  members: BoardMember[];
  now: number;
}

export type TimelineKind = 'email' | 'deal-new' | 'deal-won' | 'deal-lost' | 'offer' | 'activity' | 'order' | 'work';
export interface TimelineItem { id: string; at: number; kind: TimelineKind; title: string; detail: string; department: Department | null; person: string | null }

export interface Conversation {
  threadId: string; subject: string; type: string; start: number; last: number; messages: number;
  department: Department | null; people: string[]; lastFrom: string; emailIds: string[];
}

export interface Work { threadId: string; subject: string; start: number; last: number; versions: number; approved: boolean; person: string | null }

export interface Board {
  kpi: { emails: number; conversations: number; lastContact: number | null; openDeals: number; openValue: number; wonValue: number; orders: number; complaints: number };
  departments: { department: Department; interactions: number; last: number | null; people: string[] }[];
  months: { key: string; label: string; counts: Record<Department, number> }[];
  latestEmails: LabEmail[];
  conversations: Conversation[];
  deals: BoardDeal[];
  orders: { id: string; at: number; title: string; person: string | null }[];
  works: Work[];
  timeline: TimelineItem[];
}

const ROLE_DEPARTMENT: Record<string, Department> = {
  owner: 'commerciale', admin: 'commerciale', sales: 'commerciale', bdr: 'commerciale',
  customer_service: 'customer_service', graphics: 'personalizzazione',
};
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const norm = (s: string) => s.trim().toLowerCase();

/** Tipo dell'email: dall'etichetta se c'è, altrimenti dall'oggetto. */
export function emailType(mail: LabEmail, known?: string): string {
  if (known) return known;
  const s = mail.subject.toLowerCase();
  if (/ordine/.test(s)) return 'ordine';
  if (/offert|preventiv|quotazion/.test(s)) return 'offerta';
  if (/logo|ricamo|rendering|personalizz/.test(s)) return 'personalizzazione';
  if (/reclam|difett|sbagliat|problema/.test(s)) return 'reclamo';
  if (/sollecit|notizie|aggiornamento/.test(s)) return 'sollecito';
  if (/rdo|mepa|cig|gara/.test(s)) return 'gara';
  return 'informazioni';
}

export function buildBoard(input: BoardInput): Board {
  const { emails, emailTypes, deals, offers, activities, mailboxes, members, now } = input;
  const boxByAddress = new Map(mailboxes.map(m => [norm(m.address), m]));
  const memberByUid = new Map(members.map(m => [m.uid, m]));
  /** Persona e reparto interni coinvolti in una email (chi scrive o chi riceve). */
  const internal = (mail: LabEmail): { department: Department | null; person: string | null } => {
    const addrs = mail.direction === 'out' ? [mail.from.email] : [...mail.to, ...mail.cc].map(a => a.email);
    for (const a of addrs) {
      const box = boxByAddress.get(norm(a));
      if (!box) continue;
      if (box.kind === 'shared') return { department: 'generale', person: box.displayName };
      const m = box.uid ? memberByUid.get(box.uid) : undefined;
      return { department: ROLE_DEPARTMENT[m?.role ?? ''] ?? 'commerciale', person: m?.displayName ?? box.displayName };
    }
    return { department: null, person: null };
  };
  const personName = (uid?: string | null) => (uid ? memberByUid.get(uid)?.displayName ?? null : null);

  const sorted = [...emails].sort((a, b) => b.dateMs - a.dateMs);
  const typeOf = (m: LabEmail) => emailType(m, emailTypes[m.id]);

  // Conversazioni (thread)
  const threads = new Map<string, LabEmail[]>();
  for (const m of sorted) {
    const key = m.threadId ?? m.id;
    threads.set(key, [...(threads.get(key) ?? []), m]);
  }
  const conversations: Conversation[] = [...threads.entries()].map(([threadId, list]) => {
    const asc = [...list].sort((a, b) => a.dateMs - b.dateMs);
    const people = [...new Set(asc.map(m => internal(m).person).filter((p): p is string => !!p))];
    const first = asc[0];
    return {
      threadId, subject: first.subject, type: typeOf(first), start: first.dateMs, last: asc[asc.length - 1].dateMs,
      messages: asc.length, department: internal(first).department, people, lastFrom: asc[asc.length - 1].from.name, emailIds: asc.map(m => m.id),
    };
  }).sort((a, b) => b.last - a.last);

  // Reparti
  const depStats = new Map<Department, { interactions: number; last: number | null; people: Set<string> }>(
    DEPARTMENTS.map(d => [d, { interactions: 0, last: null, people: new Set<string>() }]));
  for (const m of sorted) {
    const { department, person } = internal(m);
    if (!department) continue;
    const s = depStats.get(department)!;
    s.interactions++;
    s.last = Math.max(s.last ?? 0, m.dateMs);
    if (person) s.people.add(person);
  }

  // Ultimi 6 mesi per reparto
  const d0 = new Date(now);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(d0.getFullYear(), d0.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MESI[d.getMonth()], counts: { commerciale: 0, customer_service: 0, personalizzazione: 0, generale: 0 } as Record<Department, number> };
  });
  for (const m of sorted) {
    const d = new Date(m.dateMs);
    const slot = months.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    const dep = internal(m).department;
    if (slot && dep) slot.counts[dep]++;
  }

  // Ordini: email d'ordine del cliente + opportunità vinte
  const orders = [
    ...conversations.filter(c => c.type === 'ordine').map(c => ({ id: c.threadId, at: c.start, title: c.subject, person: c.people[0] ?? null })),
    ...deals.filter(d => d.stage === 'chiuso-vinto').map(d => ({ id: d.id, at: d.closedAt ?? d.createdAt, title: `Opportunità vinta${d.offerRef ? ` ${d.offerRef}` : ''} · € ${d.value.toLocaleString('it-IT')}`, person: personName(d.ownerUid) })),
  ].sort((a, b) => b.at - a.at);

  // Lavori fatti insieme: personalizzazioni con versioni del rendering
  const works: Work[] = conversations.filter(c => c.type === 'personalizzazione').map(c => {
    const msgs = c.emailIds.map(id => sorted.find(m => m.id === id)!).filter(Boolean);
    const versions = new Set(msgs.flatMap(m => m.attachments).filter(a => /rendering/i.test(a))).size;
    const approved = msgs.some(m => m.direction === 'in' && /procedete|approvat|va benissimo|perfetto/i.test(m.body.split('\n\n')[0] ?? m.body));
    return { threadId: c.threadId, subject: c.subject, start: c.start, last: c.last, versions, approved, person: c.people.find(p => p) ?? null };
  });

  // Storico completo
  const timeline: TimelineItem[] = [
    ...conversations.map(c => ({
      id: `t-${c.threadId}`, at: c.start, kind: (c.type === 'ordine' ? 'order' : c.type === 'personalizzazione' ? 'work' : 'email') as TimelineKind,
      title: c.subject, detail: `${c.messages} ${c.messages === 1 ? 'messaggio' : 'messaggi'}${c.people.length ? ` · ${c.people.join(', ')}` : ''}`,
      department: c.department, person: c.people[0] ?? null,
    })),
    ...deals.map(d => ({ id: `dn-${d.id}`, at: d.createdAt, kind: 'deal-new' as const, title: 'Nuova opportunità', detail: `${(d.notes ?? '').split('\n')[0]} · € ${d.value.toLocaleString('it-IT')}`, department: 'commerciale' as const, person: personName(d.ownerUid) })),
    ...deals.filter(d => d.stage.startsWith('chiuso') && d.closedAt).map(d => ({
      id: `dc-${d.id}`, at: d.closedAt!, kind: (d.stage === 'chiuso-vinto' ? 'deal-won' : 'deal-lost') as TimelineKind,
      title: d.stage === 'chiuso-vinto' ? 'Opportunità vinta' : 'Opportunità persa', detail: `€ ${d.value.toLocaleString('it-IT')}`, department: 'commerciale' as const, person: personName(d.ownerUid),
    })),
    ...offers.map(o => ({ id: `of-${o.id}`, at: o.date, kind: 'offer' as const, title: `Offerta ${o.status}`, detail: `€ ${o.totalAmount.toLocaleString('it-IT')}`, department: 'commerciale' as const, person: null })),
    ...activities.map(a => ({ id: `ac-${a.id}`, at: a.date, kind: 'activity' as const, title: a.type, detail: a.outcome || a.notes || '', department: null, person: personName(a.createdBy) })),
  ].sort((a, b) => b.at - a.at);

  const open = deals.filter(d => !d.stage.startsWith('chiuso'));
  return {
    kpi: {
      emails: emails.length, conversations: conversations.length, lastContact: sorted[0]?.dateMs ?? null,
      openDeals: open.length, openValue: open.reduce((s, d) => s + d.value, 0),
      wonValue: deals.filter(d => d.stage === 'chiuso-vinto').reduce((s, d) => s + d.value, 0),
      orders: orders.length, complaints: conversations.filter(c => c.type === 'reclamo').length,
    },
    departments: DEPARTMENTS.map(department => {
      const s = depStats.get(department)!;
      return { department, interactions: s.interactions, last: s.last, people: [...s.people] };
    }),
    months, latestEmails: sorted.slice(0, 6), conversations, deals: [...deals].sort((a, b) => b.createdAt - a.createdAt), orders, works, timeline,
  };
}

/** Raggruppa lo storico per mese ("novembre 2026"). */
export function groupByMonth(items: TimelineItem[]): { label: string; items: TimelineItem[] }[] {
  const out: { label: string; items: TimelineItem[] }[] = [];
  for (const it of items) {
    const label = new Date(it.at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const last = out[out.length - 1];
    if (last?.label === label) last.items.push(it); else out.push({ label, items: [it] });
  }
  return out;
}
