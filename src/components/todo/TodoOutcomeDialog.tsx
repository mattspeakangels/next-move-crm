import { useState } from 'react';
import { X } from 'lucide-react';
import { DialogFrame } from '../ui/DialogFrame';
import type { TodoEsito, TodoItem } from '../../types';
import { ESITI, type EsitoGruppo } from '../../lib/todoOutcome';

const GRUPPO_STYLE: Record<EsitoGruppo, string> = {
  positivo: 'border-success/40 text-success',
  attesa: 'border-warning/40 text-warning',
  negativo: 'border-danger/40 text-danger',
};
const GRUPPO_SELECTED: Record<EsitoGruppo, string> = {
  positivo: 'bg-success-soft border-success',
  attesa: 'bg-warning-soft border-warning',
  negativo: 'bg-danger-soft border-danger',
};

interface Props {
  todo: TodoItem;
  /** true quando il to-do è già chiuso e si sta solo correggendo l'esito. */
  editing?: boolean;
  onSave: (data: { esito?: TodoEsito; esitoNote?: string }) => void;
  onClose: () => void;
}

/** Chiede com'è andata un'attività al momento della chiusura. */
export function TodoOutcomeDialog({ todo, editing, onSave, onClose }: Props) {
  const [esito, setEsito] = useState<TodoEsito | undefined>(todo.esito);
  const [note, setNote] = useState(todo.esitoNote || '');

  return (
    <DialogFrame
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-5 space-y-4 shadow-panel max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{editing ? 'Modifica esito' : 'Com’è andata?'}</h2>
            <p className="text-xs text-muted mt-0.5 break-words">{todo.titolo}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="p-1 text-muted hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Esito">
          {ESITI.map(e => {
            const sel = esito === e.id;
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setEsito(sel ? undefined : e.id)}
                className={`rounded-md border-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors ${GRUPPO_STYLE[e.gruppo]} ${sel ? GRUPPO_SELECTED[e.gruppo] : 'bg-transparent'}`}
              >
                {e.label}
              </button>
            );
          })}
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="Nota (facoltativa): es. ordine da 2.000 €, richiamare a gennaio…"
          className="w-full text-sm bg-canvas border border-line rounded-md p-2.5 outline-none text-foreground"
        />

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          {!editing && (
            <button type="button" onClick={() => onSave({})} className="px-4 py-2.5 rounded-panel text-sm font-semibold text-muted hover:text-foreground">
              Chiudi senza esito
            </button>
          )}
          <button
            type="button"
            disabled={!esito && !editing}
            onClick={() => onSave({ esito, esitoNote: note.trim() || undefined })}
            className="px-4 py-2.5 rounded-panel bg-action text-action-foreground text-sm font-semibold disabled:opacity-40"
          >
            {editing ? 'Salva esito' : 'Segna come fatto'}
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}
