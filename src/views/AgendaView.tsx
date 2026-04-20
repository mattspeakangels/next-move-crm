import React from 'react';
import { useStore } from '../store/useStore';
import { selectDealsByPriority } from '../store/selectors';
import { DealCard } from '../components/dashboard/DealCard';
import { Calendar } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

export const AgendaView: React.FC = () => {
  const priorities = selectDealsByPriority(useStore());
  const hasItems = Object.values(priorities).some(arr => arr.length > 0);

  if (!hasItems) {
    return <EmptyState icon={Calendar} title="Agenda Libera" description="Non hai scadenze immediate. Ottimo momento per cercare nuovi lead!" />;
  }

  const renderAgendaSection = (title: string, deals: any[], color: string, badge: string, theme: any) => {
    if (deals.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${color} mb-4`}>{title}</h3>
        <div className="grid grid-cols-1 gap-3">
          {deals.map(deal => <DealCard key={deal.id} deal={deal} badgeLabel={badge} badgeColor={theme} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      {renderAgendaSection("Scaduti", priorities.scaduti, "text-red-500", "Scaduto", "red")}
      {renderAgendaSection("Oggi", priorities.oggi, "text-indigo-600", "Oggi", "red")}
      {renderAgendaSection("Domani e dopodomani", priorities.ore48, "text-yellow-600", "48h", "yellow")}
      {renderAgendaSection("Questa settimana", priorities.settimana, "text-gray-500", "In sett.", "gray")}
    </div>
  );
};
