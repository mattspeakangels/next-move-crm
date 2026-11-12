/** Proprietà che il codice legge dagli errori catturati (Error, FirebaseError, DOMException…). */
export interface CaughtError {
  message?: string;
  name?: string;
  code?: string;
}

/**
 * Vista tipizzata di un errore catturato. Non cambia il valore: serve solo al tipo,
 * al posto di `catch (err: any)`. Le letture restano quelle di prima (err?.message, ecc.).
 */
export function asCaught(err: unknown): CaughtError {
  return err as CaughtError;
}
