import { Navigation, Maximize2, SlidersHorizontal, Sparkles, Route } from 'lucide-react';
import { SearchDropdown } from '../ui/SearchDropdown';
import { MapViewModel } from './useMapView';
import { MapFilters } from './MapFilters';

export function MapHeader({ v }: { v: MapViewModel }) {
  const { onGoFullscreen, locatingContactId, searchGeocodeError, setMobileTab, showFilters, setShowFilters, setShowAIPanel, setShowItinerario, setItinerarioEverOpened, searchQuery, setSearchQuery, setFlyToTarget, selectSearchContact, allContacts, allMapped, nClienti, nProspect, searchResults } = v;
  return (
    <>
      <div className="bg-surface dark:bg-surface rounded-[1.5rem] px-4 py-3 shadow-sm border border-line dark:border-line mb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-lg  dark:text-foreground   flex items-center gap-2">
              <Navigation className="text-accent" size={20} /> Radar Clienti
            </h1>
            <p className="text-muted text-xs font-bold">
              <span className="text-accent font-semibold">{nClienti}</span> clienti ·{' '}
              <span className="text-warning font-semibold">{nProspect}</span> prospect · {allMapped.length}/{allContacts.length} mappati
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Itinerario */}
            <button
              onClick={() => { setShowItinerario(true); setItinerarioEverOpened(true); }}
              className="p-2.5 rounded-md border-2 border-warning text-warning hover:bg-warning-soft transition-all"
              title="Crea itinerario di viaggio"
            >
              <Route size={16} />
            </button>
            {/* AI Cataloga */}
            <button
              onClick={() => setShowAIPanel(true)}
              className="p-2.5 rounded-md border-2 border-accent text-accent hover:bg-accent-soft transition-all"
              title="AI Cataloga contatti"
            >
              <Sparkles size={16} />
            </button>
            {/* Toggle filtri */}
            <button
              onClick={() => setShowFilters(v => !v)}
              aria-label="Filtri mappa"
              aria-expanded={showFilters}
              aria-controls="map-filters"
              className={`p-2.5 rounded-xl border-2 transition-all ${showFilters ? 'bg-action border-accent text-action-foreground' : 'border-line dark:border-line text-secondary'}`}
            >
              <SlidersHorizontal size={16} />
            </button>
            {/* Espandi fullscreen */}
            {onGoFullscreen && (
              <button
                onClick={onGoFullscreen}
                className="p-2.5 rounded-md border-2 border-line dark:border-line text-secondary hover:bg-accent-soft hover:border-accent hover:text-accent transition-all"
                title="Espandi a tutto schermo"
              >
                <Maximize2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ── Barra di ricerca ── */}
        <SearchDropdown
          className="mt-3"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cerca cliente o prospect…"
          inputWrapperClassName={() => 'flex items-center gap-2 bg-canvas dark:bg-raised border-2 border-line dark:border-line rounded-panel px-3 py-2.5 focus-within:border-accent transition-colors'}
          dropdownClassName="z-[500]"
          onSelect={c => {
            setSearchQuery(c.company);
            setMobileTab('mappa');
            selectSearchContact(c, setFlyToTarget);
          }}
          results={searchResults.map(c => {
            const isCliente = c.status === 'cliente';
            const hasPinned = !!(c.lat && c.lng);
            return {
              key: c.id,
              item: c,
              label: c.company,
              sublabel: c.city || '—',
              badge: {
                text: hasPinned ? (isCliente ? 'Cliente' : 'Prospect') : 'no pin',
                className: hasPinned
                  ? (isCliente ? 'bg-accent-soft text-accent dark:bg-accent-soft/40 dark:text-accent' : 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning')
                  : 'bg-raised text-muted dark:bg-raised dark:text-muted',
              },
            };
          })}
        />
        {locatingContactId && (
          <p className="mt-1.5 text-xs text-muted font-bold">Localizzo in mappa…</p>
        )}
        {searchGeocodeError && (
          <p className="mt-1.5 text-xs text-danger font-bold">{searchGeocodeError}</p>
        )}

        {/* Filtri collassabili */}
        <MapFilters v={v} />
      </div>
    </>
  );
}
