import { Zap, AlertTriangle, ArrowRight, Plus } from 'lucide-react';
import type { DealSuggerito } from '../../utils/pipelineSuggestions';
import { getSeasonalBase } from '../../utils/pipelineSuggestions';
import { fmtEur } from '../../lib/storicoFormat';
import { DealCard } from './StoricoCards';
import type { StoricoViewModel } from './useStoricoView';

export function PipelineTab({ v }: { v: StoricoViewModel }) {
  const { clientiDettagliati, setActiveTab, clientiSignals, setPipelineModal, openPipelineModal, tot2024, budgetAnnuale, deals, totalePipeline, gapBudget } = v;
  return (
    <div className="space-y-6">
      {/* Alert gap */}
      {budgetAnnuale > 0 && (
        <div className={`rounded-panel p-5 border flex items-center justify-between gap-4 flex-wrap ${gapBudget > 0 ? 'bg-danger-soft dark:bg-danger-soft border-danger dark:border-danger' : 'bg-success-soft dark:bg-success-soft border-success dark:border-success'}`}>
          <div className="flex items-center gap-4">
            <div className="text-3xl">{gapBudget > 0 ? '⚠️' : '✅'}</div>
            <div>
              <div className={`font-semibold text-sm ${gapBudget > 0 ? 'text-danger dark:text-danger' : 'text-success dark:text-success'}`}>
                {gapBudget > 0 ? `Gap da colmare: ${fmtEur(gapBudget)}` : 'Budget raggiunto!'}
              </div>
              <div className="text-xs text-secondary mt-0.5">
                {gapBudget > 0
                  ? `Il sistema ha identificato ${deals.length} deal con potenziale totale di ${fmtEur(totalePipeline)}`
                  : `Fatturato 2024 ${fmtEur(tot2024)} supera il target`
                }
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-foreground dark:text-foreground">{fmtEur(totalePipeline)}</div>
            <div className="text-xs text-secondary">Potenziale pipeline</div>
          </div>
        </div>
      )}

      {budgetAnnuale === 0 && (
        <div className="bg-warning-soft dark:bg-warning-soft border border-warning dark:border-warning rounded-panel p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-warning flex-shrink-0" />
          <p className="text-sm text-warning dark:text-warning">
            <strong>Imposta il budget</strong> nel tab Budget per vedere il gap da colmare. La pipeline è comunque visibile.
          </p>
          <button onClick={() => setActiveTab('budget')} className="ml-auto text-xs font-bold text-warning whitespace-nowrap flex items-center gap-1">
            Vai al Budget <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Statistiche pipeline */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line text-center">
          <div className="text-2xl font-semibold text-danger">{deals.filter(d => d.priorita === 'alta').length}</div>
          <div className="text-xs text-muted uppercase tracking-normal mt-1">Alta Priorità</div>
        </div>
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line text-center">
          <div className="text-2xl font-semibold text-warning">{deals.filter(d => d.priorita === 'media').length}</div>
          <div className="text-xs text-muted uppercase tracking-normal mt-1">Media Priorità</div>
        </div>
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line text-center">
          <div className="text-2xl font-semibold text-accent">{fmtEur(totalePipeline)}</div>
          <div className="text-xs text-muted uppercase tracking-normal mt-1">Totale Pipeline</div>
        </div>
      </div>

      {/* Lista deal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {deals.map((deal, i) => (
          <DealCard key={deal.clientId} deal={deal} rank={i + 1} onAddToPipeline={openPipelineModal} />
        ))}
      </div>

      {/* ── Ordini dal Passato ── */}
      {clientiSignals.length > 0 && (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-foreground dark:text-foreground text-sm   mb-4 flex items-center gap-2">
              🔄 Ordini dal Passato
              <span className="text-xs bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent px-2 py-1 rounded-lg">{clientiSignals.length}</span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {clientiSignals.slice(0, 10).map((signal) => {
                const colorMap = {
                  ritardo: { bg: 'bg-danger-soft dark:bg-danger-soft', border: 'border-danger dark:border-danger', badge: 'bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger', icon: '🔥' },
                  stagione: { bg: 'bg-accent-soft dark:bg-accent-soft/10', border: 'border-accent dark:border-accent', badge: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent', icon: '📅' },
                  prodotto_perso: { bg: 'bg-warning-soft dark:bg-warning-soft', border: 'border-warning dark:border-warning', badge: 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning', icon: '⚠️' },
                  crescita: { bg: 'bg-success-soft dark:bg-success-soft', border: 'border-success dark:border-success', badge: 'bg-success-soft text-success dark:bg-success-soft dark:text-success', icon: '📈' },
                  nessuno: { bg: 'bg-canvas dark:bg-surface', border: 'border-line dark:border-line', badge: 'bg-raised text-secondary dark:bg-raised dark:text-muted', icon: '⭕' },
                };
                const c = colorMap[signal.primarySignal];

                return (
                  <div key={signal.clientId} className={`rounded-panel border ${c.bg} ${c.border} overflow-hidden transition-all p-4`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-foreground dark:text-foreground text-sm truncate" title={signal.nomeCliente}>{signal.nomeCliente}</div>
                        <div className="text-xs text-secondary mt-0.5">Score: {signal.score}/100</div>
                      </div>
                      <div className="text-2xl ml-2">{c.icon}</div>
                    </div>

                    {/* Segnali attivi */}
                    <div className="space-y-1.5 mb-3">
                      {signal.recency.status !== 'puntuale' && signal.recency.giorni > 0 && (
                        <div className="text-xs bg-surface/50 dark:bg-black/20 px-2 py-1 rounded">
                          <span className="font-bold">⏱️ {signal.recency.status === 'ritardo' ? 'Ritardo' : 'Dormiente'}</span> {signal.recency.giorni}gg da ultimo ordine
                        </div>
                      )}
                      {signal.seasonality.meseAtteso && signal.frequency.mediaGiorni > 0 && (
                        <div className="text-xs bg-surface/50 dark:bg-black/20 px-2 py-1 rounded">
                          <span className="font-bold">📅 Ordina ogni</span> {signal.frequency.mediaGiorni}gg
                        </div>
                      )}
                      {signal.productsLost.length > 0 && (
                        <div className="text-xs bg-surface/50 dark:bg-black/20 px-2 py-1 rounded">
                          <span className="font-bold">⚠️ Perso:</span> {signal.productsLost[0].nome}
                        </div>
                      )}
                      {Math.abs(signal.quantityTrend.pctChange) > 10 && (
                        <div className="text-xs bg-surface/50 dark:bg-black/20 px-2 py-1 rounded">
                          <span className="font-bold">📈 Qty</span> {signal.quantityTrend.direction === 'crescita' ? '+' : ''}{signal.quantityTrend.pctChange.toFixed(0)}%
                        </div>
                      )}
                    </div>

                    <div className="mb-3 p-2 bg-surface/30 dark:bg-black/20 rounded-lg">
                      <p className="text-xs font-bold text-foreground dark:text-foreground">{signal.action}</p>
                    </div>

                    <button
                      onClick={() => {
                        const clienteData = clientiDettagliati.find(c => c.clientId === signal.clientId);
                        const estimatedValue = Math.round(signal.frequency.mediaGiorni > 0 ? (clienteData?.fatturato2024 || 0) / (365 / signal.frequency.mediaGiorni) : (clienteData?.fatturato2024 || 0) * 0.25);
                        const seasonal = clienteData ? getSeasonalBase(clienteData) : null;
                        const newDeal: DealSuggerito = {
                          clientId: signal.clientId,
                          nomeCliente: signal.nomeCliente,
                          valoreStimato: seasonal && seasonal.base > 0 ? Math.round(seasonal.base) : estimatedValue,
                          motivazione: signal.action,
                          priorita: signal.score > 75 ? 'alta' : signal.score > 50 ? 'media' : 'bassa',
                          trend: signal.quantityTrend.direction as 'crescita' | 'stabile' | 'calo',
                          prodottiSuggeriti: signal.productsLost.map(p => p.nome).slice(0, 3),
                          deltaPct: Math.round(signal.quantityTrend.pctChange),
                          mensili: seasonal?.byYear ?? [],
                          mesiWindow: seasonal?.mesiConsiderati ?? [],
                        };
                        setPipelineModal(newDeal);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-action hover:bg-action-hover text-action-foreground text-xs font-semibold uppercase tracking-wide transition-all"
                    >
                      <Plus size={14} /> Aggiungi a Pipeline
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {deals.length === 0 && clientiSignals.length === 0 && (
        <div className="text-center py-12 text-muted">
          <Zap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Carica lo storico per generare i deal suggeriti</p>
        </div>
      )}
    </div>
  );
}
