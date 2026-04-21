import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User, Building2, Target, ArrowRight, Rocket } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { setProfile } = useStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Key Account Manager',
    company: '',
    defaultMonthlyTarget: 50000,
    customProducts: [] as string[]
  });

  const handleFinish = () => {
    if (!formData.name || !formData.company) return;
    
    setProfile({
      ...formData,
      customProducts: []
    });
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-10">
          <div className={`h-2 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-100'}`} />
          <div className={`h-2 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-100'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6">
              <User size={32} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 leading-tight">
              Benvenuto su <br /><span className="text-indigo-600">Next Move CRM.</span>
            </h1>
            <p className="text-gray-500 font-medium text-lg">Iniziamo con le basi. Chi sei?</p>
            
            <div className="space-y-4 pt-4">
              <div className="relative">
                <User className="absolute left-4 top-4 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Il tuo nome e cognome"
                  className="w-full border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 transition-all font-bold"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="relative">
                <Building2 className="absolute left-4 top-4 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Nome della tua Azienda"
                  className="w-full border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 transition-all font-bold"
                  value={formData.company}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                />
              </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.company}
              className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-8 text-lg uppercase tracking-wider"
            >
              Prosegui <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-600 mb-6">
              <Target size={32} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 leading-tight">
              Definiamo gli <br /><span className="text-orange-600">Obiettivi.</span>
            </h1>
            <p className="text-gray-500 font-medium text-lg">Qual è il tuo target di vendita mensile?</p>
            
            <div className="pt-4">
              <div className="relative">
                <span className="absolute left-4 top-4 text-gray-400 font-black text-xl">€</span>
                <input 
                  type="number" 
                  className="w-full border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 transition-all font-black text-2xl"
                  value={formData.defaultMonthlyTarget}
                  onChange={e => setFormData({...formData, defaultMonthlyTarget: parseInt(e.target.value) || 0})}
                />
              </div>
              <p className="text-xs text-gray-400 mt-4 font-bold uppercase tracking-widest">Puoi cambiarlo in qualsiasi momento nelle impostazioni</p>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 border-2 border-gray-100 text-gray-400 font-black py-5 rounded-[2rem] uppercase tracking-wider"
              >
                Indietro
              </button>
              <button 
                onClick={handleFinish}
                className="flex-[2] bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                Inizia ora <Rocket size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
