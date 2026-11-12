import { Search } from 'lucide-react';
import { fmt, fmtEur } from '../../lib/storicoFormat';
import type { StoricoViewModel } from './useStoricoView';

export function RiepilogoTab({ v }: { v: StoricoViewModel }) {
  const { riepilogoSearch, setRiepilogoSearch, riepilogoRows, riepilogoTotali, fmtPct } = v;
  return (
    <div className="space-y-6">
      {/* Header + ricerca */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-foreground dark:text-foreground text-sm  ">📋 Riepilogo per Cliente</h3>
          <p className="text-xs text-muted mt-1">Fatturato e quantità per cliente · 2024 · 2025 · 2026 (YTD) · {riepilogoRows.length} clienti</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={riepilogoSearch}
            onChange={e => setRiepilogoSearch(e.target.value)}
            placeholder="Cerca cliente…"
            className="pl-9 pr-3 py-2 text-sm rounded-md border border-line dark:border-line bg-surface dark:bg-surface text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="bg-surface dark:bg-surface rounded-panel border border-line dark:border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-line dark:border-line text-xs font-semibold uppercase tracking-normal text-muted">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-right px-4 py-3">Fatt. 2024 (€)</th>
                <th className="text-right px-4 py-3">Fatt. 2025 (€)</th>
                <th className="text-right px-4 py-3">Fatt. 2026 YTD (€)</th>
                <th className="text-right px-4 py-3">Totale (€)</th>
                <th className="text-right px-4 py-3">Qtà 2024</th>
                <th className="text-right px-4 py-3">Qtà 2025</th>
                <th className="text-right px-4 py-3">Qtà 2026</th>
                <th className="text-right px-4 py-3">Var. 24→25</th>
                <th className="text-right px-4 py-3">Var. 25→26</th>
              </tr>
            </thead>
            <tbody>
              {riepilogoRows.map((r, i) => (
                <tr key={`${r.nome}-${i}`} className="border-b border-line dark:border-line/50 hover:bg-canvas dark:hover:bg-raised/40 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-foreground dark:text-foreground max-w-[260px] truncate" title={r.nome}>{r.nome}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-secondary dark:text-muted">{r.f2024 > 0 ? fmtEur(r.f2024) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-secondary dark:text-muted">{r.f2025 > 0 ? fmtEur(r.f2025) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-secondary dark:text-muted">{r.f2026 > 0 ? fmtEur(r.f2026) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground dark:text-foreground">{fmtEur(r.totale)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-secondary">{r.q2024 > 0 ? fmt(r.q2024) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-secondary">{r.q2025 > 0 ? fmt(r.q2025) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-secondary">{r.q2026 > 0 ? fmt(r.q2026) : '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.var2425 === null ? 'text-muted' : r.var2425 >= 0 ? 'text-success' : 'text-danger'}`}>{fmtPct(r.var2425)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.var2526 === null ? 'text-muted' : r.var2526 >= 0 ? 'text-success' : 'text-danger'}`}>{fmtPct(r.var2526)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line dark:border-line bg-canvas dark:bg-raised/40 font-semibold text-foreground dark:text-foreground">
                <td className="px-4 py-3 uppercase text-xs tracking-normal">Totale ({riepilogoRows.length})</td>
                <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.f2024)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.f2025)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.f2026)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.totale)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(riepilogoTotali.q2024)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(riepilogoTotali.q2025)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(riepilogoTotali.q2026)}</td>
                <td className="px-4 py-3 text-right font-mono text-muted">—</td>
                <td className="px-4 py-3 text-right font-mono text-muted">—</td>
              </tr>
            </tfoot>
          </table>
          {riepilogoRows.length === 0 && (
            <p className="text-center text-sm text-muted py-8">Nessun cliente trovato.</p>
          )}
        </div>
      </div>
    </div>
  );
}
