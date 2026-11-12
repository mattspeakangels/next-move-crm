import { MapContainer, Marker, CircleMarker, Popup, Polyline } from 'react-leaflet';
import { MapBaseLayer } from '../ui/MapStyleControl';
import { MarkerShape, shapeDivIcon, priorityStarDivIcon } from '../../lib/markerShapes';
import { resolveMarkerStyle, contactMarkerStyle, userIcon, FlyToContact } from './mapShared';
import { HOME, homeIcon, stopIcon, SizeInvalidator } from './itinerarioShared';
import { ItinerarioModel } from './useItinerario';

export function ItinerarioMap({ v }: { v: ItinerarioModel }) {
  const { isVisible, mapMarkerStyles, markerIconPx, markerRadiusPx, selectedIds, itinFlyTo, roadRouteCoords, itinUserPos, mapMarkersToShow, toggle, activeRoute } = v;
  return (
    <>
      <MapContainer center={[HOME.lat, HOME.lng]} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl={false} preferCanvas>
        <MapBaseLayer />
        <SizeInvalidator isVisible={isVisible} />
        <FlyToContact position={itinFlyTo} />
        <Marker position={[HOME.lat, HOME.lng]} icon={homeIcon}>
          <Popup><strong>Partenza — {HOME.label}</strong></Popup>
        </Marker>
        {itinUserPos && <Marker position={itinUserPos} icon={userIcon}><Popup><strong>Tu sei qui</strong></Popup></Marker>}
        {mapMarkersToShow.map((c) => {
          const selected = selectedIds.includes(c.id);
          const stopIdx = activeRoute.findIndex((s) => s.id === c.id);
          const popup = (
            <Popup minWidth={90} maxWidth={160} className="compact-popup">
              <div style={{ padding: '2px 0', lineHeight: 1.2 }}>
                <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company}</p>
                <button onClick={() => toggle(c.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%', padding: '3px 6px', borderRadius: 6, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', background: selected ? '#fee2e2' : '#176f77', color: selected ? '#dc2626' : '#fff', border: 'none', cursor: 'pointer' }}>
                  {selected ? '− Rimuovi' : '+ Aggiungi'}
                </button>
              </div>
            </Popup>
          );
          // Tappe selezionate: marker DOM numerato (poche unità). Il resto:
          // CircleMarker su canvas, veloce anche con centinaia di contatti.
          if (stopIdx >= 0) {
            return (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={stopIcon(stopIdx + 1)} eventHandlers={{ click: () => toggle(c.id) }}>
                {popup}
              </Marker>
            );
          }
          if (c.priorityToVisit) {
            return (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={priorityStarDivIcon(markerIconPx + 2)} eventHandlers={{ click: () => toggle(c.id) }}>
                {popup}
              </Marker>
            );
          }
          const style = resolveMarkerStyle(c.status, c.segment, mapMarkerStyles);
          return style.shape !== 'circle' ? (
            <Marker key={c.id} position={[c.lat, c.lng]} icon={shapeDivIcon(style.shape as MarkerShape, style.color, markerIconPx)} eventHandlers={{ click: () => toggle(c.id) }}>
              {popup}
            </Marker>
          ) : (
            <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={markerRadiusPx} pathOptions={contactMarkerStyle(c.status, c.segment, mapMarkerStyles)} eventHandlers={{ click: () => toggle(c.id) }}>
              {popup}
            </CircleMarker>
          );
        })}
        {roadRouteCoords.length > 1 && (
          <Polyline positions={roadRouteCoords} pathOptions={{ color: '#176f77', weight: 5, opacity: 0.85 }} />
        )}
      </MapContainer>

    </>
  );
}
