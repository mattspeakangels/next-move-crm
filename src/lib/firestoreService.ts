import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTIONS = ['contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions'] as const;
export type CollectionName = typeof COLLECTIONS[number];

export function upsertDoc(userId: string, col: CollectionName, id: string, data: object) {
  return setDoc(doc(db, 'users', userId, col, id), data, { merge: true });
}

export function deleteFirestoreDoc(userId: string, col: CollectionName, id: string) {
  return deleteDoc(doc(db, 'users', userId, col, id));
}
