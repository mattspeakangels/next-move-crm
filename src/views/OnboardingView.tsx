import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { AppProfile } from '../types';

export const OnboardingView: React.FC = () => {
  const { setProfile } = useStore();
  const [formData, setFormData] = useState<AppProfile>({
    name: '',
    role: '',
    company: '',
    defaultMonthlyTarget: 10000,
    customProducts: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Invia solo UN argomento, eliminando l'errore TS2554
    setProfile(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-black mb-2 dark:text-white uppercase tracking-tighter">Benvenuto</h1>
        <p className="text-gray-400 font-bold mb-8 uppercase tracking-widest text-xs">Configura il tuo profilo</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome Completo</label>
            <input 
              type="text" 
              required
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Azienda</label>
            <input 
              type="text" 
              required
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none"
              value={formData.company}
              onChange={e => setFormData({...formData, company: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Ruolo</label>
            <input 
              type="text" 
              required
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Target Mensile (€)</label>
            <input 
              type="number" 
              required
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none"
              value={formData.defaultMonthlyTarget}
              onChange={e => setFormData({...formData, defaultMonthlyTarget: Number(e.target.value)})}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-8 transition-all hover:bg-indigo-700"
          >
            Inizia a usare il CRM
          </button>
        </form>
      </div>
    </div>
  );
};
