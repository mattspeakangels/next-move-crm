import { MapContainer, Marker, Popup, Circle } from 'react-leaflet';
import { Maximize2 } from 'lucide-react';
import { MapBaseLayer, MapStyleButton } from '../ui/MapStyleControl';
import { CommercialContact, CommercialMapControls, commercialGroupColor, commercialIcon } from './CommercialMapControls';
import { markerColor } from './commercialMap';
import { GroupedMapMarkers } from './GroupedMapMarkers';
import { userIcon, ChangeView, DoubleClickHandler, FlyToContact, LocateButton } from './mapShared';
import { MapViewModel } from './useMapView';

export function MapCanvas({ v }: { v: MapViewModel }) {
  const { onNavigateToContact, onGoFullscreen, markerIconPx, userPos, radius, mobileTab, flyToTarget, isLocating, geoMsg, locateMe, defaultCenter, visibleMarkers } = v;
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

          <GroupedMapMarkers items={visibleMarkers} onSelect={c => onNavigateToContact(c.id)} getCategoryColor={c => markerColor(c, v.mapInsights)} getGroupColor={items => commercialGroupColor(items, v.mapInsights)} renderGroupItem={c => <CommercialContact contact={c} insight={v.mapInsights.get(c.id)} v={v} />} renderSingle={c => (
            <Marker key={c.markerKey} position={[c.lat!, c.lng!]} icon={commercialIcon(v.mapInsights.get(c.id)?.heat || 'unknown', markerIconPx, v.routeSelection.includes(c.id), c.status === 'cliente')}>
              <Popup minWidth={230} maxWidth={290}><CommercialContact contact={c} insight={v.mapInsights.get(c.id)} v={v} /></Popup>
            </Marker>
          )} />

        </MapContainer>
      <CommercialMapControls v={v} />

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

      </div>
    </>
  );
}
