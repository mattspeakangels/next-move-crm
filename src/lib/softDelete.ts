/**
 * Soft Delete Pattern for Firestore
 * Documents are marked as deleted but not removed from database
 * Allows recovery and audit trails
 */

import { db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  DocumentData,
} from 'firebase/firestore';

export interface WithSoftDelete {
  deletedAt: null | { seconds: number; nanoseconds: number };
}

/**
 * Soft delete a document
 * Marks document as deleted without removing it
 */
export async function softDeleteDocument(
  collectionName: string,
  documentId: string
): Promise<void> {
  const docRef = doc(db, collectionName, documentId);

  await updateDoc(docRef, {
    deletedAt: serverTimestamp(),
  });

  console.log(`[SoftDelete] Marked ${collectionName}/${documentId} as deleted`);
}

/**
 * Restore a soft-deleted document
 */
export async function restoreSoftDeletedDocument(
  collectionName: string,
  documentId: string
): Promise<void> {
  const docRef = doc(db, collectionName, documentId);

  await updateDoc(docRef, {
    deletedAt: null,
  });

  console.log(`[SoftDelete] Restored ${collectionName}/${documentId}`);
}

/**
 * Query documents excluding soft-deleted ones
 * This is the pattern to use for normal queries
 */
export function getActiveDocumentsQuery(collectionName: string) {
  return query(collection(db, collectionName), where('deletedAt', '==', null));
}

/**
 * Get permanently deleted documents (for recovery)
 */
export function getDeletedDocumentsQuery(collectionName: string) {
  return query(
    collection(db, collectionName),
    where('deletedAt', '!=', null)
  );
}

/**
 * Purge soft-deleted documents older than X days (permanent delete)
 * DANGEROUS: This removes documents permanently
 */
export async function permanentlyDeleteOldSoftDeletedDocs(
  collectionName: string,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const deletedDocs = await getDocs(getDeletedDocumentsQuery(collectionName));

  let purgedCount = 0;
  for (const docSnapshot of deletedDocs.docs) {
    const data = docSnapshot.data() as DocumentData & WithSoftDelete;

    if (data.deletedAt) {
      const deletedAtDate = new Date(
        data.deletedAt.seconds * 1000 + data.deletedAt.nanoseconds / 1000000
      );

      if (deletedAtDate < cutoffDate) {
        // Permanently delete
        await updateDoc(doc(db, collectionName, docSnapshot.id), {
          _archived: true,
          archivedAt: serverTimestamp(),
        });
        purgedCount++;
      }
    }
  }

  console.log(
    `[SoftDelete] Purged ${purgedCount} documents from ${collectionName} (deleted before ${cutoffDate.toISOString()})`
  );

  return purgedCount;
}

/**
 * Count active (non-deleted) documents
 */
export async function countActiveDocuments(
  collectionName: string
): Promise<number> {
  const q = getActiveDocumentsQuery(collectionName);
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Recovery helper: List all deleted documents with delete timestamp
 */
export async function listDeletedDocuments(
  collectionName: string
): Promise<
  Array<{
    id: string;
    deletedAt: Date;
    data: DocumentData;
  }>
> {
  const q = getDeletedDocumentsQuery(collectionName);
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data() as DocumentData & WithSoftDelete;

      if (!data.deletedAt) {
        return null;
      }

      return {
        id: docSnapshot.id,
        deletedAt: new Date(
          data.deletedAt.seconds * 1000 + data.deletedAt.nanoseconds / 1000000
        ),
        data,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    deletedAt: Date;
    data: DocumentData;
  }>;
}
