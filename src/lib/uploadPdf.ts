import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

const CHUNK_SIZE = 500_000;

function getUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sessione scaduta. Ricarica la pagina e accedi di nuovo.');
  return uid;
}

export async function uploadOfferPdf(offerId: string, file: File): Promise<{ url: string; name: string }> {
  const userId = getUserId();
  const base64 = await fileToBase64(file);
  const chunks = splitIntoChunks(base64, CHUNK_SIZE);

  await setDoc(doc(db, 'users', userId, 'offer_pdfs', offerId), {
    name: file.name,
    chunks: chunks.length,
    updatedAt: Date.now(),
  });

  await Promise.all(
    chunks.map((chunk, i) =>
      setDoc(doc(db, 'users', userId, 'offer_pdf_chunks', `${offerId}_${i}`), { data: chunk })
    )
  );

  return { url: `db:${userId}:${offerId}`, name: file.name };
}

export async function getPdfDataUrl(pdfUrl: string): Promise<string> {
  const [, userId, offerId] = pdfUrl.split(':');
  const metaSnap = await getDoc(doc(db, 'users', userId, 'offer_pdfs', offerId));
  const meta = metaSnap.data();
  if (!meta) throw new Error('PDF non trovato in archivio');
  const chunkCount: number = meta.chunks ?? 1;
  const chunkSnaps = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) =>
      getDoc(doc(db, 'users', userId, 'offer_pdf_chunks', `${offerId}_${i}`))
    )
  );
  return chunkSnaps.map(s => s.data()?.data ?? '').join('');
}

/**
 * Opens a PDF in a new tab.
 * IMPORTANT: call this directly from a user click handler (not after await)
 * to avoid popup blockers — we open the window first, then load data into it.
 */
export async function openOfferPdf(pdfUrl: string, triggerPrint = false): Promise<void> {
  if (!pdfUrl.startsWith('db:')) {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Open window SYNCHRONOUSLY before any async work to bypass popup blocker
  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Popup bloccato. Consenti i popup per questo sito nelle impostazioni del browser.');
  }

  // Show loading state
  win.document.write(
    `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;` +
    `height:100vh;font-family:sans-serif;color:#666;font-size:14px">Caricamento PDF...</body></html>`
  );

  try {
    const dataUrl = await getPdfDataUrl(pdfUrl);
    const blob = dataUrlToBlob(dataUrl);
    const blobUrl = URL.createObjectURL(blob);

    // Navigate to blob URL (works for both view and print)
    win.location.href = blobUrl;

    if (triggerPrint) {
      // Wait for PDF to load in the browser viewer, then trigger print
      const tryPrint = (attempts = 0) => {
        try {
          win.print();
        } catch {
          if (attempts < 5) setTimeout(() => tryPrint(attempts + 1), 600);
        }
      };
      setTimeout(() => tryPrint(), 1200);
    }
  } catch (err) {
    win.close();
    throw err;
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/pdf';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
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
