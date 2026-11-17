import { useMemo, useState, type ReactNode } from 'react';
import L from 'leaflet';
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { groupMarkers, type PositionedMarker } from './groupMarkers';
import { PinColorControl } from './PinColorControl';

type ContactMarker = PositionedMarker & { id: string; company: string; markerKey?: string };
const PAGE_SIZE = 20;
const clusterIcons = new Map<number, L.DivIcon>();

function clusterIcon(count: number): L.DivIcon {
  const previous = clusterIcons.get(count);
  if (previous) return previous;
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:42px;height:42px;border-radius:50%;background:#7044db;color:white;border:3px solid white;box-shadow:0 2px 8px #0006;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800">${count}</div>`,
    iconSize: [42, 42], iconAnchor: [21, 21],
  });
  clusterIcons.set(count, icon);
  return icon;
}

function GroupPopup<T extends ContactMarker>({ items, onSelect, getCategoryColor, actionLabel }: {
  items: T[];
  onSelect: (item: T) => void;
  getCategoryColor: (item: T) => string;
  actionLabel?: string;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <Popup minWidth={220} maxWidth={280}>
      <div className="font-semibold text-sm mb-2">{items.length} clienti e prospect in questa zona</div>
      <div className="max-h-56 overflow-y-auto space-y-2">
        {items.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((item, index) => (
          <div key={item.markerKey || `${item.id}-${index}`} className="border-b border-line pb-2">
            <button type="button" className="text-left text-sm font-semibold text-accent w-full" onClick={() => onSelect(item)}>{item.company}{actionLabel && <span className="block text-xs text-muted">{actionLabel}</span>}</button>
            <PinColorControl contactId={item.id} categoryColor={getCategoryColor(item)} />
          </div>
        ))}
      </div>
      {pageCount > 1 && <div className="flex justify-between items-center gap-2 mt-2 text-xs">
        <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Precedenti</button>
        <span>{currentPage + 1} / {pageCount}</span>
        <button type="button" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Successivi</button>
      </div>}
    </Popup>
  );
}

/** Keep only on-screen markers mounted; nearby contacts remain accessible in groups. */
export function GroupedMapMarkers<T extends ContactMarker>({ items, renderSingle, onSelect, getCategoryColor, actionLabel }: {
  items: T[];
  renderSingle: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  getCategoryColor: (item: T) => string;
  actionLabel?: string;
}) {
  const map = useMap();
  const [viewRevision, setViewRevision] = useState(0);
  useMapEvents({ moveend: () => setViewRevision(value => value + 1), resize: () => setViewRevision(value => value + 1) });
  const groups = useMemo(() => {
    const bounds = map.getBounds().pad(0.2);
    const zoom = map.getZoom();
    return groupMarkers(items, (lat, lng) => bounds.contains([lat, lng]), (lat, lng) => map.project([lat, lng], zoom));
  }, [items, map, viewRevision]);
  const zoom = map.getZoom();

  return <>{groups.map(group => {
    if (group.items.length === 1) return renderSingle(group.items[0]);
    const sameLocation = group.items.every(item => item.lat === group.items[0].lat && item.lng === group.items[0].lng);
    const showList = zoom >= 16 || sameLocation;
    return (
      <Marker key={`group-${group.key}`} position={[group.lat, group.lng]} icon={clusterIcon(group.items.length)}
        eventHandlers={showList ? undefined : { click: () => map.setView([group.lat, group.lng], Math.min(zoom + 3, 16)) }}>
        {showList && <GroupPopup items={group.items} onSelect={onSelect} getCategoryColor={getCategoryColor} actionLabel={actionLabel} />}
      </Marker>
    );
  })}</>;
}
