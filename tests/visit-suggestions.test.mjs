import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/components/map/commercialPriority.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node' });
const { buildVisitSuggestions } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const now = new Date('2026-11-18T12:00:00').getTime();
const contacts = ['hot', 'cold', 'unknown', 'hidden', 'snoozed'].map(id => ({ id, company: id }));
const visits = [
  { id: '1', contactId: 'hot', type: 'visita', date: now - 1000, outcomeType: 'promessa-callback' },
  { id: '2', contactId: 'cold', type: 'visita', date: now - 1000, outcomeType: 'rifiuto' },
  { id: '3', contactId: 'unknown', type: 'visita', date: now - 1000 },
];
test('prioritizes explicit follow-ups and excludes refusal and missing outcomes', () => {
  const result = buildVisitSuggestions(contacts, visits, [{ contactId: 'cold', stage: 'proposta' }], [], now, () => null);
  assert.deepEqual(result.map(s => s.contact.id), ['hot']);
  assert.match(result[0].reason, /richiamare/);
});
test('respects suppression and orders overdue work ahead of open deals', () => {
  const cs = contacts.map(c => ({ ...c, ...(c.id === 'hidden' ? { mapSuggestionHidden: true } : {}), ...(c.id === 'snoozed' ? { mapSuggestionSnoozeUntil: now + 10000 } : {}) }));
  const deals = ['hot', 'hidden', 'snoozed'].map(contactId => ({ contactId, stage: 'lead' }));
  const todos = [{ contactId: 'unknown', status: 'da-fare', scadenza: '2026-11-17', titolo: 'Richiamare' }];
  const result = buildVisitSuggestions(cs, [], deals, todos, now, () => null);
  assert.deepEqual(result.map(s => s.contact.id), ['unknown', 'hot']);
  assert.match(result[0].reason, /scaduta/);
});
test('ignores planned visits and respects active prospecting pauses', () => {
  const cs = [{ id: 'a', company: 'A', prospectingStato: 'in_pausa', prospectingDataRisveglio: now + 1000 }, { id: 'b', company: 'B' }];
  const result = buildVisitSuggestions(cs, [{ contactId: 'b', type: 'visita', date: now - 1, outcome: 'da-fare', outcomeType: 'riuscita' }], [{ contactId: 'a', stage: 'lead' }], [], now, () => null);
  assert.equal(result.length, 0);
});

test('map colors reflect urgency, refusals, unknown outcomes and suppressed suggestions', async () => {
  const mapBundle = await build({ entryPoints: [fileURLToPath(new URL('../src/components/map/commercialMap.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node' });
  const source = Buffer.from(mapBundle.outputFiles[0].text).toString('base64');
  const { buildMapInsights } = await import('data:text/javascript;base64,' + source);
  const cs = contacts.map(c => c.id === 'hidden' ? { ...c, mapSuggestionHidden: true } : c);
  const result = buildMapInsights(cs, visits, [{ contactId: 'hidden', stage: 'lead' }], [], now);
  assert.equal(result.get('hot').heat, 'hot');
  assert.equal(result.get('cold').heat, 'cold');
  assert.equal(result.get('unknown').heat, 'unknown');
  assert.equal(result.get('hidden').suppressed, true);
});
