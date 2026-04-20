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
    red: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600', avatar: 'bg-red-100 text-red-700' },
    yellow: { border: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', avatar: 'bg-yellow-100 text-yellow-700' },
    gray: { border: 'border-gray-300', bg: 'bg-gray-100', text: 'text-gray-600', avatar: 'bg-indigo-50 text-indigo-600' }
  };
  const theme = colors[badgeColor];

  return (
    <div onClick={() => navigate(`/deal/${deal.id}`)} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex overflow-hidden shadow-sm hover:shadow-md cursor-pointer group transition-all">
      <div className={`w-1.5 ${theme.border} bg-current`}></div>
      <div className="p-3 flex-1 flex justify-between items-center">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-10 h-10 shrink-0 rounded-full flex justify-center items-center font-bold text-sm ${theme.avatar}`}>{contact.company.substring(0, 2).toUpperCase()}</div>
          <div className="min-w-0 pr-2">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{contact.company}</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{deal.products.join(', ')} · {contact.region}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate group-hover:text-indigo-600 font-medium">{deal.nextAction}</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end border-l border-gray-100 dark:border-gray-700 pl-3 shrink-0">
          <p className="font-bold text-gray-900 dark:text-white text-sm mb-0">€{(deal.value/1000).toFixed(0)}k</p>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{deal.probability}%</p>
          <span className={`${theme.bg} ${theme.text} text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5`}>{badgeLabel}</span>
        </div>
      </div>
    </div>
  );
};
