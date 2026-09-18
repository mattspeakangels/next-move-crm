// Settori di riferimento predefiniti per i contatti. L'elenco puo' essere
// esteso dall'utente (settori mancanti) da Impostazioni -> customSectors
// nello store, senza toccare questo file.
export const DEFAULT_SECTORS: string[] = [
  'Edilizia',
  'Industria',
  'Idraulica',
  'Elettricista',
  'Ferramenta',
  'Trasporti e logistica',
  'Agricoltura',
  'Servizi',
  'Energia e utilities',
  'Altro',
];

export const SECTOR_LABELS: Record<string, string> = {
  'Edilizia': 'Edilizia / Costruzioni',
  'Industria': 'Industria / Manifattura',
  'Idraulica': 'Idraulica / Termoidraulica',
  'Elettricista': 'Elettricista / Impianti Elettrici',
  'Ferramenta': 'Ferramenta / Antinfortunistica',
  'Trasporti e logistica': 'Trasporti e Logistica',
  'Agricoltura': 'Agricoltura / Forestale',
  'Servizi': 'Servizi',
  'Energia e utilities': 'Energia e Utilities',
  'Altro': 'Altro',
};

export function sectorLabel(sector: string): string {
  return SECTOR_LABELS[sector] || sector;
}

export function allSectors(customSectors: string[]): string[] {
  const extra = customSectors.filter(s => !DEFAULT_SECTORS.includes(s));
  return [...DEFAULT_SECTORS.filter(s => s !== 'Altro'), ...extra, 'Altro'];
}
