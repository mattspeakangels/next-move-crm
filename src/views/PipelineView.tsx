import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { DealStage } from '../types';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STAGES: { id: DealStage; name: string; color: string }[] = [
  { id: 'lead', name: 'Lead', color: 'bg-blue-500' },
  { id: 'qualificato', name: 'Qualificato', color: 'bg-purple-500' },
  { id: 'proposta', name: 'Proposta', color: 'bg-orange-500' },
  { id: 'negoziazione', name: 'Trattativa', color: 'bg-indigo-500' }
];

export const PipelineView: React.FC = () => {
  const { deals, contacts, updateDeal } = useStore();
  const navigate = useNavigate();
  const [filterProduct, setFilterProduct] = useState<string | null>(null);

  const activeProducts = Array.from(new Set(Object.values(deals).flatMap(d => d.products))).sort();
  const filteredDeals = Object.values(deals).filter(d => {
    const isActive = !['chiuso-vinto', 'chiuso-perso'].includes(d.stage);
    const matchesProduct = !filterProduct || d.products.includes(filterProduct);
    return isActive && matchesProduct;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        <button onClick={() => setFilterProduct(null)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${!filterProduct ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>Tutti i prodotti</button>
        {activeProducts.map(p => (
          <button key={p} onClick={() => setFilterProduct(p)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterProduct === p ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>{p}</button>
        ))}
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-6 no-scrollbar">
        {STAGES.map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stage.color}`}></span>
                  <h3 className="font-bold uppercase text-[10px] tracking-widest text-gray-400">{stage.name}</h3>
                </div>
                <span className="font-bold text-xs">€{(stageTotal/1000).toFixed(0)}k</span>
              </div>

              <div className="flex-1 space-y-3">
                {stageDeals.map(deal => (
                  <div key={deal.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div onClick={() => navigate(`/deal/${deal.id}`)} className="font-bold text-sm mb-1 cursor-pointer hover:text-indigo-600 truncate">
                      {contacts[deal.contactId]?.company}
                    </div>
                    <div className="text-[10px] text-gray-500 mb-3 truncate">{deal.products.join(', ')}</div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-600 text-sm">€{(deal.value/1000).toFixed(0)}k</span>
                      <div className="flex gap-1">
                        <button onClick={() => {
                          const idx = STAGES.findIndex(s => s.id === stage.id);
                          if (idx > 0) updateDeal(deal.id, { stage: STAGES[idx-1].id });
                        }} className="p-1 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-400"><ArrowLeft size={14}/></button>
                        <button onClick={() => {
                          const idx = STAGES.findIndex(s => s.id === stage.id);
                          if (idx < STAGES.length - 1) updateDeal(deal.id, { stage: STAGES[idx+1].id });
                          else updateDeal(deal.id, { stage: 'chiuso-vinto', closedAt: Date.now() });
                        }} className="p-1 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-400"><ArrowRight size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
