// Lo script di popolamento del laboratorio rifiuta di partire sui progetti di lavoro,
// prima di aprire qualsiasi connessione (nessuna scrittura possibile).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/lab-seed.mjs', import.meta.url));
const clean = { ...process.env };
for (const k of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'GCLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS']) delete clean[k];
const run = (args, env = {}) => spawnSync(process.execPath, [script, ...args], { env: { ...clean, ...env }, encoding: 'utf8', timeout: 30_000 });

for (const pid of ['next-move---crm---dev', 'next-move---crm']) {
  test(`rifiuta ${pid}`, () => {
    const r = run(['--project', pid, '--reset']);
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stdout, new RegExp(`TARGET projectId = ${pid}`));
    assert.match(r.stderr, /RIFIUTATO: .*LAVORO/);
    assert.doesNotMatch(r.stdout, /Piano:/, 'non deve arrivare a preparare le scritture');
  });

  test(`rifiuta ${pid} anche con l'emulatore attivo`, () => {
    const r = run(['--project', pid], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /RIFIUTATO/);
  });
}

test('rifiuta un progetto qualsiasi e il projectId mancante', () => {
  assert.equal(run(['--project', 'altro-progetto']).status, 2);
  assert.equal(run([]).status, 2);
});

test('rifiuta l\'emulatore Firestore senza quello Auth (eviterebbe utenti sul cloud)', () => {
  const r = run(['--project', 'demo-syrio-lab'], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' });
  assert.equal(r.status, 2);
});

test('syrio-lab in --dry-run: accettato, nessuna scrittura', () => {
  const r = run(['--project', 'syrio-lab', '--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /TARGET projectId = syrio-lab/);
  assert.match(r.stdout, /nessuna scrittura/);
});
