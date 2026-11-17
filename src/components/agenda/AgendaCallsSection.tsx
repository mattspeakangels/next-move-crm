import { useState } from 'react';
import { Phone, ChevronDown, ChevronRight } from 'lucide-react';
import { Activity } from '../../types';
import { ActivityCard } from './AgendaCards';
import { AgendaCalendarModel } from './useAgendaCalendar';

const STORAGE_KEY = 'syrio-agenda-chiamate-aperte';

function loadOpen(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== '0'; } catch { return true; }
}

// Telefonate ancora da fare (anche quelle create dall'analisi AI delle visite):
// stanno qui, separate dagli appuntamenti del calendario.
export function AgendaCallsSection({ v }: { v: AgendaCalendarModel }) {
  const { openCalls, contacts, today, onNavigateToContact, setConfirmDeleteId, setViewActivity, openCloseModal, openEdit, handleExport } = v;
  const [open, setOpen] = useState(loadOpen);

  if (openCalls.length === 0) return null;

  const toggle = () => {
    setOpen(prev => {
      try { localStorage.setItem(STORAGE_KEY, prev ? '0' : '1'); } catch { /* storage non disponibile */ }
      return !prev;
    });
  };

  const startOfToday = today.getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  const groups: { key: string; label: string; tone: string; items: Activity[] }[] = [
    { key: 'ritardo', label: 'In ritardo', tone: 'text-danger', items: openCalls.filter(a => a.date < startOfToday) },
    { key: 'oggi', label: 'Oggi', tone: 'text-accent', items: openCalls.filter(a => a.date >= startOfToday && a.date < startOfTomorrow) },
    { key: 'prossime', label: 'Prossime', tone: 'text-muted dark:text-secondary', items: openCalls.filter(a => a.date >= startOfTomorrow) },
  ].filter(g => g.items.length > 0);
  const overdue = groups.find(g => g.key === 'ritardo')?.items.length ?? 0;

  return (
    <section className="agenda-calls bg-surface dark:bg-surface rounded-panel border border-line dark:border-line shadow-sm" aria-label="Chiamate da fare">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground dark:text-foreground">
          <Phone size={15} className="text-accent" />
          Chiamate da fare
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent dark:bg-accent-soft/40">{openCalls.length}</span>
          {overdue > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-danger-soft text-danger">{overdue} in ritardo</span>
          )}
        </span>
        {open ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
      </button>

      {open && (
        <div className="px-3 sm:px-4 pb-4 space-y-3">
          {groups.map(g => (
            <div key={g.key} className="space-y-2">
              <p className={`text-xs font-semibold uppercase tracking-normal ${g.tone}`}>
                {g.label} <span className="ml-1 text-muted dark:text-secondary">({g.items.length})</span>
              </p>
              {g.items.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  companyName={contacts[activity.contactId]?.company || 'Azienda'}
                  onEdit={() => openEdit(activity)}
                  onDelete={() => setConfirmDeleteId(activity.id)}
                  onExport={() => handleExport(activity)}
                  onClose={() => openCloseModal(activity)}
                  onView={() => setViewActivity(activity)}
                  onNavigateToContact={onNavigateToContact}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
