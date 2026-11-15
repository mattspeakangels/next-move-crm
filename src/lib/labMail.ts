// Posta del laboratorio: caselle Outlook simulate, email in arrivo, simulazione di nuove email.
// Usata solo da viste raggiungibili con l'interruttore emailInbox (src/lib/features.ts).
import { useEffect, useMemo, useState } from 'react';
import { limit, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { colRef, docRef } from './paths';
import { useStore } from '../store/useStore';
import type { Contact } from '../types';
import { domainFromWebsite, type ContactRef, type LabEmail, type Mailbox } from './labMailCore';

const MAX_EMAILS = 1000;

export function useLabEmails(enabled = true): { emails: LabEmail[]; loading: boolean; error: string } {
  const [state, setState] = useState<{ emails: LabEmail[]; loading: boolean; error: string }>({ emails: [], loading: true, error: '' });
  useEffect(() => {
    if (!enabled) return;
    const q = query(colRef('emails'), orderBy('dateMs', 'desc'), limit(MAX_EMAILS));
    return onSnapshot(q,
      snap => setState({ emails: snap.docs.map(d => ({ ...(d.data() as Omit<LabEmail, 'id'>), id: d.id })), loading: false, error: '' }),
      err => setState(s => ({ ...s, loading: false, error: err.message })));
  }, [enabled]);
  return state;
}

export function useMailboxes(): Mailbox[] {
  const [boxes, setBoxes] = useState<Mailbox[]>([]);
  useEffect(() => onSnapshot(colRef('mailboxes'),
    snap => setBoxes(snap.docs.map(d => ({ ...(d.data() as Omit<Mailbox, 'id'>), id: d.id }))),
    err => console.warn('Caselle non caricate:', err.message)), []);
  return boxes;
}

type SeededContact = Contact & { ownerUid?: string | null };

/** Clienti e prospect in forma compatta per riconoscere il mittente. */
export function useContactRefs(): ContactRef[] {
  const contacts = useStore(s => s.contacts);
  return useMemo(() => Object.values(contacts).map((c: Contact) => ({
    id: c.id, company: c.company, status: c.status,
    emails: [c.email, ...(c.stakeholders ?? []).map(s => s.email ?? '')].filter(Boolean),
    domain: domainFromWebsite(c.website),
  })), [contacts]);
}

export const markRead = (mailId: string, uid: string) =>
  updateDoc(docRef('emails', mailId), { [`readBy.${uid}`]: true });

// ─── simulazione di email in arrivo ───────────────────────────────────────────

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

const CLIENT_MAILS: [string, string][] = [
  ['Richiesta offerta', 'vorremmo ricevere la vostra migliore offerta per 40 polo in piquet e 20 felpe con zip, taglie dalla S alla XXL.'],
  ['Sollecito consegna', 'a che punto è la nostra consegna? Ci servirebbe entro venerdì.'],
  ['Ordine', 'confermiamo l\'ordine come da vostra ultima offerta. Vi mando il PDF firmato in giornata.'],
  ['Logo su capi', 'vi mando il logo da ricamare sul petto a sinistra delle giacche softshell. Ci mandate un rendering?'],
  ['Capi difettosi', 'abbiamo ricevuto la merce ma 8 pantaloni hanno le cuciture aperte. Come procediamo?'],
  ['Listino aggiornato', 'ci mandate il listino aggiornato per l\'autunno?'],
];
const PROSPECT_MAILS: [string, string][] = [
  ['Richiesta informazioni', 'stiamo cercando un nuovo fornitore di abbigliamento da lavoro. Potete mandarci un catalogo?'],
  ['Contatto dal sito', 'abbiamo visto il vostro sito: ci interessano gilet alta visibilità per circa 30 dipendenti.'],
  ['Cerchiamo un fornitore', 'un collega ci ha dato il vostro contatto. Fate anche la personalizzazione con il logo?'],
  ['Preventivo scarpe', 'ci servirebbe un preventivo per 25 paia di scarpe antinfortunistiche S3.'],
];

/**
 * Simula l'arrivo di una email da un cliente o da un prospect, come se Outlook l'avesse appena
 * sincronizzata: va al commerciale del contatto, oppure alla casella generale se non ne ha uno.
 */
export async function simulateIncomingEmail(kind: 'cliente' | 'potenziale', mailboxes: Mailbox[]): Promise<LabEmail> {
  const all = Object.values(useStore.getState().contacts) as SeededContact[];
  const pool = all.filter(c => c.status === kind && c.email);
  if (!pool.length) throw new Error(kind === 'cliente' ? 'Nessun cliente con email.' : 'Nessun prospect con email.');
  const contact = pick(pool);
  const target = mailboxes.find(m => m.uid && m.uid === contact.ownerUid) ?? mailboxes.find(m => m.kind === 'shared');
  if (!target) throw new Error('Nessuna casella Outlook collegata nello spazio.');
  const [subject, text] = pick(kind === 'cliente' ? CLIENT_MAILS : PROSPECT_MAILS);
  const now = Date.now();
  const id = `live-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const mail: LabEmail = {
    id, threadId: null, inReplyTo: null, direction: 'in', date: new Date(now).toISOString(), dateMs: now,
    from: { name: contact.contactName || contact.company, email: contact.email },
    to: [{ name: target.displayName, email: target.address }], cc: [],
    subject, body: `${pick(['Buongiorno', 'Salve', 'Buongiorno,'])}\n${text}\n\n${pick(['Cordiali saluti', 'Grazie, saluti'])}\n${contact.contactName}\n${contact.company}`,
    attachments: [], readBy: {}, simulatedLive: true,
  };
  const { id: _omit, ...data } = mail;
  void _omit;
  await setDoc(docRef('emails', id), { ...data, mailbox: 'live', labSeed: true });
  return mail;
}
