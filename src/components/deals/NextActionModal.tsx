import { DialogFrame } from '../ui/DialogFrame';
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
  { value: 'alta', label: 'Alta', color: 'bg-danger' },
  { value: 'media', label: 'Media', color: 'bg-warning' },
  { value: 'bassa', label: 'Bassa', color: 'bg-success' },
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
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface dark:bg-surface w-full max-w-md rounded-panel shadow-panel overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-line dark:border-line">
          <div>
            <h3 className="font-semibold  tracking-tight text-foreground dark:text-foreground">Prossima Azione</h3>
            {companyName && <p className="text-xs font-bold text-accent uppercase tracking-normal mt-0.5">{companyName}</p>}
          </div>
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="p-2 rounded-md hover:bg-raised dark:hover:bg-raised transition-colors">
            <X size={20} className="text-muted" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Tipo azione - chips */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Tipo azione</label>
            <div className="flex flex-wrap gap-2">
              {ACTION_CHIPS.map(chip => (
                <button
                  key={chip.type}
                  onClick={() => setActionType(chip.type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    actionType === chip.type
                      ? 'bg-action text-action-foreground shadow-panel'
                      : 'bg-raised dark:bg-raised text-secondary dark:text-muted hover:bg-raised'
                  }`}
                >
                  {chip.icon} {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Qual è il prossimo passo?</label>
            <input
              type="text"
              value={actionText}
              onChange={e => setActionText(e.target.value)}
              placeholder="Es. Chiamare Mario per conferma ordine..."
              className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-colors text-sm"
              autoFocus
            />
          </div>

          {/* Data */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Quando?</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {QUICK_DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => addDays(d)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-accent-soft dark:bg-accent-soft/30 text-accent hover:bg-accent-soft transition-colors"
                >
                  +{d}gg
                </button>
              ))}
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-colors text-sm"
            />
          </div>

          {/* Priorità */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">
              <Flag size={10} className="inline mr-1" /> Priorità
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all border-2 ${
                    priority === p.value
                      ? 'border-line dark:border-line bg-canvas dark:bg-raised'
                      : 'border-transparent bg-raised dark:bg-canvas opacity-50'
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
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Note opzionale</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Dettagli aggiuntivi..."
              rows={2}
              className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-colors text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={!actionText.trim()}
            className={`w-full py-4 rounded-panel font-semibold uppercase text-sm tracking-normal transition-all ${
              actionText.trim()
                ? 'bg-action text-action-foreground hover:bg-action-hover shadow-panel'
                : 'bg-raised text-muted cursor-not-allowed'
            }`}
          >
            Salva Prossima Azione
          </button>
        </div>

      </div>
    </DialogFrame>
  );
};
