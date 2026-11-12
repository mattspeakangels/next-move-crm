// Test del diff per campo della sincronizzazione (src/lib/syncDiff.ts) e
// dell'instradamento dei percorsi Firestore (src/lib/paths.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Firebase non serve: i moduli vengono sostituiti da stub minimi.
const stubs = {
  name: 'stub-firebase',
  setup(b) {
    b.onResolve({ filter: /^(\.\/firebase|firebase\/firestore)$/ }, a => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, a => ({
      contents: a.path === './firebase' ? 'export const db = {};' : 'export const collection = (...p) => p; export const doc = (...p) => p;',
    }));
  },
};
const load = async file => {
  const out = await build({
    entryPoints: [fileURLToPath(new URL(`../src/lib/${file}`, import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent', plugins: [stubs],
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
};
const { changedFields, sanitizeForFirestore, stripUndefinedDeep } = await load('syncDiff.ts');
const paths = await load('paths.ts');
const ctx = { uid: 'utente-1', wid: 'spazio-1' };

// ─── changedFields ──────────────────────────────────────────────────────────

test('documenti identici: nessun campo da scrivere', () => {
  const tags = ['a'];
  assert.deepEqual(changedFields({ a: 1, tags }, { a: 1, tags }), {});
});

test('solo i campi cambiati o aggiunti', () => {
  assert.deepEqual(changedFields({ nome: 'Rossi', citta: 'Rho' }, { nome: 'Rossi', citta: 'Milano', cap: '20100' }),
    { citta: 'Milano', cap: '20100' });
});

test('un campo rimosso diventa undefined, da cancellare sul server', () => {
  const diff = changedFields({ nome: 'Rossi', note: 'x' }, { nome: 'Rossi' });
  assert.ok('note' in diff);
  assert.equal(diff.note, undefined);
});

test('oggetti e liste sono confrontati per riferimento (lo store li sostituisce sempre)', () => {
  const same = { a: 1 };
  assert.deepEqual(changedFields({ o: same }, { o: same }), {});
  assert.deepEqual(changedFields({ o: { a: 1 } }, { o: { a: 1 } }), { o: { a: 1 } });
});

// ─── pulizia prima della scrittura ───────────────────────────────────────────

test('undefined di primo livello diventa il marcatore di cancellazione', () => {
  const DEL = Symbol('del');
  const out = sanitizeForFirestore({ a: 1, b: undefined }, () => DEL);
  assert.equal(out.a, 1);
  assert.equal(out.b, DEL);
});

test('undefined annidati in oggetti e liste vengono tolti', () => {
  assert.deepEqual(stripUndefinedDeep({ a: { b: undefined, c: 2 }, l: [1, undefined, { d: undefined }] }),
    { a: { c: 2 }, l: [1, {}] });
  const data = new Date(0);
  assert.equal(stripUndefinedDeep(data), data); // le classi (Date, Timestamp) restano intatte
});

// ─── instradamento dei percorsi ──────────────────────────────────────────────

test('le collezioni condivise vanno sotto workspaces/{wid}', () => {
  for (const col of paths.SHARED) assert.deepEqual(paths.collectionPath(col, ctx), ['workspaces', 'spazio-1', col]);
});

test('le collezioni personali vanno sotto users/{uid}', () => {
  for (const col of paths.PERSONAL) assert.deepEqual(paths.collectionPath(col, ctx), ['users', 'utente-1', col]);
});

test('impostazioni, To Do e comunicazioni restano personali', () => {
  for (const col of ['settings', 'todos', 'customerCommunications', 'customerRequests']) {
    assert.equal(paths.isShared(col), false, col);
    assert.equal(paths.collectionPath(col, ctx)[0], 'users', col);
  }
});

test('nessuna collezione è sia condivisa sia personale', () => {
  const both = paths.SHARED.filter(c => paths.PERSONAL.includes(c));
  assert.deepEqual(both, []);
});

test('una collezione non elencata dà errore', () => {
  assert.throws(() => paths.collectionPath('sconosciuta', ctx), /Collezione non instradata: sconosciuta/);
});

test('senza spazio di lavoro attivo i riferimenti danno un errore chiaro', () => {
  paths.setActiveDataContext(null);
  assert.throws(() => paths.colRef('contacts'), /Spazio di lavoro non ancora pronto/);
  paths.setActiveDataContext(ctx);
  assert.deepEqual(paths.docRef('contacts', 'c1'), [{}, 'workspaces', 'spazio-1', 'contacts', 'c1']);
  paths.setActiveDataContext(null);
});
