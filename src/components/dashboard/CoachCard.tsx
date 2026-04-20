import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Settings as SettingsIcon, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { generateCoachSuggestions } from '../../utils/coachLogic';

export const CoachCard: React.FC = () => {
  const navigate = useNavigate();
  const { deals, activities, contacts } = useStore();

  const activeDeals = Object.values(deals).filter(d => !['chiuso-vinto', 'chiuso-perso'].includes(d.stage));
  
  const topSuggestion = useMemo(() => {
    const suggestions = generateCoachSuggestions(activeDeals, Object.values(activities));
    return suggestions.length > 0 ? suggestions[0] : null;
  }, [activeDeals, activities]);

  if (!topSuggestion) return null;

  const contact = contacts[topSuggestion.contactId];
  const title = contact ? `Inizia da ${contact.contactName.split(' ')[0]}` : 'Priorità del giorno';

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 relative border border-indigo-100 dark:border-indigo-900/50 shadow-sm mb-6 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex justify-center items-center">
          <Star size={12} className="fill-white" />
        </div>
        <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 tracking-widest uppercase">Coach · Suggerimento del giorno</span>
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
        Il contatto caldo è <span className="font-semibold text-gray-800 dark:text-gray-100">{contact?.company || "l'azienda"}</span>. 
        Hai questo deal da <span className="font-semibold text-gray-800 dark:text-gray-100">€{topSuggestion.value.toLocaleString('it-IT')}</span> in bilico. 
        Focus: {topSuggestion.coachReason}.
      </p>
      <button 
        onClick={() => navigate(`/deal/${topSuggestion.id}`)}
        className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
      >
        Vai al dettaglio <ArrowRight size={14} />
      </button>
    </div>
  );
};
