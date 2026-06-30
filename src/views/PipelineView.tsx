import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Deal, DealStage, NextActionPriority, NextActionType } from '../types';
import { ArrowRight, ArrowLeft, Plus, X, Sparkles, Trash2, Edit2, Columns, CalendarDays, Lightbulb } from 'lucide-react';
import { NextActionModal } from '../components/deals/NextActionModal';
import { AddDealModal } from '../components/deals/AddDealModal';
import { useClaudeAI } from '../hooks/useClaudeAI';
import { AiPanel } from '../components/ai/AiPanel';
import { MonthlyOrdersView } from '../components/pipeline/MonthlyOrdersView';
import { SuggestedDealsView } from '../components/pipeline/SuggestedDealsView';

const STAGES: { id: DealStage; name: string; color: string; bar: string }[] = [
  { id: 'lead', name: 'Lead', color: 'bg-sky-500', bar: 'bg-sky-400' },
  { id: 'qualificato', name: 'Qualificato', color: 'bg-violet-500', bar: 'bg-violet-400' },
  { id: 'proposta', name: 'Proposta', color: 'bg-amber-500', bar: 'bg-amber-400' },
  { id: 'negoziazione', name: 'Trattativa', color: 'bg-brand-500', bar: 'bg-brand-400' }
];

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualificato: 'Qualificato',
  proposta: 'Proposta',
  negoziazione: 'Trattativa',
  'chiuso-vinto': 'Chiuso Vinto',
  'chiuso-perso': 'Chiuso Perso',
};

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
  const { deals, contacts, offers, updateDeal, removeDeal, addActivity } = useStore();

  const [activeTab, setActiveTab] = useState<'kanban' | 'mensile' | 'suggeriti'>('kanban');
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [editDealId, setEditDealId] = useState<string | null>(null);
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

  const filteredDeals = allDeals.filter(d => !['chiuso-vinto', 'chiuso-perso'].includes(d.stage));

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
      const deal = deals[pendingMove.dealId];
      const oldStage = deal?.stage;
      updateDeal(pendingMove.dealId, {
        stage: pendingMove.newStage,
        ...(pendingMove.newStage === 'chiuso-vinto' ? { closedAt: Date.now() } : {}),
        nextAction: data.nextAction,
        nextActionType: data.nextActionType,
        nextActionDeadline: data.nextActionDeadline,
        nextActionPriority: data.nextActionPriority,
      });
      if (deal && oldStage && oldStage !== pendingMove.newStage) {
        addActivity({
          id: `act_stage_${Date.now()}`,
          contactId: deal.contactId,
          dealId: deal.id,
          type: 'nota',
          date: Date.now(),
          outcome: 'avanzamento-pipeline',
          notes: `Pipeline: ${STAGE_LABELS[oldStage]} → ${STAGE_LABELS[pendingMove.newStage]}`,
          createdAt: Date.now(),
        });
      }
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
      const deal = deals[pendingMove.dealId];
      const oldStage = deal?.stage;
      updateDeal(pendingMove.dealId, {
        stage: pendingMove.newStage,
        ...(pendingMove.newStage === 'chiuso-vinto' ? { closedAt: Date.now() } : {}),
      });
      if (deal && oldStage && oldStage !== pendingMove.newStage) {
        addActivity({
          id: `act_stage_${Date.now()}`,
          contactId: deal.contactId,
          dealId: deal.id,
          type: 'nota',
          date: Date.now(),
          outcome: 'avanzamento-pipeline',
          notes: `Pipeline: ${STAGE_LABELS[oldStage]} → ${STAGE_LABELS[pendingMove.newStage]}`,
          createdAt: Date.now(),
        });
      }
    }
    setPendingMove(null);
    setActiveDealForModal(null);
    setModalOpen(false);
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pipeline</h1>
        {activeTab === 'kanban' && (
          <div className="flex items-center gap-2">
            <button
              onClick={runPipelineAnalysis}
              className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-3.5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wide hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
            >
              <Sparkles size={14} /> <span className="hidden sm:inline">Analizza</span>
            </button>
            <button
              onClick={() => setAddDealOpen(true)}
              className="bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-card hover:bg-brand-700 active:scale-[0.98] transition-all text-sm"
            >
              <Plus size={16} /> Nuovo Deal
            </button>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5 w-fit">
        {([
          { id: 'kanban', label: 'Deals', icon: Columns },
          { id: 'mensile', label: 'Per Mese', icon: CalendarDays },
          { id: 'suggeriti', label: 'Suggeriti', icon: Lightbulb },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all
              ${activeTab === id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Monthly view */}
      {activeTab === 'mensile' && <MonthlyOrdersView />}

      {/* Suggested deals */}
      {activeTab === 'suggeriti' && <SuggestedDealsView />}

      {/* Kanban — only when activeTab === kanban */}
      {activeTab === 'kanban' && <>

      {/* Empty state */}
      {filteredDeals.length === 0 && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <p className="font-bold tracking-tight text-sm text-gray-600 dark:text-gray-400">Nessun deal attivo</p>
          <p className="text-xs mt-1">Apri una scheda azienda e aggiungi un deal</p>
        </div>
      )}

      {/* Kanban columns — scroll orizzontale */}
      <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
        {STAGES.map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-72 rounded-2xl bg-gray-50 dark:bg-gray-800/40 p-2.5 overflow-hidden">
              {/* Accento di stage */}
              <div className={`h-1 rounded-full mb-3 ${stage.bar}`} />
              {/* Column header */}
              <div className="flex justify-between items-center px-1.5 mb-3 pb-2.5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stage.color}`} />
                  <h3 className="font-bold text-sm tracking-tight text-gray-800 dark:text-gray-100">{stage.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold tabular-nums">{stageDeals.length}</span>
                </div>
                <span className="font-bold text-sm text-brand-600 dark:text-brand-400 tabular-nums">€{(stageTotal / 1000).toFixed(0)}k</span>
              </div>

              {/* Deal cards */}
              <div className="space-y-3 min-h-[60px]">
                {stageDeals.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                    <span className="text-gray-400 dark:text-gray-600 text-[10px] font-semibold uppercase tracking-widest">Vuoto</span>
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
                      className={`p-4 rounded-2xl shadow-card border transition-all hover:-translate-y-0.5 ${
                        isOverdue
                          ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                      }`}
                    >
                      {/* Company name */}
                      <div
                        className="font-semibold text-sm mb-1 truncate text-gray-900 dark:text-white cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                        onClick={() => deal.contactId ? onNavigateToContact(deal.contactId) : undefined}
                      >
                        {contacts[deal.contactId]?.company ?? deal.nomeStorico ?? '—'}
                      </div>
                      {deal.nomeStorico && !contacts[deal.contactId] && (
                        <span className="inline-block text-[9px] font-bold uppercase tracking-wide bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full mb-1.5">
                          Da Storico
                        </span>
                      )}

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
                          <div className={`text-[10px] font-semibold mb-2 flex items-center gap-1 tabular-nums ${isPast ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
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
                            <span className="inline-block bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide mr-1 tabular-nums">
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
                              <span className="bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 flex-1 min-w-0 tabular-nums">
                                <span className="truncate">{linkedOffer.offerNumber} · €{linkedOffer.totalAmount.toLocaleString('it-IT')}</span>
                              </span>
                              <button
                                onClick={() => updateDeal(deal.id, { offerRef: undefined })}
                                className="text-gray-400 hover:text-rose-500 transition-colors flex-shrink-0"
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
                        <span className="font-bold text-brand-600 dark:text-brand-400 text-sm tabular-nums">
                          €{(deal.value / 1000).toFixed(0)}k
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAddAction(deal)}
                            className="p-1.5 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                            title="Imposta prossima azione"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => setEditDealId(deal.id)}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30 transition-colors"
                            title="Modifica deal"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => { if (window.confirm(`Eliminare il deal di ${contacts[deal.contactId]?.company ?? ''}?`)) removeDeal(deal.id); }}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 transition-colors"
                            title="Elimina deal"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              const idx = STAGES.findIndex(s => s.id === stage.id);
                              if (idx > 0) handleMove(deal.id, STAGES[idx - 1].id);
                            }}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Fase precedente"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <button
                            onClick={() => {
                              const idx = STAGES.findIndex(s => s.id === stage.id);
                              const nextStage = idx < STAGES.length - 1 ? STAGES[idx + 1].id : 'chiuso-vinto';
                              if (nextStage === 'chiuso-vinto') {
                                handleMove(deal.id, 'chiuso-vinto');
                              } else {
                                const oldStage = deal.stage;
                                updateDeal(deal.id, { stage: nextStage });
                                addActivity({
                                  id: `act_stage_${Date.now()}`,
                                  contactId: deal.contactId,
                                  dealId: deal.id,
                                  type: 'nota',
                                  date: Date.now(),
                                  outcome: 'avanzamento-pipeline',
                                  notes: `Pipeline: ${STAGE_LABELS[oldStage]} → ${STAGE_LABELS[nextStage as DealStage]}`,
                                  createdAt: Date.now(),
                                });
                              }
                            }}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 transition-colors"
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
      {editDealId && <AddDealModal dealToEdit={editDealId} onClose={() => setEditDealId(null)} />}

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
      </>}
    </div>
  );
};
