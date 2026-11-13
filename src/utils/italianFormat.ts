// Lettura di date e numeri scritti all'italiana nei file CSV/Excel importati.

/**
 * Numero da testo: "1.234,56" → 1234.56, "1234,56" → 1234.56, "1.583.885" → 1583885,
 * "7.529" → 7529 (punto seguito da 3 cifre = migliaia), "12.5" → 12.5, "€ 1.200" → 1200.
 * Restituisce NaN se il testo non è un numero.
 */
export function parseItalianNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  let s = String(value ?? '').trim().replace(/[€\s]/g, '');
  if (!s) return NaN;
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[()+-]/g, '');
  const hasComma = s.includes(',');
  const dots = (s.match(/\./g) || []).length;
  if (hasComma) s = s.replace(/\./g, '').replace(',', '.');
  else if (dots > 1) s = s.replace(/\./g, '');
  else if (dots === 1 && /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace('.', '');
  if (!/^\d*\.?\d+$/.test(s)) return NaN;
  const n = parseFloat(s);
  return negative ? -n : n;
}

/**
 * Data da testo in formato italiano (giorno prima del mese): "13/11/2026", "13-11-2026",
 * "13.11.26", anche con orario; accetta anche il formato ISO "2026-11-13".
 * Restituisce il timestamp a mezzogiorno locale (o all'orario indicato), NaN se non valida.
 */
export function parseItalianDate(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  const s = String(value ?? '').trim();
  let y: number, m: number, d: number;
  let rest = '';
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; rest = match[4]; }
  else {
    match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(.*)$/);
    if (!match) return NaN;
    d = +match[1]; m = +match[2]; y = +match[3]; rest = match[4];
    if (y < 100) y += 2000;
  }
  const time = rest.match(/(\d{1,2})[:.](\d{2})/);
  const date = new Date(y, m - 1, d, time ? +time[1] : 12, time ? +time[2] : 0);
  // Scarta date impossibili (es. 31/02): il costruttore le farebbe slittare
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return NaN;
  return date.getTime();
}
