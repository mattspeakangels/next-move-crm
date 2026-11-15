// Posta del laboratorio (src/lib/labMailCore.ts): chi vede quali email.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const out = await build({ entryPoints: [fileURLToPath(new URL('../src/lib/labMailCore.ts', import.meta.url))], bundle: true, format: 'esm', write: false, platform: 'neutral' });
const m = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

const boxes = [
  { id: 'u1', uid: 'u1', address: 'marco.rossi@dorsali.it', kind: 'personal' },
  { id: 'u2', uid: 'u2', address: 'sara.riva@dorsali.it', kind: 'personal' },
  { id: 'info', uid: null, address: 'info@dorsali.it', kind: 'shared' },
];
const mail = (id, to, cc = [], extra = {}) => ({ id, direction: 'in', dateMs: Number(id.slice(1)), from: { name: 'Cliente', email: 'anna@cliente.it' }, to: to.map(email => ({ name: '', email })), cc: cc.map(email => ({ name: '', email })), subject: id, body: '', attachments: [], ...extra });

test('ognuno vede le email indirizzate a lui o in copia, dalla più recente', () => {
  const all = [mail('m1', ['marco.rossi@dorsali.it']), mail('m2', ['sara.riva@dorsali.it'], ['Marco.Rossi@dorsali.it']), mail('m3', ['sara.riva@dorsali.it'])];
  const mine = m.inboxFor(all, m.addressesFor('u1', 'customer_service', boxes));
  assert.deepEqual(mine.map(x => x.id), ['m2', 'm1']);
  assert.equal(m.relevance(all[1], ['marco.rossi@dorsali.it']), 'cc');
});

test('la casella generale la leggono titolari e commerciali, non gli altri ruoli', () => {
  const info = [mail('m9', ['info@dorsali.it'])];
  for (const role of ['owner', 'admin', 'sales', 'bdr']) assert.equal(m.inboxFor(info, m.addressesFor('u1', role, boxes)).length, 1, role);
  for (const role of ['customer_service', 'graphics', 'accounting']) assert.equal(m.inboxFor(info, m.addressesFor('u1', role, boxes)).length, 0, role);
});

test('le email inviate restano fuori dalla casella salvo richiesta', () => {
  const sent = [mail('m5', ['anna@cliente.it'], [], { direction: 'out', from: { name: 'Marco', email: 'marco.rossi@dorsali.it' } })];
  assert.equal(m.inboxFor(sent, ['marco.rossi@dorsali.it']).length, 0);
  assert.equal(m.inboxFor(sent, ['marco.rossi@dorsali.it'], { includeSent: true }).length, 1);
  assert.equal(m.isUnread(sent[0], 'u1'), false);
});

test('da leggere finché la persona non la apre', () => {
  const x = mail('m1', ['marco.rossi@dorsali.it']);
  assert.equal(m.isUnread(x, 'u1'), true);
  assert.equal(m.isUnread({ ...x, readBy: { u1: true } }, 'u1'), false);
  assert.equal(m.isUnread({ ...x, readBy: { u1: true } }, 'u2'), true);
});

test('mittente riconosciuto per indirizzo, poi per dominio, mai per domini generici', () => {
  const contacts = [
    { id: 'c1', company: 'Cliente Srl', status: 'cliente', emails: ['anna@cliente.it'], domain: 'cliente.it' },
    { id: 'p1', company: 'Prospect Snc', status: 'potenziale', emails: ['luca77@gmail.com'], domain: 'prospect.it' },
  ];
  assert.equal(m.matchContact(mail('m1', []), contacts).id, 'c1');
  assert.equal(m.matchContact(mail('m1', [], [], { from: { name: '', email: 'nuovo@prospect.it' } }), contacts).id, 'p1');
  assert.equal(m.matchContact(mail('m1', [], [], { from: { name: '', email: 'luca77@gmail.com' } }), contacts).id, 'p1');
  assert.equal(m.matchContact(mail('m1', [], [], { from: { name: '', email: 'altro@gmail.com' } }), contacts), null);
  assert.equal(m.domainFromWebsite('https://www.cliente.it/contatti'), 'cliente.it');
});
