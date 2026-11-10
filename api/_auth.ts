// Autenticazione delle API: verifica il token di accesso Firebase dell'utente.
//
// Sostituisce il vecchio segreto condiviso (ADMIN_API_TOKEN), che essendo letto dal
// frontend tramite una variabile VITE_ finiva nel codice scaricato dal browser ed era
// quindi estraibile da chiunque. Un ID token Firebase è firmato da Google, vale un'ora,
// identifica il singolo utente e non richiede alcun segreto lato client.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export interface ApiUser { uid: string; email?: string }

function projectId(): string | undefined {
  return (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '').trim() || undefined;
}

/** Restituisce l'utente se l'header Authorization contiene un ID token Firebase valido. */
export async function verifyUser(
  headers: Record<string, string | string[] | undefined>,
): Promise<ApiUser | null> {
  const pid = projectId();
  if (!pid) {
    console.error('[auth] FIREBASE_PROJECT_ID non configurato: tutte le richieste vengono rifiutate');
    return null;
  }
  const raw = headers['authorization'];
  const header = Array.isArray(raw) ? raw[0] : raw;
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], JWKS, {
      issuer: `https://securetoken.google.com/${pid}`,
      audience: pid,
      algorithms: ['RS256'],
    });
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return { uid: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
  } catch {
    return null;
  }
}

/** Come verifyUser, ma risponde 401 e restituisce null se l'utente non è autenticato. */
export async function requireUser(
  req: { headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } },
): Promise<ApiUser | null> {
  const user = await verifyUser(req.headers);
  if (!user) res.status(401).json({ error: 'Non autorizzato: accedi di nuovo e riprova' });
  return user;
}
