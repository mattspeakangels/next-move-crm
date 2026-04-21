import React from 'react';
import { useStore } from '../../store/useStore';

export const Onboarding: React.FC = () => {
  const { setProfile } = useStore();
  const handleStart = () => {
    setProfile({
      name: 'Matteo',
      role: 'Admin',
      company: 'Next Move',
      defaultMonthlyTarget: 50000,
      customProducts: []
    });
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-3xl font-black mb-8">NEXT MOVE CRM</h1>
        <button 
          onClick={handleStart}
          className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black uppercase tracking-widest"
        >
          Configura e Inizia
        </button>
      </div>
    </div>
  );
};
