import { useEffect, useRef } from 'react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store/useStore';
import { logAuditEvent } from './auditLog';

const COLLECTIONS = ['contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions', 'checkIns'] as const;

// Firestore WriteBatch ha un limite di 500 operazioni per batch
const BATCH_SIZE = 400;

async function flushWrites(
  userId: string,
  col: string,
  changes: { id: string; data: any }[],
  deletes: string[],
) {
  const allOps = [
    ...changes.map(c => ({ type: 'set' as const, id: c.id, data: c.data })),
    ...deletes.map(id => ({ type: 'del' as const, id, data: null })),
  ];

  for (let i = 0; i < allOps.length; i += BATCH_SIZE) {
    const chunk = allOps.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      const ref = doc(db, 'users', userId, col, op.id);
      if (op.type === 'set') batch.set(ref, op.data, { merge: true });
      else batch.delete(ref);
    }
    await batch.commit();
  }
}

export function useFirestoreSync(userId: string) {
  const isLoadingRef = useRef(false);

  useEffect(() => {
    async function loadFromFirestore() {
      isLoadingRef.current = true;
      const updates: Record<string, any> = {};
      const currentState = useStore.getState();

      for (const col of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, 'users', userId, col));
        const firestoreData: Record<string, any> = {};
        snapshot.forEach((d) => { firestoreData[d.id] = d.data(); });

        const localData = (currentState as any)[col] || {};
        const merged = { ...localData };
        for (const [id, data] of Object.entries(firestoreData)) {
          merged[id] = data;
        }
        updates[col] = merged;

        if (Object.keys(localData).length > 0 || Object.keys(firestoreData).length > 0) {
          console.log(`Firestore sync ${col}:`, {
            local: Object.keys(localData).length,
            firestore: Object.keys(firestoreData).length,
            merged: Object.keys(merged).length,
          });
        }
      }

      useStore.setState(updates);
      isLoadingRef.current = false;
    }

    loadFromFirestore();

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (isLoadingRef.current) return;

      for (const col of COLLECTIONS) {
        const curr = (state as any)[col] as Record<string, any>;
        const prev = (prevState as any)[col] as Record<string, any>;

        if (curr === prev) continue;

        const changes: { id: string; data: any; isNew: boolean }[] = [];
        const deletes: string[] = [];

        for (const [id, data] of Object.entries(curr)) {
          if (curr[id] !== prev[id]) {
            changes.push({ id, data, isNew: !prev[id] });
          }
        }
        for (const id of Object.keys(prev)) {
          if (!curr[id]) deletes.push(id);
        }

        if (changes.length === 0 && deletes.length === 0) continue;

        // Batch su Firestore (chunked per rispettare il limite 500)
        flushWrites(userId, col, changes.map(c => ({ id: c.id, data: c.data })), deletes)
          .catch(err => console.error(`Firestore batch write failed [${col}]:`, err));

        // Audit log solo per modifiche singole (non per import massivi)
        if (changes.length <= 5) {
          for (const { id, data, isNew } of changes) {
            if (isNew) logAuditEvent(userId, col, id, 'CREATE', {}, data);
            else logAuditEvent(userId, col, id, 'UPDATE', prev[id], data);
          }
        }
        for (const id of deletes) {
          logAuditEvent(userId, col, id, 'DELETE', prev[id], {});
        }
      }
    });

    return unsubscribe;
  }, [userId]);
}
