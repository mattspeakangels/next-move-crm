import { MapPin, Navigation, Phone, Building2, Star } from 'lucide-react';
import { MapViewModel } from './useMapView';

export function MapContactList({ v }: { v: MapViewModel }) {
  const { onNavigateToContact, mobileTab, listContacts } = v;
  return (
    <>
      <div className={`flex-1 overflow-y-auto space-y-2 ${mobileTab === 'mappa' ? 'hidden md:hidden' : 'block'} md:hidden`}
        style={{ minHeight: 0 }}
      >
        {listContacts.length === 0 ? (
          <div className="text-center py-12 bg-surface dark:bg-surface rounded-panel">
            <MapPin size={32} className="mx-auto mb-3 text-muted" />
            <p className="text-sm font-bold text-muted uppercase tracking-normal">Nessun contatto mappato</p>
            <p className="text-xs text-muted mt-1">Apri i filtri e clicca "Trova Coordinate"</p>
          </div>
        ) : listContacts.map(c => {
          const isCliente = c.status === 'cliente';
          return (
            <div
              key={c.id}
              onClick={() => onNavigateToContact(c.id)}
              className={`bg-surface dark:bg-surface rounded-panel p-4 shadow-sm border-2 cursor-pointer transition-all ${isCliente ? 'border-line dark:border-line hover:border-accent' : 'border-warning dark:border-warning hover:border-warning'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCliente ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning'}`}>
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm dark:text-foreground uppercase truncate">{c.company}</p>
                    <p className="text-xs text-muted font-bold flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="flex-shrink-0" />
                      {c.city || '—'}{c.province ? ` (${c.province})` : ''}
                    </p>
                    {c.phone && (
                      <p className="text-xs text-muted font-bold flex items-center gap-1">
                        <Phone size={11} className="flex-shrink-0" /> {c.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${isCliente ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning'}`}>
                    {isCliente ? 'Cliente' : 'Prospect'}
                  </span>
                  {c.priorityToVisit && (
                    <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-warning text-status-foreground flex items-center gap-0.5">
                      <Star size={9} fill="currentColor" /> Prioritario
                    </span>
                  )}
                  {c.distKm !== null && (
                    <span className="text-xs font-semibold text-muted">
                      {c.distKm.toFixed(0)} km
                    </span>
                  )}
                </div>
              </div>
              {c.address && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                  target="_blank" rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-md bg-canvas dark:bg-raised text-secondary text-xs font-semibold uppercase hover:bg-accent-soft hover:text-accent transition-all"
                >
                  <Navigation size={12} /> Naviga
                </a>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
