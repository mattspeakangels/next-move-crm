// Lavagna "Attività con il cliente" (src/lib/customerBoardCore.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const out = await build({ entryPoints: [fileURLToPath(new URL('../src/lib/customerBoardCore.ts', import.meta.url))], bundle: true, format: 'esm', write: false, platform: 'neutral' });
const b = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

const DAY = 86400_000;
const now = new Date(2026, 10, 16, 12).getTime();
const members = [
  { uid: 'u1', displayName: 'Nicola Brivio', role: 'sales' },
  { uid: 'u2', displayName: 'Monica Colombi', role: 'customer_service' },
  { uid: 'u3', displayName: 'Enrico Locatelli', role: 'graphics' },
];
const mailboxes = [
  { id: 'u1', uid: 'u1', address: 'n.brivio@dorsali.it', displayName: 'Nicola Brivio', kind: 'personal' },
  { id: 'u2', uid: 'u2', address: 'monica@dorsali.it', displayName: 'Monica Colombi', kind: 'personal' },
  { id: 'u3', uid: 'u3', address: 'enrico@dorsali.it', displayName: 'Enrico Locatelli', kind: 'personal' },
  { id: 'info', uid: null, address: 'info@dorsali.it', displayName: 'Casella generale', kind: 'shared' },
];
const cli = { name: 'Anna Rota', email: 'anna@cliente.it' };
let n = 0;
const mail = (thread, daysAgo, dir, inbox, subject, extra = {}) => {
  const box = mailboxes.find(m => m.address === inbox);
  const us = { name: box.displayName, email: box.address };
  return { id: `m${++n}`, threadId: thread, inReplyTo: null, direction: dir, dateMs: now - daysAgo * DAY, date: '', from: dir === 'in' ? cli : us, to: [dir === 'in' ? us : cli], cc: [], subject, body: 'Buongiorno', attachments: [], ...extra };
};
const emails = [
  mail('t1', 40, 'in', 'n.brivio@dorsali.it', 'Richiesta offerta'),
  mail('t1', 39, 'out', 'n.brivio@dorsali.it', 'R: Richiesta offerta', { attachments: ['Offerta_DIS-001.pdf'] }),
  mail('t2', 20, 'in', 'monica@dorsali.it', 'Ordine n. 123/2026', { attachments: ['ordine.pdf'] }),
  mail('t3', 10, 'in', 'enrico@dorsali.it', 'Logo su capi', { attachments: ['logo.png'] }),
  mail('t3', 9, 'out', 'enrico@dorsali.it', 'R: Logo su capi', { attachments: ['rendering_X_v1.pdf'] }),
  mail('t3', 8, 'out', 'enrico@dorsali.it', 'R: Logo su capi', { attachments: ['rendering_X_v2.pdf'] }),
  mail('t3', 7, 'in', 'enrico@dorsali.it', 'R: Logo su capi', { body: 'Perfetto, procedete pure con la produzione.\n\nSaluti' }),
  mail('t4', 2, 'in', 'monica@dorsali.it', 'Capi difettosi'),
];
const deals = [
  { id: 'd1', stage: 'chiuso-vinto', value: 2400, createdAt: now - 40 * DAY, closedAt: now - 20 * DAY, notes: 'Fornitura polo', ownerUid: 'u1' },
  { id: 'd2', stage: 'proposta', value: 1200, createdAt: now - 5 * DAY, notes: 'Fornitura felpe', ownerUid: 'u1' },
];
const board = b.buildBoard({ emails, emailTypes: { m3: 'ordine' }, deals, offers: [], activities: [], mailboxes, members, now });

test('numeri principali', () => {
  assert.equal(board.kpi.emails, 8);
  assert.equal(board.kpi.conversations, 4);
  assert.equal(board.kpi.lastContact, now - 2 * DAY);
  assert.equal(board.kpi.openDeals, 1);
  assert.equal(board.kpi.openValue, 1200);
  assert.equal(board.kpi.wonValue, 2400);
  assert.equal(board.kpi.complaints, 1);
});

test('interazioni divise per reparto, con le persone che lo seguono', () => {
  const dep = Object.fromEntries(board.departments.map(d => [d.department, d]));
  assert.equal(dep.commerciale.interactions, 2);
  assert.equal(dep.customer_service.interactions, 2);
  assert.equal(dep.personalizzazione.interactions, 4);
  assert.deepEqual(dep.personalizzazione.people, ['Enrico Locatelli']);
});

test('ordini: email d\'ordine e opportunità vinte', () => {
  assert.equal(board.orders.length, 2);
  assert.ok(board.orders.some(o => /Ordine n\. 123/.test(o.title)));
  assert.ok(board.orders.some(o => /vinta/.test(o.title)));
});

test('lavori fatti insieme: versioni del rendering e approvazione', () => {
  assert.equal(board.works.length, 1);
  assert.equal(board.works[0].versions, 2);
  assert.equal(board.works[0].approved, true);
});

test('ultime email dalla più recente; storico in ordine e raggruppato per mese', () => {
  assert.equal(board.latestEmails[0].subject, 'Capi difettosi');
  for (let i = 1; i < board.timeline.length; i++) assert.ok(board.timeline[i - 1].at >= board.timeline[i].at);
  assert.ok(board.timeline.some(t => t.kind === 'deal-won'));
  const groups = b.groupByMonth(board.timeline);
  assert.equal(groups.reduce((s, g) => s + g.items.length, 0), board.timeline.length);
  assert.equal(board.months.length, 6);
  assert.equal(board.months.reduce((s, m) => s + Object.values(m.counts).reduce((x, y) => x + y, 0), 0), 8);
});

test('tipo dall\'oggetto quando manca l\'etichetta', () => {
  assert.equal(b.emailType({ subject: 'RE: Richiesta preventivo' }), 'offerta');
  assert.equal(b.emailType({ subject: 'Ricamo logo aziendale' }), 'personalizzazione');
  assert.equal(b.emailType({ subject: 'qualcosa' }, 'ordine'), 'ordine');
});
