import { DialogFrame } from '../ui/DialogFrame';
import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { AlertTriangle, X, Sparkles, CheckCircle2, XCircle, RotateCcw, Clock } from 'lucide-react';
import { useAICatalog, CatalogSuggestion } from '../../hooks/useAICatalog';

// Pannello catalogo AI della Mappa: suggerimenti di prodotti per segmento.
// ── AI Catalog Panel ──────────────────────────────────────────────────────────

export const SEGMENT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  dealer:    { bg: 'bg-accent-soft dark:bg-accent-soft/40', text: 'text-accent dark:text-accent', label: '🏪 Dealer' },
  edilizia:  { bg: 'bg-warning-soft dark:bg-warning-soft',  text: 'text-warning dark:text-warning',   label: '🏗️ Edilizia' },
  industria: { bg: 'bg-success-soft dark:bg-success-soft', text: 'text-success dark:text-success', label: '🏭 Industria' },
};

export const PRIORITY_COLORS: Record<string, string> = {
  alta:  'text-success font-semibold',
  media: 'text-warning font-bold',
  bassa: 'text-muted font-bold',
};

export interface AICatalogPanelProps {
  onClose: () => void;
  onApply: (suggestions: CatalogSuggestion[]) => void;
}

export const AICatalogPanel: React.FC<AICatalogPanelProps> = ({ onClose, onApply }) => {
  const { contacts } = useStore();
  const {
    suggestions, processedIds, progress, loading, error, rateLimitReset,
    run, toggleApproval, setAllApproved, clearResults,
  } = useAICatalog();

  const [onlyUncategorized, setOnlyUncategorized] = useState(true);

  const allContacts = Object.values(contacts);
  const uncategorized = allContacts.filter(c => !c.segment);
  const targetContacts = onlyUncategorized ? uncategorized : allContacts;
  const remaining = targetContacts.filter(c => !processedIds.includes(c.id));
  const approvedCount = suggestions.filter(s => s.approved).length;

  const resetMins = rateLimitReset
    ? Math.ceil((rateLimitReset - Date.now()) / 60000)
    : 0;

  const progressPct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <DialogFrame className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-2 md:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface dark:bg-canvas rounded-panel w-full max-w-lg shadow-panel flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-line dark:border-line flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold  tracking-tight dark:text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-accent" /> AI Cataloga Contatti
              </h2>
              <p className="text-xs text-muted font-bold mt-0.5">
                Classifica segment + priorità con Claude Haiku
              </p>
            </div>
            <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="p-2 rounded-md hover:bg-raised dark:hover:bg-surface text-muted transition-all flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Tab: non categ. vs tutti */}
          <div className="flex gap-1.5 mt-3 bg-raised dark:bg-surface p-1 rounded-md">
            <button
              onClick={() => setOnlyUncategorized(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${onlyUncategorized ? 'bg-surface dark:bg-raised shadow text-accent' : 'text-secondary'}`}
            >
              Non categ. ({uncategorized.length})
            </button>
            <button
              onClick={() => setOnlyUncategorized(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${!onlyUncategorized ? 'bg-surface dark:bg-raised shadow text-accent' : 'text-secondary'}`}
            >
              Tutti ({allContacts.length})
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ minHeight: 0 }}>

          {/* Progress bar */}
          {(loading || (progress && progress.done > 0)) && (
            <div className="bg-accent-soft dark:bg-accent-soft/20 rounded-panel p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-accent dark:text-accent uppercase tracking-wide">
                  {loading ? `Elaborazione… ${progress?.done ?? 0}/${progress?.total ?? 0}` : `Completato ${progress?.done}/${progress?.total}`}
                </span>
                <span className="text-xs font-semibold text-accent">{progressPct}%</span>
              </div>
              <div className="h-2 bg-accent-soft dark:bg-accent-soft/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-action rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {!loading && remaining.length > 0 && (
                <p className="text-xs text-accent font-bold mt-1.5">
                  {remaining.length} contatti rimanenti — clicca "Continua" per completare
                </p>
              )}
            </div>
          )}

          {/* Errore / rate limit */}
          {error && (
            <div className="bg-danger-soft dark:bg-danger-soft border border-danger dark:border-danger rounded-panel p-3 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-danger dark:text-danger">{error}</p>
                {rateLimitReset && (
                  <p className="text-xs text-danger mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> Riprendi tra {resetMins} {resetMins === 1 ? 'minuto' : 'minuti'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Lista suggerimenti */}
          {suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-muted uppercase tracking-normal">
                  {suggestions.length} catalogati
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setAllApproved(true)} className="text-xs font-semibold text-accent uppercase hover:underline">Seleziona tutto</button>
                  <button onClick={() => setAllApproved(false)} className="text-xs font-semibold text-muted uppercase hover:underline">Deseleziona</button>
                </div>
              </div>

              {suggestions.map(s => {
                const seg = SEGMENT_COLORS[s.segment] ?? SEGMENT_COLORS.industria;
                return (
                  <div
                    key={s.id}
                    className={`rounded-panel border-2 p-3 transition-all cursor-pointer ${s.approved ? 'border-accent dark:border-accent bg-surface dark:bg-surface' : 'border-line dark:border-line bg-canvas dark:bg-canvas opacity-60'}`}
                    onClick={() => toggleApproval(s.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold dark:text-foreground uppercase truncate">{s.company}</p>
                        <p className="text-xs text-muted mt-0.5 font-bold truncate">{s.note}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${seg.bg} ${seg.text}`}>
                          {seg.label}
                        </span>
                        {s.approved
                          ? <CheckCircle2 size={16} className="text-accent" />
                          : <XCircle size={16} className="text-muted" />
                        }
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <span className={`text-xs uppercase tracking-wide ${PRIORITY_COLORS[s.priority]}`}>
                        ● {s.priority} priorità
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {suggestions.length === 0 && !loading && !error && (
            <div className="text-center py-8">
              <Sparkles size={28} className="mx-auto mb-3 text-accent" />
              <p className="text-sm font-semibold text-muted uppercase tracking-normal">Nessun risultato</p>
              <p className="text-xs text-muted mt-1">Avvia l'analisi per catalogare i contatti</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 pt-3 border-t border-line dark:border-line flex-shrink-0 space-y-2">
          {/* Reset */}
          {suggestions.length > 0 && !loading && (
            <button
              onClick={clearResults}
              className="w-full text-xs text-muted font-bold flex items-center justify-center gap-1.5 hover:text-danger transition-colors py-1"
            >
              <RotateCcw size={12} /> Azzera risultati salvati
            </button>
          )}

          {/* Avvia / Continua */}
          {remaining.length > 0 && (
            <button
              onClick={() => run(targetContacts)}
              disabled={loading}
              className={`w-full py-3 rounded-panel font-semibold uppercase text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                loading ? 'bg-raised dark:bg-raised text-muted' : 'bg-action hover:bg-action-hover text-action-foreground shadow-panel'
              }`}
            >
              <Sparkles size={16} />
              {loading
                ? 'Analisi in corso…'
                : processedIds.length > 0
                  ? `Continua (${remaining.length} rimanenti)`
                  : `Analizza ${remaining.length} contatti`
              }
            </button>
          )}

          {/* Applica */}
          {approvedCount > 0 && !loading && (
            <button
              onClick={() => { onApply(suggestions.filter(s => s.approved)); onClose(); }}
              className="w-full py-3 rounded-panel font-semibold uppercase text-sm tracking-wide bg-success hover:bg-success text-status-foreground shadow-panel flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle2 size={16} /> Applica {approvedCount} selezionati
            </button>
          )}
        </div>
      </div>
    </DialogFrame>
  );
};
