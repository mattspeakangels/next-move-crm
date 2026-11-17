import { useEffect, useState, useSyncExternalStore } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { Layers } from 'lucide-react';

// Stili mappa Esri (gratuiti, senza chiave API). Lo stile scelto è condiviso da tutte le mappe e ricordato.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
export const MAP_STYLES = {
  strade: { label: 'Strade', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' },
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

let googleMapsPromise: Promise<void> | undefined;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;
  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const globals = window as unknown as { gm_authFailure?: () => void; google?: { maps?: { Map?: unknown } } };
    if (globals.google?.maps?.Map) { resolve(); return; }
    globals.gm_authFailure = () => {
      window.dispatchEvent(new Event('nextmove-google-maps-error'));
      reject(new Error('Google Maps authentication failed'));
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps could not be loaded'));
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

/** Da mettere dentro <MapContainer> al posto del TileLayer. */
export function MapBaseLayer() {
  const style = useMapStyle();
  const map = useMap();
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (style !== 'strade' || !apiKey) return;
    let disposed = false;
    let failed = false;
    let layer: L.Layer | undefined;
    const fail = () => {
      if (disposed) return;
      failed = true;
      if (layer) { map.removeLayer(layer); layer = undefined; }
      setGoogleReady(false);
    };
    window.addEventListener('nextmove-google-maps-error', fail);
    loadGoogleMaps(apiKey).then(async () => {
      if (disposed) return;
      // GoogleMutant requires the Leaflet global when its module is evaluated.
      (window as unknown as { L: typeof L }).L = L;
      // @ts-expect-error GoogleMutant does not ship TypeScript declarations.
      const { default: GoogleMutant } = await import('leaflet.gridlayer.googlemutant/src/Leaflet.GoogleMutant.mjs');
      if (disposed || failed) return;
      layer = new GoogleMutant({ type: 'roadmap', maxZoom: 19 }) as L.Layer;
      layer.addTo(map);
      setGoogleReady(true);
    }).catch(fail);
    return () => {
      disposed = true;
      window.removeEventListener('nextmove-google-maps-error', fail);
      if (layer) map.removeLayer(layer);
      setGoogleReady(false);
    };
  }, [map, style]);

  if (style === 'strade' && googleReady) return null;
  return (
    <TileLayer
      key={style}
      url={MAP_STYLES[style].url}
      attribution={style === 'strade' ? '&copy; OpenStreetMap contributors &copy; CARTO' : 'Tiles &copy; Esri'}
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
