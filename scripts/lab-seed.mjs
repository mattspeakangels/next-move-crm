// Popola il LABORATORIO (syrio-lab) o l'emulatore con il dataset simulato.
//
// Crea per ognuna delle 3 aziende fittizie uno spazio aziendale (workspaces/{wid}) con:
// colleghi come utenti Auth fittizi (@syrio-lab.test) e membri con ruolo, clienti
// (contacts), opportunità (deals), email (emails) e risposte giuste (email_labels).
// Con --grant dà accesso da amministratore a persone reali (le tue email Google).
//
// Uso:
//   node scripts/lab-seed.mjs --project syrio-lab [--reset] [--grant a@x.it,b@y.it] [--dry-run]
//   node scripts/lab-seed.mjs --project syrio-lab --grant-only --grant a@x.it [--active lab-agente]
// L'app non ha (ancora) un selettore di spazio: --active sceglie quale dei tre vedi.
// Sull'emulatore: FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST impostati,
// progetto demo-* (vedi npm run lab:seed:emulator).
//
// La guardia gira PRIMA di caricare firebase-admin: sui progetti di lavoro lo script
// esce senza aver aperto alcuna connessione.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { assertLabProject } from '../lab/guard.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

const projectId = opt('--project') ?? process.env.GCLOUD_PROJECT ?? '';
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
assertLabProject(projectId, { emulator });
if (emulator !== Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
  console.error('RIFIUTATO: con l\'emulatore servono sia FIRESTORE_EMULATOR_HOST sia FIREBASE_AUTH_EMULATOR_HOST');
  process.exit(2);
}

const RESET = flag('--reset');
const DRY = flag('--dry-run');
const GRANT_ONLY = flag('--grant-only');
const GRANT = (opt('--grant') ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const ACTIVE = opt('--active');
const FAKE_DOMAIN = 'syrio-lab.test';
const SEED_TAG = 'lab-seed-v1';

// Le collezioni scritte qui devono essere condivise (SHARED) in src/lib/paths.ts,
// l'unico punto che definisce i percorsi Firestore dell'app.
const pathsSrc = readFileSync(new URL('../src/lib/paths.ts', import.meta.url), 'utf8');
const sharedBlock = /export const SHARED = \[([\s\S]*?)\] as const/.exec(pathsSrc)?.[1] ?? '';
const SHARED = new Set([...sharedBlock.matchAll(/'([a-z_A-Z]+)'/g)].map((m) => m[1]));
for (const c of ['contacts', 'deals', 'emails', 'email_labels', 'mailboxes']) {
  if (!SHARED.has(c)) { console.error(`Collezione ${c} non è in SHARED (src/lib/paths.ts)`); process.exit(1); }
}

const { generateDataset, END } = await import('../lab/dataset/generate.mjs');
const ds = generateDataset();
// Il dataset è fisso (6 mesi fino al 1° novembre 2026): lo si sposta di giorni interi
// perché l'ultima email cada nelle ultime 24 ore. Così "Oggi" ha sempre posta recente.
const DAY_MS = 86400_000;
const SHIFT = Math.max(0, Math.floor((Date.now() - END) / DAY_MS) * DAY_MS);
const shifted = (iso) => Date.parse(iso) + SHIFT;

const ROLE_MAP = { commerciale: 'sales', customer_service: 'customer_service', personalizzazione: 'graphics' };
const SEGMENT = (c) => (c.type === 'dealer' ? 'dealer' : /edilizia|costruzioni|serramenti/.test(c.sector) ? 'edilizia' : /officine|carpenteria|impianti|termoidraulica/.test(c.sector) ? 'industria' : 'end-user');
const PROB = { lead: 10, qualificato: 25, proposta: 40, negoziazione: 60, 'chiuso-vinto': 100, 'chiuso-perso': 0 };
const wsId = (company) => `lab-${company.id.replace(/^az-/, '')}`;
const fakeEmail = (col) => `${col.email.split('@')[0]}.${col.companyId.replace(/^az-/, '')}@${FAKE_DOMAIN}`;

const plan = {
  workspaces: ds.companies.length,
  users: ds.companies.reduce((s, c) => s + c.colleagues.length, 0),
  contacts: ds.customers.length,
  deals: ds.deals.length,
  emails: ds.emails.length,
  grant: GRANT,
};
console.log(`Piano: ${JSON.stringify(plan)}${RESET ? ' (con --reset)' : ''}${GRANT_ONLY ? ' (solo --grant)' : ''}`);
if (DRY) { console.log('--dry-run: nessuna scrittura.'); process.exit(0); }

const { initializeApp } = await import('firebase-admin/app');
const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
const { getAuth } = await import('firebase-admin/auth');
initializeApp({ projectId });
const db = getFirestore();
const auth = getAuth();

// Doppio controllo sull'istanza reale: il progetto deve essere quello verificato.
if (db.projectId && db.projectId !== projectId) { console.error(`RIFIUTATO: Firestore punta a ${db.projectId}`); process.exit(2); }

async function commitAll(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = db.batch();
    for (const op of ops.slice(i, i + 400)) op(b);
    await b.commit();
  }
}

