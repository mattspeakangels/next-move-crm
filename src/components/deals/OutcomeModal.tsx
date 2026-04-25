import React, { useState } from 'react';
import { X, CheckCircle, Clock, PhoneOff, ThumbsDown, BookOpen } from 'lucide-react';
import { ActivityOutcome } from '../../types';

interface OutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { outcomeType: ActivityOutcome; results: string }) => void;
  onSkip?: () => void;
  companyName?: string;
  previousAction?: string;
}

const OUTCOME_OPTIONS: { type: ActivityOutcome; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'riuscita', label: 'Riuscita', icon: <CheckCircle size={16} />, color: 'bg-green-50 dark:bg-green-900/20 text-green-600' },
  { type: 'parziale', label: 'Parziale', icon: <Clock size={16} />, color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' },
  { type: 'nessun-contatto', label: 'Nessun contatto', icon: <PhoneOff size={16} />, color: 'bg-gray-50 dark:bg-gray-700 text-gray-600' },
  { type: 'promessa-callback', label: 'Promessa callback', icon: <Clock size={16} />, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
  { type: 'rifiuto', label: 'Rifiuto', icon: <ThumbsDown size={16} />, color: 'bg-red-50 dark:bg-red-900/20 text-red-600' },
  { type: 'nota', label: 'Solo nota', icon: <BookOpen size={16} />, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' },
];

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  isOpen, onClose, onSave, onSkip, companyName, previousAction
}) => {
  const [outcomeType, setOutcomeType] = useState<ActivityOutcome>('riuscita');
  const [results, setResults] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!results.trim() && outcomeType !== 'nessun-contatto') {
      alert('Aggiungi dettagli su cosa è successo');
      return;
    }
    onSave({
      outcomeType,
      results: results.trim(),
    });
    setOutcomeType('riuscita');
    setResults('');
  };

  const handleSkip = () => {
    onSkip?.();
    setOutcomeType('riuscita');
    setResults('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black uppercase dark:text-white">Come è andata?</h2>
            {companyName && (
              <p className="text-sm text-gray-400 mt-1 font-bold uppercase tracking-widest">
                {companyName}
              </p>
            )}
            {previousAction && (
              <p className="text-xs text-gray-500 mt-2 italic">
                Ultima azione: {previousAction}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Outcome Type Selection */}
        <div className="mb-8">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-4">
            Esito
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {OUTCOME_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => setOutcomeType(opt.type)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                  outcomeType === opt.type
                    ? `${opt.color} border-current`
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 border-transparent hover:border-gray-200'
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results / Notes */}
        <div className="mb-8">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">
            Cosa è successo? (Dettagli)
          </label>
          <textarea
            placeholder="Es. Ha confermato interesse, aspetta nostro preventivo... O: No-answer, ha lasciato voicemail... O: Ha rifiutato, dice che ha già supplier."
            className="w-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 font-bold text-sm dark:text-white resize-none min-h-[120px] outline-none focus:border-indigo-400 transition-all"
            value={results}
            onChange={e => setResults(e.target.value)}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-colors"
          >
            Salva e continua
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-colors"
          >
            Salta
          </button>
        </div>
      </div>
    </div>
  );
};
