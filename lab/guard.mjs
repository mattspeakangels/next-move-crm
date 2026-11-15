// Guardia condivisa degli script del laboratorio (deploy regole, seed).
// Unica regola: si opera SOLO sul progetto di laboratorio o sull'emulatore locale.
export const LAB_PROJECT_ID = 'syrio-lab';
// Progetti di lavoro: rifiutati sempre, anche con l'emulatore attivo.
export const WORK_PROJECT_IDS = ['next-move---crm', 'next-move---crm---dev'];

/**
 * Restituisce null se il projectId è ammesso, altrimenti il motivo del rifiuto.
 * @param {string|undefined} projectId
 * @param {{ emulator?: boolean }} [opts] emulator: true se FIRESTORE_EMULATOR_HOST è impostato
 */
export function labRefusal(projectId, opts = {}) {
  const pid = String(projectId ?? '').trim();
  if (!pid) return 'projectId mancante';
  if (WORK_PROJECT_IDS.includes(pid)) return `"${pid}" è un progetto di LAVORO: vietato`;
  if (pid === LAB_PROJECT_ID) return null;
  if (opts.emulator && pid.startsWith('demo-')) return null;
  return `"${pid}" non è il laboratorio (${LAB_PROJECT_ID}) né un progetto demo- sull'emulatore`;
}

/** Stampa il projectId di destinazione ed esce con errore se non è ammesso. */
export function assertLabProject(projectId, opts = {}) {
  console.log(`TARGET projectId = ${projectId || '(vuoto)'}${opts.emulator ? ' (emulatore)' : ''}`);
  const why = labRefusal(projectId, opts);
  if (why) {
    console.error(`RIFIUTATO: ${why}`);
    process.exit(2);
  }
}
