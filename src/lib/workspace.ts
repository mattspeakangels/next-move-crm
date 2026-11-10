import {
  arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp,
  setDoc, updateDoc, deleteDoc, where, writeBatch, type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';
import { SHARED, legacyColRef } from './paths';

export type WorkspaceRole = 'owner' | 'admin' | 'sales' | 'customer_service' | 'graphics' | 'bdr';
export type MemberStatus = 'active' | 'disabled';

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Titolare',
  admin: 'Amministratore',
  sales: 'Commerciale',
  customer_service: 'Customer service',
  graphics: 'Ufficio personalizzazione',
  bdr: 'BDR',
};

/** Ruoli assegnabili da un invito o da un cambio ruolo (owner non si assegna). */
export const ASSIGNABLE_ROLES: WorkspaceRole[] = ['admin', 'sales', 'customer_service', 'graphics', 'bdr'];

export interface Workspace { id: string; name: string; ownerUid: string; createdAt: number; legacyMigratedAt?: number }
export interface Member { uid: string; email: string; displayName: string; role: WorkspaceRole; status: MemberStatus; joinedAt: number }
export interface Invite { email: string; wid: string; workspaceName: string; role: WorkspaceRole; invitedBy: string; createdAt: number }
interface UserProfile { activeWorkspaceId?: string; workspaceIds?: string[]; email?: string }

const wsDoc = (wid: string) => doc(db, 'workspaces', wid);
const memberDoc = (wid: string, uid: string) => doc(db, 'workspaces', wid, 'members', uid);
const profileDoc = (uid: string) => doc(db, 'userProfiles', uid);
const inviteDoc = (email: string) => doc(db, 'invites', email.trim().toLowerCase());

export const canManage = (role: WorkspaceRole | null) => role === 'owner' || role === 'admin';

export interface ResolvedWorkspace { wid: string; role: WorkspaceRole; workspace: Workspace; createdNow: boolean }

/**
 * Determina lo spazio di lavoro dell'utente al login:
 * 1) se c'è un invito per la sua email lo accetta;
 * 2) altrimenti usa il workspace attivo del profilo (se è ancora membro attivo);
 * 3) altrimenti crea un nuovo workspace di cui è titolare.
 */
export async function resolveWorkspace(user: User): Promise<ResolvedWorkspace> {
  const profileSnap = await getDoc(profileDoc(user.uid));
  const profile = (profileSnap.data() ?? {}) as UserProfile;

  if (user.email) {
    const inviteSnap = await getDoc(inviteDoc(user.email));
    if (inviteSnap.exists()) {
      const invite = inviteSnap.data() as Invite;
      if (!(profile.workspaceIds ?? []).includes(invite.wid)) {
        await acceptInvite(user, invite);
        return loadMembership(user.uid, invite.wid, false);
      }
      await deleteDoc(inviteSnap.ref).catch(() => {});
    }
  }

  if (profile.activeWorkspaceId) {
    // Se l'accesso è stato disattivato l'errore arriva all'utente: non creiamo
    // in silenzio uno spazio vuoto al posto di quello aziendale.
    return loadMembership(user.uid, profile.activeWorkspaceId, false);
  }

  const wid = await createWorkspace(user);
  return loadMembership(user.uid, wid, true);
}

async function loadMembership(uid: string, wid: string, createdNow: boolean): Promise<ResolvedWorkspace> {
  const [memberSnap, wsSnap] = await Promise.all([getDoc(memberDoc(wid, uid)), getDoc(wsDoc(wid))]);
  const member = memberSnap.data() as Member | undefined;
  if (!member || member.status !== 'active' || !wsSnap.exists()) {
    throw new Error('Non hai più accesso a questo spazio aziendale.');
  }
  return { wid, role: member.role, workspace: { id: wid, ...(wsSnap.data() as Omit<Workspace, 'id'>) }, createdNow };
}

