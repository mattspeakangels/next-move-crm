// Funzioni pure della sincronizzazione con Firestore: diff per campo e pulizia dei valori
// prima della scrittura. Separate da useFirestoreSync per poterle testare senza Firebase.

/** Documento Firestore generico: mappa di campi di primo livello. */
export type DocFields = Record<string, unknown>;

/**
 * Diff superficiale tra due versioni di un documento: solo i campi di primo livello
 * cambiati. Scrivere i soli campi modificati evita che due colleghi che lavorano
 * sullo stesso cliente si cancellino a vicenda le modifiche.
 * Un campo rimosso compare con valore `undefined` (diventerà deleteField()).
 */
export function changedFields(prev: DocFields, curr: DocFields): DocFields {
  const out: DocFields = {};
  for (const k of Object.keys(curr)) if (curr[k] !== prev[k]) out[k] = curr[k];
  for (const k of Object.keys(prev)) if (!(k in curr)) out[k] = undefined;
  return out;
}

// Firestore rifiuta i valori `undefined` (es. TodoItem con completedAt/scadenza
// non impostati): un solo campo undefined faceva fallire l'intero batch della
// collezione, silenziosamente. Nei campi top-level undefined diventa
// deleteField() (con merge:true rimuove il campo remoto); nei nested viene tolto.
export function stripUndefinedDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.filter(v => v !== undefined).map(stripUndefinedDeep);
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: DocFields = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefinedDeep(v);
    }
    return out;
  }
  return value;
}

/**
 * Prepara i campi per la scrittura: `undefined` di primo livello → marcatore di
 * cancellazione (deleteField() di Firestore, passato da chi chiama), nested ripuliti.
 */
export function sanitizeForFirestore(data: DocFields, deleteMarker: () => unknown): DocFields {
  const out: DocFields = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v === undefined ? deleteMarker() : stripUndefinedDeep(v);
  }
  return out;
}
