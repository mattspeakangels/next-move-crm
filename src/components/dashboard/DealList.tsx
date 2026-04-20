import React from 'react';
import { useStore } from '../../store/useStore';
import { selectDealsByPriority } from '../../store/selectors';
import { DealCard } from './DealCard';
import { Deal } from '../../types';

export const DealList: React.FC = () => {
  const priorities = selectDealsByPriority(useStore());

  const renderSection = (title: string, deals: Deal[], badgeColor: 'red' | 'yellow' | 'gray', badgeLabelFn: (deal: Deal) => string, dotColor: string) => {
    if (deals.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
            <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title} · {deals.length}</h3>
          </div>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">€{(deals.reduce((a,d)=>a+d.value,0)/1000).toFixed(0)}K</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {deals.map(deal => <DealCard key={deal.id} deal={deal} badgeLabel={badgeLabelFn(deal)} badgeColor={badgeColor} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-2">
      {renderSection("Urgente — Fai Ora", [...priorities.scaduti, ...priorities.oggi], 'red', (d) => priorities.scaduti.includes(d) ? 'Scaduto' : 'Oggi', 'bg-red-500')}
      {renderSection("Prossime 48 Ore", priorities.ore48, 'yellow', () => 'Domani', 'bg-yellow-400')}
      {renderSection("Questa Settimana", priorities.settimana, 'gray', () => 'In set.', 'bg-gray-400')}
      {renderSection("Backlog", priorities.resto, 'gray', () => 'Futuro', 'bg-gray-300')}
    </div>
  );
};
