import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const source = await readFile(new URL('../src/lib/customerWork.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const { groupCustomerWork, todoDeadline, UNASSIGNED_CUSTOMER, postponeCustomerWork, archiveCustomerWork, countCustomerWork } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);

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
test('open customer requests appear with their customer and influence deadline order', () => {
  const requests = [
    { id: 'r1', contactId: 'b', status: 'in_progress', dueDate: '2026-11-01', category: 'after_sales' },
    { id: 'r2', contactId: 'a', status: 'closed', dueDate: '2026-10-01', category: 'marketing' },
  ];
  const groups = groupCustomerWork({ a: { company: 'Alfa' }, b: { company: 'Beta' } }, [], [{ id: 't', contactId: 'a', status: 'da-fare', scadenza: '2026-11-10' }], requests);
  assert.deepEqual(groups.map(group => group.id), ['b', 'a']);
  assert.deepEqual(groups[0].requests.map(request => request.id), ['r1']);
  assert.equal(groups[1].requests.length, 0);
});

// ─── Menu ⋯ della Dashboard: posticipa / archivia / elimina tutto ───────────
const NOW = new Date(2026, 10, 12, 10).getTime();
const DAY = 86400000;
const group = () => ({
  id: 'a', name: 'Alfa',
  deals: [
    { id: 'scaduta', contactId: 'a', stage: 'proposta', nextAction: 'Richiamare', nextActionType: 'chiama', nextActionDeadline: NOW - 2 * DAY },
    { id: 'futura', contactId: 'a', stage: 'proposta', nextAction: 'Offerta', nextActionDeadline: NOW + 10 * DAY },
  ],
  todos: [{ id: 't1', contactId: 'a', status: 'da-fare', titolo: 'Campioni', scadenza: '2026-11-10' }, { id: 't2', contactId: 'a', status: 'da-fare', titolo: 'Senza data' }],
  requests: [{ id: 'r1', contactId: 'a', status: 'open', dueDate: '2026-11-20', category: 'after_sales' }],
});

test('posticipa: le scadenze passate ripartono da oggi, le future si spostano in avanti', () => {
  const c = postponeCustomerWork(group(), 3, NOW);
  assert.equal(c.deals.find(d => d.id === 'scaduta').updates.nextActionDeadline, NOW + 3 * DAY);
  assert.equal(c.deals.find(d => d.id === 'futura').updates.nextActionDeadline, NOW + 13 * DAY);
  assert.equal(c.todos.find(t => t.id === 't1').updates.scadenza, '2026-11-15');
  assert.equal(c.todos.find(t => t.id === 't2').updates.scadenza, '2026-11-15');
  assert.equal(c.requests[0].dueDate, '2026-11-23');
  assert.equal(c.activities.length, 0);
  assert.equal(c.deleteTodoIds.length, 0);
});

test('archivia: azioni nell\'archivio Attività, To Do fatti, richieste chiuse, opportunità intatte', () => {
  const c = archiveCustomerWork(group(), NOW);
  assert.equal(c.activities.length, 2);
  assert.equal(c.activities[0].type, 'chiamata');
  assert.equal(c.activities[0].dealId, 'scaduta');
  assert.match(c.activities[0].notes, /Richiamare/);
  assert.deepEqual(c.deals.map(d => d.updates), [{ nextAction: '', nextActionDeadline: 0 }, { nextAction: '', nextActionDeadline: 0 }]);
  assert.ok(c.todos.every(t => t.updates.status === 'fatto' && t.updates.completedAt === NOW));
  assert.equal(c.deleteTodoIds.length, 0);
  assert.equal(c.requests[0].status, 'closed');
  assert.equal(new Set(c.activities.map(a => a.id)).size, 2);
});

test('elimina: i To Do vengono cancellati, le azioni delle opportunità vanno comunque in archivio', () => {
  const c = archiveCustomerWork(group(), NOW, { deleteTodos: true });
  assert.deepEqual(c.deleteTodoIds, ['t1', 't2']);
  assert.equal(c.todos.length, 0);
  assert.equal(c.activities.length, 2);
  assert.equal(countCustomerWork(group()), 5);
});

test('dopo l\'archiviazione il cliente sparisce da "Clienti da seguire"', () => {
  const g = group();
  const c = archiveCustomerWork(g, NOW);
  const deals = g.deals.map(d => ({ ...d, ...c.deals.find(x => x.id === d.id).updates }));
  const todos = g.todos.map(t => ({ ...t, ...c.todos.find(x => x.id === t.id).updates }));
  assert.deepEqual(groupCustomerWork({ a: { company: 'Alfa' } }, deals, todos, c.requests), []);
});
