// Test delle protezioni delle API: autenticazione e blocco SSRF.
// Esecuzione: npm run test:api
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.FIREBASE_PROJECT_ID = 'demo-syrio';
const { verifyUser } = await import('../api/_auth.ts');
const { assertPublicUrl, UnsafeUrlError } = await import('../api/_safeFetch.ts');

test('senza header Authorization la richiesta è rifiutata', async () => {
  assert.equal(await verifyUser({}), null);
});

test('il vecchio token condiviso o una stringa qualsiasi non valgono più', async () => {
  assert.equal(await verifyUser({ authorization: 'Bearer vecchio-token-admin' }), null);
  assert.equal(await verifyUser({ authorization: 'Basic abc' }), null);
});

test('un token non firmato (alg none) è rifiutato', async () => {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'attaccante', aud: 'demo-syrio', iss: 'https://securetoken.google.com/demo-syrio', exp: 9999999999 })}.`;
  assert.equal(await verifyUser({ authorization: `Bearer ${forged}` }), null);
});

test('senza FIREBASE_PROJECT_ID tutto è rifiutato', async () => {
  const saved = process.env.FIREBASE_PROJECT_ID;
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.VITE_FIREBASE_PROJECT_ID;
  assert.equal(await verifyUser({ authorization: 'Bearer x.y.z' }), null);
  process.env.FIREBASE_PROJECT_ID = saved;
});

for (const url of [
  'http://127.0.0.1/', 'http://localhost/', 'http://10.0.0.5/', 'http://192.168.1.1/', 'http://172.20.0.1/',
  'http://169.254.169.254/latest/meta-data/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://0.0.0.0/',
  'http://2130706433/', 'file:///etc/passwd', 'ftp://example.com/', 'http://example.com:8080/', 'http://user:pw@example.com/',
]) {
  test(`URL bloccato: ${url}`, async () => {
    await assert.rejects(assertPublicUrl(url), UnsafeUrlError);
  });
}

test('un indirizzo pubblico è accettato', async () => {
  assert.equal((await assertPublicUrl('https://93.184.216.34/pagina')).hostname, '93.184.216.34');
});
