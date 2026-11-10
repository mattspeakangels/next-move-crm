import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Instradamento dei dati tra spazio aziendale condiviso e area personale.
 *
 * - Collezioni SHARED → workspaces/{wid}/{col}: le vedono tutti i membri attivi del workspace.
 * - Collezioni PERSONAL → users/{uid}/{col}: le vede solo l'utente (es. impostazioni con la chiave API).
 *
 * Questo è l'UNICO file che costruisce percorsi Firestore dei dati applicativi:
 * ogni altro modulo passa da colRef/docRef.
 */
export const SHARED = [
  'contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions',
  'checkIns', 'groups', 'strategicFocuses', 'sequences',
  'storico', 'storico_dettagliati',
  'offer_pdfs', 'offer_pdf_chunks', 'bi_docs', 'bi_doc_chunks', 'contact_photos', 'contact_photo_chunks',
  'audit_logs',
] as const;

export const PERSONAL = [
  'customerCommunications', 'customerRequests', 'settings', 'todos', 'targets', 'prospectingTracks', 'prospectEmailDrafts', 'prospectHistory',
] as const;

export type SharedCollection = typeof SHARED[number];
export type PersonalCollection = typeof PERSONAL[number];
export type DataCollection = SharedCollection | PersonalCollection;

export interface DataContext { uid: string; wid: string }

let active: DataContext | null = null;

/** Impostato da WorkspaceProvider quando utente e workspace sono pronti; null al logout. */
export function setActiveDataContext(ctx: DataContext | null) {
  active = ctx;
}

export function getActiveDataContext(): DataContext {
  if (!active) throw new Error('Spazio di lavoro non ancora pronto. Ricarica la pagina e riprova.');
  return active;
}

export function isShared(col: string): col is SharedCollection {
  return (SHARED as readonly string[]).includes(col);
}

function isPersonal(col: string): col is PersonalCollection {
  return (PERSONAL as readonly string[]).includes(col);
}

function basePath(col: string, ctx: DataContext): [string, string] {
  if (isShared(col)) return ['workspaces', ctx.wid];
  if (isPersonal(col)) return ['users', ctx.uid];
  throw new Error(`Collezione non instradata: ${col}. Aggiungila a SHARED o PERSONAL in paths.ts`);
}

export function colRef(col: DataCollection, ctx: DataContext = getActiveDataContext()): CollectionReference {
  const [root, id] = basePath(col, ctx);
  return collection(db, root, id, col);
}

export function docRef(col: DataCollection, id: string, ctx: DataContext = getActiveDataContext()): DocumentReference {
  const [root, rootId] = basePath(col, ctx);
  return doc(db, root, rootId, col, id);
}

/** Percorso legacy (pre-workspace): usato SOLO dalla migrazione una tantum. */
export function legacyColRef(uid: string, col: string): CollectionReference {
  return collection(db, 'users', uid, col);
}
