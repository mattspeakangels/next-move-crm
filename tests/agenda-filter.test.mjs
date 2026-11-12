// Test del filtro categorie dell'Agenda (src/lib/agendaFilter.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const source = await readFile(new URL('../src/lib/agendaFilter.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const { isShownInAgenda, AGENDA_CATEGORIES, DEFAULT_AGENDA_CATEGORIES, loadAgendaCategories } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);

test('di base l\'Agenda mostra solo gli appuntamenti', () => {
  assert.equal(isShownInAgenda({ type: 'visita', outcome: 'da-fare' }, DEFAULT_AGENDA_CATEGORIES), true);
  assert.equal(isShownInAgenda({ type: 'call-remota', outcome: 'da-fare' }, DEFAULT_AGENDA_CATEGORIES), true);
  assert.equal(isShownInAgenda({ type: 'chiamata', outcome: 'fatto' }, DEFAULT_AGENDA_CATEGORIES), false);
  assert.equal(isShownInAgenda({ type: 'email', outcome: 'fatto' }, DEFAULT_AGENDA_CATEGORIES), false);
  assert.equal(isShownInAgenda({ type: 'nota', outcome: 'fatto' }, DEFAULT_AGENDA_CATEGORIES), false);
});

test('le azioni archiviate non compaiono mai, neanche se sono visite', () => {
  const tutte = AGENDA_CATEGORIES.map(c => c.id);
  assert.equal(isShownInAgenda({ type: 'visita', outcome: 'archiviata' }, tutte), false);
  assert.equal(isShownInAgenda({ type: 'chiamata', outcome: 'archiviata' }, tutte), false);
});

test('attivando una categoria compaiono i suoi tipi', () => {
  assert.equal(isShownInAgenda({ type: 'chiamata', outcome: 'fatto' }, ['appuntamenti', 'contatti']), true);
  assert.equal(isShownInAgenda({ type: 'ufficio', outcome: 'da-fare' }, ['organizzazione']), true);
});

test('ogni tipo di attività appartiene a una sola categoria', () => {
  const tipi = AGENDA_CATEGORIES.flatMap(c => c.types);
  assert.equal(new Set(tipi).size, tipi.length);
  assert.equal(tipi.length, 15);
});

test('senza localStorage si parte dai soli appuntamenti', () => {
  assert.deepEqual(loadAgendaCategories(), ['appuntamenti']);
});
