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

/**
 * Punteggio di rilevanza (più basso = più rilevante) di `fields` rispetto a `query`:
 * 0 = corrispondenza esatta, 1 = un campo inizia con la query (es. "Colombo" per "colomb"),
 * 2 = una parola dentro un campo inizia con la query (es. "Mario Colombo" per "colomb"),
 * 3 = la query compare solo in mezzo a un campo, 4 = nessuna corrispondenza sui campi passati.
 * Usato per ordinare i risultati di ricerca così che i "Colombo..." vengano prima di un
 * match casuale su un altro campo (indirizzo, email, ecc.).
 */
export const searchRank = (query: string, fields: Array<unknown>): number => {
  const q = normalizeSearch(query).trim();
  if (!q) return 0;
  let best = 4;
  for (const raw of fields) {
    const v = normalizeSearch(raw);
    if (!v) continue;
    if (v === q) return 0;
    if (v.startsWith(q)) { best = Math.min(best, 1); continue; }
    if (v.split(/\s+/).some(w => w.startsWith(q))) { best = Math.min(best, 2); continue; }
    if (v.includes(q)) best = Math.min(best, 3);
  }
  return best;
};

/** Ordina `items` per rilevanza rispetto a `query` (vedi searchRank), stabile a parità di punteggio. */
export const sortByRelevance = <T>(query: string, items: T[], getFields: (item: T) => Array<unknown>): T[] => {
  if (!normalizeSearch(query).trim()) return items;
  return items
    .map((item, index) => ({ item, index, rank: searchRank(query, getFields(item)) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(x => x.item);
};
