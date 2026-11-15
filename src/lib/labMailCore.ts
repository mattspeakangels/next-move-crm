// Logica pura della posta del laboratorio (nessun Firebase): chi deve leggere cosa.
// Testata in tests/lab-mail.test.mjs.

export interface MailAddress { name: string; email: string }

export interface LabEmail {
  id: string;
  threadId: string | null;
  inReplyTo: string | null;
  direction: 'in' | 'out' | 'internal';
  date: string;
  dateMs: number;
  from: MailAddress;
  to: MailAddress[];
  cc: MailAddress[];
  subject: string;
  body: string;
  attachments: string[];
  readBy?: Record<string, boolean>;
  simulatedLive?: boolean;
}

/** Casella Outlook collegata: una per membro (id = uid) più 'info', la casella generale. */
export interface Mailbox {
  id: string;
  uid: string | null;
  address: string;
  displayName: string;
  provider: 'outlook';
  kind: 'personal' | 'shared';
  simulated: boolean;
  connectedAt: number;
  lastSyncAt: number;
}

export interface ContactRef { id: string; company: string; status: 'potenziale' | 'cliente'; emails: string[]; domain?: string }

/** Mansioni che leggono anche la casella generale (primi contatti, prospect senza commerciale). */
const SHARED_READERS = new Set(['owner', 'admin', 'sales', 'bdr']);

const norm = (s: string) => s.trim().toLowerCase();

/** Indirizzi di cui una persona è responsabile: la sua casella e, per i commerciali, la generale. */
export function addressesFor(uid: string, role: string | null | undefined, mailboxes: Mailbox[]): string[] {
  const out = mailboxes.filter(m => m.uid === uid).map(m => norm(m.address));
  if (SHARED_READERS.has(role ?? '')) out.push(...mailboxes.filter(m => m.kind === 'shared').map(m => norm(m.address)));
  return out;
}

/** 'to' se la email è indirizzata a uno di quegli indirizzi, 'cc' se è solo in copia, null se non riguarda. */
export function relevance(mail: LabEmail, addresses: string[]): 'to' | 'cc' | 'from' | null {
  const set = new Set(addresses.map(norm));
  if (mail.to.some(a => set.has(norm(a.email)))) return 'to';
  if (mail.cc.some(a => set.has(norm(a.email)))) return 'cc';
  if (set.has(norm(mail.from.email))) return 'from';
  return null;
}

/** Email di competenza: arrivate a me (destinatario o in copia), dalla più recente. */
export function inboxFor(mails: LabEmail[], addresses: string[], opts: { includeSent?: boolean } = {}): LabEmail[] {
  return mails
    .filter(m => {
      const r = relevance(m, addresses);
      return r === 'to' || r === 'cc' || (opts.includeSent && r === 'from');
    })
    .sort((a, b) => b.dateMs - a.dateMs);
}

export const isUnread = (mail: LabEmail, uid: string) => mail.direction !== 'out' && !mail.readBy?.[uid];

/** Cliente o prospect del mittente: per indirizzo esatto, altrimenti per dominio aziendale. */
export function matchContact(mail: LabEmail, contacts: ContactRef[]): ContactRef | null {
  const sender = norm(mail.direction === 'out' ? mail.to[0]?.email ?? '' : mail.from.email);
  if (!sender) return null;
  const exact = contacts.find(c => c.emails.some(e => norm(e) === sender));
  if (exact) return exact;
  const domain = sender.split('@')[1];
  if (!domain || GENERIC.has(domain)) return null;
  return contacts.find(c => c.domain && norm(c.domain) === domain) ?? null;
}

const GENERIC = new Set(['gmail.com', 'libero.it', 'hotmail.it', 'yahoo.it', 'outlook.it', 'icloud.com']);

/** Dominio dal sito web salvato in anagrafica ("www.esempio.it" → "esempio.it"). */
export function domainFromWebsite(website?: string): string | undefined {
  if (!website) return undefined;
  const d = website.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return d || undefined;
}

export function relativeTime(ms: number, now: number): string {
  const min = Math.round((now - ms) / 60000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h fa`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ieri';
  if (d < 7) return `${d} giorni fa`;
  return new Date(ms).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}
