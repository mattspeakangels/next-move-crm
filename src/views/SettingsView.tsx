import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { User, Target, Package, Trash2, Moon, Sun, Plus, X } from 'lucide-react';
import { useToast } from '../components/ui/ToastContext';

export const SettingsView: React.FC = () => {
  const { profile, theme, updateProfile, toggleTheme, resetAll } = useStore();
  const { showToast } = useToast();
  const [newProduct, setNewProduct] = useState('');

  if (!profile) return null;

  const handleAddProduct = () => {
    if (newProduct.trim() && !profile.customProducts.includes(newProduct.trim())) {
      updateProfile({ customProducts: [...profile.customProducts, newProduct.trim()] });
      setNewProduct('');
      showToast('Prodotto aggiunto');
    }
  };

  const removeProduct = (p: string) => {
    updateProfile({ customProducts: profile.customProducts.filter(item => item !== p) });
    showToast('Prodotto rimosso');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Profilo */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><User size={18} className="text-indigo-600"/> Profilo Personale</h3>
        <div className="space-y-4">
          <input 
            type="text" 
            value={profile.name} 
            onChange={e => updateProfile({ name: e.target.value })}
            placeholder="Tuo Nome"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent"
          />
          <input 
            type="text" 
            value={profile.company} 
            onChange={e => updateProfile({ company: e.target.value })}
            placeholder="Azienda"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent"
          />
        </div>
      </div>

      {/* Target */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Target size={18} className="text-indigo-600"/> Obiettivo Mensile</h3>
        <input 
          type="number" 
          value={profile.defaultMonthlyTarget} 
          onChange={e => updateProfile({ defaultMonthlyTarget: parseInt(e.target.value) })}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent font-bold text-indigo-600"
        />
      </div>

      {/* Prodotti Custom */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Package size={18} className="text-indigo-600"/> Gestione Prodotti</h3>
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={newProduct} 
            onChange={e => setNewProduct(e.target.value)}
            placeholder="Aggiungi nuovo prodotto..."
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-sm"
          />
          <button onClick={handleAddProduct} className="p-2 bg-indigo-600 text-white rounded-xl"><Plus size={20}/></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.customProducts.map(p => (
            <span key={p} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-xs font-bold">
              {p} <X size={14} className="cursor-pointer text-red-500" onClick={() => removeProduct(p)}/>
            </span>
          ))}
        </div>
      </div>

      {/* Preferenze */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Tema Scuro
          </div>
          <button 
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Azioni Pericolose */}
      <div className="p-6">
        <button 
          onClick={() => window.confirm('Sei sicuro? Perderai tutti i dati salvati.') && resetAll()}
          className="flex items-center gap-2 text-red-500 text-sm font-bold opacity-70 hover:opacity-100 transition-opacity"
        >
          <Trash2 size={16} /> Resetta tutti i dati dell'App
        </button>
      </div>
    </div>
  );
};
