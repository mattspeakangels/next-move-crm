import { useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store/useStore';

const COLLECTIONS = ['contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions'] as const;

export function useFirestoreSync(userId: string) {
  const isLoadingRef = useRef(false);

  useEffect(() => {
    async function loadFromFirestore() {
      isLoadingRef.current = true;
      const updates: Record<string, any> = {};

      for (const col of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, 'users', userId, col));
        const data: Record<string, any> = {};
        snapshot.forEach((d) => { data[d.id] = d.data(); });
        updates[col] = data;
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
            setDoc(doc(db, 'users', userId, col, id), data, { merge: true });
          }
        }

        for (const id of Object.keys(prev)) {
          if (!curr[id]) {
            deleteDoc(doc(db, 'users', userId, col, id));
          }
        }
      }
    });

    return unsubscribe;
  }, [userId]);
}
