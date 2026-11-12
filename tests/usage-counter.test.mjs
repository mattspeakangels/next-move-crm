// Test del documento del contatore delle aperture (src/lib/usageCounter.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const out = await build({
  entryPoints: [fileURLToPath(new URL('../src/lib/usageCounter.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'stub', setup(b) {
    b.onResolve({ filter: /^(firebase\/firestore|\.\/firebase)$/ }, a => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const db={}; export const setDoc=()=>Promise.resolve(); export const increment=n=>n; export const collection=()=>0; export const doc=()=>0;' }));
  } }],
});
const { usageCounterDoc, usageMonth } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

test('un documento per mese e scheda, senza dati personali', () => {
  const d = usageCounterDoc('offers', new Date(2026, 10, 12));
  assert.deepEqual(d, { id: '2026-11_offers', fields: { section: 'opportunita', tab: 'offers', month: '2026-11' } });
});

test('la mappa a schermo intero conta come Mappa', () => {
  assert.equal(usageCounterDoc('map-full', new Date(2026, 0, 5)).id, '2026-01_map');
});

test('mese a due cifre', () => {
  assert.equal(usageMonth(new Date(2026, 2, 1)), '2026-03');
});
