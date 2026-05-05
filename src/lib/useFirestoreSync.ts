import { useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store/useStore';
import { logAuditEvent } from './auditLog';

const COLLECTIONS = ['contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions', 'checkIns'] as const;

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

        // Smart merge: prefer Firestore data, but keep localStorage data for items not in Firestore
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

    return unsubscribe;
  }, [userId]);
}
