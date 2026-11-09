import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const source = await readFile(new URL('../src/lib/customerWork.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const { groupCustomerWork, todoDeadline, UNASSIGNED_CUSTOMER } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);

test('groups open work by customer and keeps unassigned items visible', () => {
  const contacts = { a: { company: 'Alfa' }, b: { company: 'Beta' } };
  const deals = [{ id: 'd1', contactId: 'a', stage: 'proposta', nextAction: 'Invia offerta', nextActionDeadline: 0 }, { id: 'closed', contactId: 'b', stage: 'chiuso-vinto', nextAction: 'Non mostrare' }];
  const todos = [{ id: 't1', contactId: 'a', status: 'da-fare', titolo: 'Campioni', scadenza: '2026-11-10' }, { id: 't2', status: 'da-fare', titolo: 'Da assegnare' }, { id: 't3', contactId: 'b', status: 'fatto', titolo: 'Completata' }];
  const result = groupCustomerWork(contacts, deals, todos);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].deals.map(x => x.id), ['d1']);
  assert.deepEqual(result[0].todos.map(x => x.id), ['t1']);
  assert.equal(result[1].id, UNASSIGNED_CUSTOMER);
});

test('orders by earliest valid deadline and treats invalid dates as unscheduled', () => {
  const groups = groupCustomerWork({ a: { company: 'Alfa' }, b: { company: 'Beta' } }, [], [
    { id: 'a', contactId: 'a', status: 'da-fare', scadenza: '2026-02-30' },
    { id: 'b', contactId: 'b', status: 'da-fare', scadenza: '2026-11-10' },
  ]);
  assert.equal(groups[0].id, 'b');
  assert.equal(todoDeadline('2026-02-30'), Infinity);
  assert.equal(todoDeadline(undefined), Infinity);
});
