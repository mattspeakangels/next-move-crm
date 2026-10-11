import { showNotice } from '../ui/Feedback';
import { DialogFrame } from '../ui/DialogFrame';
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
  { type: 'riuscita', label: 'Riuscita', icon: <CheckCircle size={16} />, color: 'bg-success-soft dark:bg-success-soft text-success' },
  { type: 'parziale', label: 'Parziale', icon: <Clock size={16} />, color: 'bg-warning-soft dark:bg-warning-soft text-warning' },
  { type: 'nessun-contatto', label: 'Nessun contatto', icon: <PhoneOff size={16} />, color: 'bg-canvas dark:bg-raised text-secondary' },
  { type: 'promessa-callback', label: 'Promessa callback', icon: <Clock size={16} />, color: 'bg-accent-soft dark:bg-accent-soft/20 text-accent' },
  { type: 'rifiuto', label: 'Rifiuto', icon: <ThumbsDown size={16} />, color: 'bg-danger-soft dark:bg-danger-soft text-danger' },
  { type: 'nota', label: 'Solo nota', icon: <BookOpen size={16} />, color: 'bg-accent-soft dark:bg-accent-soft/20 text-accent' },
];

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  isOpen, onClose, onSave, onSkip, companyName, previousAction
}) => {
  const [outcomeType, setOutcomeType] = useState<ActivityOutcome>('riuscita');
  const [results, setResults] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!results.trim() && outcomeType !== 'nessun-contatto') {
      showNotice('Aggiungi dettagli su cosa è successo');
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
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-surface dark:bg-surface w-full max-w-2xl rounded-panel p-8 shadow-panel">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold  dark:text-foreground">Come è andata?</h2>
            {companyName && (
              <p className="text-sm text-muted mt-1 font-bold uppercase tracking-normal">
                {companyName}
              </p>
            )}
            {previousAction && (
              <p className="text-xs text-secondary mt-2 italic">
                Ultima azione: {previousAction}
              </p>
            )}
          </div>
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="p-2 rounded-md hover:bg-raised dark:hover:bg-raised">
            <X size={24} className="text-muted" />
          </button>
        </div>

        {/* Outcome Type Selection */}
        <div className="mb-8">
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-4">
            Esito
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {OUTCOME_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => setOutcomeType(opt.type)}
                className={`flex items-center gap-2 px-4 py-3 rounded-panel font-bold text-sm transition-all border-2 ${
                  outcomeType === opt.type
                    ? `${opt.color} border-current`
                    : 'bg-canvas dark:bg-raised text-secondary border-transparent hover:border-line'
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
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">
            Cosa è successo? (Dettagli)
          </label>
          <textarea
            placeholder="Es. Ha confermato interesse, aspetta nostro preventivo... O: No-answer, ha lasciato voicemail... O: Ha rifiutato, dice che ha già supplier."
            className="w-full bg-surface dark:bg-canvas border-2 border-line dark:border-line rounded-panel p-4 font-bold text-sm dark:text-foreground resize-none min-h-[120px] outline-none focus:border-accent transition-all"
            value={results}
            onChange={e => setResults(e.target.value)}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-action text-action-foreground px-6 py-3 rounded-panel font-semibold uppercase text-xs tracking-normal shadow-panel hover:bg-action-hover transition-colors"
          >
            Salva e continua
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 bg-raised dark:bg-raised text-secondary dark:text-muted px-6 py-3 rounded-panel font-semibold uppercase text-xs tracking-normal hover:bg-raised transition-colors"
          >
            Salta
          </button>
        </div>
      </div>
    </DialogFrame>
  );
};
