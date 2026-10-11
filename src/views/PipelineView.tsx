import { confirmAction } from '../components/ui/Feedback';
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Deal, DealStage, NavView, NextActionPriority, NextActionType } from '../types';
import { ArrowRight, ArrowLeft, Plus, X, Sparkles, Trash2, Edit2, Columns, CalendarDays, Lightbulb, Radar } from 'lucide-react';
import { NextActionModal } from '../components/deals/NextActionModal';
import { AddDealModal } from '../components/deals/AddDealModal';
import { CloseDealModal } from '../components/deals/CloseDealModal';
import { useClaudeAI } from '../hooks/useClaudeAI';
import { AiPanel } from '../components/ai/AiPanel';
import { MonthlyOrdersView } from '../components/pipeline/MonthlyOrdersView';
import { SuggestedDealsView } from '../components/pipeline/SuggestedDealsView';
import { ProspectingView } from './ProspectingView';
import { uploadOfferPdf } from '../lib/uploadPdf';

const STAGES: { id: DealStage; name: string; color: string; bar: string }[] = [
  { id: 'lead', name: 'Lead', color: 'bg-action', bar: 'bg-accent' },
  { id: 'qualificato', name: 'Qualificato', color: 'bg-action', bar: 'bg-accent' },
  { id: 'proposta', name: 'Proposta', color: 'bg-warning', bar: 'bg-warning' },
  { id: 'negoziazione', name: 'Trattativa', color: 'bg-action', bar: 'bg-accent' }
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
  if (diffDays < 0) return { dot: 'bg-danger', overdueDays: Math.abs(diffDays) };
  if (diffDays <= 3) return { dot: 'bg-warning', overdueDays: 0 };
  return { dot: 'bg-success', overdueDays: 0 };
}

