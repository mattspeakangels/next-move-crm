// Esiti dei to-do completati e riepilogo annuale per tipo di attività.
// File senza dipendenze runtime: testato direttamente da tests/todo-outcome.test.mjs.
import type { TodoEsito, TodoItem, TodoTipo } from '../types';

export type EsitoGruppo = 'positivo' | 'attesa' | 'negativo';

export const ESITI: { id: TodoEsito; label: string; gruppo: EsitoGruppo }[] = [
  { id: 'ordine', label: 'Ordine ottenuto', gruppo: 'positivo' },
  { id: 'offerta-richiesta', label: 'Offerta richiesta', gruppo: 'positivo' },
  { id: 'interessato', label: 'Interessato', gruppo: 'positivo' },
  { id: 'in-attesa', label: 'In attesa di risposta', gruppo: 'attesa' },
  { id: 'non-interessato', label: 'Non interessato', gruppo: 'negativo' },
  { id: 'nessuna-risposta', label: 'Nessuna risposta', gruppo: 'negativo' },
];

export const ESITO_LABEL = Object.fromEntries(ESITI.map(e => [e.id, e.label])) as Record<TodoEsito, string>;
export const ESITO_GRUPPO = Object.fromEntries(ESITI.map(e => [e.id, e.gruppo])) as Record<TodoEsito, EsitoGruppo>;

export const TIPO_LABEL: Record<TodoTipo, string> = {
  offerta: 'Offerta',
  'scheda-tecnica': 'Scheda tecnica',
  'email-info': 'Email / Info',
  'chiamata-follow': 'Chiamata',
  campionatura: 'Campionatura',
  demo: 'Demo',
  visita: 'Visita',
  altro: 'Altro',
};

export interface OutcomeRow {
  tipo: TodoTipo;
  totale: number;
  perEsito: Record<TodoEsito, number>;
  senzaEsito: number;
  positivi: number;
  attesa: number;
  negativi: number;
  /** % positivi sui completati con esito (null se nessun esito registrato). */
  successo: number | null;
}

export interface OutcomeSummary {
  anno: number;
  righe: OutcomeRow[];
  totale: OutcomeRow;
}

const emptyPerEsito = () => Object.fromEntries(ESITI.map(e => [e.id, 0])) as Record<TodoEsito, number>;

const emptyRow = (tipo: TodoTipo): OutcomeRow => ({
  tipo, totale: 0, perEsito: emptyPerEsito(), senzaEsito: 0, positivi: 0, attesa: 0, negativi: 0, successo: null,
});

const addTo = (row: OutcomeRow, esito: TodoEsito | undefined) => {
  row.totale++;
  if (!esito || !(esito in ESITO_GRUPPO)) { row.senzaEsito++; return; }
  row.perEsito[esito]++;
  const g = ESITO_GRUPPO[esito];
  if (g === 'positivo') row.positivi++;
  else if (g === 'attesa') row.attesa++;
  else row.negativi++;
};

const finish = (row: OutcomeRow): OutcomeRow => {
  const conEsito = row.positivi + row.attesa + row.negativi;
  return { ...row, successo: conEsito ? Math.round((row.positivi / conEsito) * 100) : null };
};

/** Data di chiusura: completedAt, altrimenti l'ultimo passaggio a "fatto" nello storico. */
export function completedAtOf(t: TodoItem): number | undefined {
  if (t.completedAt) return t.completedAt;
  const h = t.statusHistory?.filter(x => x.status === 'fatto').pop();
  return h?.at;
}

/** Anni in cui ci sono to-do completati, dal più recente. */
export function outcomeYears(todos: TodoItem[]): number[] {
  const years = new Set<number>();
  for (const t of todos) {
    if (t.status !== 'fatto') continue;
    const at = completedAtOf(t);
    if (at) years.add(new Date(at).getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

/** Riepilogo dei to-do completati nell'anno, raggruppati per tipo (solo tipi presenti). */
export function summarizeOutcomes(todos: TodoItem[], anno: number): OutcomeSummary {
  const rows = new Map<TodoTipo, OutcomeRow>();
  const totale = emptyRow('altro');
  for (const t of todos) {
    if (t.status !== 'fatto') continue;
    const at = completedAtOf(t);
    if (!at || new Date(at).getFullYear() !== anno) continue;
    const tipo = (t.tipo in TIPO_LABEL ? t.tipo : 'altro') as TodoTipo;
    if (!rows.has(tipo)) rows.set(tipo, emptyRow(tipo));
    addTo(rows.get(tipo)!, t.esito);
    addTo(totale, t.esito);
  }
  const order = Object.keys(TIPO_LABEL) as TodoTipo[];
  const righe = [...rows.values()].map(finish).sort((a, b) => b.totale - a.totale || order.indexOf(a.tipo) - order.indexOf(b.tipo));
  return { anno, righe, totale: finish(totale) };
}
