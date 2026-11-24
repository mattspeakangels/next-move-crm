import type { Activity, Contact, Deal, TodoItem } from '../../types';
import { buildVisitSuggestions } from './commercialPriority';

export type MapHeat = 'hot' | 'warm' | 'cold' | 'unknown';
export type MapInsight = { heat: MapHeat; reason: string; visit?: Activity; suppressed: boolean };
export const HEAT_COLORS: Record<MapHeat, string> = { hot: '#d83d35', warm: '#e28a21', cold: '#5080a6', unknown: '#89949e' };
/** I clienti (già acquisiti) sono sempre verdi; se sono anche "da visitare presto" hanno il bordo rosso. */
export const CLIENT_COLOR = '#2e9e4f';
export function markerColor(c: { id: string; status?: string }, insights: Map<string, MapInsight>): string {
  return c.status === 'cliente' ? CLIENT_COLOR : HEAT_COLORS[insights.get(c.id)?.heat || 'unknown'];
}
export const HEAT_LABELS: Record<MapHeat, string> = { hot: 'Da visitare presto', warm: 'Da coltivare', cold: 'Bassa priorità', unknown: 'Da valutare' };

export function buildMapInsights(contacts: Contact[], activities: Activity[], deals: Deal[], todos: TodoItem[], now: number): Map<string, MapInsight> {
  const suggestions = new Map(buildVisitSuggestions(contacts, activities, deals, todos, now, () => null).map(s => [s.contact.id, s]));
  const visits = new Map<string, Activity>();
  for (const activity of activities) {
    if (!['visita', 'visita-freddo', 'sopralluogo'].includes(activity.type) || activity.date > now || activity.outcome === 'da-fare') continue;
    for (const id of new Set([activity.contactId, ...(activity.contactIds || [])])) {
      if (!visits.has(id) || visits.get(id)!.date < activity.date) visits.set(id, activity);
    }
  }
  const result = new Map<string, MapInsight>();
  for (const c of contacts) {
    const visit = visits.get(c.id);
    const suppressed = !!c.mapSuggestionHidden || (c.mapSuggestionSnoozeUntil || 0) > now;
    const suggestion = suggestions.get(c.id);
    if (suggestion) result.set(c.id, { heat: suggestion.score >= 75 ? 'hot' : 'warm', reason: suggestion.reason, visit, suppressed });
    else if (suppressed) result.set(c.id, { heat: 'cold', reason: c.mapSuggestionHidden ? 'Suggerimento disattivato' : 'Suggerimento rimandato', visit, suppressed });
    else if (c.prospectingStato === 'scartato' || (c.prospectingStato === 'in_pausa' && (!c.prospectingDataRisveglio || c.prospectingDataRisveglio > now)) || visit?.outcomeType === 'rifiuto' || visit?.outcomeType === 'parziale') result.set(c.id, { heat: 'cold', reason: c.prospectingStato === 'scartato' ? 'Prospect scartato' : (c.prospectingStato === 'in_pausa' && (!c.prospectingDataRisveglio || c.prospectingDataRisveglio > now)) ? 'Prospect in pausa' : visit?.outcomeType === 'rifiuto' ? 'Ultima visita: non interessato' : 'Ultima visita: nessuna opportunità per ora', visit, suppressed });
    else result.set(c.id, { heat: 'unknown', reason: visit ? 'Esito da valutare' : 'Nessun segnale commerciale sufficiente', visit, suppressed });
  }
  return result;
}
