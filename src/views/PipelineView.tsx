import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Deal, DealStage, NextActionPriority, NextActionType } from '../types';
import { ArrowRight, ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NextActionModal } from '../components/deals/NextActionModal';

const STAGES: { id: DealStage; name: string; color: string }[] = [
  { id: 'lead', name: 'Lead', color: 'bg-blue-500' },
  { id: 'qualificato', name: 'Qualificato', color: 'bg-purple-500' },
  { id: 'proposta', name: 'Proposta', color: 'bg-orange-500' },
  { id: 'negoziazione', name: 'Trattativa', color: 'bg-indigo-500' }
];

// Semaphore: returns color class + overdue info
function getSemaphore(deadline: number): { dot: string; overdueDays: number } {
  const now = Date.now();
  const diffMs = deadline - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { dot: 'bg-red-500', overdueDays: Math.abs(diffDays) };
  if (diffDays <= 3) return { dot: 'bg-yellow-400', overdueDays: 0 };
  return { dot: 'bg-green-500', overdueDays: 0 };
}

function formatDeadline(ts: number): string {
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

export const PipelineView: React.FC = () => {
  const { deals, contacts, updateDeal } = useStore();
  const navigate = useNavigate();
  const [filterProduct, setFilterProduct] = useState<string | null>(null);

  // NextActionModal state
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    dealId: string;
    newStage: DealStage | 'chiuso-vinto';
  } | null>(null);
  const [activeDealForModal, setActiveDealForModal] = useState<Deal | null>(null);

  const activeProducts = Array.from(new Set(Object.values(deals).flatMap(d => d.products))).sort();
  const filteredDeals = Object.values(deals).filter(d => {
    const isActive = !['chiuso-vinto', 'chiuso-perso'].includes(d.stage);
    const matchesProduct = !filterProduct || d.products.includes(filterProduct);
    return isActive && matchesProduct;
  });

  // Open modal before moving a card
  const handleMove = (dealId: string, newStage: DealStage | 'chiuso-vinto') => {
    const deal = deals[dealId];
    if (!deal) return;
    setPendingMove({ dealId, newStage });
    setActiveDealForModal(deal);
    setModalOpen(true);
  };

  // Open modal to add/edit next action on a card (+ button)
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
      // Apply move + next action together
      const update: Partial<Deal> = {
        stage: pendingMove.newStage as DealStage,
        ...(pendingMove.newStage === 'chiuso-vinto' ? { closedAt: Date.now() } : {}),
        nextAction: data.nextAction,
        nextActionType: data.nextActionType,
        nextActionDeadline: data.nextActionDeadline,
        nextActionPriority: data.nextActionPriority,
      };
      updateDeal(pendingMove.dealId, update);
    } else if (activeDealForModal) {
      // Just update next action
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
    // If closing without saving during a move, still move the card
    if (pendingMove) {
      const update: Partial<Deal> = {
        stage: pendingMove.newStage as DealStage,
        ...(pendingMove.newStage === 'chiuso-vinto' ? { closedAt: Date.now() } : {}),
      };
      updateDeal(pendingMove.dealId, update);
    }
    setPendingMove(null);
    setActiveDealForModal(null);
    setModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col">
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

      {/* Kanban columns */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-6 no-scrollbar">
        {STAGES.map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col gap-4">
              {/* Column header */}
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <h3 className="font-bold uppercase text-[10px] tracking-widest text-gray-400">{stage.name}</h3>
                  <span className="text-[10px] text-gray-400 font-bold">({stageDeals.length})</span>
                </div>
                <span className="font-bold text-xs">€{(stageTotal / 1000).toFixed(0)}k</span>
              </div>

              {/* Deal cards */}
              <div className="flex-1 space-y-3">
                {stageDeals.map(deal => {
                  const { dot, overdueDays } = deal.nextActionDeadline
                    ? getSemaphore(deal.nextActionDeadline)
                    : { dot: 'bg-gray-300', overdueDays: 0 };
                  const isOverdue = overdueDays > 0;

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
                        onClick={() => navigate(`/deal/${deal.id}`)}
                        className="font-bold text-sm mb-1 cursor-pointer hover:text-indigo-600 truncate"
                      >
                        {contacts[deal.contactId]?.company}
                      </div>

                      {/* Products */}
                      <div className="text-[10px] text-gray-500 mb-2 truncate">{deal.products.join(', ')}</div>

                      {/* Next action row */}
                      <div className="flex items-center gap-2 mb-3">
                        {/* Semaphore dot */}
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

                        {/* Deadline date */}
                        {deal.nextActionDeadline ? (
                          <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">
                            {formatDeadline(deal.nextActionDeadline)}
                          </span>
                        ) : null}
                      </div>

                      {/* Footer: value + actions */}
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-600 text-sm">
                          €{(deal.value / 1000).toFixed(0)}k
                        </span>
                        <div className="flex gap-1">
                          {/* Add/edit next action */}
                          <button
                            onClick={() => handleAddAction(deal)}
                            className="p-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-500 hover:bg-indigo-100 transition-colors"
                            title="Imposta prossima azione"
                          >
                            <Plus size={14} />
                          </button>

                          {/* Move left */}
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

                          {/* Move right */}
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

                {stageDeals.length === 0 && (
                  <div className="text-center py-8 text-gray-300 dark:text-gray-600 text-xs font-bold uppercase tracking-widest">
                    Vuoto
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Action Modal */}
      <NextActionModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        companyName={
          activeDealForModal ? contacts[activeDealForModal.contactId]?.company : undefined
        }
      />
    </div>
  );
};
