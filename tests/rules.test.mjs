// Test delle regole Firestore del workspace condiviso.
// Esecuzione: npm run test:rules  (avvia l'emulatore Firestore e lancia questo file)
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, writeBatch, getDocs, query, where } from 'firebase/firestore';

const WID = 'ws1';
let env;

const users = {
  owner: { uid: 'owner', email: 'owner@a.it' },
  admin: { uid: 'admin', email: 'admin@a.it' },
  sales: { uid: 'sales', email: 'sales@a.it' },
  off: { uid: 'off', email: 'off@a.it' },
  outsider: { uid: 'out', email: 'out@b.it' },
  invited: { uid: 'inv', email: 'inv@a.it' },
};

const db = (u, verified = true) =>
  env.authenticatedContext(u.uid, { email: u.email, email_verified: verified }).firestore();

const member = (u, role, status = 'active') =>
  ({ uid: u.uid, email: u.email, displayName: u.uid, role, status, joinedAt: 1 });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-syrio',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'workspaces', WID), { name: 'A', ownerUid: 'owner', createdAt: 1 });
    await setDoc(doc(f, 'workspaces', WID, 'members', 'owner'), member(users.owner, 'owner'));
    await setDoc(doc(f, 'workspaces', WID, 'members', 'admin'), member(users.admin, 'admin'));
    await setDoc(doc(f, 'workspaces', WID, 'members', 'sales'), member(users.sales, 'sales'));
    await setDoc(doc(f, 'workspaces', WID, 'members', 'off'), member(users.off, 'sales', 'disabled'));
    await setDoc(doc(f, 'workspaces', WID, 'contacts', 'c1'), { company: 'Rossi', createdBy: 'owner' });
    await setDoc(doc(f, 'users', 'owner', 'settings', 'app'), { claudeApiKey: 'segreta' });
  });
});

test('un membro attivo legge e scrive i clienti del workspace', async () => {
  const f = db(users.sales);
  await assertSucceeds(getDoc(doc(f, 'workspaces', WID, 'contacts', 'c1')));
  await assertSucceeds(setDoc(doc(f, 'workspaces', WID, 'contacts', 'c2'), { company: 'Bianchi' }));
  await assertSucceeds(updateDoc(doc(f, 'workspaces', WID, 'contacts', 'c1'), { city: 'Rho' }));
});

test('un esterno non legge né scrive nulla del workspace', async () => {
  const f = db(users.outsider);
  await assertFails(getDoc(doc(f, 'workspaces', WID)));
  await assertFails(getDoc(doc(f, 'workspaces', WID, 'contacts', 'c1')));
  await assertFails(setDoc(doc(f, 'workspaces', WID, 'contacts', 'c3'), { company: 'X' }));
  await assertFails(getDocs(collection(f, 'workspaces', WID, 'members')));
});

test('non autenticato: nessun accesso', async () => {
  const f = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(f, 'workspaces', WID, 'contacts', 'c1')));
});

test('un membro disattivato non legge più', async () => {
  await assertFails(getDoc(doc(db(users.off), 'workspaces', WID, 'contacts', 'c1')));
});

test('le impostazioni personali (chiave API) non sono leggibili da un collega', async () => {
  await assertFails(getDoc(doc(db(users.sales), 'users', 'owner', 'settings', 'app')));
  await assertSucceeds(getDoc(doc(db(users.owner), 'users', 'owner', 'settings', 'app')));
});

test('un commerciale non crea inviti né cambia ruoli; un admin sì', async () => {
  const invite = { email: 'new@a.it', wid: WID, workspaceName: 'A', role: 'sales', invitedBy: 'x', createdAt: 1 };
  await assertFails(setDoc(doc(db(users.sales), 'invites', 'new@a.it'), invite));
  await assertFails(updateDoc(doc(db(users.sales), 'workspaces', WID, 'members', 'admin'), { role: 'sales' }));
  await assertSucceeds(setDoc(doc(db(users.admin), 'invites', 'new@a.it'), invite));
  await assertSucceeds(updateDoc(doc(db(users.admin), 'workspaces', WID, 'members', 'sales'), { role: 'graphics' }));
});

