// Palette colore accento personalizzabili per sezione. I valori numerici
// ricalcano le shade standard di Tailwind, cosi' il colore di default
// ("indigo") resta visivamente identico a quello storico dell'app.
export type AccentPaletteKey = 'indigo' | 'emerald' | 'sky' | 'rose' | 'amber' | 'violet' | 'cyan' | 'orange';

export const ACCENT_PALETTES: Record<AccentPaletteKey, Record<number, string>> = {
  indigo:  { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
  sky:     { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
  rose:    { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
  amber:   { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
  violet:  { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
  cyan:    { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
  orange:  { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
};

export const ACCENT_PALETTE_LABELS: Record<AccentPaletteKey, string> = {
  indigo: 'Indaco',
  emerald: 'Smeraldo',
  sky: 'Azzurro',
  rose: 'Rosa',
  amber: 'Ambra',
  violet: 'Viola',
  cyan: 'Ciano',
  orange: 'Arancio',
};

// Sezioni della sidebar personalizzabili singolarmente (esclude Impostazioni,
// Login/Onboarding e gli elementi globali come toast/banner, che restano fissi).
export const ACCENT_SECTIONS: { id: string; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'deals', label: 'Pipeline' },
  { id: 'strategia', label: 'Strategia' },
  { id: 'contacts', label: 'Clienti' },
  { id: 'offers', label: 'Offerte' },
  { id: 'products', label: 'Prodotti' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'attivita', label: 'Attività' },
  { id: 'map', label: 'Mappa' },
  { id: 'todo', label: 'To Do' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'storico', label: 'Storico' },
  { id: 'legal', label: 'Legal' },
];

// Alias: view interne che condividono il colore di una sezione della sidebar.
export const ACCENT_SECTION_ALIAS: Record<string, string> = {
  'map-full': 'map',
  prospecting: 'deals',
};

// --- Colore libero: l'utente sceglie qualsiasi colore da un color picker
// nativo e qui generiamo l'intera scala 50-900 partendo da quell'hex,
// cosi' bottoni/badge/evidenziazioni restano leggibili in ogni shade.
function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Curva di luminosita' target per ciascuna shade, calibrata sulle palette
// Tailwind (es. indigo-500 ~ L 65%, indigo-900 ~ L 27%).
const SHADE_LIGHTNESS: Record<number, number> = {
  50: 96, 100: 92, 200: 83, 300: 72, 400: 62, 500: 55, 600: 47, 700: 39, 800: 31, 900: 23,
};

export function shadesFromHex(hex: string): Record<number, string> {
  const [h, s] = hexToHsl(hex);
  const sat = Math.max(s, 45); // evita grigi piatti se l'utente sceglie un colore poco saturo
  const shades: Record<number, string> = {} as Record<number, string>;
  for (const shade of Object.keys(SHADE_LIGHTNESS)) {
    shades[Number(shade)] = hslToHex(h, sat, SHADE_LIGHTNESS[Number(shade)]);
  }
  return shades;
}

export function cssVarsForPalette(value: string | undefined): Record<string, string> {
  let palette: Record<number, string>;
  if (!value) {
    palette = ACCENT_PALETTES.indigo;
  } else if (value.startsWith('#')) {
    palette = shadesFromHex(value);
  } else {
    palette = ACCENT_PALETTES[value as AccentPaletteKey] || ACCENT_PALETTES.indigo;
  }
  const vars: Record<string, string> = {};
  for (const shade of Object.keys(palette)) vars[`--accent-${shade}`] = palette[Number(shade)];
  return vars;
}

// Colore "rappresentativo" (shade 600) da mostrare come anteprima/valore
// corrente nell'input color, sia per i vecchi preset sia per un hex libero.
export function representativeColor(value: string | undefined): string {
  if (!value) return ACCENT_PALETTES.indigo[600];
  if (value.startsWith('#')) return value;
  return (ACCENT_PALETTES[value as AccentPaletteKey] || ACCENT_PALETTES.indigo)[600];
}

export type FontFamilyKey = 'sans' | 'serif' | 'rounded' | 'mono';

export const FONT_STACKS: Record<FontFamilyKey, string> = {
  sans: `'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  serif: `'Lora', Georgia, Cambria, 'Times New Roman', serif`,
  rounded: `'Quicksand', ui-rounded, -apple-system, sans-serif`,
  mono: `'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace`,
};

export const FONT_LABELS: Record<FontFamilyKey, string> = {
  sans: 'Moderno',
  serif: 'Classico',
  rounded: 'Arrotondato',
  mono: 'Tecnico',
};
