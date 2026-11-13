// Test del riepilogo esiti dei to-do (src/lib/todoOutcome.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const source = await readFile(new URL('../src/lib/todoOutcome.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const o = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);

const at = (y, m = 5) => new Date(y, m, 10).getTime();
const todo = (id, tipo, esito, completedAt, status = 'fatto') => ({ id, tipo, esito, completedAt, status, titolo: id, priorita: 'media', createdAt: 0, source: 'manuale' });

test('riepilogo annuale per tipo con positivi, attesa, negativi e senza esito', () => {
  const todos = [
    todo('a', 'campionatura', 'ordine', at(2026)),
    todo('b', 'campionatura', 'non-interessato', at(2026)),
    todo('c', 'campionatura', 'in-attesa', at(2026)),
    todo('d', 'campionatura', undefined, at(2026)),
    todo('e', 'demo', 'interessato', at(2026)),
    todo('f', 'demo', 'ordine', at(2025)),            // altro anno
    todo('g', 'offerta', 'ordine', undefined, 'da-fare'), // non chiuso
  ];
  const s = o.summarizeOutcomes(todos, 2026);
  assert.equal(s.totale.totale, 5);
  assert.deepEqual([s.totale.positivi, s.totale.attesa, s.totale.negativi, s.totale.senzaEsito], [2, 1, 1, 1]);
  const camp = s.righe.find(r => r.tipo === 'campionatura');
  assert.equal(camp.totale, 4);
  assert.equal(camp.perEsito.ordine, 1);
  assert.equal(camp.successo, 33); // 1 positivo su 3 con esito
  assert.equal(s.righe[0].tipo, 'campionatura');
  assert.equal(s.righe.find(r => r.tipo === 'demo').successo, 100);
});

test('anni disponibili e data di chiusura dallo storico se manca completedAt', () => {
  const legacy = { ...todo('x', 'visita', 'ordine', undefined), statusHistory: [{ status: 'fatto', at: at(2024) }] };
  assert.deepEqual(o.outcomeYears([todo('a', 'demo', 'ordine', at(2026)), legacy]), [2026, 2024]);
  assert.equal(o.summarizeOutcomes([legacy], 2024).totale.positivi, 1);
});

test('esito sconosciuto conta come senza esito', () => {
  const s = o.summarizeOutcomes([todo('a', 'demo', 'boh', at(2026))], 2026);
  assert.equal(s.totale.senzaEsito, 1);
  assert.equal(s.totale.successo, null);
});
