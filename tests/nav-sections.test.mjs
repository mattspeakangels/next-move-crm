// Test del menu a voci raggruppate (src/lib/navSections.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const source = await readFile(new URL('../src/lib/navSections.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const nav = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);

const OLD_MENU = ['dashboard', 'deals', 'strategia', 'contacts', 'offers', 'products', 'agenda', 'attivita', 'map', 'todo', 'analytics', 'storico', 'legal', 'settings'];

test('ogni voce del vecchio menu finisce in una sola voce nuova', () => {
  const seen = new Map();
  for (const s of nav.NAV_SECTIONS) for (const t of s.tabs) {
    assert.equal(seen.has(t.view), false, `${t.view} in due voci`);
    seen.set(t.view, s.id);
  }
  for (const v of OLD_MENU) assert.ok(seen.has(v), `${v} non ha una voce`);
});

test('le viste sono assegnate alla voce concordata', () => {
  const expected = { todo: 'oggi', strategia: 'clienti', offers: 'opportunita', products: 'opportunita', attivita: 'agenda', storico: 'analisi', legal: 'impostazioni', 'map-full': 'mappa', prospecting: 'opportunita' };
  for (const [view, section] of Object.entries(expected)) assert.equal(nav.sectionOf(view), section, view);
});

test('il menu principale ha 6 voci, Impostazioni a parte', () => {
  assert.equal(nav.MAIN_SECTION_IDS.length, 6);
  assert.equal(nav.MAIN_SECTION_IDS.includes('impostazioni'), false);
});

test('l\'ordine salvato con il vecchio menu viene convertito', () => {
  assert.deepEqual(nav.orderMainSections(['agenda', 'attivita', 'storico', 'contacts']),
    ['agenda', 'analisi', 'clienti', 'oggi', 'opportunita', 'mappa']);
  assert.deepEqual(nav.orderMainSections([]), nav.MAIN_SECTION_IDS);
  assert.deepEqual(nav.orderMainSections(['legal', 'settings']), nav.MAIN_SECTION_IDS);
});

test('barra in basso: viste vecchie convertite, massimo 4, valore di base', () => {
  assert.deepEqual(nav.footerSections(['dashboard', 'deals', 'agenda', 'contacts']), ['oggi', 'opportunita', 'agenda', 'clienti']);
  assert.deepEqual(nav.footerSections(['deals', 'offers', 'todo']), ['opportunita', 'oggi']);
  assert.deepEqual(nav.footerSections(['dashboard', 'deals', 'agenda', 'contacts', 'map']).length, 4);
  assert.deepEqual(nav.footerSections([]), nav.DEFAULT_FOOTER_SECTIONS);
});

test('la vista principale di ogni voce è la prima scheda', () => {
  assert.equal(nav.primaryView('opportunita'), 'deals');
  assert.equal(nav.primaryView('oggi'), 'dashboard');
});
