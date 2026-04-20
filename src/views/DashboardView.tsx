import React from 'react';
import { CoachCard } from '../components/dashboard/CoachCard';
import { TargetProgress } from '../components/dashboard/TargetProgress';
import { DealList } from '../components/dashboard/DealList';
import { useStore } from '../store/useStore';
import { EmptyState } from '../components/ui/EmptyState';
import { LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardView: React.FC = () => {
  const deals = useStore(state => state.deals);
  const navigate = useNavigate();
  const hasDeals = Object.keys(deals).length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <CoachCard />
      <TargetProgress />
      
      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Le tue priorità</h2>
      </div>

      {hasDeals ? (
        <DealList />
      ) : (
        <EmptyState 
          icon={LayoutGrid}
          title="Nessuna trattativa attiva"
          description="Inizia aggiungendo il tuo primo deal dalla sezione Contatti o cliccando il tasto + in alto."
          action={{ label: "Vai ai contatti", onClick: () => navigate('/contacts') }}
        />
      )}
    </div>
  );
};
