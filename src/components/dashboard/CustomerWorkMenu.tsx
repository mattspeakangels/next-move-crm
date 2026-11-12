import { useEffect, useRef, useState } from 'react';
import { Archive, Clock, MoreHorizontal, Trash2 } from 'lucide-react';
import { confirmAction } from '../ui/Feedback';
import { useToast } from '../ui/ToastContext';
import { useStore } from '../../store/useStore';
import {
  archiveCustomerWork, countCustomerWork, postponeCustomerWork,
  type CustomerWorkChanges, type CustomerWorkGroup,
} from '../../lib/customerWork';

const POSTPONE_DAYS = [1, 3, 7] as const;

/** Menu ⋯ accanto a "Dettagli": posticipa, archivia o elimina tutte le attività aperte del cliente. */
export function CustomerWorkMenu({ group }: { group: CustomerWorkGroup }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const total = countCustomerWork(group);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const apply = (changes: CustomerWorkChanges) => {
    const store = useStore.getState();
    changes.activities.forEach(activity => store.addActivity(activity));
    changes.deals.forEach(({ id, updates }) => store.updateDeal(id, updates));
    changes.todos.forEach(({ id, updates }) => store.updateTodo(id, updates));
    changes.deleteTodoIds.forEach(id => store.deleteTodo(id));
    changes.requests.forEach(request => store.saveCustomerRequest(request));
  };

  const postpone = (days: number) => {
    apply(postponeCustomerWork(group, days, Date.now()));
    setOpen(false);
    showToast(`${group.name}: ${total === 1 ? 'attività posticipata' : `${total} attività posticipate`} di ${days} ${days === 1 ? 'giorno' : 'giorni'}`, 'success');
  };

  const archive = () => {
    apply(archiveCustomerWork(group, Date.now()));
    setOpen(false);
    showToast(`${group.name}: ${total === 1 ? 'attività archiviata' : `${total} attività archiviate`}`, 'success');
  };

  const remove = async () => {
    setOpen(false);
    const parts = [
      group.todos.length > 0 && (group.todos.length === 1 ? 'il To Do verrà eliminato' : `${group.todos.length} To Do verranno eliminati`),
      group.deals.length > 0 && `${group.deals.length === 1 ? 'la prossima azione dell’opportunità finirà' : `le prossime azioni di ${group.deals.length} opportunità finiranno`} nell’archivio Attività`,
      group.requests.length > 0 && `${group.requests.length === 1 ? 'la richiesta verrà chiusa' : `${group.requests.length} richieste verranno chiuse`}`,
    ].filter(Boolean).join('; ');
    const detail = parts.charAt(0).toUpperCase() + parts.slice(1);
    if (!await confirmAction(`Eliminare le attività aperte di ${group.name}? ${detail}.`)) return;
    apply(archiveCustomerWork(group, Date.now(), { deleteTodos: true }));
    showToast(`${group.name}: attività eliminate`, 'success');
  };

  const item = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-md hover:bg-raised focus-visible:bg-raised';

  return (
    <div ref={rootRef} className="relative flex-none" onClick={event => event.preventDefault()}>
      <button
        type="button"
        aria-label={`Altre azioni per ${group.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={event => { event.preventDefault(); event.stopPropagation(); setOpen(value => !value); }}
        className="customer-work-menu-trigger grid place-items-center w-8 h-8 rounded-full text-muted hover:text-foreground hover:bg-raised"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div role="menu" aria-label={`Azioni per ${group.name}`} className="customer-work-menu absolute right-0 top-full mt-1.5 z-30 w-60 p-1.5 bg-surface border border-line rounded-panel shadow-panel">
          <div className="flex items-center gap-2.5 px-3 pt-2 pb-1 text-xs font-semibold text-muted"><Clock size={14} /> Posticipa tutto di</div>
          <div className="flex gap-1.5 px-3 pb-2">
            {POSTPONE_DAYS.map(days => (
              <button key={days} type="button" role="menuitem" onClick={() => postpone(days)} className="flex-1 py-1.5 text-xs font-semibold rounded-full bg-raised text-foreground hover:bg-accent-soft hover:text-accent">
                +{days} gg
              </button>
            ))}
          </div>
          <div className="my-1 border-t border-line" />
          <button type="button" role="menuitem" onClick={archive} className={`${item} text-foreground`}><Archive size={15} className="text-muted" /> Archivia tutto</button>
          <button type="button" role="menuitem" onClick={remove} className={`${item} text-danger hover:bg-danger-soft`}><Trash2 size={15} /> Elimina tutto</button>
          <p className="px-3 pt-1.5 pb-1 text-[11px] leading-snug text-muted">Vale per {total === 1 ? 'l’unica attività aperta' : `tutte le ${total} attività aperte`} di questo cliente.</p>
        </div>
      )}
    </div>
  );
}
