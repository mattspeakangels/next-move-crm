// Guardia degli script di laboratorio: rifiuta sempre i progetti di lavoro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { labRefusal } from '../lab/guard.mjs';

test('rifiuta i progetti di lavoro, anche con emulatore', () => {
  for (const pid of ['next-move---crm', 'next-move---crm---dev']) {
    assert.match(labRefusal(pid), /LAVORO/);
    assert.match(labRefusal(pid, { emulator: true }), /LAVORO/);
  }
});

test('accetta syrio-lab e i progetti demo- solo sull\'emulatore', () => {
  assert.equal(labRefusal('syrio-lab'), null);
  assert.equal(labRefusal('demo-syrio-lab', { emulator: true }), null);
  assert.ok(labRefusal('demo-syrio-lab'));
  assert.ok(labRefusal('altro-progetto'));
  assert.ok(labRefusal(''));
});

test('.firebaserc: default = laboratorio', () => {
  const rc = JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8'));
  assert.equal(rc.projects.default, 'lab');
  assert.equal(rc.projects.lab, 'syrio-lab');
});

test('nessuno script npm fa deploy verso il lavoro', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const [name, cmd] of Object.entries(scripts)) {
    if (!/deploy/.test(cmd) && !/deploy/.test(name)) continue;
    assert.ok(name.endsWith(':lab'), `script di deploy non di laboratorio: ${name}`);
    assert.doesNotMatch(cmd, /next-move---crm|--project work|-P work/, name);
  }
});
