// Test della lettura dei file Storico (src/lib/storicoParse.ts), spostata dalla vista nel Blocco 3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const out = await build({
  entryPoints: [fileURLToPath(new URL('../src/lib/storicoParse.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
  // La notifica a schermo non serve nei test
  plugins: [{ name: 'stub-feedback', setup(b) { b.onResolve({ filter: /ui\/Feedback$/ }, () => ({ path: 'feedback', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const showNotice = () => {};' })); } }],
});
const { parseAmount, isPivotFormat } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

test('importi in formato italiano e numerico', () => {
  assert.equal(parseAmount(7529), 7529);
  assert.equal(parseAmount('1.583.885'), 1583885);
  assert.equal(parseAmount('7.529'), 7529);
  assert.equal(parseAmount('1.234,56'), 1234.56);
  assert.equal(parseAmount('33,3'), 33.3);
  assert.equal(parseAmount('(250)'), 250);
  assert.equal(parseAmount(''), 0);
  assert.equal(parseAmount('-'), 0);
});

test('riconosce il formato pivot solo con anno e "Somma di Invoice Amount"', () => {
  const pivot = [[], ['', 2025], [], [], ['Cliente', 'Somma di Invoice Amount'], []];
  assert.equal(isPivotFormat(pivot), true);
  assert.equal(isPivotFormat([['Cliente', 'Importo'], ['Rossi', 10]]), false);
});
