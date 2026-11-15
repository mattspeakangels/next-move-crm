// Motore della giornata simulata del laboratorio: applica il piano del giorno
// (src/lib/labSimCore.ts) man mano che gli orari passano, come se l'azienda lavorasse.
//
// Gira nel browser di chi usa il laboratorio. Se nessuno apre l'app per qualche giorno,
// alla prima apertura recupera i giorni mancanti (massimo 14) con gli orari giusti.
// Ogni giorno ha un documento labSim/day-AAAAMMGG con piano ed eventi già applicati,
// aggiornato in transazione: due persone collegate insieme non duplicano nulla.
import { useEffect, useState } from 'react';
import { getDoc, getDocs, onSnapshot, runTransaction, type DocumentReference } from 'firebase/firestore';
import { db } from './firebase';
import { colRef, docRef } from './paths';
import { useStore } from '../store/useStore';
import { useWorkspace } from './workspaceContext';
import type { Contact, Deal } from '../types';
import type { Mailbox } from './labMailCore';
import { daysToRun, dueEvents, localDay, planDay, SIM_VERSION, type DayPlan, type PlanEvent, type SimContact, type SimDeal, type SimMember } from './labSimCore';

const MAX_EVENTS_PER_TX = 120; // ogni email = 2 scritture; restiamo sotto il limite di 500
const TICK_MS = 5 * 60_000;

interface DayDoc { plan: DayPlan; applied: string[]; complete: boolean; updatedAt: number }

const dayRef = (day: string) => docRef('labSim', `day-${day.replace(/-/g, '')}`);
const stateRef = () => docRef('labSim', 'state');

type Owned = { ownerUid?: string | null };

function snapshotInputs(members: SimMember[], mailboxes: Mailbox[]) {
  const { contacts, deals } = useStore.getState();
  const simContacts: SimContact[] = (Object.values(contacts) as (Contact & Owned)[])
    .filter(c => c.email)
    .map(c => ({ id: c.id, company: c.company, status: c.status, email: c.email, contactName: c.contactName, ownerUid: c.ownerUid ?? null }));
  const simDeals: SimDeal[] = (Object.values(deals) as (Deal & Owned)[])
    .map(d => ({ id: d.id, contactId: d.contactId, stage: d.stage, ownerUid: d.ownerUid ?? null, value: d.value }));
  return { contacts: simContacts, deals: simDeals, members, mailboxes };
}

function write(tx: Parameters<Parameters<typeof runTransaction>[1]>[0], ev: PlanEvent) {
  if (ev.kind === 'email') {
    tx.set(docRef('emails', ev.id), { ...ev.email, mailbox: 'sim' });
    tx.set(docRef('email_labels', ev.id), { ...ev.label, labSim: true });
  } else if (ev.kind === 'contact') {
    tx.set(docRef('contacts', ev.id), ev.contact);
  } else if (ev.kind === 'deal-new') {
    tx.set(docRef('deals', ev.id), ev.deal);
  } else {
    tx.set(docRef('deals', ev.dealId), ev.updates, { merge: true });
  }
}

/** Applica gli eventi maturati di un giorno. Restituisce quanti ne ha applicati e se il giorno è finito. */
async function runDay(day: string, start: number, now: number, members: SimMember[], mailboxes: Mailbox[], wid: string) {
  const ref = dayRef(day) as DocumentReference;
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const existing = snap.exists() ? (snap.data() as DayDoc) : null;
    const plan = existing?.plan ?? planDay({ wid, day, dayStart: start, ...snapshotInputs(members, mailboxes) });
    const applied = existing?.applied ?? [];
    const due = dueEvents(plan, applied, now).slice(0, MAX_EVENTS_PER_TX);
    for (const ev of due) write(tx, ev);
    const nowApplied = [...applied, ...due.map(e => e.id)];
    const complete = nowApplied.length >= plan.events.length;
    tx.set(ref, { plan, applied: nowApplied, complete, updatedAt: now } satisfies DayDoc);
    return { applied: due.length, complete };
  });
}

