import React, { useState } from 'react';
import { X, Phone, Mail, StickyNote, MapPin } from 'lucide-react';
import { ActivityType } from '../../types';

// Sottoinsieme dei tipi attività rilevanti per il log rapido di uno scambio
// (email/chiamata/nota/visita): gli altri tipi (demo, formazione, ecc.) restano
// disponibili solo dal form completo in Agenda/Pipeline.
const QUICK_TYPES: { type: ActivityType; label: string; icon: React.ReactNode }[] = [
  { type: 'email', label: 'Email', icon: <Mail size={13} /> },
  { type: 'chiamata', label: 'Chiamata', icon: <Phone size={13} /> },
  { type: 'visita', label: 'Visita', icon: <MapPin size={13} /> },
  { type: 'nota', label: 'Nota', icon: <StickyNote size={13} /> },
];

interface Props {
  companyName: string;
  onSave: (type: ActivityType, notes: string) => void;
  onClose: () => void;
}

export const QuickLogModal: React.FC<Props> = ({ companyName, onSave, onClose }) => {
  const [type, setType] = useState<ActivityType>('email');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(type, notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white">Registra contatto</h2>
            <p className="text-xs font-bold text-gray-400">{companyName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
        </div>

        <div className="flex gap-2">
          {QUICK_TYPES.map(t => (
            <button
              key={t.type}
              type="button"
              onClick={() => setType(t.type)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${type === t.type ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
            {type === 'email' ? 'Oggetto / testo email' : 'Note, esito, prossimi passi'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={type === 'email' ? 6 : 3}
            autoFocus
            placeholder={type === 'email' ? "Incolla qui oggetto e corpo dell'email inviata/ricevuta..." : undefined}
            className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 resize-none"
          />
        </div>

        <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700">
          Registra ora
        </button>
      </form>
    </div>
  );
};
