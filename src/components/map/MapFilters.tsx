import { AlertTriangle, Star } from 'lucide-react';
import { sectorLabel } from '../../lib/sectors';
import { MapViewModel } from './useMapView';

export function MapFilters({ v }: { v: MapViewModel }) {
  const { radius, setRadius, isGeocoding, debugMsg, mapFilter, setMapFilter, mapSegmentFilter, setMapSegmentFilter, mapProvinceFilter, setMapProvinceFilter, mapSectorFilter, setMapSectorFilter, mapPriorityOnly, setMapPriorityOnly, showFilters, geocodeContacts, allMapped, nClienti, nProspect, availableProvinces, availableSectors, unmappedWithAddress, markersCapped } = v;
  return (
    <>
      {showFilters && (
        <div id="map-filters" className="mt-3 pt-3 max-h-[40dvh] overflow-y-auto overscroll-contain border-t border-line dark:border-line space-y-3">
          {/* Banner marker cap */}
          {markersCapped && (
            <div className="bg-accent-soft dark:bg-accent-soft/20 border border-accent dark:border-accent rounded-md px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={13} className="text-accent flex-shrink-0" />
              <p className="text-xs font-bold text-accent dark:text-accent">
                Mostrati tutti i marker
              </p>
            </div>
          )}

          {/* Banner geocoding */}
          {unmappedWithAddress.length > 0 && !isGeocoding && (
            <div className="bg-warning-soft dark:bg-warning-soft border border-warning dark:border-warning rounded-md px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-warning flex-shrink-0" />
                <p className="text-xs font-bold text-warning dark:text-warning">
                  <span className="font-black">{unmappedWithAddress.length}</span> senza coordinate
                </p>
              </div>
              <button onClick={geocodeContacts} className="flex-shrink-0 bg-warning text-status-foreground text-xs font-semibold uppercase px-3 py-1.5 rounded-lg">
                Posiziona
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-muted uppercase tracking-normal">Raggio:</span>
            <select
              className="border-2 border-line dark:border-line rounded-md px-2 py-1.5 bg-surface dark:bg-surface dark:text-foreground font-bold outline-none text-xs"
              value={radius} onChange={e => setRadius(Number(e.target.value))}
            >
              {[10, 20, 50, 100, 500].map(r => <option key={r} value={r}>{r} km</option>)}
            </select>
            <button
              onClick={geocodeContacts} disabled={isGeocoding}
              className={`px-3 py-1.5 rounded-md font-semibold uppercase text-xs transition-all ${isGeocoding ? 'bg-raised text-secondary' : 'bg-action text-action-foreground'}`}
            >
              {isGeocoding ? 'Ricerca…' : 'Trova Coordinate'}
            </button>
            {debugMsg && <span className="text-xs text-warning font-bold">{debugMsg}</span>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {([
              { key: 'tutti',    label: 'Tutti',    count: allMapped.length },
              { key: 'clienti',  label: 'Clienti',  count: nClienti },
              { key: 'prospect', label: 'Prospect', count: nProspect },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setMapFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${
                  mapFilter === key ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary dark:text-muted'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setMapSegmentFilter(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${mapSegmentFilter === null ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
            >
              Tutti
            </button>
            {([
              { key: 'dealer',    icon: '🏪', label: 'Dealer' },
              { key: 'industria', icon: '🏭', label: 'Industria' },
              { key: 'edilizia',  icon: '🏗️', label: 'Edilizia' },
              { key: 'end-user',  icon: '👤', label: 'End User' },
            ] as const).map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setMapSegmentFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${mapSegmentFilter === key ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
              >
                {icon} {label}
              </button>
            ))}
            <button
              onClick={() => setMapPriorityOnly(p => !p)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-1 ${mapPriorityOnly ? 'bg-warning text-status-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
            >
              <Star size={12} fill={mapPriorityOnly ? 'currentColor' : 'none'} /> Prioritari
            </button>
          </div>

          {/* Filtro provincia */}
          {availableProvinces.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-normal whitespace-nowrap">Provincia</span>
              <select
                value={mapProvinceFilter}
                onChange={e => setMapProvinceFilter(e.target.value)}
                className="min-w-0 flex-1 px-3 py-1.5 bg-raised dark:bg-raised rounded-md text-xs font-bold text-foreground dark:text-muted border-0 outline-none cursor-pointer"
              >
                <option value="">Tutte</option>
                {availableProvinces.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {mapProvinceFilter && (
                <button onClick={() => setMapProvinceFilter('')}
                  className="text-xs font-semibold text-accent hover:text-accent whitespace-nowrap">
                  Rimuovi
                </button>
              )}
            </div>
          )}

          {/* Filtro settore */}
          {availableSectors.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-normal whitespace-nowrap">Settore</span>
              <select
                value={mapSectorFilter}
                onChange={e => setMapSectorFilter(e.target.value)}
                className="min-w-0 flex-1 px-3 py-1.5 bg-raised dark:bg-raised rounded-md text-xs font-bold text-foreground dark:text-muted border-0 outline-none cursor-pointer"
              >
                <option value="">Tutti</option>
                {availableSectors.map(s => (
                  <option key={s} value={s}>{sectorLabel(s)}</option>
                ))}
              </select>
              {mapSectorFilter && (
                <button onClick={() => setMapSectorFilter('')}
                  className="text-xs font-semibold text-accent hover:text-accent whitespace-nowrap">
                  Rimuovi
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
