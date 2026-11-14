// Dati di esempio della visita guidata (src/data/demoData.ts) e modalità dimostrazione.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const load = async rel => {
  const out = await build({ entryPoints: [fileURLToPath(new URL(rel, import.meta.url))], bundle: true, format: 'esm', write: false, platform: 'neutral' });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
};
const { buildDemoData } = await load('../src/data/demoData.ts');
const tour = await load('../src/lib/guidedTour.ts');
const demo = buildDemoData(Date.UTC(2026, 10, 14, 9));
const syncSrc = await readFile(new URL('../src/lib/useFirestoreSync.ts', import.meta.url), 'utf8');
const demoSrc = await readFile(new URL('../src/lib/demoMode.ts', import.meta.url), 'utf8');
const list = src => JSON.stringify(src.match(/COLLECTIONS = \[([^\]]+)\]/)[1].match(/'[^']+'/g).sort());

test('la modalità dimostrazione copre tutte le collezioni sincronizzate col cloud', () => {
  assert.equal(list(demoSrc), list(syncSrc));
});

test('il sync col cloud si ferma durante la dimostrazione', () => {
  assert.equal((syncSrc.match(/if \(isDemoActive\(\)\) return;/g) ?? []).length, 2);
});

test('ogni riferimento a un cliente punta a un cliente di esempio esistente', () => {
  const ids = new Set(Object.keys(demo.contacts));
  for (const col of ['deals', 'offers', 'activities', 'salesTransactions', 'strategicFocuses']) {
    for (const x of Object.values(demo[col])) assert.ok(ids.has(x.contactId), `${col} ${x.id} → ${x.contactId}`);
  }
  for (const t of Object.values(demo.todos)) if (t.contactId) assert.ok(ids.has(t.contactId), t.id);
  for (const c of Object.values(demo.contacts)) if (c.groupId) assert.ok(demo.groups[c.groupId], c.id);
});

test('gli id sono tutti marcati demo- e le chiavi coincidono con gli id', () => {
  for (const [col, map] of Object.entries(demo)) for (const [k, v] of Object.entries(map)) {
    assert.equal(k, v.id, `${col} ${k}`);
    assert.ok(k.startsWith('demo-'), `${col} ${k}`);
  }
});

test('i clienti citati nei testi della visita esistono nei dati di esempio', () => {
  const companies = Object.values(demo.contacts).map(c => c.company);
  const text = tour.TOUR_STEPS.map(s => [s.body, ...(s.tips ?? [])].join(' ')).join(' ');
  for (const name of ['Edil Rossi', 'Tecno Servizi', 'Ferramenta Bianchi', 'Elettro Gamma', 'Logistica Nord']) {
    assert.ok(text.includes(name), `testo senza ${name}`);
    assert.ok(companies.some(c => c.includes(name)), `dati senza ${name}`);
  }
  for (const s of tour.TOUR_STEPS) if (s.openContact) assert.ok(demo.contacts[s.openContact], s.id);
});

test('la trattativa citata (Edil Rossi, 12.400 €, negoziazione) è nei dati', () => {
  const d = Object.values(demo.deals).find(x => x.contactId === 'demo-edilrossi');
  assert.equal(d.value, 12400); assert.equal(d.stage, 'negoziazione');
});
