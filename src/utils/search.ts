/**
 * Ricerca testuale condivisa: case-insensitive, accent-insensitive, multi-parola.
 * Ogni token della query deve trovare corrispondenza in almeno uno dei campi
 * (AND tra i token, OR tra i campi) — così "mario rossi" trova "Rossi Mario Srl".
 */
export const normalizeSearch = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // rimuove accenti (é→e, à→a, ...)

export const matchSearch = (query: string, fields: Array<unknown>): boolean => {
  const q = normalizeSearch(query).trim();
  if (!q) return true;
  const tokens = q.split(/\s+/);
  const haystack = fields.map(normalizeSearch);
  return tokens.every(token => haystack.some(field => field.includes(token)));
};