async function createWorkspace(user: User): Promise<string> {
  const ref = doc(collection(db, 'workspaces'));
  const now = Date.now();
  const name = `Spazio di ${user.displayName || user.email?.split('@')[0] || 'utente'}`;
  const batch = writeBatch(db);
  batch.set(ref, { name, ownerUid: user.uid, createdAt: now });
  batch.set(memberDoc(ref.id, user.uid), memberFor(user, 'owner', now));
  batch.set(profileDoc(user.uid), {
    activeWorkspaceId: ref.id, workspaceIds: arrayUnion(ref.id), email: user.email ?? '', updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  return ref.id;
}

async function acceptInvite(user: User, invite: Invite) {
  if (!user.emailVerified) {
    throw new Error(`Hai un invito per "${invite.workspaceName}": verifica prima il tuo indirizzo email, poi accedi di nuovo.`);
  }
  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(memberDoc(invite.wid, user.uid), memberFor(user, invite.role, now));
  batch.set(profileDoc(user.uid), {
    activeWorkspaceId: invite.wid, workspaceIds: arrayUnion(invite.wid), email: user.email ?? '', updatedAt: serverTimestamp(),
  }, { merge: true });
  batch.delete(inviteDoc(invite.email));
  await batch.commit();
}

function memberFor(user: User, role: WorkspaceRole, now: number): Member {
  return {
    uid: user.uid,
    email: (user.email ?? '').toLowerCase(),
    displayName: user.displayName || user.email?.split('@')[0] || 'Utente',
    role,
    status: 'active',
    joinedAt: now,
  };
}

// ─── Migrazione una tantum dei dati pre-workspace ────────────────────────────

/** Batch Firestore: max 500 operazioni e ~10 MiB; i chunk PDF pesano fino a 500 KB l'uno. */
const MAX_OPS = 400;
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Copia users/{uid}/<collezioni condivise> in workspaces/{wid}/... mantenendo gli ID.
 * Non cancella nulla dalla sorgente (resta come backup). Idempotente: se interrotta,
 * al login successivo riparte perché legacyMigratedAt non è ancora impostato.
 */
export async function migrateLegacyData(
  uid: string, wid: string, onProgress?: (msg: string) => void,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const col of SHARED) {
    if (col === 'audit_logs') continue; // lo storico modifiche resta nell'area personale come archivio
    const snap = await getDocs(legacyColRef(uid, col));
    counts[col] = snap.size;
    if (snap.empty) continue;
    onProgress?.(`Copia ${col} (${snap.size})…`);

    let batch = writeBatch(db);
    let ops = 0;
    let bytes = 0;
    for (const d of snap.docs) {
      const data = d.data();
      const payload = 'createdBy' in data ? data : { ...data, createdBy: uid };
      const size = JSON.stringify(payload).length;
      if (ops > 0 && (ops >= MAX_OPS || bytes + size > MAX_BYTES)) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
        bytes = 0;
      }
      batch.set(doc(db, 'workspaces', wid, col, d.id), payload);
      ops += 1;
      bytes += size;
    }
    if (ops > 0) await batch.commit();
  }
  await updateDoc(wsDoc(wid), { legacyMigratedAt: Date.now() });
  return counts;
}

/** True se l'utente ha dati nel vecchio percorso personale (prima del workspace). */
export async function hasLegacyData(uid: string): Promise<boolean> {
  for (const col of ['contacts', 'deals', 'offers', 'activities'] as const) {
    const snap = await getDocs(legacyColRef(uid, col));
    if (!snap.empty) return true;
  }
  return false;
}

// ─── Gestione membri e inviti ────────────────────────────────────────────────

export function watchMembers(wid: string, cb: (members: Member[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'workspaces', wid, 'members'), snap => {
    cb(snap.docs.map(d => d.data() as Member).sort((a, b) => a.joinedAt - b.joinedAt));
  }, err => console.error('Lettura membri non riuscita:', err));
}

export function watchInvites(wid: string, cb: (invites: Invite[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'invites'), where('wid', '==', wid)), snap => {
    cb(snap.docs.map(d => d.data() as Invite).sort((a, b) => b.createdAt - a.createdAt));
  }, err => console.error('Lettura inviti non riuscita:', err));
}

export async function createInvite(ws: { id: string; name: string }, email: string, role: WorkspaceRole, invitedBy: string) {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Indirizzo email non valido.');
  if (!ASSIGNABLE_ROLES.includes(role)) throw new Error('Ruolo non assegnabile.');
  const existing = await getDoc(inviteDoc(clean)).catch(() => null);
  if (existing?.exists()) throw new Error('Esiste già un invito in attesa per questa email.');
  const invite: Invite = { email: clean, wid: ws.id, workspaceName: ws.name, role, invitedBy, createdAt: Date.now() };
  await setDoc(inviteDoc(clean), invite);
}

export const cancelInvite = (email: string) => deleteDoc(inviteDoc(email));

export const updateMember = (wid: string, uid: string, changes: Partial<Pick<Member, 'role' | 'status'>>) =>
  updateDoc(memberDoc(wid, uid), changes);

export const renameWorkspace = (wid: string, name: string) => updateDoc(wsDoc(wid), { name: name.trim() });
