// Freno locale ai tentativi di accesso ripetuti da questo dispositivo.
//
// È solo una cortesia d'interfaccia: la protezione vera contro i tentativi a raffica la
// applica Firebase Authentication lato server (errore auth/too-many-requests).
// La versione precedente scriveva su Redis direttamente dal browser, e per farlo il
// token Redis era incluso nel codice pubblico dell'app: chiunque poteva leggerlo.

const STORAGE_KEY = 'nm_login_attempts';
const FAILED_ATTEMPTS_LIMIT = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minuti

function readFailures(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const now = Date.now();
    return Array.isArray(raw) ? raw.filter((t): t is number => typeof t === 'number' && now - t < LOCKOUT_DURATION_MS) : [];
  } catch {
    return [];
  }
}

function writeFailures(list: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* storage non disponibile */ }
}

export async function checkLoginRateLimit(): Promise<{ allowed: boolean; remainingAttempts: number; lockedUntil?: number }> {
  const failures = readFailures();
  if (failures.length >= FAILED_ATTEMPTS_LIMIT) {
    return { allowed: false, remainingAttempts: 0, lockedUntil: failures[0] + LOCKOUT_DURATION_MS };
  }
  return { allowed: true, remainingAttempts: FAILED_ATTEMPTS_LIMIT - failures.length };
}

export async function recordSuccessfulLogin(_email: string | null | undefined) {
  writeFailures([]);
}

export async function recordFailedLogin(_email: string | null | undefined) {
  writeFailures([...readFailures(), Date.now()]);
}
