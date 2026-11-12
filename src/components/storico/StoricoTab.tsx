import { TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { fmtEur } from '../../lib/storicoFormat';
import type { StoricoViewModel } from './useStoricoView';

export function StoricoTab({ v }: { v: StoricoViewModel }) {
  const { clientiDettagliati, filterDormienti, setFilterDormienti, expandedClientId, setExpandedClientId, page, setPage, PAGE_SIZE, annoCorr, annoPrev, dormienti, clientiSorted, topClientiChart, toggleSort, SortIcon } = v;
  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="min-w-0 overflow-hidden bg-surface dark:bg-surface rounded-panel p-5 border border-line dark:border-line">
        <h3 className="font-semibold text-foreground dark:text-foreground mb-4 text-sm  ">Top 12 Clienti per Fatturato</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topClientiChart} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--syrio-line))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${Math.round(v/1000)}K`} />
            <Tooltip formatter={(v: number) => fmtEur(v)} />
            <Legend />
            <Bar dataKey={String(annoPrev)} fill="var(--syrio-chart-2)" radius={[4,4,0,0]} />
            <Bar dataKey={String(annoCorr)} fill="var(--syrio-chart-1)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setFilterDormienti(!filterDormienti)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all border ${filterDormienti ? 'bg-warning-soft border-warning text-warning' : 'bg-surface dark:bg-surface border-line dark:border-line text-secondary'}`}
        >
          <AlertTriangle size={14} /> Solo dormienti ({dormienti.length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface dark:bg-surface rounded-panel border border-line dark:border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line dark:border-line">
                <th className="w-8 px-2" />
                {[
                  { label: 'Cliente', field: 'id' as const },
                  { label: `${annoPrev} (€)`, field: 'f2023' as const },
                  { label: `${annoCorr} (€)`, field: 'f2024' as const },
                  { label: 'Δ YoY', field: 'delta' as const },
                ].map(({ label, field }) => (
                  <th key={field} onClick={() => toggleSort(field)} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted cursor-pointer hover:text-secondary select-none">
                    <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted">2025 (€)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted">2026 (€)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted">Stato</th>
              </tr>
            </thead>
            <tbody>
              {clientiSorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(c => {
                const cPrev = (((c as any)[`fatturato${annoPrev}`] as number) || 0);
                const cCorr = (((c as any)[`fatturato${annoCorr}`] as number) || 0);
                const delta = cPrev > 0 ? ((cCorr - cPrev) / cPrev * 100) : null;
                const isDormiente = cPrev > 0 && cCorr === 0;
                const isNuovo = cPrev === 0 && cCorr > 0;
                const isExpanded = expandedClientId === c.clientId;
                const hasProdotti = c.prodotti.length > 0;
                // Cerca i dati dettagliati con ordini individuali
                const dettaglio = clientiDettagliati.find(d => d.nome === c.nome);
                const allOrdini = dettaglio
                  ? dettaglio.prodotti.flatMap(p =>
                      p.ordini.map(o => ({
                        itemId: p.itemId,
                        nome: p.nome,
                        date: o.date,
                        year: o.year,
                        amount: o.amount,
                        margin: o.margin,
                        quantity: o.quantity,
                        mese: o.mese || '',
                        classe: o.classe || '',
                        productModel: o.productModel || '',
                      }))
                    ).sort((a, b) => {
                      // Ordina per data (più recente prima)
                      const parseDate = (d: string) => {
                        const parts = d.split('-');
                        if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]).getTime();
                        return 0;
                      };
                      return parseDate(b.date) - parseDate(a.date);
                    })
                  : [];
                return (
                  <>
                    <tr
                      key={c.clientId}
                      onClick={() => hasProdotti && setExpandedClientId(isExpanded ? null : c.clientId)}
                      className={`border-b border-line dark:border-line/50 transition-colors ${hasProdotti ? 'cursor-pointer hover:bg-accent-soft/60 dark:hover:bg-accent-soft/10' : 'hover:bg-canvas dark:hover:bg-raised/50'} ${isExpanded ? 'bg-accent-soft/40 dark:bg-accent-soft/10' : ''}`}
                    >
                      <td className="w-8 px-2 py-3 text-muted">
                        {hasProdotti && (isExpanded ? <ChevronUp size={14} className="text-accent" /> : <ChevronDown size={14} />)}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground dark:text-foreground truncate max-w-[250px]" title={c.nome || `#${c.clientId}`}>{c.nome || `#${c.clientId}`}</td>
                      <td className="px-4 py-3 font-mono text-secondary dark:text-muted">{cPrev > 0 ? fmtEur(cPrev) : '—'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground dark:text-foreground">{cCorr > 0 ? fmtEur(cCorr) : '—'}</td>
                      <td className="px-4 py-3">
                        {delta !== null ? (
                          <span className={`flex items-center gap-1 font-bold text-xs ${delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted'}`}>
                            {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                            {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-secondary dark:text-muted">{(c.fatturato2025 || 0) > 0 ? fmtEur(c.fatturato2025!) : '—'}</td>
                      <td className="px-4 py-3 font-mono text-secondary dark:text-muted">{(c.fatturato2026 || 0) > 0 ? fmtEur(c.fatturato2026!) : '—'}</td>
                      <td className="px-4 py-3">
                        {isDormiente && <span className="text-xs bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning px-2 py-0.5 rounded-lg font-bold">Dormiente</span>}
                        {isNuovo && <span className="text-xs bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent px-2 py-0.5 rounded-lg font-bold">Nuovo {annoCorr}</span>}
                        {!isDormiente && !isNuovo && delta !== null && delta > 20 && <span className="text-xs bg-success-soft text-success dark:bg-success-soft dark:text-success px-2 py-0.5 rounded-lg font-bold">In crescita</span>}
                        {!isDormiente && !isNuovo && delta !== null && delta < -20 && <span className="text-xs bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger px-2 py-0.5 rounded-lg font-bold">In calo</span>}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${c.clientId}-prodotti`} className="border-b border-accent dark:border-accent/30">
                        <td colSpan={8} className="px-0 py-0">
                          <div className="bg-accent-soft/50 dark:bg-accent-soft/10 px-6 py-3">
                            {allOrdini.length > 0 ? (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted uppercase tracking-normal font-semibold">
                                    <th className="text-left pb-2 pr-3">Data</th>
                                    <th className="text-left pb-2 pr-3">Mese</th>
                                    <th className="text-left pb-2 pr-3">Class</th>
                                    <th className="text-left pb-2 pr-3">Product Model</th>
                                    <th className="text-left pb-2">Prodotto</th>
                                    <th className="text-right pb-2 pr-3">Importo</th>
                                    <th className="text-right pb-2">Qtà</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                  {allOrdini.map((o, idx) => (
                                    <tr key={`${o.itemId}-${o.date}-${idx}`} className="text-secondary dark:text-muted">
                                      <td className="py-1.5 pr-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                          o.year === 2023 ? 'bg-accent-soft text-accent' :
                                          o.year === 2024 ? 'bg-accent-soft text-accent' :
                                          o.year === 2025 ? 'bg-accent-soft text-accent' :
                                          'bg-accent-soft text-accent'
                                        }`}>{o.date}</span>
                                      </td>
                                      <td className="py-1.5 pr-3 text-secondary whitespace-nowrap">{o.mese || '—'}</td>
                                      <td className="py-1.5 pr-3 text-secondary whitespace-nowrap">{o.classe || '—'}</td>
                                      <td className="py-1.5 pr-3 font-mono text-muted whitespace-nowrap">{o.productModel || o.itemId || '—'}</td>
                                      <td className="py-1.5 pr-3 font-medium max-w-xs truncate" title={o.nome}>{o.nome}</td>
                                      <td className="py-1.5 pr-3 text-right font-mono font-bold text-foreground dark:text-foreground">{fmtEur(o.amount)}</td>
                                      <td className="py-1.5 text-right font-mono text-secondary">{o.quantity > 0 ? o.quantity : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-xs text-muted py-2">Ricarica il file per vedere il dettaglio ordini con date</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {clientiSorted.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-line dark:border-line">
              <span className="text-xs text-muted">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, clientiSorted.length)} di {clientiSorted.length} clienti
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPage(p => p - 1); setExpandedClientId(null); }}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-line dark:border-line disabled:opacity-30 disabled:cursor-not-allowed hover:bg-canvas dark:hover:bg-raised transition-colors"
                >
                  ← Prec
                </button>
                {Array.from({ length: Math.ceil(clientiSorted.length / PAGE_SIZE) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPage(i); setExpandedClientId(null); }}
                    className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${page === i ? 'bg-action text-action-foreground' : 'border border-line dark:border-line hover:bg-canvas dark:hover:bg-raised text-secondary dark:text-muted'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => { setPage(p => p + 1); setExpandedClientId(null); }}
                  disabled={page >= Math.ceil(clientiSorted.length / PAGE_SIZE) - 1}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-line dark:border-line disabled:opacity-30 disabled:cursor-not-allowed hover:bg-canvas dark:hover:bg-raised transition-colors"
                >
                  Succ →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
