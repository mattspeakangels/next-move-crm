import { useState } from 'react';
import type React from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, ArrowRightCircle } from 'lucide-react';
import type { DealSuggerito } from '../../utils/pipelineSuggestions';
import { MESI } from '../../utils/pipelineSuggestions';
import { fmtEur } from '../../lib/storicoFormat';

// Schede KPI e opportunità suggerite della vista Storico.
// ─── COMPONENTS ───────────────────────────────────────────────────────────────

export function KPICard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub?: string; color: string; icon: React.ElementType }) {
  return (
    <div className={`bg-surface dark:bg-surface rounded-panel p-5 border border-line dark:border-line relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-muted mb-1">{label}</p>
          <p className="text-2xl font-semibold text-foreground dark:text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('bg-', 'bg-').replace('-500', '-50')} dark:bg-raised`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
    </div>
  );
}

export function DealCard({ deal, rank, onAddToPipeline }: { deal: DealSuggerito; rank: number; onAddToPipeline: (d: DealSuggerito) => void }) {
  const [open, setOpen] = useState(false);
  const colors = {
    alta: { bg: 'bg-danger-soft dark:bg-danger-soft', border: 'border-danger dark:border-danger', badge: 'bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger', dot: 'bg-danger' },
    media: { bg: 'bg-warning-soft dark:bg-warning-soft', border: 'border-warning dark:border-warning', badge: 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning', dot: 'bg-warning' },
    bassa: { bg: 'bg-canvas dark:bg-surface', border: 'border-line dark:border-line', badge: 'bg-raised text-secondary dark:bg-raised dark:text-muted', dot: 'bg-raised' },
  };
  const c = colors[deal.priorita];
  const trendIcon = deal.trend === 'crescita' ? TrendingUp : deal.trend === 'calo' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;

  return (
    <div className={`rounded-panel border ${c.bg} ${c.border} overflow-hidden transition-all`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold ${c.badge} flex-shrink-0`}>
              {rank}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground dark:text-foreground text-sm truncate" title={deal.nomeCliente}>{deal.nomeCliente}</div>
              <div className="text-xs text-secondary truncate mt-0.5">{deal.motivazione}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="text-lg font-semibold text-foreground dark:text-foreground">{fmtEur(deal.valoreStimato)}</div>
            <div className={`flex items-center gap-1 text-xs font-bold ${deal.trend === 'crescita' ? 'text-success' : deal.trend === 'calo' ? 'text-danger' : 'text-muted'}`}>
              <TrendIcon size={12} />
              {deal.deltaPct !== 0 ? `${deal.deltaPct > 0 ? '+' : ''}${deal.deltaPct}%` : 'Stabile'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${c.badge}`}>
            {deal.priorita === 'alta' ? '🔴 Priorità Alta' : deal.priorita === 'media' ? '🟡 Priorità Media' : '⚪ Priorità Bassa'}
          </span>
          <button onClick={() => setOpen(!open)} className="text-xs text-muted flex items-center gap-1 hover:text-secondary">
            Dettaglio {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {open && (
          <div className="mt-3 space-y-3">
            {/* Breakdown stagionale */}
            {deal.mensili && deal.mensili.length > 0 && (
              <div className="bg-surface dark:bg-canvas rounded-md p-3 border border-line dark:border-line">
                <p className="text-xs font-semibold uppercase tracking-normal text-muted mb-2">
                  Ordini periodo {deal.mesiWindow?.map(m => MESI[m - 1]).join('/')}
                </p>
                <div className="space-y-1">
                  {deal.mensili.map(({ year, amount }) => (
                    <div key={year} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-secondary w-10">{year}</span>
                      <div className="flex-1 bg-raised dark:bg-raised rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.dot}`}
                          style={{ width: `${Math.min(100, (amount / Math.max(...deal.mensili!.map(d => d.amount))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground dark:text-muted w-16 text-right">
                        {fmtEur(Math.round(amount))}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 border-t border-line dark:border-line mt-1">
                    <span className="text-xs font-semibold uppercase text-muted">Media</span>
                    <span className="text-xs font-semibold text-accent">
                      {fmtEur(Math.round(deal.mensili.reduce((s, d) => s + d.amount, 0) / deal.mensili.length))}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Prodotti suggeriti */}
            {deal.prodottiSuggeriti.length > 0 && (
              <div className="space-y-1">
                {deal.prodottiSuggeriti.map((p, i) => (
                  <div key={i} className="text-xs text-secondary dark:text-muted flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                    {p}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Aggiungi a Pipeline ── */}
        <button
          onClick={() => onAddToPipeline(deal)}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-action hover:bg-action-hover text-action-foreground text-xs font-semibold uppercase tracking-wide transition-all"
        >
          <ArrowRightCircle size={14} /> Aggiungi a Pipeline
        </button>
      </div>
    </div>
  );
}
