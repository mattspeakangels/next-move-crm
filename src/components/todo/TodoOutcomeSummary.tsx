import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { TodoItem } from '../../types';
import { ESITI, TIPO_LABEL, outcomeYears, summarizeOutcomes, type OutcomeRow } from '../../lib/todoOutcome';

interface Props {
  todos: TodoItem[];
  /** Versione ridotta per la pagina To Do: solo totali per tipo, senza dettaglio per esito. */
  compact?: boolean;
  onOpenDetails?: () => void;
}

const Bar = ({ row }: { row: OutcomeRow }) => {
  const pct = (n: number) => (row.totale ? (n / row.totale) * 100 : 0);
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-raised" aria-hidden="true">
      <span className="bg-success" style={{ width: `${pct(row.positivi)}%` }} />
      <span className="bg-warning" style={{ width: `${pct(row.attesa)}%` }} />
      <span className="bg-danger" style={{ width: `${pct(row.negativi)}%` }} />
    </div>
  );
};

/** Riepilogo annuale: cosa è andato a buon fine, per tipo di attività. */
export function TodoOutcomeSummary({ todos, compact, onOpenDetails }: Props) {
  const years = useMemo(() => outcomeYears(todos), [todos]);
  const currentYear = new Date().getFullYear();
  const [anno, setAnno] = useState(years.includes(currentYear) || !years.length ? currentYear : years[0]);
  const summary = useMemo(() => summarizeOutcomes(todos, anno), [todos, anno]);
  const yearOptions = years.includes(anno) ? years : [anno, ...years];
  const tot = summary.totale;

  return (
    <section className="syrio-panel p-4" data-testid="todo-outcome-summary">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Esito attività</h2>
        </div>
        <select
          value={anno}
          onChange={e => setAnno(Number(e.target.value))}
          aria-label="Anno"
          className="text-xs font-semibold bg-canvas border border-line rounded-md px-2 py-1 text-foreground"
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {tot.totale === 0 ? (
        <p className="text-sm text-muted">Nessuna attività completata nel {anno}.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Completate', value: tot.totale, cls: 'text-foreground' },
              { label: 'Andate bene', value: tot.positivi, cls: 'text-success' },
              { label: 'In attesa', value: tot.attesa, cls: 'text-warning' },
              { label: 'Non andate', value: tot.negativi, cls: 'text-danger' },
            ].map(k => (
              <div key={k.label} className="rounded-md bg-canvas px-3 py-2">
                <p className={`text-lg font-semibold tabular-nums ${k.cls}`}>{k.value}</p>
                <p className="text-xs text-muted">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {summary.righe.map(r => (
              <div key={r.tipo}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-foreground">{TIPO_LABEL[r.tipo]}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {r.totale} fatte{r.successo !== null ? ` · ${r.successo}% a buon fine` : ''}
                  </span>
                </div>
                <div className="mt-1.5"><Bar row={r} /></div>
                {!compact && (
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {ESITI.filter(e => r.perEsito[e.id] > 0).map(e => `${e.label} ${r.perEsito[e.id]}`).join(' · ')}
                    {r.senzaEsito > 0 && `${ESITI.some(e => r.perEsito[e.id] > 0) ? ' · ' : ''}Senza esito ${r.senzaEsito}`}
                  </p>
                )}
              </div>
            ))}
          </div>

          {tot.senzaEsito > 0 && (
            <p className="text-xs text-muted mt-3">
              {tot.senzaEsito} {tot.senzaEsito === 1 ? 'attività chiusa' : 'attività chiuse'} senza esito: puoi aggiungerlo dalla lista «Fatto».
            </p>
          )}
          {compact && onOpenDetails && (
            <button type="button" onClick={onOpenDetails} className="text-xs font-semibold text-accent mt-3">Dettaglio in Analisi →</button>
          )}
        </>
      )}
    </section>
  );
}