/** Un giro del motore: recupera i giorni arretrati e applica quelli di oggi già maturati. */
export async function runLabSimulation(wid: string, members: SimMember[]): Promise<number> {
  const now = Date.now();
  const mailboxes = (await getDocs(colRef('mailboxes'))).docs.map(d => ({ ...(d.data() as Omit<Mailbox, 'id'>), id: d.id }));
  if (!mailboxes.length) return 0;
  const state = await getDoc(stateRef());
  const last = state.exists() ? (state.data().lastCompleteDay as string | null) ?? null : null;
  const today = localDay(now).day;
  let total = 0;
  for (const { day, start } of daysToRun(last, now)) {
    // Un giorno passato può richiedere più transazioni se gli eventi sono tanti.
    for (let guard = 0; guard < 10; guard++) {
      const r = await runDay(day, start, now, members, mailboxes, wid);
      total += r.applied;
      if (r.complete || r.applied === 0) {
        if (r.complete && day < today) {
          await runTransaction(db, async tx => {
            const s = await tx.get(stateRef());
            const prev = s.exists() ? (s.data().lastCompleteDay as string | null) : null;
            if (!prev || day > prev) tx.set(stateRef(), { lastCompleteDay: day, version: SIM_VERSION, updatedAt: Date.now() }, { merge: true });
          });
        }
        break;
      }
    }
  }
  if (!last) await runTransaction(db, async tx => {
    const s = await tx.get(stateRef());
    if (!s.exists()) tx.set(stateRef(), { lastCompleteDay: localDay(now - 24 * 3600_000).day, startedAt: now, version: SIM_VERSION });
  });
  return total;
}

const ROLE_FOR_SIM: Record<string, string> = { owner: 'sales', admin: 'admin', sales: 'sales', bdr: 'sales', customer_service: 'customer_service', graphics: 'graphics' };

/** Avvia il motore quando lo spazio e i dati sono pronti; poi un giro ogni 5 minuti. */
export function useLabDailySim(enabled: boolean) {
  const { workspace, members, status } = useWorkspace();
  const loaded = useStore(s => Object.keys(s.contacts).length > 0);
  const wid = workspace?.id;
  const ready = enabled && status === 'ready' && !!wid && loaded && members.length > 0;
  const memberKey = members.map(m => `${m.uid}:${m.role}`).join(',');
  useEffect(() => {
    if (!ready || !wid) return;
    // I titolari reali (admin aggiunti a mano) non ricevono email simulate: solo i colleghi fittizi.
    const simMembers: SimMember[] = members.filter(m => m.status === 'active' && m.email.endsWith('@syrio-lab.test'))
      .map(m => ({ uid: m.uid, displayName: m.displayName, role: ROLE_FOR_SIM[m.role] ?? m.role }));
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        const n = await runLabSimulation(wid, simMembers);
        if (n) console.info(`[laboratorio] giornata simulata: ${n} eventi applicati`);
      } catch (err) { console.warn('[laboratorio] simulazione non riuscita:', err); }
      finally { running = false; }
    };
    void tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
    // memberKey riassume members: evita di ripartire a ogni snapshot identico
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, wid, memberKey]);
}

/** Riepilogo della giornata simulata di oggi (per l'intestazione della casella). */
export function useLabSimToday(): { summary: Record<string, number> | null; applied: number; total: number } {
  const [s, setS] = useState<{ summary: Record<string, number> | null; applied: number; total: number }>({ summary: null, applied: 0, total: 0 });
  useEffect(() => onSnapshot(dayRef(localDay(Date.now()).day), snap => {
    if (!snap.exists()) return;
    const d = snap.data() as DayDoc;
    setS({ summary: d.plan.summary, applied: d.applied.length, total: d.plan.events.length });
  }, () => undefined), []);
  return s;
}
