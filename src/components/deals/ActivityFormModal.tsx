import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ActivityType } from '../../types';
import { useToast } from '../ui/ToastContext';

interface ActivityFormModalProps {
  dealId: string;
  type: ActivityType;
  onClose: () => void;
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({ dealId, type, onClose }) => {
  const addActivity = useStore(state => state.addActivity);
  const { showToast } = useToast();
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) return;
    addActivity({
      id: `a_${Date.now()}`,
      dealId,
      type,
      date: Date.now(),
      outcome,
      notes,
      createdAt: Date.now()
    });
    showToast('Attività salvata con successo', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 z-50 flex items-end md:items-center justify-center animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full md:w-[400px] rounded-t-2xl md:rounded-2xl p-5 pb-safe border border-transparent dark:border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">Nuova {type}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Esito dell'attività</label>
            <input 
              autoFocus 
              type="text" 
              value={outcome} 
              onChange={e => setOutcome(e.target.value)} 
              placeholder="Es: Molto interessati, mandare preventivo"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-transparent dark:text-white outline-none focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Note aggiuntive</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-transparent dark:text-white outline-none focus:border-indigo-500" 
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all">
            Salva Attività
          </button>
        </form>
      </div>
    </div>
  );
};