async function reset() {
  for (const c of ds.companies) {
    const ref = db.doc(`workspaces/${wsId(c)}`);
    const snap = await ref.get();
    if (snap.exists && snap.data().seedTag !== SEED_TAG) throw new Error(`${ref.path} non è stato creato dal seed: non lo tocco`);
    if (snap.exists) await db.recursiveDelete(ref);
  }
  const wids = ds.companies.map(wsId);
  const inv = await db.collection('invites').where('wid', 'in', wids).get();
  for (const d of inv.docs) await d.ref.delete();
  // Profili: si toglie solo il riferimento agli spazi del seed.
  const prof = await db.collection('userProfiles').where('workspaceIds', 'array-contains-any', wids).get();
  for (const d of prof.docs) {
    const left = (d.data().workspaceIds ?? []).filter((w) => !wids.includes(w));
    if ((d.data().email ?? '').endsWith(`@${FAKE_DOMAIN}`)) await d.ref.delete();
    else await d.ref.set({ workspaceIds: left, activeWorkspaceId: left[0] ?? FieldValue.delete() }, { merge: true });
  }
  let pageToken;
  let removed = 0;
  do {
    const page = await auth.listUsers(1000, pageToken);
    const fake = page.users.filter((u) => u.email?.endsWith(`@${FAKE_DOMAIN}`)).map((u) => u.uid);
    if (fake.length) { await auth.deleteUsers(fake); removed += fake.length; }
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`Reset: spazi del laboratorio, inviti, profili e ${removed} utenti fittizi rimossi.`);
}

async function ensureUser(email, displayName, password) {
  try {
    const u = await auth.getUserByEmail(email);
    await auth.updateUser(u.uid, { password, displayName, emailVerified: true });
    return u.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    return (await auth.createUser({ email, password, displayName, emailVerified: true })).uid;
  }
}

