// Ambienti lavoro/laboratorio: interruttori delle funzioni, menu e guardia del progetto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const entry = (f) => fileURLToPath(new URL(`../src/lib/${f}`, import.meta.url));
async function load(file, appEnv) {
  const define = { __APP_ENV__: JSON.stringify(appEnv ?? '') };
  const out = await build({ entryPoints: [entry(file)], bundle: true, format: 'esm', write: false, platform: 'neutral', define });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
}

const workNav = await load('navSections.ts', 'work');
const labNav = await load('navSections.ts', 'lab');
const noEnvNav = await load('navSections.ts'); // variabile vuota: deve valere "work"

for (const [name, mod] of [['work', await load('features.ts', 'work')], ['variabile vuota', await load('features.ts')]]) {
  test(`${name}: le funzioni nuove sono spente`, () => {
    assert.equal(mod.FEATURES.emailInbox, false);
    assert.equal(mod.FEATURES.learningEngine, false);
  });
}

test('lab: le funzioni nuove sono accese', async () => {
  const f = await load('features.ts', 'lab');
  assert.equal(f.FEATURES.emailInbox, true);
  assert.equal(f.FEATURES.learningEngine, true);
});

for (const [name, nav] of [['work', workNav], ['variabile vuota', noEnvNav]]) {
  test(`${name}: Email e Apprendimento non sono nel menu e non si aprono`, () => {
    for (const role of ['owner', 'sales', 'customer_service', 'marketing']) {
      const views = nav.NAV_SECTIONS.flatMap(s => nav.tabsFor(s.id, role)).map(t => t.view);
      assert.equal(views.includes('inbox'), false, role);
      assert.equal(views.includes('apprendimento'), false, role);
      assert.equal(nav.canOpenView('inbox', role), false, role);
      assert.equal(nav.canOpenView('apprendimento', role), false, role);
    }
  });
}

test('lab: Email e Apprendimento compaiono e si aprono (owner)', () => {
  assert.ok(labNav.tabsFor('oggi', 'owner').some(t => t.view === 'inbox'));
  assert.ok(labNav.tabsFor('analisi', 'owner').some(t => t.view === 'apprendimento'));
  assert.equal(labNav.canOpenView('inbox', 'owner'), true);
  assert.equal(labNav.canOpenView('apprendimento', 'owner'), true);
});

test('le altre voci del menu sono identiche tra lavoro e laboratorio', () => {
  const strip = (nav) => nav.NAV_SECTIONS.map(s => [s.id, nav.tabsFor(s.id, 'owner').filter(t => !t.feature).map(t => t.view)]);
  assert.deepEqual(strip(workNav), strip(labNav));
});

test('guardia: il laboratorio accetta solo syrio-lab, il lavoro mai syrio-lab', async () => {
  const { projectEnvMismatch } = await load('appEnv.ts', 'lab');
  assert.equal(projectEnvMismatch('lab', 'syrio-lab'), null);
  assert.match(projectEnvMismatch('lab', 'next-move---crm'), /bloccato/);
  assert.match(projectEnvMismatch('lab', 'next-move---crm---dev'), /bloccato/);
  assert.match(projectEnvMismatch('lab', ''), /bloccato/);
  assert.match(projectEnvMismatch('work', 'syrio-lab'), /bloccato/);
  assert.equal(projectEnvMismatch('work', 'next-move---crm'), null);
});
