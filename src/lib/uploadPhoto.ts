import { docRef } from './paths';
import { setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth } from './firebase';
import { dataUrlToBlob } from './uploadPdf';
import { compressImage } from './imageCompress';
import type { ContactPhoto } from '../types';

// Stesso schema "chunk in Firestore" già usato per PDF/documenti BI (src/lib/uploadPdf.ts,
// src/lib/uploadBiDocument.ts). Le foto vengono compresse in JPEG prima di essere salvate,
// così restano quasi sempre entro un solo chunk da 500KB.
const CHUNK_SIZE = 500_000;

function getUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sessione scaduta. Ricarica la pagina e accedi di nuovo.');
  return uid;
}

export async function uploadContactPhoto(contactId: string, file: File): Promise<ContactPhoto> {
  const userId = getUserId();
  const docId = `${contactId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { dataUrl, thumbDataUrl, size } = await compressImage(file);
  const chunks = splitIntoChunks(dataUrl, CHUNK_SIZE);
  const uploadedAt = Date.now();

  await setDoc(docRef('contact_photos', docId), {
    contactId,
    name: file.name,
    contentType: 'image/jpeg',
    size,
    chunks: chunks.length,
    thumb: thumbDataUrl,
    uploadedAt,
  });

  await Promise.all(
    chunks.map((chunk, i) =>
      setDoc(docRef('contact_photo_chunks', `${docId}_${i}`), { data: chunk })
    )
  );

  return {
    id: docId,
    name: file.name,
    url: `db:${userId}:${docId}`,
    thumb: thumbDataUrl,
    contentType: 'image/jpeg',
    size,
    uploadedAt,
  };
}

export async function deleteContactPhoto(photo: ContactPhoto): Promise<void> {
  const [, , docId] = photo.url.split(':');
  const metaSnap = await getDoc(docRef('contact_photos', docId));
  const chunkCount: number = metaSnap.data()?.chunks ?? 0;
  await Promise.all([
    deleteDoc(docRef('contact_photos', docId)),
    ...Array.from({ length: chunkCount }, (_, i) =>
      deleteDoc(docRef('contact_photo_chunks', `${docId}_${i}`))
    ),
  ]);
}

export async function getContactPhotoFullDataUrl(photo: ContactPhoto): Promise<string> {
  const [, , docId] = photo.url.split(':');
  const metaSnap = await getDoc(docRef('contact_photos', docId));
  const meta = metaSnap.data();
  if (!meta) throw new Error('Foto non trovata in archivio');
  const chunkCount: number = meta.chunks ?? 1;
  const chunkSnaps = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) =>
      getDoc(docRef('contact_photo_chunks', `${docId}_${i}`))
    )
  );
  return chunkSnaps.map(s => s.data()?.data ?? '').join('');
}

export async function downloadContactPhoto(photo: ContactPhoto): Promise<void> {
  const dataUrl = await getContactPhotoFullDataUrl(photo);
  const blob = dataUrlToBlob(dataUrl);
  const blobUrl = URL.createObjectURL(blob);

  const a = window.document.createElement('a');
  a.href = blobUrl;
  a.download = photo.name;
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
