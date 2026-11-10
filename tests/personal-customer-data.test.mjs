import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
let env;
const user = uid => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true }).firestore();
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-syrio', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { await env.cleanup(); });
for (const collection of ['customerRequests', 'customerCommunications']) {
  test(`${collection}: il proprietario salva e aggiorna, altri utenti non leggono o scrivono`, async () => {
    const mine = doc(user('alice'), 'users', 'alice', collection, 'one');
    const other = doc(user('bob'), 'users', 'alice', collection, 'one');
    await assertSucceeds(setDoc(mine, { id:'one', ownerId:'alice', workspaceId:'ws1', contactId:'client', description:'test' }));
    await assertSucceeds(updateDoc(mine, { description:'updated' }));
    await assertSucceeds(getDoc(mine));
    await assertFails(getDoc(other));
    await assertFails(updateDoc(other, { description:'unauthorized' }));
  });
}
test('il report operativo è accessibile solo a owner e admin attivi', async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    const f = ctx.firestore();
    for (const [uid, role, status] of [['alice','owner','active'], ['anna','admin','active'], ['bob','sales','active'], ['off','admin','disabled']]) {
      await setDoc(doc(f, 'workspaces', 'ws1', 'members', uid), { uid, role, status });
    }
  });
  const ref = uid => doc(user(uid), 'workspaces', 'ws1', 'operationalReports', 'current');
  await assertSucceeds(setDoc(ref('alice'), { activeDeals: 2 }));
  await assertSucceeds(getDoc(ref('anna')));
  await assertSucceeds(updateDoc(ref('anna'), { activeDeals: 3 }));
  await assertFails(getDoc(ref('bob')));
  await assertFails(updateDoc(ref('bob'), { activeDeals: 4 }));
  await assertFails(getDoc(ref('off')));
});
