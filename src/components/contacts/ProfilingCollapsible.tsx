import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Contact } from '../../types';
import { ProfilingForm } from '../profiling/ProfilingForm';

// Profilazione del cliente, richiudibile.
export const ProfilingCollapsible: React.FC<{ contact: Contact }> = ({ contact }) => {
  const [open, setOpen] = useState(false);
  const badge = contact.profiling
    ? (() => {
        const q = contact.profiling.qualificazione;
        const t = q.esigenzaReale + q.decisionMaker + q.aperturaFornitore + q.timeline + q.budget;
        return t >= 20 ? 'HOT' : t >= 15 ? 'WARM' : t >= 10 ? 'COLD' : 'TRASH';
      })()
    : null;
  const BADGE_STYLE: Record<string, string> = {
    HOT: 'bg-danger text-status-foreground', WARM: 'bg-warning text-status-foreground',
    COLD: 'bg-success text-status-foreground', TRASH: 'bg-raised text-foreground',
  };
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted   flex items-center gap-2">
          <ClipboardList size={16} /> 2. Profilazione Blaklader
          {badge && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLE[badge]}`}>{badge}</span>}
          {!contact.profiling && <span className="text-xs font-bold text-muted normal-case tracking-normal">Non compilata</span>}
        </h3>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wide transition-all
            ${open
              ? 'bg-raised dark:bg-raised text-secondary dark:text-muted'
              : 'bg-action text-action-foreground hover:bg-action-hover shadow-panel  '}`}>
          <ClipboardList size={12} />
          {open ? 'Chiudi' : contact.profiling ? 'Modifica' : 'Compila'}
        </button>
      </div>
      {open && (
        <div className="bg-canvas dark:bg-canvas rounded-panel p-5 border border-line dark:border-line">
          <ProfilingForm contact={contact} key={contact.id} />
        </div>
      )}
    </section>
  );
};
