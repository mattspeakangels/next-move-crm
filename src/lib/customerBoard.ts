// Dati della lavagna "Attività con il cliente" (laboratorio).
import { useEffect, useMemo, useState } from 'react';
import { getDoc, getDocs, query, where } from 'firebase/firestore';
import { colRef, docRef } from './paths';
import { useStore } from '../store/useStore';
import { useWorkspace } from './workspaceContext';
import { useContactRefs, useLabEmails, useMailboxes } from './labMail';
import { matchContact, type LabEmail } from './labMailCore';
import { buildBoard, type Board, type BoardDeal } from './customerBoardCore';
import type { Deal } from '../types';

type Extra = { closedAt?: number; offerRef?: string; ownerUid?: string | null };

export function useCustomerBoard(contactId: string | null): { board: Board | null; loading: boolean } {
  const { members } = useWorkspace();
  const mailboxes = useMailboxes();
  const contacts = useContactRefs();
  const { emails: recent, loading: recentLoading } = useLabEmails(!!contactId);
  const storeDeals = useStore(s => s.deals);
  const storeOffers = useStore(s => s.offers);
  const storeActivities = useStore(s => s.activities);
  const [labelled, setLabelled] = useState<{ emails: LabEmail[]; types: Record<string, string>; loading: boolean }>({ emails: [], types: {}, loading: true });

  // Tutte le email etichettate con questo cliente (anche quelle oltre le più recenti caricate).
  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    setLabelled(s => ({ ...s, loading: true }));
    (async () => {
      const labels = await getDocs(query(colRef('email_labels'), where('customerId', '==', contactId)));
      const types: Record<string, string> = {};
      labels.docs.forEach(d => { types[d.id] = String(d.data().type ?? ''); });
      const docs = await Promise.all(labels.docs.map(d => getDoc(docRef('emails', d.id))));
      const emails = docs.filter(d => d.exists()).map(d => ({ ...(d.data() as Omit<LabEmail, 'id'>), id: d.id }));
      if (!cancelled) setLabelled({ emails, types, loading: false });
    })().catch(err => { console.warn('Storico email non caricato:', err); if (!cancelled) setLabelled(s => ({ ...s, loading: false })); });
    return () => { cancelled = true; };
  }, [contactId]);

  const board = useMemo(() => {
    if (!contactId) return null;
    // Email recenti riconosciute per mittente (anche nuove, non ancora etichettate)
    const matched = recent.filter(m => matchContact(m, contacts)?.id === contactId);
    const byId = new Map<string, LabEmail>();
    for (const m of [...labelled.emails, ...matched]) byId.set(m.id, m);
    const deals: BoardDeal[] = (Object.values(storeDeals) as (Deal & Extra)[]).filter(d => d.contactId === contactId).map(d => ({
      id: d.id, stage: d.stage, value: d.value, createdAt: d.createdAt, closedAt: d.closedAt, notes: d.notes, offerRef: d.offerRef, products: d.products, ownerUid: d.ownerUid ?? null,
    }));
    return buildBoard({
      emails: [...byId.values()], emailTypes: labelled.types, deals,
      offers: Object.values(storeOffers).filter(o => o.contactId === contactId).map(o => ({ id: o.id, date: o.date, status: o.status, totalAmount: o.totalAmount })),
      activities: Object.values(storeActivities).filter(a => a.contactId === contactId || a.contactIds?.includes(contactId))
        .map(a => ({ id: a.id, type: a.type, date: a.date, outcome: a.outcome, notes: a.notes })),
      mailboxes, members: members.map(m => ({ uid: m.uid, displayName: m.displayName, role: m.role })), now: Date.now(),
    });
  }, [contactId, recent, contacts, labelled, storeDeals, storeOffers, storeActivities, mailboxes, members]);

  return { board, loading: labelled.loading || recentLoading };
}
