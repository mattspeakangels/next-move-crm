// Giornata simulata del laboratorio (src/lib/labSimCore.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const out = await build({ entryPoints: [fileURLToPath(new URL('../src/lib/labSimCore.ts', import.meta.url))], bundle: true, format: 'esm', write: false, platform: 'neutral' });
const sim = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

const members = [
  { uid: 'u-sales', displayName: 'Federica Rossetti', role: 'sales' },
  { uid: 'u-sales2', displayName: 'Giorgio Agazzi', role: 'sales' },
  { uid: 'u-cs', displayName: 'Davide Fumagalli', role: 'customer_service' },
  { uid: 'u-gr', displayName: 'Claudio Vitali', role: 'graphics' },
];
const mailboxes = [
  ...members.map(m => ({ id: m.uid, uid: m.uid, address: `${m.uid}@dorsali.it`, displayName: m.displayName, kind: 'personal' })),
  { id: 'info', uid: null, address: 'info@dorsali.it', displayName: 'Dorsali — casella generale', kind: 'shared' },
];
const contacts = [
  ...Array.from({ length: 30 }, (_, i) => ({ id: `cust-${i}`, company: `Cliente ${i} Srl`, status: 'cliente', email: `a${i}@cliente${i}.it`, contactName: `Anna ${i}`, ownerUid: i % 2 ? 'u-sales' : 'u-sales2' })),
  ...Array.from({ length: 50 }, (_, i) => ({ id: `pros-${i}`, company: `Prospect ${i} Snc`, status: 'potenziale', email: `b${i}@pros${i}.it`, contactName: `Bruno ${i}`, ownerUid: i % 3 ? null : 'u-sales' })),
];
const deals = Array.from({ length: 20 }, (_, i) => ({ id: `deal-${i}`, contactId: `cust-${i}`, stage: ['lead', 'qualificato', 'proposta', 'negoziazione', 'chiuso-vinto'][i % 5], ownerUid: 'u-sales', value: 1000 }));
// Lunedì 16 novembre 2026, mezzanotte locale
const monday = sim.localDay(new Date(2026, 10, 16, 10).getTime());
const input = (d = monday) => ({ wid: 'lab-distributore', day: d.day, dayStart: d.start, contacts, deals, mailboxes, members });

test('stesso spazio e stesso giorno: stesso piano; giorno diverso: piano diverso', () => {
  assert.deepEqual(sim.planDay(input()), sim.planDay(input()));
  const tue = sim.localDay(monday.start + 36 * 3600_000);
  assert.notDeepEqual(sim.planDay(input(tue)).events.map(e => e.id), sim.planDay(input()).events.map(e => e.id).slice(0, 0));
  assert.notEqual(JSON.stringify(sim.planDay(input(tue)).events), JSON.stringify(sim.planDay(input()).events));
});

test('giornata feriale piena: email da clienti e prospect, risposte, nuovi prospect, opportunità', () => {
  const p = sim.planDay(input());
  assert.ok(p.summary.emailIn >= 10, `email in arrivo: ${p.summary.emailIn}`);
  assert.ok(p.summary.emailOut >= 1, 'il team risponde');
  assert.ok(p.summary.newProspects >= 1, 'nuovi prospect dal sito');
  assert.ok(p.summary.dealsAdvanced >= 1, 'opportunità che avanzano');
  for (const e of p.events) assert.ok(e.at >= monday.start && e.at < monday.start + 86400_000, `${e.id} fuori dal giorno`);
  for (let i = 1; i < p.events.length; i++) assert.ok(p.events[i - 1].at <= p.events[i].at, 'ordine cronologico');
  assert.equal(new Set(p.events.map(e => e.id)).size, p.events.length, 'id duplicati');
  assert.ok(p.events.every(e => e.id.startsWith('sim-20261116-')));
});

