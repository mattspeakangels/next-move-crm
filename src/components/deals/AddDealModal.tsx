import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DealStage } from '../../types';
import { useToast } from '../ui/ToastContext';

interface AddDealModalProps {
  onClose: () => void;
  initialContactId?: string;
  dealToEdit?: string;
}

export const AddDealModal: React.FC<AddDealModalProps> = ({ onClose, initialContactId, dealToEdit }) => {
  const { contacts, deals, profile, addDeal, updateDeal, addCustomProduct } = useStore();
  const { showToast } = useToast();
  const editModeDeal = dealToEdit ? deals[dealToEdit] : null;

  const [contactId, setContactId] = useState(initialContactId || editModeDeal?.contactId || '');
  const [value, setValue] = useState(editModeDeal?.value.toString() || '');
  const [probability, setProbability] = useState(editModeDeal?.probability || 50);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(editModeDeal?.products || []);
  const [newProduct, setNewProduct] = useState('');
  const [stage, setStage] = useState<DealStage>(editModeDeal?.stage || 'lead');
  const [nextAction, setNextAction] = useState(editModeDeal?.nextAction || '');
  const [deadline, setDeadline] = useState(editModeDeal?.nextActionDeadline ? new Date(editModeDeal.nextActionDeadline).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

  const toggleProduct = (p: string) => {
    setSelectedProducts(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p]);
  };

  const handleAddNewProduct = () => {
    if (newProduct && !selectedProducts.includes(newProduct)) {
      addCustomProduct(newProduct);
      setSelectedProducts([...selectedProducts, newProduct]);
      setNewProduct('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || !value || selectedProducts.length === 0) return;

    const dealData = {
      contactId,
      value: parseFloat(value),
      probability,
      products: selectedProducts,
      stage,
      nextAction,
      nextActionDeadline: new Date(deadline).getTime(),
      updatedAt: Date.now(),
    };

    if (editModeDeal) {
      updateDeal(editModeDeal.id, dealData);
      showToast('Deal aggiornato', 'success');
    } else {
      addDeal({ ...dealData, id: `d_${Date.now()}`, notes: '', createdAt: Date.now() });
      showToast('Deal creato', 'success');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-5 max-h-[90vh] overflow-y-auto border border-transparent dark:border-gray-700 shadow-2xl transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editModeDeal ? 'Modifica Deal' : 'Nuovo Deal'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {!editModeDeal && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Cliente</label>
              <select value={contactId} onChange={e => setContactId(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-3 bg-transparent dark:text-white outline-none">
                <option value="">-- Seleziona Contatto --</option>
                {Object.values(contacts).map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Valore (€)</label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-3 bg-transparent dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Probabilità: {probability}%</label>
              <input type="range" min="0" max="100" step="5" value={probability} onChange={e => setProbability(Number(e.target.value))} className="w-full accent-indigo-600 mt-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Prodotti</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {profile?.customProducts.map(p => (
                <button key={p} type="button" onClick={() => toggleProduct(p)} 
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedProducts.includes(p) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newProduct} onChange={e => setNewProduct(e.target.value)} placeholder="+ Nuovo prodotto..." 
                className="flex-1 border-b border-gray-300 dark:border-gray-600 bg-transparent dark:text-white text-sm py-1 outline-none focus:border-indigo-500" />
              <button type="button" onClick={handleAddNewProduct} className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">Aggiungi</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Fase</label>
              <select value={stage} onChange={e => setStage(e.target.value as DealStage)} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-3 bg-transparent dark:text-white outline-none">
                <option value="lead">Lead</option><option value="qualificato">Qualificato</option><option value="proposta">Proposta</option><option value="negoziazione">Trattativa</option><option value="chiuso-vinto">Vinto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Scadenza</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-3 bg-transparent dark:text-white outline-none" />
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-4">
            {editModeDeal ? 'Salva Modifiche' : 'Crea Deal'}
          </button>
        </form>
      </div>
    </div>
  );
};
