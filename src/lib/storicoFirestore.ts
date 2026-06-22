import { db } from './firebase';
import {
  doc, getDoc, getDocs,
  collection, writeBatch,
} from 'firebase/firestore';
import { ClienteRecord, ClienteDettagliato, StoricoBudget } from '../store/storicoStore';

const BATCH_LIMIT = 450;

interface StoricoMeta {
  clienti: ClienteRecord[];
  anni: string[];
  fileName: string;
  budget: StoricoBudget;
  updatedAt: number;
}

async function runBatch(ops: { ref: ReturnType<typeof doc>; data: object | null }[]) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + BATCH_LIMIT)) {
      if (op.data === null) batch.delete(op.ref);
      else batch.set(op.ref, op.data);
    }
    await batch.commit();
  }
}

export async function saveStoricoToFirestore(
  userId: string,
  clienti: ClienteRecord[],
  anni: string[],
  fileName: string,
  budget: StoricoBudget,
  clientiDettagliati: ClienteDettagliato[],
) {
  const meta: StoricoMeta = { clienti, anni, fileName, budget, updatedAt: Date.now() };
  const ops = [
    { ref: doc(db, 'users', userId, 'storico', 'meta'), data: meta as object },
    ...clientiDettagliati.map(c => ({
      ref: doc(db, 'users', userId, 'storico_dettagliati', String(c.clientId)),
      data: c as object,
    })),
  ];
  await runBatch(ops);
}

export async function loadStoricoFromFirestore(userId: string): Promise<{
  clienti: ClienteRecord[];
  clientiDettagliati: ClienteDettagliato[];
  anni: string[];
  fileName: string;
  budget: StoricoBudget;
} | null> {
  const metaSnap = await getDoc(doc(db, 'users', userId, 'storico', 'meta'));
  if (!metaSnap.exists()) return null;

  const meta = metaSnap.data() as StoricoMeta;
  const detSnap = await getDocs(collection(db, 'users', userId, 'storico_dettagliati'));
  const clientiDettagliati = detSnap.docs.map(d => d.data() as ClienteDettagliato);

  return {
    clienti: meta.clienti,
    anni: meta.anni,
    fileName: meta.fileName,
    budget: meta.budget,
    clientiDettagliati,
  };
}

export async function deleteStoricoFromFirestore(userId: string) {
  const metaRef = doc(db, 'users', userId, 'storico', 'meta');
  const metaSnap = await getDoc(metaRef);
  const detSnap = await getDocs(collection(db, 'users', userId, 'storico_dettagliati'));

  const ops: { ref: ReturnType<typeof doc>; data: null }[] = [
    { ref: metaRef, data: null },
    ...detSnap.docs.map(d => ({ ref: d.ref as ReturnType<typeof doc>, data: null as null })),
  ];
  if (metaSnap.exists() || detSnap.docs.length > 0) await runBatch(ops);
}