async function seed() {
  const password = `Lab-${randomBytes(9).toString('base64url')}`;
  const credentials = [];
  const now = Date.now();
  for (const company of ds.companies) {
    const wid = wsId(company);
    const ws = db.doc(`workspaces/${wid}`);
    const ops = [];
    const uidOf = {};
    for (const [i, col] of company.colleagues.entries()) {
      const email = fakeEmail(col);
      const uid = await ensureUser(email, col.name, password);
      uidOf[col.id] = uid;
      const role = i === 0 ? 'owner' : ROLE_MAP[col.role];
      credentials.push({ azienda: company.name, nome: col.name, ruolo: role, email });
      // Outlook simulato: ogni collega ha la sua casella aziendale già collegata.
      const connectedAt = now - (i + 1) * 3 * DAY_MS;
      ops.push((b) => b.set(ws.collection('members').doc(uid), { uid, email, displayName: col.name, role, status: 'active', joinedAt: now, outlookConnectedAt: connectedAt }));
      ops.push((b) => b.set(ws.collection('mailboxes').doc(uid), {
        uid, address: col.email, displayName: col.name, provider: 'outlook', kind: 'personal', simulated: true, connectedAt, lastSyncAt: now, labSeed: true,
      }));
      ops.push((b) => b.set(db.doc(`userProfiles/${uid}`), { activeWorkspaceId: wid, workspaceIds: [wid], email, updatedAt: FieldValue.serverTimestamp() }));
    }
    const ownerUid = uidOf[company.colleagues[0].id];
    // legacyMigratedAt: nessun dato "pre-workspace" da migrare per questi utenti.
    ops.unshift((b) => b.set(ws, { name: `${company.name} (LAB)`, ownerUid, createdAt: now, legacyMigratedAt: now, seedTag: SEED_TAG }));

    // Casella generale dell'azienda (info@): riceve i primi contatti dei prospect senza commerciale.
    ops.push((b) => b.set(ws.collection('mailboxes').doc('info'), {
      uid: null, address: company.infoEmail, displayName: `${company.name} — casella generale`, provider: 'outlook', kind: 'shared', simulated: true, connectedAt: now - 30 * DAY_MS, lastSyncAt: now, labSeed: true,
    }));
    const stamp = (createdBy, t) => ({ createdBy, updatedBy: createdBy, createdAt: t, updatedAt: t });
    for (const c of ds.customers.filter((x) => x.companyId === company.id)) {
      const ref = c.contacts[0];
      const owner = c.ownerId ? uidOf[c.ownerId] : null;
      const creator = owner ?? ownerUid;
      ops.push((b) => b.set(ws.collection('contacts').doc(c.id), {
        id: c.id, company: c.name, customerType: c.type === 'dealer' ? 'dealer' : 'end-user', contactName: ref.name, role: ref.role,
        email: ref.email, phone: ref.phone, city: c.town, country: 'Italia', website: `www.${c.domain}`,
        status: c.status, segment: SEGMENT(c), sector: c.sector, region: 'Lombardia',
        stakeholders: c.contacts.slice(1).map((s, k) => ({ id: `${c.id}-st-${k + 1}`, name: s.name, role: s.role, email: s.email, phone: s.phone })),
        notes: c.publicBody ? 'Ente pubblico: acquisti tramite MEPA.' : '',
        ownerUid: owner, labSeed: true, ...stamp(creator, shifted(ds.meta.start)),
      }));
    }
    for (const d of ds.deals.filter((x) => x.companyId === company.id)) {
      const owner = uidOf[d.ownerId];
      const t = shifted(d.createdAt);
      const closed = d.stage.startsWith('chiuso');
      ops.push((b) => b.set(ws.collection('deals').doc(d.id), {
        id: d.id, contactId: d.customerId, value: d.value, probability: PROB[d.stage], products: d.items.map((it) => `${it.qty} ${it.product}`),
        stage: d.stage, nextAction: closed ? '' : 'Ricontattare il cliente', nextActionDeadline: t + 14 * 86400_000, notes: [d.title, d.cig ? `CIG ${d.cig} · ${d.lotti} lotti · scadenza ${d.scadenza}` : '', d.orderRef ? `Ordine ${d.orderRef}` : ''].filter(Boolean).join('\n'),
        offerRef: d.code, ...(closed ? { closedAt: t + 10 * 86400_000 } : {}),
        ownerUid: owner, labSeed: true, ...stamp(owner, t),
      }));
    }
    for (const e of ds.emails.filter((x) => x.mailbox === company.id)) {
      const t = shifted(e.date);
      const { labels, meta, ...mail } = e;
      // Le email inviate da noi sono già "lette"; quelle in arrivo no.
      ops.push((b) => b.set(ws.collection('emails').doc(e.id), { ...mail, date: new Date(t).toISOString(), dateMs: t, readBy: {}, labSeed: true }));
      ops.push((b) => b.set(ws.collection('email_labels').doc(e.id), {
        ...labels, actor: labels.actor ? { ...labels.actor, uid: labels.actor.personId ? uidOf[labels.actor.personId] ?? null : null } : null,
        meta, labSeed: true,
      }));
    }
    await commitAll(ops);
    console.log(`✔ ${company.name}: ${ops.length} scritture in workspaces/${wid}`);
  }
  // Credenziali dei colleghi fittizi: solo in lab/env/ (escluso da git), mai in chiaro nel log.
  if (!emulator) {
    mkdirSync(new URL('../lab/env/', import.meta.url), { recursive: true });
    const file = new URL('../lab/env/credenziali-lab.json', import.meta.url);
    writeFileSync(file, `${JSON.stringify({ progetto: projectId, password, utenti: credentials }, null, 2)}\n`);
    console.log('Credenziali dei colleghi fittizi salvate in lab/env/credenziali-lab.json (esclusa da git).');
  }
}