test('le email dei clienti vanno al loro commerciale o al reparto giusto, i nuovi prospect alla casella generale', () => {
  const p = sim.planDay(input());
  const byId = new Map(contacts.map(c => [c.id, c]));
  const newIds = new Set(p.events.filter(e => e.kind === 'contact').map(e => e.id));
  for (const e of p.events.filter(e => e.kind === 'email' && e.email.direction === 'in' && e.label.customerId)) {
    const to = e.email.to[0].email;
    if (newIds.has(e.label.customerId)) { assert.equal(to, 'info@dorsali.it', e.id); continue; }
    const c = byId.get(e.label.customerId);
    if (e.label.type === 'offerta' || e.label.type === 'informazioni') assert.equal(to, c.ownerUid ? `${c.ownerUid}@dorsali.it` : 'info@dorsali.it', e.id);
    else assert.ok(mailboxes.some(m => m.address === to), e.id);
  }
});

test('le risposte del team arrivano dopo la richiesta, nello stesso thread', () => {
  const p = sim.planDay(input());
  const byId = new Map(p.events.map(e => [e.id, e]));
  const replies = p.events.filter(e => e.kind === 'email' && e.email.direction === 'out');
  assert.ok(replies.length > 0);
  for (const r of replies) {
    const q = byId.get(r.email.inReplyTo);
    assert.ok(q && q.at < r.at && q.email.threadId === r.email.threadId, r.id);
    assert.equal(r.email.to[0].email, q.email.from.email);
  }
});

test('le opportunità avanzano di una fase alla volta; le nuove nascono in "lead"', () => {
  const p = sim.planDay(input());
  const order = ['lead', 'qualificato', 'proposta', 'negoziazione'];
  for (const e of p.events.filter(e => e.kind === 'deal-update')) {
    const before = deals.find(d => d.id === e.dealId).stage;
    assert.notEqual(before, 'chiuso-vinto', 'una opportunità chiusa non si muove');
    if (before === 'negoziazione') assert.ok(e.updates.stage.startsWith('chiuso'));
    else assert.equal(e.updates.stage, order[order.indexOf(before) + 1]);
  }
  for (const e of p.events.filter(e => e.kind === 'deal-new')) assert.equal(e.deal.stage, 'lead');
});

test('domenica quasi ferma', () => {
  const sunday = sim.localDay(new Date(2026, 10, 15, 10).getTime());
  const p = sim.planDay(input(sunday));
  assert.ok(p.summary.emailIn <= 1 && p.summary.newProspects === 0 && p.summary.dealsAdvanced === 0);
});

test('gli eventi "accadono" solo quando ne arriva l\'ora, una volta sola', () => {
  const p = sim.planDay(input());
  const noon = monday.start + 12 * 3600_000;
  const due = sim.dueEvents(p, [], noon);
  assert.ok(due.every(e => e.at <= noon));
  assert.ok(due.length > 0 && due.length < p.events.length);
  assert.equal(sim.dueEvents(p, due.map(e => e.id), noon).length, 0);
  assert.equal(sim.dueEvents(p, [], monday.start + 86400_000).length, p.events.length);
});

test('recupero dei giorni arretrati, al massimo 14', () => {
  const now = new Date(2026, 10, 16, 9).getTime();
  assert.deepEqual(sim.daysToRun('2026-11-13', now).map(d => d.day), ['2026-11-14', '2026-11-15', '2026-11-16']);
  assert.deepEqual(sim.daysToRun('2026-11-16', now).map(d => d.day), ['2026-11-16']);
  assert.deepEqual(sim.daysToRun(null, now).map(d => d.day), ['2026-11-16']);
  assert.equal(sim.daysToRun('2026-01-01', now).length, 14);
});

test('nessun valore undefined (Firestore li rifiuta)', () => {
  const p = sim.planDay(input());
  const walk = (o, path) => {
    if (o === undefined) assert.fail(`undefined in ${path}`);
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  };
  walk(p, 'plan');
});
