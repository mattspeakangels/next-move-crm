// Pubblica le regole Firestore (con indici) e Storage SOLO sul laboratorio.
// Non esiste uno script equivalente per il lavoro, di proposito.
//
// Le regole Storage vanno sul bucket del laboratorio indicato in lab/env/.env.lab:
// non è il bucket "predefinito", quindi la CLI non lo vede e usiamo l'API Rules
// con il token di gcloud.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { assertLabProject, LAB_PROJECT_ID } from '../lab/guard.mjs';

const rc = JSON.parse(readFileSync('.firebaserc', 'utf8'));
const target = rc.projects?.lab;
assertLabProject(target);

const envFile = readFileSync('lab/env/.env.lab', 'utf8');
const bucket = /^VITE_FIREBASE_STORAGE_BUCKET=(.+)$/m.exec(envFile)?.[1]?.trim();
const envProject = /^VITE_FIREBASE_PROJECT_ID=(.+)$/m.exec(envFile)?.[1]?.trim();
assertLabProject(envProject);
if (!bucket) throw new Error('VITE_FIREBASE_STORAGE_BUCKET mancante in lab/env/.env.lab');

execFileSync('firebase', ['deploy', '--only', 'firestore:rules,firestore:indexes', '--project', LAB_PROJECT_ID, '--non-interactive'], { stdio: 'inherit' });

console.log(`TARGET projectId = ${LAB_PROJECT_ID}, bucket Storage = ${bucket}`);
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const api = 'https://firebaserules.googleapis.com/v1';
const headers = { Authorization: `Bearer ${token}`, 'x-goog-user-project': LAB_PROJECT_ID, 'Content-Type': 'application/json' };
const call = async (method, url, body) => {
  const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
};

const ruleset = await call('POST', `${api}/projects/${LAB_PROJECT_ID}/rulesets`, {
  source: { files: [{ name: 'storage.rules', content: readFileSync('storage.rules', 'utf8') }] },
});
if (!ruleset.ok) throw new Error(`Regole Storage non compilate: ${JSON.stringify(ruleset.json)}`);
const releaseName = `projects/${LAB_PROJECT_ID}/releases/firebase.storage/${bucket}`;
let rel = await call('PATCH', `${api}/${releaseName}`, { release: { name: releaseName, rulesetName: ruleset.json.name } });
if (rel.status === 404) rel = await call('POST', `${api}/projects/${LAB_PROJECT_ID}/releases`, { name: releaseName, rulesetName: ruleset.json.name });
if (!rel.ok) throw new Error(`Rilascio regole Storage fallito: ${JSON.stringify(rel.json)}`);
console.log(`✔ Regole Storage pubblicate su ${bucket}`);