function formatDeadline(ts: number): string {
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

interface PipelineViewProps {
  onNavigateToContact: (contactId: string) => void;
  onNavigate?: (view: NavView) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({ onNavigateToContact, onNavigate }) => {
  const { deals, contacts, offers, updateDeal, removeDeal, addActivity, addTodo } = useStore();

  const [activeTab, setActiveTab] = useState<'prospecting' | 'kanban' | 'mensile' | 'suggeriti'>('prospecting');
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [editDealId, setEditDealId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ dealId: string; newStage: DealStage } | null>(null);
  const [activeDealForModal, setActiveDealForModal] = useState<Deal | null>(null);
  const [closeDealTarget, setCloseDealTarget] = useState<Deal | null>(null);
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

  const handleWinDeal = async (data: { orderValue?: number; pdfFile?: File }) => {
    const deal = closeDealTarget;
    if (!deal) return;
    let orderPdfUrl: string | undefined;
    let orderPdfName: string | undefined;
    if (data.pdfFile) {
      try {
        const { url, name } = await uploadOfferPdf(deal.id, data.pdfFile);
        orderPdfUrl = url;
        orderPdfName = name;
      } catch {
        // upload fallito: si procede comunque con la chiusura, senza PDF allegato
      }
    }
    updateDeal(deal.id, {
      stage: 'chiuso-vinto',
      closedAt: Date.now(),
      ...(data.orderValue !== undefined ? { value: data.orderValue } : {}),
      ...(orderPdfUrl ? { orderPdfUrl, orderPdfName } : {}),
    });
    addActivity({
      id: `act_close_${Date.now()}`,
      contactId: deal.contactId,
      dealId: deal.id,
      type: 'nota',
      date: Date.now(),
      outcome: 'avanzamento-pipeline',
      notes: `Trattativa VINTA${data.orderValue ? ` — ordine €${data.orderValue.toLocaleString('it-IT')}` : ''}`,
      createdAt: Date.now(),
    });
    setCloseDealTarget(null);
  };

  const handleLoseDeal = (data: { feedback: string; monthsDelay: 1 | 2 | 3 | 6 }) => {
    const deal = closeDealTarget;
    if (!deal) return;
    const nextVisitDate = new Date();
    nextVisitDate.setMonth(nextVisitDate.getMonth() + data.monthsDelay);
    nextVisitDate.setHours(9, 0, 0, 0);

    updateDeal(deal.id, {
      stage: 'chiuso-perso',
      closedAt: Date.now(),
      lostFeedback: data.feedback,
    });
    addActivity({
      id: `act_close_${Date.now()}`,
      contactId: deal.contactId,
      dealId: deal.id,
      type: 'nota',
      date: Date.now(),
      outcome: 'avanzamento-pipeline',
      notes: `Trattativa PERSA — ${data.feedback}`,
      createdAt: Date.now(),
    });
    addTodo({
      titolo: `Ricontattare ${contacts[deal.contactId]?.company ?? ''} (trattativa persa)`,
      tipo: 'visita',
      priorita: 'media',
      scadenza: nextVisitDate.toISOString().split('T')[0],
      note: data.feedback,
      contactId: deal.contactId,
      status: 'da-fare',
      source: 'manuale',
    });
    addActivity({
      id: `act_${Date.now()}_nextvisit`,
      contactId: deal.contactId,
      dealId: deal.id,
      type: 'visita',
      date: nextVisitDate.getTime(),
      outcome: 'da-fare',
      notes: `Nuova visita dopo trattativa persa. Feedback: ${data.feedback}`,
      createdAt: Date.now(),
    });
    setCloseDealTarget(null);
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl  text-foreground dark:text-foreground tracking-tight">Pipeline</h1>
        {activeTab === 'kanban' && (
          <div className="flex items-center gap-2">
            <button
              onClick={runPipelineAnalysis}
              className="flex items-center gap-1.5 bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent px-3.5 py-2.5 rounded-md font-bold uppercase text-xs tracking-wide hover:bg-accent-soft dark:hover:bg-accent-soft/50 transition-colors"
            >
              <Sparkles size={14} /> <span className="hidden sm:inline">Analizza</span>
            </button>
            <button
              onClick={() => setAddDealOpen(true)}
              className="bg-action text-action-foreground px-5 py-2.5 rounded-md font-semibold flex items-center gap-2 shadow-card hover:bg-action-hover active:scale-[0.98] transition-all text-sm"
            >
              <Plus size={16} /> Nuovo Deal
            </button>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-raised dark:bg-surface p-1 rounded-panel mb-5 w-fit max-w-full overflow-x-auto overscroll-x-contain">
        {([
          { id: 'prospecting', label: 'Prospecting', icon: Radar },
          { id: 'kanban', label: 'Deals', icon: Columns },
          { id: 'mensile', label: 'Per Mese', icon: CalendarDays },
          { id: 'suggeriti', label: 'Suggeriti', icon: Lightbulb },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors
              ${activeTab === id
                ? 'bg-surface dark:bg-raised text-foreground dark:text-foreground shadow-sm'
                : 'text-muted dark:text-secondary hover:text-secondary dark:hover:text-muted'}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Prospecting — prima fase della pipeline, prima di "Lead" */}
      {activeTab === 'prospecting' && <ProspectingView onNavigate={onNavigate ?? (() => {})} />}

      {/* Monthly view */}
      {activeTab === 'mensile' && <MonthlyOrdersView />}

      {/* Suggested deals */}
      {activeTab === 'suggeriti' && <SuggestedDealsView />}

      {/* Kanban — only when activeTab === kanban */}
      {activeTab === 'kanban' && <>

      {/* Empty state */}
      {filteredDeals.length === 0 && (
        <div className="text-center py-20 text-muted dark:text-secondary">
          <p className="font-bold tracking-tight text-sm text-secondary dark:text-muted">Nessun deal attivo</p>
          <p className="text-xs mt-1">Apri una scheda azienda e aggiungi un deal</p>
        </div>
      )}

      {/* Kanban columns — scroll orizzontale */}
      <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
        {STAGES.map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-72 rounded-panel bg-canvas dark:bg-surface/40 p-2.5 overflow-hidden">
              {/* Accento di stage */}
              <div className={`h-1 rounded-full mb-3 ${stage.bar}`} />
              {/* Column header */}
              <div className="flex justify-between items-center px-1.5 mb-3 pb-2.5 border-b border-line dark:border-line">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stage.color}`} />
                  <h3 className="font-bold text-sm tracking-tight text-foreground dark:text-muted">{stage.name}</h3>
                  <span className="text-xs text-secondary dark:text-muted font-semibold tabular-nums">{stageDeals.length}</span>
                </div>
                <span className="font-bold text-sm text-accent dark:text-accent tabular-nums">€{(stageTotal / 1000).toFixed(0)}k</span>
              </div>

              {/* Deal cards */}
              <div className="space-y-3 min-h-[60px]">
                {stageDeals.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-line dark:border-line rounded-md">
                    <span className="text-muted dark:text-secondary text-xs font-semibold uppercase tracking-normal">Vuoto</span>
                  </div>
                )}

                {stageDeals.map(deal => {
                  const { dot, overdueDays } = deal.nextActionDeadline
                    ? getSemaphore(deal.nextActionDeadline)
                    : { dot: 'bg-raised', overdueDays: 0 };
                  const isOverdue = overdueDays > 0;
                  const products = deal.products ?? [];

                  return (
                    <div
                      key={deal.id}
                      className={`p-4 rounded-panel shadow-card border transition-all hover:-translate-y-0.5 ${
                        isOverdue
                          ? 'bg-danger-soft dark:bg-danger-soft border-danger dark:border-danger'
                          : 'bg-surface dark:bg-surface border-line dark:border-line hover:border-accent dark:hover:border-accent'
                      }`}
                    >
                      {/* Company name */}
                      <div
                        className="font-semibold text-sm mb-1 truncate text-foreground dark:text-foreground cursor-pointer hover:text-accent dark:hover:text-accent transition-colors"
                        onClick={() => deal.contactId ? onNavigateToContact(deal.contactId) : undefined}
                      >
                        {contacts[deal.contactId]?.company ?? deal.nomeStorico ?? '—'}
                      </div>
                      {deal.nomeStorico && !contacts[deal.contactId] && (
                        <span className="inline-block text-xs font-bold uppercase tracking-wide bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent px-2 py-0.5 rounded-full mb-1.5">
                          Da Storico
                        </span>
                      )}

                      {/* Products */}
                      {products.length > 0 && (
                        <div className="text-xs text-secondary mb-2 truncate">
                          {products.join(', ')}
                        </div>
                      )}

                      {deal.closingDate && (() => {
                        const isPast = deal.closingDate < Date.now();
                        const daysLeft = Math.ceil((deal.closingDate - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <div className={`text-xs font-semibold mb-2 flex items-center gap-1 tabular-nums ${isPast ? 'text-danger' : daysLeft <= 7 ? 'text-warning' : 'text-secondary dark:text-muted'}`}>
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
                            <span className="inline-block bg-danger text-status-foreground text-xs font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide mr-1 tabular-nums">
                              SCADUTA {overdueDays}gg
                            </span>
                          )}
                          {deal.nextAction ? (
                            <span className="text-xs text-secondary dark:text-muted truncate block">
                              {deal.nextAction}
                            </span>
                          ) : (
                            <span className="text-xs text-muted italic">Nessuna azione</span>
                          )}
                        </div>
                        {deal.nextActionDeadline ? (
                          <span className="text-xs font-bold text-muted flex-shrink-0">
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
                              <span className="bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 flex-1 min-w-0 tabular-nums">
                                <span className="truncate">{linkedOffer.offerNumber} · €{linkedOffer.totalAmount.toLocaleString('it-IT')}</span>
                              </span>
                              <button
                                onClick={() => updateDeal(deal.id, { offerRef: undefined })}
                                className="text-muted hover:text-danger transition-colors flex-shrink-0"
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
                                className="text-xs font-bold text-secondary bg-canvas dark:bg-surface rounded-lg px-2 py-1 border-0 outline-none w-full"
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
                        <span className="font-bold text-accent dark:text-accent text-sm tabular-nums">
                          €{(deal.value / 1000).toFixed(0)}k
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAddAction(deal)}
                            className="p-1.5 bg-accent-soft dark:bg-accent-soft/30 rounded-lg text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/50 transition-colors"
                            title="Imposta prossima azione"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => setEditDealId(deal.id)}
                            className="p-1.5 bg-raised dark:bg-raised rounded-lg text-secondary hover:bg-accent-soft hover:text-accent dark:hover:bg-accent-soft/30 transition-colors"
                            title="Modifica deal"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={async () => { if (await confirmAction(`Eliminare il deal di ${contacts[deal.contactId]?.company ?? ''}?`)) removeDeal(deal.id); }}
                            className="p-1.5 bg-raised dark:bg-raised rounded-lg text-secondary hover:bg-danger-soft hover:text-danger dark:hover:bg-danger-soft transition-colors"
                            title="Elimina deal"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              const idx = STAGES.findIndex(s => s.id === stage.id);
                              if (idx > 0) handleMove(deal.id, STAGES[idx - 1].id);
                            }}
                            className="p-1.5 bg-raised dark:bg-raised rounded-lg text-secondary hover:bg-raised dark:hover:bg-raised transition-colors"
                            title="Fase precedente"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <button
                            onClick={() => {
                              const idx = STAGES.findIndex(s => s.id === stage.id);
                              const nextStage = idx < STAGES.length - 1 ? STAGES[idx + 1].id : 'chiuso-vinto';
                              if (nextStage === 'chiuso-vinto') {
                                setCloseDealTarget(deal);
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
                            className="p-1.5 bg-raised dark:bg-raised rounded-lg text-secondary hover:bg-success-soft hover:text-success dark:hover:bg-success-soft transition-colors"
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

      <CloseDealModal
        isOpen={!!closeDealTarget}
        onClose={() => setCloseDealTarget(null)}
        onWin={handleWinDeal}
        onLose={handleLoseDeal}
        companyName={closeDealTarget ? contacts[closeDealTarget.contactId]?.company : undefined}
        currentValue={closeDealTarget?.value}
      />

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
