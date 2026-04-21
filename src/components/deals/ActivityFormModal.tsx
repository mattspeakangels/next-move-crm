import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActivityType, Deal } from '../../types';
import { X } from 'lucide-react';

interface Props {
  deal: Deal;
  onClose: () => void;
}

export const ActivityFormModal: React.FC<Props> = ({ deal, onClose }) => {
  const { addActivity } = useStore();
  const [type, setType] = useState<ActivityType>('chiamata');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateTime = new Date(`${date}T${time}`).getTime();

    addActivity({
      id: `act_${Date.now()}`,
      contactId: deal.contactId, // <--- Agganciato all'azienda del deal
      dealId: deal.id,
      type,
      date: dateTime,
      outcome: 'da-fare',
      notes,
      createdAt: Date.now()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2rem] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black dark:text-white">Nuova Attività</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-gray-400 mb-1">Tipo</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as ActivityType)}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-transparent dark:text-white outline-none focus:border-indigo-600"
            >
              <option value="chiamata">Chiamata</option>
              <option value="visita">Visita</option>
              <option value="email">Email</option>
              <option value="nota">Nota</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 mb-1">Data</label>
              <input 
                type="date" 
                required 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-transparent dark:text-white outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 mb-1">Ora</label>
              <input 
                type="time" 
                required 
                value={time} 
                onChange={(e) => setTime(e.target.value)}
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-transparent dark:text-white outline-none" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-gray-400 mb-1">Note</label>
            <textarea 
              rows={3} 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Di cosa parlerete?"
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-transparent dark:text-white outline-none resize-none focus:border-indigo-600"
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase">
            Pianifica
          </button>
        </form>
      </div>
    </div>
  );
};