test("nessuno può promuovere a owner o modificare l'owner", async () => {
  await assertFails(updateDoc(doc(db(users.admin), 'workspaces', WID, 'members', 'sales'), { role: 'owner' }));
  await assertFails(updateDoc(doc(db(users.admin), 'workspaces', WID, 'members', 'owner'), { status: 'disabled' }));
  await assertFails(setDoc(doc(db(users.admin), 'invites', 'boss@a.it'),
    { email: 'boss@a.it', wid: WID, workspaceName: 'A', role: 'owner', invitedBy: 'x', createdAt: 1 }));
});

test("l'admin vede gli inviti del proprio workspace", async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'invites', 'inv@a.it'),
    { email: 'inv@a.it', wid: WID, workspaceName: 'A', role: 'graphics', invitedBy: 'admin', createdAt: 1 }));
  await assertSucceeds(getDocs(query(collection(db(users.admin), 'invites'), where('wid', '==', WID))));
  await assertFails(getDocs(query(collection(db(users.outsider), 'invites'), where('wid', '==', WID))));
});

test("l'invitato entra con il ruolo dell'invito e non con uno superiore", async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'invites', 'inv@a.it'),
    { email: 'inv@a.it', wid: WID, workspaceName: 'A', role: 'graphics', invitedBy: 'admin', createdAt: 1 }));

  const f = db(users.invited);
  await assertSucceeds(getDoc(doc(f, 'invites', 'inv@a.it')));
  await assertFails(setDoc(doc(f, 'workspaces', WID, 'members', 'inv'), member(users.invited, 'admin')));
  await assertFails(setDoc(doc(db(users.invited, false), 'workspaces', WID, 'members', 'inv'), member(users.invited, 'graphics')));

  const b = writeBatch(f);
  b.set(doc(f, 'workspaces', WID, 'members', 'inv'), member(users.invited, 'graphics'));
  b.set(doc(f, 'userProfiles', 'inv'), { activeWorkspaceId: WID, workspaceIds: [WID] });
  b.delete(doc(f, 'invites', 'inv@a.it'));
  await assertSucceeds(b.commit());
  await assertSucceeds(getDoc(doc(f, 'workspaces', WID, 'contacts', 'c1')));
});

test('senza invito non ci si aggiunge da soli a un workspace', async () => {
  await assertFails(setDoc(doc(db(users.outsider), 'workspaces', WID, 'members', 'out'), member(users.outsider, 'sales')));
});

test('nuovo utente: crea il proprio workspace e si registra owner nello stesso batch', async () => {
  const f = db(users.outsider);
  const b = writeBatch(f);
  b.set(doc(f, 'workspaces', 'ws2'), { name: 'B', ownerUid: 'out', createdAt: 1 });
  b.set(doc(f, 'workspaces', 'ws2', 'members', 'out'), member(users.outsider, 'owner'));
  b.set(doc(f, 'userProfiles', 'out'), { activeWorkspaceId: 'ws2', workspaceIds: ['ws2'] });
  await assertSucceeds(b.commit());
  // ...ma non può diventare owner di un workspace esistente
  await assertFails(setDoc(doc(f, 'workspaces', WID, 'members', 'out'), member(users.outsider, 'owner')));
});

test('audit log: solo aggiunte, firmate dal vero autore', async () => {
  const f = db(users.sales);
  await assertSucceeds(addDoc(collection(f, 'workspaces', WID, 'audit_logs'), { authorUid: 'sales', timestamp: 1 }));
  await assertFails(addDoc(collection(f, 'workspaces', WID, 'audit_logs'), { authorUid: 'owner', timestamp: 1 }));
  let id;
  await env.withSecurityRulesDisabled(async ctx => {
    id = (await addDoc(collection(ctx.firestore(), 'workspaces', WID, 'audit_logs'), { authorUid: 'sales' })).id;
  });
  await assertFails(updateDoc(doc(f, 'workspaces', WID, 'audit_logs', id), { authorUid: 'x' }));
  await assertFails(deleteDoc(doc(db(users.owner), 'workspaces', WID, 'audit_logs', id)));
});

test("il workspace non si cancella e l'owner non si cambia", async () => {
  await assertFails(deleteDoc(doc(db(users.owner), 'workspaces', WID)));
  await assertFails(updateDoc(doc(db(users.admin), 'workspaces', WID), { ownerUid: 'admin' }));
  await assertSucceeds(updateDoc(doc(db(users.admin), 'workspaces', WID), { name: 'Nuovo nome' }));
});
