// Ambiente dell'app: "work" (lavoro, dati reali) o "lab" (laboratorio, dati simulati).
//
// Il valore nasce dalla variabile VITE_APP_ENV del file .env dell'ambiente e viene
// iniettato da vite.config.ts come costante __APP_ENV__ al momento della build: nella
// build di lavoro tutto il codice "solo laboratorio" viene eliminato dal bundle.
// Fuori da Vite (test node senza define) la costante non esiste e l'ambiente vale "work".

export type AppEnv = 'work' | 'lab';

export const IS_LAB: boolean = typeof __APP_ENV__ !== 'undefined' && __APP_ENV__ === 'lab';

export const APP_ENV: AppEnv = IS_LAB ? 'lab' : 'work';

/** L'unico progetto Firebase su cui il laboratorio può girare. */
export const LAB_PROJECT_ID = 'syrio-lab';

/**
 * Controlla che il progetto Firebase sia coerente con l'ambiente.
 * Restituisce il messaggio d'errore, oppure null se va tutto bene.
 * - lab: SOLO il progetto di laboratorio;
 * - work: MAI il progetto di laboratorio.
 */
export function projectEnvMismatch(env: AppEnv, projectId: string | undefined): string | null {
  const pid = (projectId ?? '').trim();
  if (env === 'lab' && pid !== LAB_PROJECT_ID) {
    return `Ambiente LABORATORIO collegato al progetto "${pid || '(vuoto)'}": è ammesso solo "${LAB_PROJECT_ID}". Avvio bloccato.`;
  }
  if (env === 'work' && pid === LAB_PROJECT_ID) {
    return `Ambiente di LAVORO collegato al progetto di laboratorio "${LAB_PROJECT_ID}". Avvio bloccato.`;
  }
  return null;
}
