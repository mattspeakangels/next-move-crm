// Formattazione numeri della vista Storico.
import type { ClienteRecord } from '../store/storicoStore';

/** Fatturato del cliente per l'anno indicato (0 se manca o non è un numero). */
export function fatturatoAnno(c: ClienteRecord, anno: number): number {
  const v = (c as unknown as Record<string, unknown>)[`fatturato${anno}`];
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}
// ─── FORMATTERS ───────────────────────────────────────────────────────────────

export function fmt(n: number): string {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function fmtEur(n: number): string {
  return `€${fmt(n)}`;
}
