import { DialogFrame } from '../ui/DialogFrame';
import { X, MapPin, Plus, Check } from 'lucide-react';
import { AgendaCalendarModel } from './useAgendaCalendar';
import { NEARBY_RADIUS_KM } from './nearbyProspects';

// Dopo aver fissato un appuntamento: prospect entro 10 km da aggiungere alla stessa giornata.
export function AgendaNearbyModal({ v }: { v: AgendaCalendarModel }) {
  const { nearby, setNearby, addNearbyVisit } = v;
  if (!nearby) return null;
  const close = () => setNearby(null);
  const dayLabel = new Date(`${nearby.date}T12:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <DialogFrame className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
      <div className="bg-surface dark:bg-canvas rounded-panel shadow-panel w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-line dark:border-line flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold dark:text-foreground flex items-center gap-2">
              <MapPin size={20} className="text-warning" /> Prospect nelle vicinanze
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Entro {NEARBY_RADIUS_KM} km da <strong>{nearby.originName}</strong> · {dayLabel}
            </p>
          </div>
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={close} className="text-muted hover:text-secondary flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
          {nearby.items.map(({ contact, km }) => {
            const added = nearby.added.includes(contact.id);
            return (
              <div key={contact.id} className="flex items-center gap-3 p-3 rounded-md border border-line dark:border-line">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm dark:text-foreground truncate">{contact.company || contact.contactName}</p>
                  <p className="text-xs text-muted truncate">
                    {[contact.city, contact.address].filter(Boolean).join(' · ') || 'Indirizzo non inserito'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-secondary whitespace-nowrap">{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`}</span>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => addNearbyVisit(contact.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors whitespace-nowrap ${added ? 'bg-success-soft text-success' : 'bg-action text-action-foreground hover:bg-action-hover'}`}
                >
                  {added ? <><Check size={13} /> In agenda</> : <><Plus size={13} /> Visita</>}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-line dark:border-line flex-shrink-0">
          <p className="text-xs text-muted">Prossima visita alle {nearby.nextTime}</p>
          <button type="button" onClick={close} className="px-5 py-2 rounded-md bg-raised dark:bg-raised text-sm font-semibold text-secondary hover:text-foreground">
            Fatto
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}
