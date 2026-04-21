import React from 'react';
import { useStore } from '../../store/useStore';

export const Onboarding: React.FC = () => {
  const { setProfile } = useStore();
  const handleStart = () => {
    setProfile({
      name: 'Matteo',
      role: 'Admin',
      company: 'Mia Azienda',
      defaultMonthlyTarget: 50000,
      customProducts: []
    });
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center text-white p-10">
      <div className="text-center">
        <h1 className="text-4xl font-black mb-6 uppercase tracking-tighter">Next Move CRM</h1>
        <p className="mb-8 font-medium opacity-80">Configurazione iniziale pronta.</p>
        <button onClick={handleStart} className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform">
          Inizia ora
        </button>
      </div>
    </div>
  );
};
