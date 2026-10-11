import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Deal } from '../../types';
import { useStore } from '../../store/useStore';

interface DealCardProps {
  deal: Deal;
  badgeLabel: string;
  badgeColor: 'red' | 'yellow' | 'gray';
}

export const DealCard: React.FC<DealCardProps> = ({ deal, badgeLabel, badgeColor }) => {
  const navigate = useNavigate();
  const contact = useStore(state => state.contacts[deal.contactId]);

  if (!contact) return null;

  const colors = {
    red: { border: 'border-danger', bg: 'bg-danger-soft', text: 'text-danger', avatar: 'bg-danger-soft text-danger' },
    yellow: { border: 'border-warning', bg: 'bg-warning-soft', text: 'text-warning', avatar: 'bg-warning-soft text-warning' },
    gray: { border: 'border-line', bg: 'bg-raised', text: 'text-secondary', avatar: 'bg-accent-soft text-accent' }
  };
  const theme = colors[badgeColor];

  return (
    <div onClick={() => navigate(`/deal/${deal.id}`)} className="bg-surface dark:bg-surface border border-line dark:border-line rounded-md flex overflow-hidden shadow-sm hover:shadow-panel cursor-pointer group transition-all">
      <div className={`w-1.5 ${theme.border} bg-current`}></div>
      <div className="p-3 flex-1 flex justify-between items-center">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-10 h-10 shrink-0 rounded-full flex justify-center items-center font-bold text-sm ${theme.avatar}`}>{contact.company.substring(0, 2).toUpperCase()}</div>
          <div className="min-w-0 pr-2">
            <h4 className="font-bold text-foreground dark:text-foreground text-sm truncate">{contact.company}</h4>
            <p className="text-xs text-secondary dark:text-muted truncate">{deal.products.join(', ')} · {contact.region}</p>
            <p className="text-xs text-secondary dark:text-muted mt-1 truncate group-hover:text-accent font-medium">{deal.nextAction}</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end border-l border-line dark:border-line pl-3 shrink-0">
          <p className="font-bold text-foreground dark:text-foreground text-sm mb-0">€{(deal.value/1000).toFixed(0)}k</p>
          <p className="text-xs font-medium text-secondary dark:text-muted">{deal.probability}%</p>
          <span className={`${theme.bg} ${theme.text} text-xs font-bold px-2 py-0.5 rounded-full mt-1.5`}>{badgeLabel}</span>
        </div>
      </div>
    </div>
  );
};
