import L from 'leaflet';

// Forme selezionabili per i marker dei clienti sulla mappa, una per
// categoria (stato/segmento). Il marker "prioritario" (stellina oro/fucsia)
// resta un caso a parte e non e' personalizzabile da qui.
export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'pentagon' | 'hexagon';

export const MARKER_SHAPE_LABELS: Record<MarkerShape, string> = {
  circle: 'Cerchio',
  square: 'Quadrato',
  triangle: 'Triangolo',
  diamond: 'Rombo',
  star: 'Stella',
  pentagon: 'Pentagono',
  hexagon: 'Esagono',
};

// Categorie di contatti mostrate sulla mappa (derivate da stato/segmento).
export type MarkerCategory = 'cliente' | 'dealer' | 'edilizia' | 'industria' | 'altro';

export const MARKER_CATEGORY_LABELS: Record<MarkerCategory, string> = {
  cliente: 'Cliente',
  dealer: 'Prospect Dealer',
  edilizia: 'Prospect Edilizia',
  industria: 'Prospect Industria',
  altro: 'Altro / non categorizzato',
};

export const DEFAULT_MARKER_STYLE: Record<MarkerCategory, { shape: MarkerShape; color: string }> = {
  cliente: { shape: 'circle', color: '#22c55e' },
  dealer: { shape: 'circle', color: '#38bdf8' },
  edilizia: { shape: 'circle', color: '#eab308' },
  industria: { shape: 'circle', color: '#f87171' },
  altro: { shape: 'circle', color: '#94a3b8' },
};

export function getMarkerCategory(status: string, segment?: string): MarkerCategory {
  if (status === 'cliente') return 'cliente';
  if (segment === 'dealer') return 'dealer';
  if (segment === 'edilizia') return 'edilizia';
  if (segment === 'industria') return 'industria';
  return 'altro';
}

// Genera il path SVG di una forma, centrato in un riquadro di lato `size`.
function shapePath(shape: MarkerShape, size: number): string {
  const c = size / 2;
  const r = size / 2 - 2;
  switch (shape) {
    case 'square': {
      const s = r * 1.55;
      return `M${c - s / 2},${c - s / 2} h${s} v${s} h${-s} Z`;
    }
    case 'triangle': {
      const h = r * 1.9;
      return `M${c},${c - h * 0.62} L${c + h * 0.58},${c + h * 0.46} L${c - h * 0.58},${c + h * 0.46} Z`;
    }
    case 'diamond': {
      const d = r * 1.15;
      return `M${c},${c - d} L${c + d},${c} L${c},${c + d} L${c - d},${c} Z`;
    }
    case 'star': {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r * 1.05 : r * 0.45;
        const ang = (Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${c + rad * Math.cos(ang)},${c + rad * Math.sin(ang)}`);
      }
      return `M${pts.join(' L')} Z`;
    }
    case 'pentagon': {
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const ang = (2 * Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${c + r * Math.cos(ang)},${c + r * Math.sin(ang)}`);
      }
      return `M${pts.join(' L')} Z`;
    }
    case 'hexagon': {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${c + r * Math.cos(ang)},${c + r * Math.sin(ang)}`);
      }
      return `M${pts.join(' L')} Z`;
    }
    case 'circle':
    default:
      return '';
  }
}

export type MarkerSize = 'small' | 'medium' | 'large';

export const MARKER_SIZE_LABELS: Record<MarkerSize, string> = {
  small: 'Piccole',
  medium: 'Medie',
  large: 'Grandi',
};

// Lato in px del divIcon e raggio del CircleMarker canvas per ciascuna taglia.
export const MARKER_ICON_PX: Record<MarkerSize, number> = { small: 18, medium: 22, large: 32 };
export const MARKER_CIRCLE_RADIUS: Record<MarkerSize, number> = { small: 7, medium: 9, large: 13 };

const iconCache = new Map<string, L.DivIcon>();

// Icona DOM (divIcon) per una forma+colore. Cache per evitare di ricreare lo
// stesso SVG per ogni marker: con marker "cerchio" (il default) usiamo
// invece CircleMarker su canvas, molto piu' leggero con tanti punti — questa
// funzione entra in gioco solo quando l'utente sceglie una forma diversa.
export function shapeDivIcon(shape: MarkerShape, color: string, size = 22): L.DivIcon {
  const key = `${shape}-${color}-${size}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const inner = shape === 'circle'
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="#fff" stroke-width="2.5"/>`
    : `<path d="${shapePath(shape, size)}" fill="${color}" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>`;

  const icon = L.divIcon({
    className: '',
    html: `<div style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));width:${size}px;height:${size}px;">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${inner}</svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

const starIconCache = new Map<number, L.DivIcon>();

// Marker "prioritario" (contorno oro, interno fucsia), dimensione variabile
// in base alla taglia scelta in Impostazioni. Sempre uguale a se stesso a
// parita' di taglia, quindi cache per non ricrearlo per ogni contatto.
export function priorityStarDivIcon(size = 24): L.DivIcon {
  const cached = starIconCache.get(size);
  if (cached) return cached;
  const icon = L.divIcon({
    className: '',
    html: `<div style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.45));width:${size}px;height:${size}px;">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"
          fill="#d946ef" stroke="#facc15" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
  starIconCache.set(size, icon);
  return icon;
}
