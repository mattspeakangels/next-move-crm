// Test della visita guidata (src/lib/guidedTour.ts): ogni passo apre una vista reale
// e le mansioni vedono solo le schermate che possono aprire.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const out = await build({ entryPoints: [fileURLToPath(new URL('../src/lib/guidedTour.ts', import.meta.url))], bundle: true, format: 'esm', write: false, platform: 'neutral' });
const tour = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const navSrc = await readFile(new URL('../src/lib/navSections.ts', import.meta.url), 'utf8');

test('ogni vista dei passi esiste nel menu', () => {
  for (const s of tour.TOUR_STEPS) if (s.view) assert.ok(navSrc.includes(`view: '${s.view}'`), `${s.id}: vista ${s.view} assente dal menu`);
});

test('gli id dei passi sono unici e il primo è il benvenuto', () => {
  const ids = tour.TOUR_STEPS.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids[0], 'benvenuto');
});

test('il titolare vede tutti i passi', () => {
  assert.equal(tour.stepsForRole('owner').length, tour.TOUR_STEPS.length);
});

test('la grafica non vede Pipeline, Mappa e Analisi', () => {
  const views = tour.stepsForRole('graphics').map(s => s.view).filter(Boolean);
  for (const v of ['deals', 'map', 'analytics', 'storico', 'todo']) assert.equal(views.includes(v), false, v);
  assert.ok(views.includes('contacts') && views.includes('offers') && views.includes('settings'));
});

test('i passi senza vista (benvenuto, microfono) restano per tutte le mansioni', () => {
  for (const role of ['customer_service', 'marketing', 'accounting', 'graphics']) {
    const ids = tour.stepsForRole(role).map(s => s.id);
    assert.ok(ids.includes('benvenuto') && ids.includes('microfono'), role);
  }
});
