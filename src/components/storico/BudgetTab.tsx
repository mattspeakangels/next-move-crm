import { Target, Euro } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MESI } from '../../utils/pipelineSuggestions';
import { fmtEur } from '../../lib/storicoFormat';
import type { StoricoViewModel } from './useStoricoView';

export function BudgetTab({ v }: { v: StoricoViewModel }) {
  const { budget, setBudget, budgetMode, setBudgetMode, annoCorr, annoPrev, totCorr, totPrev, tot2024, budgetMensileBase } = v;
  return (
    <div className="space-y-6">
      {/* Budget input */}
      <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
        <h3 className="font-semibold text-foreground dark:text-foreground text-sm   mb-5">🎯 Imposta Budget Annuale</h3>

        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-secondary uppercase tracking-normal mb-2">Budget Annuale (€)</label>
            <div className="relative">
              <Euro size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="number"
                value={budget.annuale || ''}
                onChange={e => setBudget(b => ({ ...b, annuale: parseFloat(e.target.value) || 0 }))}
                placeholder="es. 500000"
                className="w-full pl-9 pr-4 py-3 border border-line dark:border-line rounded-md text-lg font-bold bg-canvas dark:bg-raised dark:text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setBudgetMode('annuale')}
              className={`px-4 py-3 rounded-md text-sm font-bold transition-all ${budgetMode === 'annuale' ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
            >
              Annuale
            </button>
            <button
              onClick={() => setBudgetMode('mensile')}
              className={`px-4 py-3 rounded-md text-sm font-bold transition-all ${budgetMode === 'mensile' ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
            >
              Per Mese
            </button>
          </div>
        </div>

        {budget.annuale > 0 && (
          <div className="mt-4 p-4 bg-accent-soft dark:bg-accent-soft/20 rounded-md">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-secondary uppercase tracking-wider mb-1">Mensile Base</div>
                <div className="font-semibold text-accent">{fmtEur(budgetMensileBase)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary uppercase tracking-wider mb-1">vs 2024</div>
                <div className={`font-black ${budget.annuale > tot2024 ? 'text-warning' : 'text-success'}`}>
                  {budget.annuale > tot2024 ? '+' : ''}{fmtEur(budget.annuale - tot2024)}
                </div>
              </div>
              <div>
                <div className="text-xs text-secondary uppercase tracking-wider mb-1">Crescita %</div>
                <div className="font-semibold text-foreground dark:text-muted">
                  {tot2024 > 0 ? `${((budget.annuale - tot2024) / tot2024 * 100).toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Griglia mensile */}
      {budgetMode === 'mensile' && budget.annuale > 0 && (
        <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
          <h3 className="font-semibold text-foreground dark:text-foreground text-sm   mb-5">📅 Suddivisione Mensile</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {MESI.map(m => {
              const val = budget.mensile[m] || budgetMensileBase;
              const pct = budget.annuale > 0 ? (val / budget.annuale * 100) : 0;
              return (
                <div key={m} className="bg-canvas dark:bg-raised rounded-md p-3">
                  <div className="text-xs font-semibold uppercase tracking-normal text-secondary mb-2">{m}</div>
                  <input
                    type="number"
                    value={Math.round(val)}
                    onChange={e => setBudget(b => ({ ...b, mensile: { ...b.mensile, [m]: parseFloat(e.target.value) || 0 } }))}
                    className="w-full text-sm font-bold bg-transparent dark:text-foreground focus:outline-none border-b border-line dark:border-line pb-1"
                  />
                  <div className="text-xs text-muted mt-1">{pct.toFixed(1)}%</div>
                  <div className="h-1.5 bg-raised dark:bg-raised rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-action rounded-full" style={{ width: `${Math.min(pct * 12, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-sm text-secondary">
            Totale mensile: <strong className="text-foreground dark:text-foreground">{fmtEur(Object.values(budget.mensile).reduce((s, v) => s + v, 0) || budget.annuale)}</strong>
          </div>
        </div>
      )}

      {/* Confronto storico vs budget */}
      {budget.annuale > 0 && (
        <div className="bg-surface dark:bg-surface rounded-panel p-5 border border-line dark:border-line">
          <h3 className="font-semibold text-foreground dark:text-foreground text-sm   mb-4">📊 Storico vs Budget</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { anno: String(annoPrev), fatturato: Math.round(totPrev), budget: 0 },
              { anno: String(annoCorr), fatturato: Math.round(totCorr), budget: 0 },
              { anno: `${annoCorr + 1} (prev)`, fatturato: 0, budget: Math.round(budget.annuale) },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--syrio-line))" />
              <XAxis dataKey="anno" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${Math.round(v / 1000)}K`} />
              <Tooltip formatter={(v: number) => fmtEur(v)} />
              <Legend />
              <Bar dataKey="fatturato" name="Fatturato Reale" fill="var(--syrio-chart-1)" radius={[6,6,0,0]} />
              <Bar dataKey="budget" name="Budget Target" fill="rgb(var(--syrio-warning))" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {budget.annuale === 0 && (
        <div className="text-center py-12 text-muted">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Inserisci il budget annuale per vedere le analisi</p>
        </div>
      )}
    </div>
  );
}
