// Test della lettura di date e numeri all'italiana (src/utils/italianFormat.ts)
// e della data ISO nello Storico (prima veniva scartata).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const load = async file => {
  const out = await build({
    entryPoints: [fileURLToPath(new URL(`../src/${file}`, import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
    plugins: [{ name: 'stub', setup(b) { b.onResolve({ filter: /ui\/Feedback$/ }, () => ({ path: 'f', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const showNotice=()=>{};' })); } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
};
const { parseItalianNumber, parseItalianDate } = await load('utils/italianFormat.ts');
const { parseCSVData } = await load('lib/storicoParse.ts');

test('numeri all\'italiana', () => {
  assert.equal(parseItalianNumber('1.234,56'), 1234.56);
  assert.equal(parseItalianNumber('1234,56'), 1234.56);
  assert.equal(parseItalianNumber('1.583.885'), 1583885);
  assert.equal(parseItalianNumber('7.529'), 7529);
  assert.equal(parseItalianNumber('12.5'), 12.5);
  assert.equal(parseItalianNumber('€ 1.200'), 1200);
  assert.equal(parseItalianNumber('-3,5'), -3.5);
  assert.ok(Number.isNaN(parseItalianNumber('abc')));
});

test('date con il giorno prima del mese', () => {
  const d = ts => { const x = new Date(ts); return [x.getFullYear(), x.getMonth() + 1, x.getDate()]; };
  assert.deepEqual(d(parseItalianDate('03/04/2026')), [2026, 4, 3]); // 3 aprile, non 4 marzo
  assert.deepEqual(d(parseItalianDate('13-11-2026')), [2026, 11, 13]);
  assert.deepEqual(d(parseItalianDate('13.11.26')), [2026, 11, 13]);
  assert.deepEqual(d(parseItalianDate('2026-10-01')), [2026, 10, 1]);
  assert.equal(new Date(parseItalianDate('13/11/2026 09:30')).getHours(), 9);
  assert.ok(Number.isNaN(parseItalianDate('31/02/2026')));
  assert.ok(Number.isNaN(parseItalianDate('domani')));
});

test('Storico: la data ISO non viene più scartata', () => {
  const rows = [['Cliente', 'Item ID', 'Prodotto', 'Data', 'Anno', 'Importo', 'Quantita'],
    ['Rossi Srl', 'A1', 'Giacca', '2026-10-01', '', '125,50', '5']];
  const out = parseCSVData(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].fatturato2026, 125.5);
  assert.equal(out[0].prodotti[0].ordini[0].date, '01-10-2026');
});
