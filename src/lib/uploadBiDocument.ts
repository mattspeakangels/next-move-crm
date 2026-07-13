import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { dataUrlToBlob } from './uploadPdf';
import type { BiDocument } from '../types';

// Stesso schema "chunk in Firestore" già usato per i PDF delle offerte (src/lib/uploadPdf.ts):
// Firebase Storage non è attivo su questo progetto, quindi i file vengono spezzettati in
// stringhe base64 da 500KB e salvati come sotto-collezioni Firestore.
const CHUNK_SIZE = 500_000;

function getUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sessione scaduta. Ricarica la pagina e accedi di nuovo.');
  return uid;
}

export async function uploadBiDocument(contactId: string, file: File): Promise<BiDocument> {
  const userId = getUserId();
  const docId = `${contactId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const base64 = await fileToBase64(file);
  const chunks = splitIntoChunks(base64, CHUNK_SIZE);
  const uploadedAt = Date.now();

  await setDoc(doc(db, 'users', userId, 'bi_docs', docId), {
    contactId,
    name: file.name,
    contentType: file.type,
    size: file.size,
    chunks: chunks.length,
    uploadedAt,
  });

  await Promise.all(
    chunks.map((chunk, i) =>
      setDoc(doc(db, 'users', userId, 'bi_doc_chunks', `${docId}_${i}`), { data: chunk })
    )
  );

  return {
    id: docId,
    name: file.name,
    url: `db:${userId}:${docId}`,
    contentType: file.type,
    size: file.size,
    uploadedAt,
  };
}

export async function deleteBiDocument(biDoc: BiDocument): Promise<void> {
  const [, userId, docId] = biDoc.url.split(':');
  const metaSnap = await getDoc(doc(db, 'users', userId, 'bi_docs', docId));
  const chunkCount: number = metaSnap.data()?.chunks ?? 0;
  await Promise.all([
    deleteDoc(doc(db, 'users', userId, 'bi_docs', docId)),
    ...Array.from({ length: chunkCount }, (_, i) =>
      deleteDoc(doc(db, 'users', userId, 'bi_doc_chunks', `${docId}_${i}`))
    ),
  ]);
}

export async function downloadBiDocument(biDoc: BiDocument): Promise<void> {
  const [, userId, docId] = biDoc.url.split(':');
  const metaSnap = await getDoc(doc(db, 'users', userId, 'bi_docs', docId));
  const meta = metaSnap.data();
  if (!meta) throw new Error('Documento non trovato in archivio');
  const chunkCount: number = meta.chunks ?? 1;
  const chunkSnaps = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) =>
      getDoc(doc(db, 'users', userId, 'bi_doc_chunks', `${docId}_${i}`))
    )
  );
  const dataUrl = chunkSnaps.map(s => s.data()?.data ?? '').join('');
  const blob = dataUrlToBlob(dataUrl);
  const blobUrl = URL.createObjectURL(blob);

  const a = window.document.createElement('a');
  a.href = blobUrl;
  a.download = biDoc.name;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}

function splitIntoChunks(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) chunks.push(str.slice(i, i + size));
  return chunks;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
