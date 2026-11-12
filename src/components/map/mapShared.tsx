import type { Contact } from '../../types';
import React, { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import L from 'leaflet';
import { MarkerShape, getMarkerCategory, DEFAULT_MARKER_STYLE } from '../../lib/markerShapes';

// Marker, icone e funzioni di posizione condivise dalle mappe.

// ── Icone colorate via divIcon ─────────────────────────────────────────────────

export type MapMarkerStyles = Record<string, { shape: string; color: string }>;

// Risolve forma+colore di un contatto: stile personalizzato da Impostazioni
// (per categoria stato/segmento) se presente, altrimenti il default.
export function resolveMarkerStyle(status: string, segment: string | undefined, styles: MapMarkerStyles) {
  const category = getMarkerCategory(status, segment);
  const custom = styles[category];
  const base = DEFAULT_MARKER_STYLE[category];
  return {
    shape: (custom?.shape as MarkerShape) || base.shape,
    color: custom?.color || base.color,
  };
}

// I marker "cerchio" (il default) sono CircleMarker disegnati su canvas
// (preferCanvas): con centinaia di punti i divIcon DOM rendono la mappa
// inutilizzabile su smartphone. Le altre forme (personalizzate dall'utente)
// usano invece un divIcon SVG, pagato solo se l'utente sceglie una forma
// diversa dal cerchio.
export const contactMarkerStyle = (status: string, segment: string | undefined, styles: MapMarkerStyles) => ({
  color: '#ffffff',
  weight: 2.5,
  fillColor: resolveMarkerStyle(status, segment, styles).color,
  fillOpacity: 1,
});

// CARTO ora richiede una API key sulle tile basemaps.cartocdn.com (tile
// placeholder "API KEY REQUIRED" senza autenticazione) → torniamo alle tile
// OSM standard, gratuite e senza registrazione.
// Posizione utente: stella verde con contorno giallo, lampeggiante — ben
// distinguibile dai marker circolari di clienti e prospect
export const userIcon = L.divIcon({
  className: '',
  html: `<style>@keyframes nm-user-blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.85)}}</style>
  <div style="width:38px;height:38px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.45));">
    <svg viewBox="0 0 24 24" width="38" height="38">
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"
        fill="#22c55e" stroke="#facc15" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 8); }, [center]);
  return null;
};

export const DoubleClickHandler = ({ onDoubleClick }: { onDoubleClick: () => void }) => {
  useMapEvents({ dblclick: () => { onDoubleClick(); } });
  return null;
};

export const FlyToContact = ({ position }: { position: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 14, { duration: 1 });
  }, [position]);
  return null;
};

// Bottone "trova la mia posizione" — overlay condiviso dalle tre mappe
export const LocateButton: React.FC<{ locating: boolean; onClick: () => void; className?: string }> = ({ locating, onClick, className }) => (
  <button
    onClick={onClick}
    title="Mostra la mia posizione"
    className={`bg-surface/95 dark:bg-surface/95 backdrop-blur-sm rounded-panel p-3 shadow-panel text-accent dark:text-accent active:scale-95 transition-all ${className ?? ''}`}
  >
    <LocateFixed size={18} className={locating ? 'animate-pulse' : ''} />
  </button>
);

export function requestPosition(
  onOk: (pos: [number, number]) => void,
  onErr: (msg: string) => void,
  setLocating: (v: boolean) => void,
) {
  if (!navigator.geolocation) {
    onErr('GPS non disponibile su questo dispositivo/browser.');
    return;
  }
  setLocating(true);
  navigator.geolocation.getCurrentPosition(
    pos => {
      setLocating(false);
      onOk([pos.coords.latitude, pos.coords.longitude]);
    },
    err => {
      setLocating(false);
      onErr(err.code === 1
        ? 'Permesso posizione negato. Abilita il GPS per questo sito nelle impostazioni del browser.'
        : 'Posizione non disponibile. Verifica che il GPS sia attivo e riprova.');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  );
}

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Contatto con coordinate valide, cioè mostrabile in mappa. */
export type MappedContact = Contact & { lat: number; lng: number };

/** Stesso controllo usato da sempre per i marker (`c.lat && c.lng`), con il tipo corretto. */
export function hasCoords(c: Contact | undefined): c is MappedContact {
  return !!c && !!c.lat && !!c.lng;
}
