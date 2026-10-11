import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { AppProfile } from '../types';
import { Wordmark } from '../components/ui/Syrio';

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
    <div className="min-h-screen bg-canvas dark:bg-canvas flex items-center justify-center p-4">
      <div className="bg-surface dark:bg-surface p-8 rounded-panel shadow-panel max-w-md w-full">
        <Wordmark className="text-3xl mb-8" />
        <h1 className="text-3xl  mb-2 dark:text-foreground  ">Benvenuto</h1>
        <p className="text-muted font-bold mb-8 uppercase tracking-normal text-xs">Configura il tuo profilo</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal mb-1 block">Nome Completo</label>
            <input 
              type="text" 
              required
              className="w-full border-2 border-line dark:border-line rounded-panel p-4 bg-transparent dark:text-foreground font-bold outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal mb-1 block">Azienda</label>
            <input 
              type="text" 
              required
              className="w-full border-2 border-line dark:border-line rounded-panel p-4 bg-transparent dark:text-foreground font-bold outline-none"
              value={formData.company}
              onChange={e => setFormData({...formData, company: e.target.value})}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal mb-1 block">Ruolo</label>
            <input 
              type="text" 
              required
              className="w-full border-2 border-line dark:border-line rounded-panel p-4 bg-transparent dark:text-foreground font-bold outline-none"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-action text-action-foreground py-4 rounded-panel font-semibold uppercase text-xs tracking-normal shadow-panel mt-8 transition-all hover:bg-action-hover"
          >
            Inizia a usare il CRM
          </button>
        </form>
      </div>
    </div>
  );
};
