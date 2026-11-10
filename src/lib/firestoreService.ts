import { setDoc, deleteDoc } from 'firebase/firestore';
import { docRef, type DataCollection } from './paths';

export type CollectionName = DataCollection;

export function upsertDoc(col: CollectionName, id: string, data: object) {
  return setDoc(docRef(col, id), data, { merge: true });
}

export function deleteFirestoreDoc(col: CollectionName, id: string) {
  return deleteDoc(docRef(col, id));
}
