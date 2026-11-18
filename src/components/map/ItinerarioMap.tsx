import { MapContainer, Marker, Popup, Polyline } from 'react-leaflet';
import { MapBaseLayer } from '../ui/MapStyleControl';
import { GroupedMapMarkers } from './GroupedMapMarkers';
import { commercialIcon, commercialGroupColor } from './CommercialMapControls';
import { HEAT_COLORS } from './commercialMap';
import { userIcon, FlyToContact } from './mapShared';
import { HOME, homeIcon, stopIcon, SizeInvalidator } from './itinerarioShared';
import { ItinerarioModel } from './useItinerario';

export function ItinerarioMap({ v }: { v: ItinerarioModel }) {
  const { isVisible, mapInsights, markerIconPx, selectedIds, itinFlyTo, roadRouteCoords, itinUserPos, mapMarkersToShow, toggle, activeRoute } = v;
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
        <GroupedMapMarkers items={mapMarkersToShow} onSelect={c => toggle(c.id)} getCategoryColor={c => HEAT_COLORS[mapInsights.get(c.id)?.heat || 'unknown']} getGroupColor={items => commercialGroupColor(items, mapInsights)} actionLabel="Aggiungi o rimuovi" renderSingle={c => {
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
          // Le tappe selezionate mantengono il numero nell'itinerario.
          if (stopIdx >= 0) {
            return (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={stopIcon(stopIdx + 1)} eventHandlers={{ click: () => toggle(c.id) }}>
                {popup}
              </Marker>
            );
          }
          return (
            <Marker key={c.id} position={[c.lat, c.lng]} icon={commercialIcon(mapInsights.get(c.id)?.heat || 'unknown', markerIconPx, false)} eventHandlers={{ click: () => toggle(c.id) }}>
              {popup}
            </Marker>
          );
        }} />
        {roadRouteCoords.length > 1 && (
          <Polyline positions={roadRouteCoords} pathOptions={{ color: '#176f77', weight: 5, opacity: 0.85 }} />
        )}
      </MapContainer>

    </>
  );
}
