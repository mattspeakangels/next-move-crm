import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { GripVertical } from 'lucide-react';
import L from 'leaflet';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { calculateDistance } from './mapShared';

// Costanti, calcolo del percorso e piccoli componenti dell'itinerario.
// ── Itinerario ────────────────────────────────────────────────────────────────

export const HOME = { lat: 45.5386, lng: 9.0667, label: 'Casa — Via Don Bianchi, Rho' };
export const AVG_SPEED_KMH = 70; // velocità media stradale stimata

// Chiave YYYY-MM-DD in orario locale, per confrontare un timestamp con il valore di un <input type="date">
export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtTime(km: number): string {
  const mins = Math.round((km / AVG_SPEED_KMH) * 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function nearestNeighbor(
  stops: { id: string; lat: number; lng: number }[],
): { id: string; lat: number; lng: number }[] {
  const unvisited = [...stops];
  const route: typeof stops = [];
  let curLat = HOME.lat, curLng = HOME.lng;
  while (unvisited.length > 0) {
    let minD = Infinity, minI = 0;
    unvisited.forEach((s, i) => {
      const d = calculateDistance(curLat, curLng, s.lat, s.lng);
      if (d < minD) { minD = d; minI = i; }
    });
    route.push(unvisited[minI]);
    curLat = unvisited[minI].lat;
    curLng = unvisited[minI].lng;
    unvisited.splice(minI, 1);
  }
  return route;
}

export const homeIcon = L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#c08d62;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
  </div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
});

export const stopIcon = (n: number) => L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#176f77;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:white;font-family:sans-serif;">${n}</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});


// Componente sortable per singola tappa — drag handle visibile
export const SortableTappa = React.memo(function SortableTappa({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-canvas dark:bg-surface rounded-panel px-3 py-2 flex items-center gap-2 select-none ${isDragging ? 'opacity-50 shadow-panel z-50 ring-2 ring-warning' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-muted hover:text-secondary cursor-grab active:cursor-grabbing touch-none"
        tabIndex={-1}
        aria-label="Trascina per riordinare"
      >
        <GripVertical size={15} />
      </button>
      {children}
    </div>
  );
});

// Vista fullscreen itinerario: mappa + bottom sheet
// Chiama map.invalidateSize() quando la mappa torna visibile dopo display:none
export const SizeInvalidator: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const map = useMap();
  useEffect(() => {
    if (isVisible) setTimeout(() => map.invalidateSize(), 50);
  }, [isVisible, map]);
  return null;
};