/** Accesso da amministratore agli spazi del laboratorio per persone reali (Google). */
async function grant() {
  const wids = ds.companies.map(wsId);
  if (ACTIVE && !wids.includes(ACTIVE)) throw new Error(`--active deve essere uno di: ${wids.join(', ')}`);
  for (const email of GRANT) {
    if (email.endsWith(`@${FAKE_DOMAIN}`)) continue;
    let user = null;
    try { user = await auth.getUserByEmail(email); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
    if (!user) {
      // Mai entrato nel laboratorio: invito al primo spazio, accettato al primo accesso con Google.
      const c = ds.companies[0];
      await db.doc(`invites/${email}`).set({ email, wid: wsId(c), workspaceName: `${c.name} (LAB)`, role: 'admin', invitedBy: 'lab-seed', createdAt: Date.now() });
      console.log(`✉ ${email}: invito come admin in ${wsId(c)}. Dopo il primo accesso rilancia --grant-only per gli altri spazi.`);
      continue;
    }
    const now = Date.now();
    const b = db.batch();
    for (const wid of wids) {
      b.set(db.doc(`workspaces/${wid}/members/${user.uid}`), { uid: user.uid, email, displayName: user.displayName || email.split('@')[0], role: 'admin', status: 'active', joinedAt: now });
    }
    const profRef = db.doc(`userProfiles/${user.uid}`);
    const prof = (await profRef.get()).data() ?? {};
    b.set(profRef, { email, workspaceIds: FieldValue.arrayUnion(...wids), activeWorkspaceId: ACTIVE ?? (wids.includes(prof.activeWorkspaceId) ? prof.activeWorkspaceId : wids[0]), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    b.delete(db.doc(`invites/${email}`));
    await b.commit();
    console.log(`✔ ${email}: admin in ${wids.join(', ')}; spazio attivo: ${ACTIVE ?? (wids.includes(prof.activeWorkspaceId) ? prof.activeWorkspaceId : wids[0])}`);
  }
}

async function verify() {
  const out = {};
  for (const c of ds.companies) {
    const ws = db.doc(`workspaces/${wsId(c)}`);
    const counts = {};
    for (const col of ['members', 'mailboxes', 'contacts', 'deals', 'emails', 'email_labels']) counts[col] = (await ws.collection(col).count().get()).data().count;
    out[wsId(c)] = counts;
    const expected = {
      contacts: ds.customers.filter((x) => x.companyId === c.id).length,
      deals: ds.deals.filter((x) => x.companyId === c.id).length,
      emails: ds.emails.filter((x) => x.mailbox === c.id).length,
      mailboxes: c.colleagues.length + 1,
    };
    for (const [k, v] of Object.entries(expected)) {
      if (counts[k] !== v) throw new Error(`${wsId(c)}/${k}: ${counts[k]} invece di ${v}`);
    }
    if (counts.email_labels !== expected.emails) throw new Error(`${wsId(c)}/email_labels incompleto`);
  }
  console.log(`Verifica conteggi OK: ${JSON.stringify(out)}`);
}

if (!GRANT_ONLY) {
  if (RESET) await reset();
  await seed();
}
if (GRANT.length) await grant();
if (!GRANT_ONLY) await verify();
process.exit(0);
