import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Deal, DealStage, NextActionPriority, NextActionType } from '../types';
import { ArrowRight, ArrowLeft, Plus, X, Sparkles } from 'lucide-react';
import { NextActionModal } from '../components/deals/NextActionModal';
import { AddDealModal } from '../components/deals/AddDealModal';
import { useClaudeAI } from '../hooks/useClaudeAI';
import { AiPanel } from '../components/ai/AiPanel';

const STAGES: { id: DealStage; name: string; color: string }[] = [
  { id: 'lead', name: 'Lead', color: 'bg-blue-500' },
  { id: 'qualificato', name: 'Qualificato', color: 'bg-purple-500' },
  { id: 'proposta', name: 'Proposta', color: 'bg-orange-500' },
  { id: 'negoziazione', name: 'Trattativa', color: 'bg-indigo-500' }
];

function getSemaphore(deadline: number): { dot: string; overdueDays: number } {
  const diffDays = Math.floor((deadline - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { dot: 'bg-red-500', overdueDays: Math.abs(diffDays) };
  if (diffDays <= 3) return { dot: 'bg-yellow-400', overdueDays: 0 };
  return { dot: 'bg-green-500', overdueDays: 0 };
}

function formatDeadline(ts: number): string {
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

interface PipelineViewProps {
  onNavigateToContact: (contactId: string) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({ onNavigateToContact }) => {
  const { deals, contacts, offers, updateDeal } = useStore();
  const [filterProduct, setFilterProduct] = useState<string | null>(null);

  const [addDealOpen, setAddDealOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ dealId: string; newStage: DealStage } | null>(null);
  const [activeDealForModal, setActiveDealForModal] = useState<Deal | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const { result: aiResult, loading: aiLoading, error: aiError, run: aiRun, reset: aiReset } = useClaudeAI();

  const runPipelineAnalysis = () => {
    const now = Date.now();
    const dealsData = filteredDeals.map(d => ({
      id: d.id,
      company: contacts[d.contactId]?.company ?? 'Sconosciuto',
      stage: d.stage,
      value: d.value,
      probability: d.probability,
      daysOpen: Math.floor((now - d.createdAt) / 86400000),
      nextActionDeadline: d.nextActionDeadline ? new Date(d.nextActionDeadline).toLocaleDateString('it-IT') : '—',
      deadlinePassed: d.nextActionDeadline ? d.nextActionDeadline < now : false,
      nextAction: d.nextAction || '—',
      notes: d.notes || '',
    }));
    const totalValue = dealsData.reduce((s, d) => s + d.value, 0);
    const weightedValue = filteredDeals.reduce((s, d) => s + d.value * d.probability / 100, 0);
    setShowAiPanel(true);
    aiRun('analizza-pipeline', { deals: dealsData, totalValue, weightedValue });
  };

  const allDeals = Object.values(deals);
  const activeProducts = Array.from(
    new Set(allDeals.flatMap(d => d.products ?? []))
  ).filter(Boolean).sort();

  const filteredDeals = allDeals.filter(d => {
    const isActive = !['chiuso-vinto', 'chiuso-perso'].includes(d.stage);
    const matchesProduct = !filterProduct || (d.products ?? []).includes(filterProduct);
    return isActive && matchesProduct;
  });

  const handleMove = (dealId: string, newStage: DealStage) => {
    const deal = deals[dealId];
    if (!deal) return;
    setPendingMove({ dealId, newStage });
    setActiveDealForModal(deal);
    setModalOpen(true);
  };

  const handleAddAction = (deal: Deal) => {
    setPendingMove(null);
    setActiveDealForModal(deal);
    setModalOpen(true);
  };

  const handleModalSave = (data: {
    nextAction: string;
    nextActionType: NextActionType;
    nextActionDeadline: number;
    nextActionPriority: NextActionPriority;
  }) => {
    if (pendingMove) {
      updateDeal(pendingMove.dealId, {
        stage: pendingMove.newStage,
        ...(pendingMove.newStage === 'chiuso-vinto' ? { closedAt: Date.now() } : {}),
        nextAction: data.nextAction,
        nextActionType: data.nextActionType,
        nextActionDeadline: data.nextActionDeadline,
        nextActionPriority: data.nextActionPriority,
      });
    } else if (activeDealForModal) {
      updateDeal(activeDealForModal.id, {
        nextAction: data.nextAction,
        nextActionType: data.nextActionType,
        nextActionDeadline: data.nextActionDeadline,
        nextActionPriority: data.nextActionPriority,
      });
    }
    setPendingMove(null);
    setActiveDealForModal(null);
    setModalOpen(false);
  };

  const handleModalClose = () => {
    // Se si chiude senza salvare durante uno spostamento, sposta comunque il deal
    if (pendingMove) {
      updateDeal(pendingMove.dealId, {
        stage: pendingMove.newStage,
        ...(pendingMove.newStage === 'chiuso-vinto' ? { closedAt: Date.now() } : {}),
      });
    }
    setPendingMove(null);
    setActiveDealForModal(null);
    setModalOpen(false);
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Pipeline</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={runPipelineAnalysis}
            className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-3 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-100 transition-colors"
          >
            <Sparkles size={14} /> <span className="hidden sm:inline">Analizza</span>
          </button>
          <button
            onClick={() => setAddDealOpen(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus size={16} /> Nuovo Deal
          </button>
        </div>
      </div>

      {/* Product filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        <button
          onClick={() => setFilterProduct(null)}
          className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            !filterProduct ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'
          }`}
        >
          Tutti i prodotti
        </button>
        {activeProducts.map(p => (
          <button
            key={p}
            onClick={() => setFilterProduct(p)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              filterProduct === p ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredDeals.length === 0 && (
        <div className="text-center py-20 text-gray-300 dark:text-gray-600">
          <p className="font-black uppercase tracking-widest text-sm">Nessun deal attivo</p>
          <p className="text-xs mt-1">Apri una scheda azienda e aggiungi un deal</p>
        </div>
      )}

      {/* Kanban columns — scroll orizzontale */}
      <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
        {STAGES.map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              {/* Column header */}
              <div className="flex justify-between items-center px-1 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <h3 className="font-bold uppercase text-[10px] tracking-widest text-gray-400">{stage.name}</h3>
                  <span className="text-[10px] text-gray-400 font-bold">({stageDeals.length})</span>
                </div>
                <span className="font-bold text-xs dark:text-gray-300">€{(stageTotal / 1000).toFixed(0)}k</span>
              </div>

              {/* Deal cards */}
              <div className="space-y-3 min-h-[60px]">
                {stageDeals.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
                    <span className="text-gray-300 dark:text-gray-600 text-[10px] font-bold uppercase tracking-widest">Vuoto</span>
                  </div>
                )}

                {stageDeals.map(deal => {
                  const { dot, overdueDays } = deal.nextActionDeadline
                    ? getSemaphore(deal.nextActionDeadline)
                    : { dot: 'bg-gray-300', overdueDays: 0 };
                  const isOverdue = overdueDays > 0;
                  const products = deal.products ?? [];

                  return (
                    <div
                      key={deal.id}
                      className={`p-4 rounded-xl shadow-sm border-2 transition-all ${
                        isOverdue
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-400'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      {/* Company name */}
                      <div
                        className="font-bold text-sm mb-1 truncate dark:text-white cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => onNavigateToContact(deal.contactId)}
                      >
                        {contacts[deal.contactId]?.company ?? '—'}
                      </div>

                      {/* Products */}
                      {products.length > 0 && (
                        <div className="text-[10px] text-gray-500 mb-2 truncate">
                          {products.join(', ')}
                        </div>
                      )}

                      {deal.closingDate && (() => {
                        const isPast = deal.closingDate < Date.now();
                        const daysLeft = Math.ceil((deal.closingDate - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <div className={`text-[10px] font-bold mb-2 flex items-center gap-1 ${isPast ? 'text-red-500' : daysLeft <= 7 ? 'text-orange-500' : 'text-gray-400'}`}>
                            <span>⏱</span>
                            <span>{isPast ? `Scaduto ${Math.abs(daysLeft)}gg fa` : `Chiusura: ${new Date(deal.closingDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`}</span>
                          </div>
                        );
                      })()}

                      {/* Next action row */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                        <div className="flex-1 min-w-0">
                          {isOverdue && (
                            <span className="inline-block bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide mr-1">
                              SCADUTA {overdueDays}gg
                            </span>
                          )}
                          {deal.nextAction ? (
                            <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate block">
                              {deal.nextAction}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Nessuna azione</span>
                          )}
                        </div>
                        {deal.nextActionDeadline ? (
                          <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">
                            {formatDeadline(deal.nextActionDeadline)}
                          </span>
                        ) : null}
                      </div>

                      {/* Offer selector */}
                      {(() => {
                        const contactOffers = Object.values(offers).filter(o => o.contactId === deal.contactId);
                        const linkedOffer = deal.offerRef ? offers[deal.offerRef] : null;
                        if (linkedOffer) {
                          return (
                            <div className="flex items-center gap-1 mb-2">
                              <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 flex-1 min-w-0">
                                <span className="truncate">{linkedOffer.offerNumber} · €{linkedOffer.totalAmount.toLocaleString('it-IT')}</span>
                              </span>
                              <button
                                onClick={() => updateDeal(deal.id, { offerRef: undefined })}
                                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                title="Scollega offerta"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        }
                        if (contactOffers.length > 0) {
                          return (
                            <div className="mb-2">
                              <select
                                className="text-[10px] font-bold text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1 border-0 outline-none w-full"
                                value=""
                                onChange={e => { if (e.target.value) updateDeal(deal.id, { offerRef: e.target.value }); }}
                              >
                                <option value="">Collega offerta...</option>
                                {contactOffers.map(o => (
                                  <option key={o.id} value={o.id}>{o.offerNumber} · €{o.totalAmount.toLocaleString('it-IT')}</option>
                                ))}
                              </select>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Footer */}
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-600 text-sm">
                          €{(deal.value / 1000).toFixed(0)}k
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAddAction(deal)}
                            className="p-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-500 hover:bg-indigo-100 transition-colors"
                            title="Imposta prossima azione"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => {
                              const idx = STAGES.findIndex(s => s.id === stage.id);
                              if (idx > 0) handleMove(deal.id, STAGES[idx - 1].id);
                            }}
                            className="p-1 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                            title="Fase precedente"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <button
                            onClick={() => {
                              const idx = STAGES.findIndex(s => s.id === stage.id);
                              if (idx < STAGES.length - 1) handleMove(deal.id, STAGES[idx + 1].id);
                              else handleMove(deal.id, 'chiuso-vinto');
                            }}
                            className="p-1 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                            title="Fase successiva"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <NextActionModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        companyName={activeDealForModal ? contacts[activeDealForModal.contactId]?.company : undefined}
      />

      {addDealOpen && <AddDealModal onClose={() => setAddDealOpen(false)} />}

      {showAiPanel && (
        <AiPanel
          title="Analizza Pipeline"
          subtitle={`${filteredDeals.length} opportunità attive`}
          loading={aiLoading}
          result={aiResult}
          error={aiError}
          onClose={() => { setShowAiPanel(false); aiReset(); }}
          onRetry={runPipelineAnalysis}
        />
      )}
    </div>
  );
};
