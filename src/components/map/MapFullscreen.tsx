import { DialogFrame } from '../ui/DialogFrame';
import { MapContainer, Marker, CircleMarker, Popup, Circle, ZoomControl } from 'react-leaflet';
import { MapPin, Navigation, Phone, ExternalLink, X, SlidersHorizontal, Star } from 'lucide-react';
import { MapBaseLayer, MapStyleButton } from '../ui/MapStyleControl';
import { SearchDropdown } from '../ui/SearchDropdown';
import { MarkerShape, shapeDivIcon, priorityStarDivIcon } from '../../lib/markerShapes';
import { sectorLabel } from '../../lib/sectors';
import { resolveMarkerStyle, contactMarkerStyle, userIcon, ChangeView, DoubleClickHandler, FlyToContact, LocateButton, calculateDistance } from './mapShared';
import { MapViewModel } from './useMapView';

export function MapFullscreen({ v }: { v: MapViewModel }) {
  const { onNavigateToContact, onExitFullscreen, updateContact, mapMarkerStyles, markerIconPx, markerRadiusPx, userPos, radius, locatingContactId, searchGeocodeError, mapFilter, setMapFilter, mapProvinceFilter, setMapProvinceFilter, mapSectorFilter, setMapSectorFilter, mapPriorityOnly, setMapPriorityOnly, showFilters, setShowFilters, searchQuery, setSearchQuery, flyToTarget, setFlyToTarget, isLocating, geoMsg, locateMe, selectSearchContact, nClienti, nProspect, searchResults, availableProvinces, availableSectors, defaultCenter, visibleMarkers, markersCapped } = v;
  return (
    <DialogFrame className="fixed inset-0 z-50 bg-black overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={userPos ? 8 : 6}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        doubleClickZoom={false}
        preferCanvas
      >
        <ZoomControl position="bottomright" />
        <MapBaseLayer />
        {userPos && <ChangeView center={userPos} />}
        {userPos && <Marker position={userPos} icon={userIcon}><Popup><strong>Tu sei qui</strong></Popup></Marker>}
        {userPos && <Circle center={userPos} radius={radius * 1000} pathOptions={{ color: '#c08d62', fillOpacity: 0.06, dashArray: '6 4' }} />}
        <DoubleClickHandler onDoubleClick={() => onExitFullscreen?.()} />
        <FlyToContact position={flyToTarget} />
        {visibleMarkers.map(c => {
          const isCliente = c.status === 'cliente';
          const distKm = userPos ? calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) : null;
          const popupContent = (
            <Popup minWidth={220}>
              <div className="p-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${isCliente ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning'}`}>
                    {isCliente ? '● Cliente' : '◆ Prospect'}
                  </span>
                  {c.sedeLabel && <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-raised text-secondary">{c.sedeLabel}</span>}
                  {distKm !== null && <span className="text-xs text-muted font-bold">{distKm.toFixed(0)} km</span>}
                </div>
                <h4 className="font-semibold uppercase text-foreground text-sm mb-1">{c.company}</h4>
                {c.address && <p className="text-xs text-secondary flex items-center gap-1"><MapPin size={10} />{c.address}, {c.city}</p>}
                {c.phone   && <p className="text-xs text-secondary flex items-center gap-1 mt-0.5"><Phone size={10} />{c.phone}</p>}
                <button
                  onClick={() => onNavigateToContact(c.id)}
                  className="mt-2 w-full bg-action text-action-foreground py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={10} /> {isCliente ? 'Apri Cliente' : 'Apri Prospect'}
                </button>
                <button
                  onClick={() => updateContact(c.id, { priorityToVisit: !c.priorityToVisit })}
                  className={`mt-1 w-full py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5 ${c.priorityToVisit ? 'bg-warning text-status-foreground' : 'bg-warning-soft text-warning'}`}
                >
                  <Star size={10} fill={c.priorityToVisit ? 'currentColor' : 'none'} /> {c.priorityToVisit ? 'Prioritario' : 'Segna prioritario'}
                </button>
                {c.lat && c.lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                    target="_blank" rel="noreferrer"
                    className="mt-1 w-full bg-raised text-foreground py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5"
                  >
                    <Navigation size={10} /> Naviga
                  </a>
                )}
              </div>
            </Popup>
          );
          if (c.priorityToVisit) {
            return (
              <Marker key={c.markerKey} position={[c.lat!, c.lng!]} icon={priorityStarDivIcon(markerIconPx + 2)}>
                {popupContent}
              </Marker>
            );
          }
          const style = resolveMarkerStyle(c.status, c.segment, mapMarkerStyles);
          return style.shape !== 'circle' ? (
            <Marker key={c.markerKey} position={[c.lat!, c.lng!]} icon={shapeDivIcon(style.shape as MarkerShape, style.color, markerIconPx)}>
              {popupContent}
            </Marker>
          ) : (
            <CircleMarker key={c.markerKey} center={[c.lat!, c.lng!]} radius={markerRadiusPx} pathOptions={contactMarkerStyle(c.status, c.segment, mapMarkerStyles)}>
              {popupContent}
            </CircleMarker>
          );
        })}
      </MapContainer>

      <MapStyleButton className="bottom-20 left-4" />

      {/* Filtri in alto, ricerca sotto: il dropdown dei risultati si apre libero, senza coprire/essere coperto dai filtri */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+4.25rem)] left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(40rem,calc(100%-2rem))] z-[1000] flex flex-col items-stretch gap-2">
      {/* Filtri separati dalla ricerca e limitati in altezza sui telefoni. */}
      {showFilters && <div id="fullscreen-map-filters" className="flex items-center gap-2 flex-wrap max-h-[30dvh] overflow-y-auto overscroll-contain bg-surface/95 rounded-panel p-2 shadow-panel">
        {/* Toggle clienti/tutti/prospect */}
        <div className="bg-surface/90 backdrop-blur-sm rounded-panel p-1 flex gap-1 shadow-panel">
          {(['tutti', 'clienti', 'prospect'] as const).map(f => (
            <button key={f} onClick={() => setMapFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${mapFilter === f ? 'bg-action text-action-foreground' : 'text-secondary hover:bg-raised'}`}>
              {f === 'tutti' ? 'Tutti' : f === 'clienti' ? 'Clienti' : 'Prospect'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setMapPriorityOnly(p => !p)}
          className={`px-3 py-1.5 rounded-panel text-xs font-semibold uppercase transition-all flex items-center gap-1 shadow-panel ${mapPriorityOnly ? 'bg-warning text-status-foreground' : 'bg-surface/90 backdrop-blur-sm text-secondary'}`}
        >
          <Star size={14} fill={mapPriorityOnly ? 'currentColor' : 'none'} /> Prioritari
        </button>

        {/* Filtro provincia */}
        {availableProvinces.length > 0 && (
          <select
            value={mapProvinceFilter}
            onChange={e => setMapProvinceFilter(e.target.value)}
            className="min-w-0 max-w-full flex-1 bg-surface/90 backdrop-blur-sm rounded-panel px-3 py-2 text-xs font-semibold text-foreground shadow-panel border-0 outline-none cursor-pointer"
          >
            <option value="">Tutte le province</option>
            {availableProvinces.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}

        {/* Filtro settore */}
        {availableSectors.length > 0 && (
          <select
            value={mapSectorFilter}
            onChange={e => setMapSectorFilter(e.target.value)}
            className="min-w-0 max-w-full flex-1 bg-surface/90 backdrop-blur-sm rounded-panel px-3 py-2 text-xs font-semibold text-foreground shadow-panel border-0 outline-none cursor-pointer"
          >
            <option value="">Tutti i settori</option>
            {availableSectors.map(s => (
              <option key={s} value={s}>{sectorLabel(s)}</option>
            ))}
          </select>
        )}
      </div>}

      {/* Barra di ricerca fullscreen */}
      <div className="w-full min-w-0">
        <SearchDropdown
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cerca cliente o prospect…"
          inputWrapperClassName={() => 'flex items-center gap-2 bg-surface/90 backdrop-blur-sm border-0 rounded-panel px-3 py-2.5 shadow-panel focus-within:ring-2 focus-within:ring-accent transition-all'}
          dropdownClassName="z-[1100] [&>div:last-child]:max-h-[25dvh]"
          onSelect={c => {
            setSearchQuery(c.company);
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
                  ? (isCliente ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning')
                  : 'bg-raised text-muted',
              },
            };
          })}
        />
        {locatingContactId && (
          <p className="mt-1.5 ml-1 text-xs text-foreground font-bold drop-shadow">Localizzo in mappa…</p>
        )}
        {searchGeocodeError && (
          <p className="mt-1.5 ml-1 text-xs bg-danger text-status-foreground font-bold rounded-md px-3 py-1.5 shadow-panel inline-block">{searchGeocodeError}</p>
        )}
      </div>

      </div>

      <button
        type="button"
        aria-expanded={showFilters}
        aria-controls="fullscreen-map-filters"
        onClick={() => setShowFilters(v => !v)}
        className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-3 z-[1000] min-h-11 bg-surface/95 text-foreground rounded-panel px-3 shadow-panel flex items-center gap-2 text-xs font-semibold"
      >
        <SlidersHorizontal size={16} /> Filtri
      </button>

      {/* Bottone chiudi */}
      <button
        onClick={onExitFullscreen}
        className="absolute top-[calc(env(safe-area-inset-top)+1rem)] right-3 z-[1000] bg-surface/90 backdrop-blur-sm text-foreground rounded-panel px-4 py-2.5 font-semibold uppercase text-xs flex items-center gap-2 shadow-panel"
      >
        <X size={16} /> Chiudi
      </button>

      {/* Geolocalizzazione */}
      <div className="absolute bottom-28 right-3 z-[1000] flex flex-col items-end gap-2">
        {geoMsg && (
          <div className="bg-danger text-status-foreground text-xs font-bold rounded-md px-3 py-2 max-w-[230px] shadow-panel">{geoMsg}</div>
        )}
        <LocateButton locating={isLocating} onClick={locateMe} />
      </div>

      {/* Info overlay */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-3 right-14 md:right-auto z-[1000] bg-surface/90 backdrop-blur-sm rounded-panel px-4 py-2.5 shadow-panel">
        <p className="text-xs font-semibold text-foreground">
          <span className="text-accent">{nClienti}</span> clienti ·{' '}
          <span className="text-warning">{nProspect}</span> prospect
        </p>
        {markersCapped && (
          <p className="text-xs text-warning font-bold mt-0.5">
            Mostrati tutti i marker
          </p>
        )}
        <p className="text-xs text-muted font-bold mt-0.5">Doppio click per uscire</p>
      </div>
    </DialogFrame>
  );
}
