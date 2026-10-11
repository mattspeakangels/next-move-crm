import React from 'react';
import { Wordmark } from '../ui/Syrio';
import { useStore } from '../../store/useStore';

export const Onboarding: React.FC = () => {
  const { setProfile } = useStore();
  const handleStart = () => {
    setProfile({
      name: 'Mattia',
      role: 'Admin',
      company: 'SYRIO',
      defaultMonthlyTarget: 50000,
      customProducts: []
    });
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center text-foreground">
      <div className="text-center">
        <div className="mb-8"><Wordmark /></div>
        <button 
          onClick={handleStart}
          className="bg-action text-action-foreground px-10 py-4 rounded-panel font-semibold uppercase tracking-normal"
        >
          Configura e Inizia
        </button>
      </div>
    </div>
  );
};
