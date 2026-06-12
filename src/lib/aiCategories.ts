export interface AIClassification {
  categoria: string;
  motivazione: string;
  priorita: 'alta' | 'media' | 'bassa';
}

export const AI_CATEGORIES = [
  'Cliente Premium',
  'Cliente Attivo',
  'Cliente a Rischio',
  'Dealer Strategico',
  'Prospect Caldo',
  'Prospect Freddo',
] as const;

export type AICategory = typeof AI_CATEGORIES[number];

interface CategoryStyle {
  bg: string;
  text: string;
  mapColor: string;
  emoji: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  'Cliente Premium':   { bg: 'bg-indigo-100 dark:bg-indigo-900/40',  text: 'text-indigo-700 dark:text-indigo-300',  mapColor: '#3730a3', emoji: '⭐' },
  'Cliente Attivo':    { bg: 'bg-blue-100 dark:bg-blue-900/40',      text: 'text-blue-700 dark:text-blue-300',      mapColor: '#2563eb', emoji: '✅' },
  'Cliente a Rischio': { bg: 'bg-red-100 dark:bg-red-900/40',        text: 'text-red-700 dark:text-red-300',        mapColor: '#ef4444', emoji: '⚠️' },
  'Dealer Strategico': { bg: 'bg-purple-100 dark:bg-purple-900/40',  text: 'text-purple-700 dark:text-purple-300',  mapColor: '#7c3aed', emoji: '🏪' },
  'Prospect Caldo':    { bg: 'bg-orange-100 dark:bg-orange-900/40',  text: 'text-orange-700 dark:text-orange-300',  mapColor: '#f97316', emoji: '🔥' },
  'Prospect Freddo':   { bg: 'bg-gray-100 dark:bg-gray-700',         text: 'text-gray-600 dark:text-gray-300',      mapColor: '#9ca3af', emoji: '❄️' },
};

const FALLBACK_STYLE: CategoryStyle = {
  bg: 'bg-gray-100 dark:bg-gray-700',
  text: 'text-gray-500 dark:text-gray-400',
  mapColor: '#9ca3af',
  emoji: '🏷️',
};

export function parseClassification(raw?: string | null): AIClassification | null {
  if (!raw) return null;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (parsed.categoria && parsed.motivazione) return parsed as AIClassification;
    return null;
  } catch {
    return null;
  }
}

export function getCategoryStyle(categoria: string): CategoryStyle {
  return CATEGORY_STYLES[categoria] ?? FALLBACK_STYLE;
}
