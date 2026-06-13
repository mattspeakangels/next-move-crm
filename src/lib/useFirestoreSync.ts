import { useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store/useStore';
import { logAuditEvent } from './auditLog';

const COLLECTIONS = ['contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions', 'checkIns'] as const;

export function useFirestoreSync(userId: string) {
  // Flag to prevent writing back to Firestore changes that originated from Firestore
  const fromFirestoreRef = useRef(false);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    for (const col of COLLECTIONS) {
      const colRef = collection(db, 'users', userId, col);

      const unsub = onSnapshot(colRef, (snapshot) => {
        const firestoreData: Record<string, any> = {};
        snapshot.forEach((d) => { firestoreData[d.id] = d.data(); });

        // Mark update as coming from Firestore so the store subscriber skips it
        fromFirestoreRef.current = true;
        useStore.setState((state) => {
          const localData = (state as any)[col] as Record<string, any>;
          // Firestore is the source of truth: replace collection entirely
          const merged = { ...localData };
          for (const [id, data] of Object.entries(firestoreData)) {
            merged[id] = data;
          }
          return { [col]: merged };
        });
        fromFirestoreRef.current = false;
      }, (error) => {
        console.error(`Firestore sync error on ${col}:`, error);
      });

      unsubscribers.push(unsub);
    }

    // Write local store changes back to Firestore (skip changes that came FROM Firestore)
    const storeUnsub = useStore.subscribe((state, prevState) => {
      if (fromFirestoreRef.current) return;

      for (const col of COLLECTIONS) {
        const curr = (state as any)[col] as Record<string, any>;
        const prev = (prevState as any)[col] as Record<string, any>;

        if (curr === prev) continue;

        for (const [id, data] of Object.entries(curr)) {
          if (curr[id] !== prev[id]) {
            const isNew = !prev[id];
            setDoc(doc(db, 'users', userId, col, id), data, { merge: true });
            if (isNew) {
              logAuditEvent(userId, col, id, 'CREATE', {}, data);
            } else {
              logAuditEvent(userId, col, id, 'UPDATE', prev[id], data);
            }
          }
        }

        for (const id of Object.keys(prev)) {
          if (!curr[id]) {
            deleteDoc(doc(db, 'users', userId, col, id));
            logAuditEvent(userId, col, id, 'DELETE', prev[id], {});
          }
        }
      }
    });

    return () => {
      unsubscribers.forEach(u => u());
      storeUnsub();
    };
  }, [userId]);
}
