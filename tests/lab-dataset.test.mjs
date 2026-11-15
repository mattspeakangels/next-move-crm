// Dataset simulato del laboratorio (lab/dataset): deterministico e con le proporzioni attese.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateDataset, START, END } from '../lab/dataset/generate.mjs';
import { FORBIDDEN_WORDS } from '../lab/dataset/names.mjs';

const hash = (o) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
const ds = generateDataset();
const E = ds.emails;
const business = E.filter((e) => e.labels.customerId);
const noise = E.filter((e) => !e.labels.customerId);

test('due esecuzioni con lo stesso seed producono lo stesso dataset', () => {
  assert.equal(hash(generateDataset()), hash(ds));
  assert.notEqual(hash(generateDataset(7)), hash(ds), 'un seed diverso deve cambiare il dataset');
});

test('tra 800 e 1.000 email, in ordine cronologico, su 6 mesi', () => {
  assert.ok(E.length >= 800 && E.length <= 1000, `email: ${E.length}`);
  for (let i = 1; i < E.length; i++) assert.ok(E[i - 1].date <= E[i].date, `ordine rotto a ${E[i].id}`);
  const first = Date.parse(E[0].date), last = Date.parse(E.at(-1).date);
  assert.ok(first >= START && last < END);
  assert.ok(last - first > 170 * 86400_000, 'le email devono coprire circa 6 mesi');
  for (let m = 4; m <= 9; m++) assert.ok(E.some((e) => new Date(e.date).getUTCMonth() === m), `nessuna email nel mese ${m + 1}`);
  assert.equal(new Set(E.map((e) => e.id)).size, E.length, 'id duplicati');
});

test('tre aziende fittizie con colleghi nei tre ruoli', () => {
  assert.deepEqual(ds.companies.map((c) => c.kind).sort(), ['agente', 'distributore', 'personalizzatore']);
  for (const c of ds.companies) {
    for (const r of ['commerciale', 'customer_service', 'personalizzazione']) assert.ok(c.colleagues.some((x) => x.role === r), `${c.id}: manca ${r}`);
  }
});

test('15-30 clienti per azienda, tra dealer ed end user', () => {
  for (const c of ds.companies) {
    const list = ds.customers.filter((x) => x.companyId === c.id);
    assert.ok(list.length >= 15 && list.length <= 30, `${c.id}: ${list.length} clienti`);
    assert.ok(list.some((x) => x.type === 'dealer') && list.some((x) => x.type === 'end_user'), c.id);
  }
});

test('circa 40% di rumore (newsletter, notifiche, personali)', () => {
  const share = noise.length / E.length;
  assert.ok(share >= 0.35 && share <= 0.45, `rumore ${(share * 100).toFixed(1)}%`);
  for (const t of ['newsletter', 'notifica', 'personale']) assert.ok(noise.some((e) => e.labels.type === t), t);
  for (const e of noise) assert.deepEqual([e.labels.dealId, e.labels.kind, e.labels.actor], [null, 'nessuna', null]);
});

test('tutti i tipi di contenuto sono presenti', () => {
  for (const t of ['offerta', 'gara', 'personalizzazione', 'ordine', 'sollecito', 'reclamo']) {
    assert.ok(business.filter((e) => e.labels.type === t).length >= 10, `pochi messaggi di tipo ${t}`);
  }
  const gare = ds.deals.filter((d) => d.kind === 'gara');
  assert.ok(gare.length > 0 && gare.every((d) => /^B[0-9A-F]{9}$/.test(d.cig) && d.lotti >= 1 && d.scadenza));
  assert.ok(E.some((e) => e.attachments.some((a) => /_v2\.pdf$/.test(a))), 'rendering in più versioni');
  assert.ok(E.some((e) => e.attachments.some((a) => /_v3\.pdf$/.test(a))), 'rendering v3');
  assert.ok(business.some((e) => e.cc.length > 0), 'colleghi in copia');
});

test('realismo: firme, testo citato, refusi, mittenti nuovi, domini generici', () => {
  assert.ok(business.every((e) => /\n\n.+\n/.test(e.body)), 'firma mancante');
  assert.ok(E.filter((e) => e.meta.quoted && /ha scritto:\n> /.test(e.body)).length >= 50, 'testo citato');
  assert.ok(E.filter((e) => e.meta.typos > 0).length >= 30, 'refusi');
  const newSenders = E.filter((e) => e.meta.newSender);
  assert.ok(newSenders.length >= 5, 'mittenti nuovi');
  for (const e of newSenders) {
    const cust = ds.customers.find((c) => c.id === e.labels.customerId);
    assert.ok(e.from.email.endsWith(`@${cust.domain}`), 'mittente nuovo con dominio aziendale');
    assert.ok(!cust.contacts.some((c) => c.email === e.from.email), 'il mittente nuovo non è già in anagrafica');
  }
  assert.ok(business.filter((e) => /@(gmail\.com|libero\.it)$/.test(e.from.email)).length >= 10, 'gmail/libero');
});

test('conversazioni: le risposte restano nello stesso thread e rispondono a un messaggio precedente', () => {
  const byId = new Map(E.map((e) => [e.id, e]));
  const replies = E.filter((e) => e.inReplyTo);
  assert.ok(replies.length >= 200);
  for (const r of replies) {
    const p = byId.get(r.inReplyTo);
    assert.ok(p && p.threadId === r.threadId && p.date <= r.date, `${r.id} → ${r.inReplyTo}`);
  }
});

test('ogni email ha la risposta giusta coerente', () => {
  const cust = new Map(ds.customers.map((c) => [c.id, c]));
  const deals = new Map(ds.deals.map((d) => [d.id, d]));
  const people = new Set(ds.companies.flatMap((c) => c.colleagues.map((x) => x.id)));
  for (const e of business) {
    const c = cust.get(e.labels.customerId);
    assert.ok(c && c.companyId === e.mailbox, `${e.id}: cliente`);
    if (e.labels.dealId) assert.equal(deals.get(e.labels.dealId)?.customerId, c.id, `${e.id}: opportunità di un altro cliente`);
    assert.ok(['richiesta', 'aggiornamento'].includes(e.labels.kind), e.id);
    const a = e.labels.actor;
    if (a.role === 'cliente') assert.equal(e.direction, 'out', e.id);
    else assert.ok(people.has(a.personId) && ['commerciale', 'customer_service', 'personalizzazione'].includes(a.role), `${e.id}: chi agisce`);
  }
  assert.ok(business.some((e) => e.labels.kind === 'richiesta') && business.some((e) => e.labels.kind === 'aggiornamento'));
});

test('solo nomi di fantasia: nessun marchio o cliente reale', () => {
  const text = JSON.stringify(ds).toLowerCase();
  for (const w of FORBIDDEN_WORDS) assert.equal(text.includes(w), false, `parola vietata: ${w}`);
});
