import { MapContainer, Marker, CircleMarker, Popup, Circle } from 'react-leaflet';
import { MapPin, Navigation, Phone, ExternalLink, Maximize2, Star } from 'lucide-react';
import { MapBaseLayer, MapStyleButton } from '../ui/MapStyleControl';
import { MarkerShape, DEFAULT_MARKER_STYLE, shapeDivIcon, priorityStarDivIcon } from '../../lib/markerShapes';
import { resolveMarkerStyle, contactMarkerStyle, userIcon, ChangeView, DoubleClickHandler, FlyToContact, LocateButton, calculateDistance } from './mapShared';
import { MapViewModel } from './useMapView';

export function MapCanvas({ v }: { v: MapViewModel }) {
  const { onNavigateToContact, onGoFullscreen, updateContact, mapMarkerStyles, markerIconPx, markerRadiusPx, userPos, radius, mobileTab, flyToTarget, isLocating, geoMsg, locateMe, defaultCenter, visibleMarkers } = v;
  return (
    <>
      <div className={`rounded-panel overflow-hidden shadow-panel h-[55dvh] min-h-[18rem] flex-none md:h-auto md:min-h-0 md:flex-1 relative z-0 border-4 border-line dark:border-line ${mobileTab === 'lista' ? 'hidden md:block' : 'block'}`}
      >
        <MapContainer
          center={defaultCenter}
          zoom={userPos ? 8 : 6}
          style={{ height: '100%', width: '100%' }}
          doubleClickZoom={false}
          preferCanvas
        >
          <MapBaseLayer />
          {userPos && <ChangeView center={userPos} />}
          {userPos && <Marker position={userPos} icon={userIcon}><Popup><strong>Tu sei qui</strong></Popup></Marker>}
          {userPos && <Circle center={userPos} radius={radius * 1000} pathOptions={{ color: '#c08d62', fillOpacity: 0.06, dashArray: '6 4' }} />}
          {onGoFullscreen && <DoubleClickHandler onDoubleClick={onGoFullscreen} />}
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
                  <div className="flex flex-col gap-1.5 pt-2 mt-2 border-t border-line">
                    <button
                      onClick={() => onNavigateToContact(c.id)}
                      className="w-full bg-action text-action-foreground py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5 hover:bg-action-hover"
                    >
                      <ExternalLink size={10} /> {isCliente ? 'Apri Cliente' : 'Apri Prospect'}
                    </button>
                    <button
                      onClick={() => updateContact(c.id, { priorityToVisit: !c.priorityToVisit })}
                      className={`w-full py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5 ${c.priorityToVisit ? 'bg-warning text-status-foreground hover:bg-warning' : 'bg-warning-soft text-warning hover:bg-warning-soft'}`}
                    >
                      <Star size={10} fill={c.priorityToVisit ? 'currentColor' : 'none'} /> {c.priorityToVisit ? 'Prioritario' : 'Segna prioritario'}
                    </button>
                    {c.lat && c.lng && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                        target="_blank" rel="noreferrer"
                        className="w-full bg-raised text-foreground py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5 hover:bg-raised"
                      >
                        <Navigation size={10} /> Naviga
                      </a>
                    )}
                  </div>
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

        <MapStyleButton className="bottom-3 left-3" />

        {/* Overlay hint doppio click */}
        {onGoFullscreen && (
          <div className="absolute bottom-3 right-3 z-[400] hidden md:block bg-surface/80 dark:bg-surface/80 backdrop-blur-sm rounded-md px-3 py-1.5 pointer-events-none">
            <p className="text-xs font-semibold text-secondary uppercase tracking-normal flex items-center gap-1.5">
              <Maximize2 size={10} /> Doppio click per fullscreen
            </p>
          </div>
        )}

        {/* Geolocalizzazione */}
        <div className="absolute bottom-14 right-3 z-[400] flex flex-col items-end gap-2">
          {geoMsg && (
            <div className="bg-danger text-status-foreground text-xs font-bold rounded-md px-3 py-2 max-w-[230px] shadow-panel">{geoMsg}</div>
          )}
          <LocateButton locating={isLocating} onClick={locateMe} />
        </div>

        {/* Legenda colori */}
        <div className="absolute top-3 right-3 z-[400] bg-surface/90 dark:bg-canvas/90 backdrop-blur-sm rounded-md px-3 py-2 shadow pointer-events-none">
          <div className="space-y-1">
            {([
              { category: 'cliente', label: 'Cliente' },
              { category: 'dealer', label: 'Dealer' },
              { category: 'edilizia', label: 'Edilizia' },
              { category: 'industria', label: 'Industria' },
              { category: 'altro', label: 'Non categ.' },
            ] as const).map(({ category, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div style={{ background: mapMarkerStyles[category]?.color || DEFAULT_MARKER_STYLE[category].color }} className="w-3 h-3 rounded-full flex-shrink-0" />
                <span className="text-xs font-medium text-secondary">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
