import { useState, useSyncExternalStore } from 'react';
import { TileLayer } from 'react-leaflet';
import { Layers } from 'lucide-react';

// Stili mappa Esri (gratuiti, senza chiave API). Lo stile scelto è condiviso da tutte le mappe e ricordato.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
export const MAP_STYLES = {
  strade: { label: 'Strade', url: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}` },
  topo: { label: 'Topografica', url: `${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}` },
  satellite: { label: 'Satellite', url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}` },
} as const;
export type MapStyleId = keyof typeof MAP_STYLES;

const STORAGE_KEY = 'mapStyle';
const listeners = new Set<() => void>();
const readStored = (): MapStyleId => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && v in MAP_STYLES) return v as MapStyleId;
  } catch { /* storage non disponibile */ }
  return 'strade';
};
let current: MapStyleId = readStored();
const setStyle = (id: MapStyleId) => {
  current = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignora */ }
  listeners.forEach(l => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const useMapStyle = () => useSyncExternalStore(subscribe, () => current);

/** Da mettere dentro <MapContainer> al posto del TileLayer. */
export function MapBaseLayer() {
  const style = useMapStyle();
  return (
    <TileLayer
      key={style}
      url={MAP_STYLES[style].url}
      attribution="Tiles © Esri"
      maxZoom={19}
    />
  );
}

/** Tasto cambio stile: da mettere fuori dal <MapContainer>, nel contenitore `relative` della mappa. */
export function MapStyleButton({ className = 'bottom-3 left-3' }: { className?: string }) {
  const style = useMapStyle();
  const [open, setOpen] = useState(false);
  return (
    <div className={`absolute z-[1000] ${className}`}>
      {open && (
        <div className="mb-2 bg-surface/95 dark:bg-surface/95 backdrop-blur-sm rounded-panel shadow-panel p-1 flex flex-col">
          {(Object.keys(MAP_STYLES) as MapStyleId[]).map(id => (
            <button
              key={id}
              type="button"
              onClick={() => { setStyle(id); setOpen(false); }}
              className={`px-3 py-2 rounded-md text-xs font-semibold uppercase text-left transition-colors ${style === id ? 'bg-action text-action-foreground' : 'text-secondary hover:bg-raised'}`}
            >
              {MAP_STYLES[id].label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label="Cambia stile mappa"
        onClick={() => setOpen(v => !v)}
        className="bg-surface/95 dark:bg-surface/95 backdrop-blur-sm text-foreground rounded-panel px-3 py-2.5 shadow-panel flex items-center gap-2 text-xs font-semibold uppercase"
      >
        <Layers size={14} /> {MAP_STYLES[style].label}
      </button>
    </div>
  );
}
