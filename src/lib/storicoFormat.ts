// Formattazione numeri della vista Storico.
// ─── FORMATTERS ───────────────────────────────────────────────────────────────

export function fmt(n: number): string {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function fmtEur(n: number): string {
  return `€${fmt(n)}`;
}
