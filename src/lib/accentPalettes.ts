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

export function cssVarsForPalette(key: AccentPaletteKey | undefined): Record<string, string> {
  const palette = ACCENT_PALETTES[key || 'indigo'];
  const vars: Record<string, string> = {};
  for (const shade of Object.keys(palette)) vars[`--accent-${shade}`] = palette[Number(shade)];
  return vars;
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
