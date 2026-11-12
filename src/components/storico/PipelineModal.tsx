import { DialogFrame } from '../ui/DialogFrame';
import { Euro, Plus, X } from 'lucide-react';
import { fmt, fmtEur } from '../../lib/storicoFormat';
import type { StoricoViewModel } from './useStoricoView';

export function PipelineModal({ v }: { v: StoricoViewModel }) {
  const { clienti, clientiDettagliati, contacts, pipelineModal, setPipelineModal, pmContactId, setPmContactId, pmValue, setPmValue, normName, confirmAddToPipeline } = v;
  if (!pipelineModal) return null;
  return (
    <DialogFrame className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface dark:bg-surface rounded-panel shadow-panel w-full max-w-md p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground dark:text-foreground text-lg">Aggiungi a Pipeline</h3>
            <p className="text-xs text-muted mt-0.5">{pipelineModal.nomeCliente} · {pipelineModal.motivazione}</p>
          </div>
          <button onClick={() => setPipelineModal(null)} className="p-2 rounded-md hover:bg-raised dark:hover:bg-raised text-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Contesto storico — cerca per clientId O per nome CRM collegato */}
        {(() => {
          const byId = clienti.find(c => c.clientId === pipelineModal.clientId);
          const byCrm = pmContactId
            ? (() => {
                const crm = contacts[pmContactId];
                return crm ? clienti.find(c => normName(c.nome) === normName(crm.company)) : undefined;
              })()
            : undefined;
          const rec = byId ?? byCrm;
          if (!rec) return null;
          const yearsWithData = ([2023, 2024, 2025, 2026] as const).filter(y =>
            (rec[`fatturato${y}` as keyof typeof rec] as number) > 0
          );
          if (yearsWithData.length === 0) return null;
          return (
            <div className="mb-4 p-3 bg-canvas dark:bg-canvas/50 rounded-md border border-line dark:border-line">
              <p className="text-xs font-semibold text-muted uppercase tracking-normal mb-2">📊 Fatturato effettivo (da storico)</p>
              <div className="flex gap-4 flex-wrap">
                {yearsWithData.map(y => (
                  <div key={y}>
                    <p className="text-xs text-muted">{y}{y === 2026 ? ' YTD' : ''}</p>
                    <p className="text-sm font-semibold text-foreground dark:text-foreground">
                      {fmtEur(rec[`fatturato${y}` as keyof typeof rec] as number)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Valore opportunità — basato sui prodotti top, NON sul fatturato totale */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Valore Opportunità (€)</label>
          <p className="text-xs text-muted mb-1.5">
            Stimato sui <strong>prodotti top</strong> del cliente — modifica liberamente
          </p>
          <div className="relative">
            <Euro size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="number"
              value={pmValue}
              onChange={e => setPmValue(parseFloat(e.target.value) || 0)}
              className="w-full pl-9 pr-4 py-3 border-2 border-line dark:border-line rounded-md font-semibold text-lg bg-canvas dark:bg-canvas dark:text-foreground outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Selezione azienda CRM */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">
            Collega ad Azienda CRM
            {pmContactId && <span className="ml-2 text-success font-semibold normal-case">✓ Collegato automaticamente</span>}
          </label>
          <select
            value={pmContactId}
            onChange={e => setPmContactId(e.target.value)}
            className={`w-full border-2 rounded-md px-3 py-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-colors text-sm ${pmContactId ? 'border-success dark:border-success' : 'border-line dark:border-line'}`}
          >
            <option value="">— Nessuna azienda (aggiungila dopo) —</option>
            {(() => {
              const all = Object.values(contacts).sort((a, b) => a.company.localeCompare(b.company));
              const clienti = all.filter(c => c.status === 'cliente');
              const prospect = all.filter(c => c.status !== 'cliente');
              return (
                <>
                  {clienti.length > 0 && <option disabled>── Clienti ──</option>}
                  {clienti.map(c => {
                    const storicoC = clienti.length > 0 ? clientiDettagliati.find(s => normName(s.nome) === normName(c.company)) : undefined;
                    const fattLabel = storicoC ? ` · storico €${fmt(storicoC.fatturato2024 || storicoC.fatturato2025 || storicoC.fatturato2023)}` : '';
                    return <option key={c.id} value={c.id}>{c.company}{fattLabel}</option>;
                  })}
                  {prospect.length > 0 && <option disabled>── Prospect ──</option>}
                  {prospect.map(c => {
                    const storicoC = clientiDettagliati.find(s => normName(s.nome) === normName(c.company));
                    const fattLabel = storicoC ? ` · storico €${fmt(storicoC.fatturato2024 || storicoC.fatturato2025 || storicoC.fatturato2023)}` : '';
                    return <option key={c.id} value={c.id}>{c.company}{fattLabel}</option>;
                  })}
                </>
              );
            })()}
          </select>
          <p className="text-xs text-muted mt-1.5">
            Il collegamento viene cercato automaticamente per nome — modifica se necessario
          </p>
        </div>

        {/* Prodotti suggeriti (read-only) */}
        {pipelineModal.prodottiSuggeriti.length > 0 && (
          <div className="mb-5 p-3 bg-accent-soft dark:bg-accent-soft/20 rounded-md">
            <p className="text-xs font-semibold text-accent uppercase tracking-normal mb-2">Prodotti da proporre</p>
            <div className="space-y-1">
              {pipelineModal.prodottiSuggeriti.map((p, i) => (
                <div key={i} className="text-xs text-accent dark:text-accent flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setPipelineModal(null)}
            className="flex-1 py-3 rounded-md border-2 border-line dark:border-line font-semibold text-sm text-secondary hover:bg-canvas transition-colors">
            Annulla
          </button>
          <button onClick={confirmAddToPipeline}
            className="flex-1 py-3 rounded-md bg-action hover:bg-action-hover text-action-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-panel">
            <Plus size={16} /> Crea Deal
          </button>
        </div>
      </div>
    </DialogFrame>
    );
}
