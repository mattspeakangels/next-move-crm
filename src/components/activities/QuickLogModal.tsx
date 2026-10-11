import { DialogFrame } from '../ui/DialogFrame';
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
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground dark:text-foreground">Registra contatto</h2>
            <p className="text-xs font-bold text-muted">{companyName}</p>
          </div>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
        </div>

        <div className="flex gap-2">
          {QUICK_TYPES.map(t => (
            <button
              key={t.type}
              type="button"
              onClick={() => setType(t.type)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-md text-xs font-semibold uppercase transition-all ${type === t.type ? 'bg-action text-action-foreground' : 'bg-canvas dark:bg-surface text-secondary dark:text-muted'}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">
            {type === 'email' ? 'Oggetto / testo email' : 'Note, esito, prossimi passi'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={type === 'email' ? 6 : 3}
            autoFocus
            placeholder={type === 'email' ? "Incolla qui oggetto e corpo dell'email inviata/ricevuta..." : undefined}
            className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent resize-none"
          />
        </div>

        <button type="submit" className="w-full py-3 rounded-md bg-action text-action-foreground font-semibold hover:bg-action-hover">
          Registra ora
        </button>
      </form>
    </DialogFrame>
  );
};
