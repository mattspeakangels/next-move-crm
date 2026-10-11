import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';
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
    <div className="bg-accent-soft dark:bg-accent-soft/20 rounded-panel p-5 relative border border-accent dark:border-accent/50 shadow-sm mb-6 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-action text-action-foreground w-6 h-6 rounded-full flex justify-center items-center">
          <Star size={12} className="fill-white" />
        </div>
        <span className="text-xs font-bold text-accent dark:text-accent tracking-normal uppercase">Coach · Suggerimento del giorno</span>
      </div>
      <h2 className="text-lg font-bold text-foreground dark:text-foreground mb-2">{title}</h2>
      <p className="text-sm text-secondary dark:text-muted mb-4 leading-relaxed">
        Il contatto caldo è <span className="font-semibold text-foreground dark:text-muted">{contact?.company || "l'azienda"}</span>.
        Hai questo deal da <span className="font-semibold text-foreground dark:text-muted">€{topSuggestion.value.toLocaleString('it-IT')}</span> in bilico.
        Focus: {topSuggestion.coachReason}.
      </p>
      <button
        onClick={() => navigate(`/deal/${topSuggestion.id}`)}
        className="text-sm font-bold text-accent dark:text-accent flex items-center gap-1 hover:text-accent dark:hover:text-accent transition-colors"
      >
        Vai al dettaglio <ArrowRight size={14} />
      </button>
    </div>
  );
};
