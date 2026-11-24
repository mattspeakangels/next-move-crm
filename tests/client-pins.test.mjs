import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/components/map/commercialMap.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node' });
const { markerColor, CLIENT_COLOR, HEAT_COLORS } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const insights = new Map([['c', { heat: 'hot' }], ['p', { heat: 'warm' }]]);
test('clienti sempre verdi, anche se "presto"', () => {
  assert.equal(markerColor({ id: 'c', status: 'cliente' }, insights), CLIENT_COLOR);
});
test('prospect con il colore della priorità', () => {
  assert.equal(markerColor({ id: 'p', status: 'potenziale' }, insights), HEAT_COLORS.warm);
  assert.equal(markerColor({ id: 'x', status: 'potenziale' }, insights), HEAT_COLORS.unknown);
});
