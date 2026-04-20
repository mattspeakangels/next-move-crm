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
  const { addActivity, updateDeal } = useStore();
  const { showToast } = useToast();
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextDeadline, setNextDeadline] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) return;

    const activityId = `act_${Date.now()}`;
    addActivity({
      id: activityId,
      dealId,
      type,
      date: Date.now(),
      outcome,
      notes,
    });

    if (nextAction) {
      updateDeal(dealId, {
        nextAction,
        nextActionDeadline: new Date(nextDeadline).getTime(),
        updatedAt: Date.now(),
      });
    }

    showToast('Attività registrata', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold dark:text-white capitalize">Registra {type}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Esito</label>
            <input type="text" value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="Com'è andata?" required
              className="w-full border rounded-xl px-4 py-2 bg-transparent dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Note (opzionale)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border rounded-xl px-4 py-2 bg-transparent dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <hr className="dark:border-gray-700" />
          <p className="text-xs font-bold text-indigo-600 uppercase">Pianifica Prossimo Step</p>
          <div>
            <input type="text" value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Cosa devi fare ora?"
              className="w-full border rounded-xl px-4 py-2 bg-transparent dark:text-white outline-none focus:border-indigo-500 mb-2" />
            <input type="date" value={nextDeadline} onChange={e => setNextDeadline(e.target.value)}
              className="w-full border rounded-xl px-4 py-2 bg-transparent dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-4">Salva Attività</button>
        </form>
      </div>
    </div>
  );
};
