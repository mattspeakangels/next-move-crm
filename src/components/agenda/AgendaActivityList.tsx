import { confirmAction } from '../ui/Feedback';
import { Trash2, Route } from 'lucide-react';
import { Activity } from '../../types';
import { TYPE_LABELS, NO_CONTACT_TYPES } from './agendaShared';
import { ActivityCard } from './AgendaCards';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaActivityList({ v }: { v: AgendaCalendarModel }) {
  const { onNavigateToContact, onViewItinerary, deleteActivity, contacts, calMode, selectedDay, setConfirmDeleteId, setViewActivity, openCloseModal, listActivities, dayHasMappedVisits, toLocalDateStr, openNew, openEdit, handleExport } = v;
  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted  ">
            {selectedDay
              ? `${selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : calMode === 'list' ? 'Tutti i prossimi appuntamenti' : 'Seleziona un giorno'
            }
          </h2>
          {selectedDay && (
            <div className="flex items-center gap-2">
              {dayHasMappedVisits && onViewItinerary && (
                <button onClick={() => onViewItinerary(toLocalDateStr(selectedDay))}
                  className="flex items-center gap-1 text-xs font-semibold text-warning bg-warning-soft dark:bg-warning-soft px-3 py-1 rounded-full uppercase tracking-wide hover:bg-warning-soft transition-colors">
                  <Route size={11} /> Vedi itinerario
                </button>
              )}
              <button onClick={() => openNew(selectedDay)} className="text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/30 px-3 py-1 rounded-full uppercase tracking-wide hover:bg-accent-soft transition-colors">
                + Aggiungi in questa data
              </button>
            </div>
          )}
        </div>

        {listActivities.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-line dark:border-line rounded-panel">
            <p className="text-muted dark:text-secondary font-semibold uppercase tracking-normal text-xs">
              {selectedDay ? 'Nessun appuntamento in questa data' : 'Nessun appuntamento futuro'}
            </p>
          </div>
        )}

        {/* Raggruppamento per giorno con tasto elimina tutti */}
        {(() => {
          // Raggruppa per giorno (chiave YYYY-MM-DD locale)
          const groups: { key: string; date: Date; items: Activity[] }[] = [];
          listActivities.forEach(act => {
            const d = new Date(act.date);
            const key = toLocalDateStr(d);
            const existing = groups.find(g => g.key === key);
            if (existing) existing.items.push(act);
            else groups.push({ key, date: d, items: [act] });
          });

          return groups.map(({ key, date, items }) => (
            <div key={key} className="space-y-2">
              {/* Header giorno */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs font-semibold uppercase tracking-normal text-muted dark:text-secondary">
                  {date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}
                  <span className="ml-2 text-muted dark:text-secondary">({items.length})</span>
                </p>
                {items.length > 0 && (
                  <button
                    onClick={async () => {
                      if (await confirmAction(`Eliminare tutti i ${items.length} appuntamenti del ${date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}?`)) {
                        items.forEach(a => deleteActivity(a.id));
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-danger hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft px-2 py-1 rounded-lg transition-colors uppercase tracking-wide"
                    title="Elimina tutti gli appuntamenti di questo giorno"
                  >
                    <Trash2 size={10} /> Elimina tutti
                  </button>
                )}
              </div>
              {items.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  companyName={contacts[activity.contactId]?.company || (NO_CONTACT_TYPES.includes(activity.type) ? TYPE_LABELS[activity.type] : 'Azienda')}
                  onEdit={() => openEdit(activity)}
                  onDelete={() => setConfirmDeleteId(activity.id)}
                  onExport={() => handleExport(activity)}
                  onClose={() => openCloseModal(activity)}
                  onView={() => setViewActivity(activity)}
                  onNavigateToContact={onNavigateToContact}
                />
              ))}
            </div>
          ));
        })()}
      </div>
    </>
  );
}
