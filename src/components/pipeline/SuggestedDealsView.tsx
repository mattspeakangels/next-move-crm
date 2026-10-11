import React, { useMemo, useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus, Check, Plus, Lightbulb } from 'lucide-react';
import { useStoricoStore } from '../../store/storicoStore';
import { useStore } from '../../store/useStore';
import { generaDeal, type DealSuggerito } from '../../utils/pipelineSuggestions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function normName(s: string): string {
  return s.toUpperCase().trim().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ');
}

// ─── Main ────────────────────────────────────────────────────────────────────

export const SuggestedDealsView: React.FC = () => {
  const clientiDettagliati = useStoricoStore(s => s.clientiDettagliati);
  const contacts = useStore(s => s.contacts);
  const addDeal = useStore(s => s.addDeal);

  const [added, setAdded] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const suggestions = useMemo(() => generaDeal(clientiDettagliati), [clientiDettagliati]);

  const visible = suggestions.filter(d => !dismissed.has(d.clientId));

  function findContact(nomeStorico: string) {
    const key = normName(nomeStorico);
    const all = Object.values(contacts);
    const exact = all.find(c => normName(c.company) === key);
    if (exact) return exact;
    if (key.length >= 6) {
      return all.find(c => {
        const cn = normName(c.company);
        return cn.length >= 6 && (cn.includes(key) || key.includes(cn));
      });
    }
    return undefined;
  }

  function handleAdd(deal: DealSuggerito) {
    const now = Date.now();
    const matched = findContact(deal.nomeCliente);
    const prodStr = deal.prodottiSuggeriti.length > 0
      ? `\nProdotti suggeriti: ${deal.prodottiSuggeriti.join(', ')}`
      : '';
    addDeal({
      id: `deal_auto_${now}_${deal.clientId}`,
      contactId: matched?.id ?? '',
      value: deal.valoreStimato,
      probability: deal.priorita === 'alta' ? 70 : deal.priorita === 'media' ? 50 : 30,
      products: deal.prodottiSuggeriti,
      stage: 'lead',
      nextAction: deal.motivazione + prodStr,
      nextActionDeadline: now + 14 * 24 * 60 * 60 * 1000,
      nextActionType: 'chiama',
      nextActionPriority: deal.priorita === 'alta' ? 'alta' : 'media',
      notes: `Suggerito automaticamente dallo storico vendite.${prodStr}`,
      createdAt: now,
      updatedAt: now,
      nomeStorico: matched ? undefined : deal.nomeCliente,
    });
    setAdded(prev => new Set(prev).add(deal.clientId));
  }

  if (clientiDettagliati.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lightbulb size={44} className="text-muted dark:text-foreground mb-4" />
        <p className="font-semibold text-muted uppercase tracking-normal text-sm">Nessuno storico caricato</p>
        <p className="text-xs text-muted dark:text-secondary mt-1">Importa il file Excel dallo Storico per ricevere suggerimenti automatici</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center gap-3 bg-accent-soft dark:bg-accent-soft/20 rounded-panel px-4 py-3">
        <Sparkles size={16} className="text-accent flex-shrink-0" />
        <p className="text-xs font-bold text-accent dark:text-accent">
          {visible.length} opportunità identificate dallo storico ordini — basate su trend stagionali e variazioni anno su anno.
        </p>
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="bg-surface dark:bg-surface rounded-panel p-10 text-center border border-line dark:border-line">
          <Check size={28} className="mx-auto text-success mb-2" />
          <p className="font-semibold text-muted uppercase tracking-normal text-sm">Tutti i suggerimenti gestiti</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(deal => {
            const isAdded = added.has(deal.clientId);
            const matched = findContact(deal.nomeCliente);
            const TrendIcon = deal.trend === 'crescita' ? TrendingUp : deal.trend === 'calo' ? TrendingDown : Minus;
            const trendColor = deal.trend === 'crescita' ? 'text-success' : deal.trend === 'calo' ? 'text-danger' : 'text-warning';
            const prioBg = deal.priorita === 'alta'
              ? 'bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger'
              : deal.priorita === 'media'
              ? 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning'
              : 'bg-raised text-secondary dark:bg-raised dark:text-muted';

            return (
              <div key={deal.clientId}
                className={`bg-surface dark:bg-surface rounded-panel border transition-all overflow-hidden
                  ${isAdded ? 'border-success dark:border-success' : 'border-line dark:border-line'}`}>
                {/* Top row */}
                <div className="px-4 pt-4 pb-2 flex items-start gap-3">
                  {/* Trend icon */}
                  <div className={`mt-0.5 flex-shrink-0 ${trendColor}`}>
                    <TrendIcon size={18} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-foreground dark:text-foreground text-sm uppercase truncate">
                        {deal.nomeCliente}
                      </p>
                      <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-lg ${prioBg}`}>
                        {deal.priorita}
                      </span>
                      {matched && (
                        <span className="text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/20 px-2 py-0.5 rounded-lg">
                          CRM
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-secondary dark:text-muted font-medium leading-relaxed">
                      {deal.motivazione}
                    </p>
                    {deal.prodottiSuggeriti.length > 0 && (
                      <p className="text-xs text-muted mt-1 font-bold">
                        {deal.prodottiSuggeriti.join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Value */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-accent dark:text-accent text-base">€{fmt(deal.valoreStimato)}</p>
                    <p className="text-xs font-bold text-muted uppercase">stimato</p>
                  </div>
                </div>

                {/* Action bar */}
                <div className="px-4 pb-3 flex items-center gap-2">
                  {isAdded ? (
                    <div className="flex items-center gap-2 text-success dark:text-success">
                      <Check size={14} />
                      <span className="text-xs font-semibold">Aggiunto alla Pipeline</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAdd(deal)}
                        className="flex items-center gap-1.5 bg-action hover:bg-action-hover text-action-foreground px-4 py-1.5 rounded-md text-xs font-semibold transition-colors">
                        <Plus size={12} /> Aggiungi alla Pipeline
                      </button>
                      <button
                        onClick={() => setDismissed(prev => new Set(prev).add(deal.clientId))}
                        className="text-xs font-bold text-muted hover:text-secondary dark:hover:text-muted px-2 py-1.5 rounded-md hover:bg-raised dark:hover:bg-raised transition-colors">
                        Ignora
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
