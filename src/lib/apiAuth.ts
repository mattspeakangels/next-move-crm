import { auth } from './firebase';

/**
 * Header di autenticazione per le chiamate a /api/*: il token di accesso Firebase
 * dell'utente collegato (rinnovato da Firebase quando scade). Nessun segreto nel frontend.
 */
export async function apiAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessione scaduta. Accedi di nuovo e riprova.');
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}
