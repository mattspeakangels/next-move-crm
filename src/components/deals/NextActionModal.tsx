import React, { useState } from 'react';
import { X, Phone, Mail, FileText, Calendar, MoreHorizontal, Flag } from 'lucide-react';
import { NextActionType, NextActionPriority } from '../../types';

interface NextActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    nextAction: string;
    nextActionType: NextActionType;
    nextActionDeadline: number;
    nextActionPriority: NextActionPriority;
  }) => void;
  companyName?: string;
}

const ACTION_CHIPS: { type: NextActionType; label: string; icon: React.ReactNode }[] = [
  { type: 'chiama', label: 'Chiama', icon: <Phone size={14} /> },
  { type: 'email', label: 'Email follow-up', icon: <Mail size={14} /> },
  { type: 'invia-offerta', label: 'Invia offerta', icon: <FileText size={14} /> },
  { type: 'fissa-visita', label: 'Fissa visita', icon: <Calendar size={14} /> },
  { type: 'altro', label: 'Altro', icon: <MoreHorizontal size={14} /> },
];

const PRIORITY_OPTIONS: { value: NextActionPriority; label: string; color: string }[] = [
  { value: 'alta', label: 'Alta', color: 'bg-red-500' },
  { value: 'media', label: 'Media', color: 'bg-yellow-400' },
  { value: 'bassa', label: 'Bassa', color: 'bg-green-500' },
];

const QUICK_DAYS = [3, 7, 14, 30];

export const NextActionModal: React.FC<NextActionModalProps> = ({
  isOpen, onClose, onSave, companyName
}) => {
  const [actionType, setActionType] = useState<NextActionType>('chiama');
  const [actionText, setActionText] = useState('');
  const [priority, setPriority] = useState<NextActionPriority>('media');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  const addDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSave = () => {
    if (!actionText.trim()) return;
    onSave({
      nextAction: actionText.trim() + (notes.trim() ? ` — ${notes.trim()}` : ''),
      nextActionType: actionType,
      nextActionDeadline: new Date(selectedDate).getTime(),
      nextActionPriority: priority,
    });
    // reset
    setActionText('');
    setNotes('');
    setPriority('media');
    setActionType('chiama');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="font-black uppercase tracking-tight text-gray-900 dark:text-white">Prossima Azione</h3>
            {companyName && <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-0.5">{companyName}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Tipo azione - chips */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Tipo azione</label>
            <div className="flex flex-wrap gap-2">
              {ACTION_CHIPS.map(chip => (
                <button
                  key={chip.type}
                  onClick={() => setActionType(chip.type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    actionType === chip.type
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {chip.icon} {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Qual è il prossimo passo?</label>
            <input
              type="text"
              value={actionText}
              onChange={e => setActionText(e.target.value)}
              placeholder="Es. Chiamare Mario per conferma ordine..."
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-colors text-sm"
              autoFocus
            />
          </div>

          {/* Data */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Quando?</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {QUICK_DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => addDays(d)}
                  className="px-3 py-1.5 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  +{d}gg
                </button>
              ))}
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-colors text-sm"
            />
          </div>

          {/* Priorità */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
              <Flag size={10} className="inline mr-1" /> Priorità
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all border-2 ${
                    priority === p.value
                      ? 'border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700'
                      : 'border-transparent bg-gray-100 dark:bg-gray-900 opacity-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note opzionale */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Note opzionale</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Dettagli aggiuntivi..."
              rows={2}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-colors text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={!actionText.trim()}
            className={`w-full py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${
              actionText.trim()
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Salva Prossima Azione
          </button>
        </div>

      </div>
    </div>
  );
};
