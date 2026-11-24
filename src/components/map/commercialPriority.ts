import type { Activity, Contact, Deal, TodoItem } from '../../types';

export interface VisitSuggestion { contact: Contact; score: number; reason: string; visit?: Activity; distKm: number | null }
const DAY = 86400000;

// I segnali sono espliciti: una visita senza esito non equivale a interesse.
export function buildVisitSuggestions(contacts: Contact[], activities: Activity[], deals: Deal[], todos: TodoItem[], now: number, distance: (c: Contact) => number | null): VisitSuggestion[] {
  const visits = new Map<string, Activity>();
  for (const a of activities) {
    if (!['visita', 'visita-freddo', 'sopralluogo'].includes(a.type) || a.date > now || a.outcome === 'da-fare') continue;
    for (const id of new Set([a.contactId, ...(a.contactIds || [])])) {
      if (!visits.has(id) || visits.get(id)!.date < a.date) visits.set(id, a);
    }
  }
  const openDeals = new Map<string, Deal[]>();
  for (const d of deals) if (!['chiuso-vinto', 'chiuso-perso'].includes(d.stage)) openDeals.set(d.contactId, [...(openDeals.get(d.contactId) || []), d]);
  const openTodos = new Map<string, TodoItem[]>();
  for (const t of todos) if (t.contactId && t.status === 'da-fare' && t.scadenza) openTodos.set(t.contactId, [...(openTodos.get(t.contactId) || []), t]);
  return contacts.flatMap(contact => {
    if (contact.mapSuggestionHidden || (contact.mapSuggestionSnoozeUntil || 0) > now || contact.prospectingStato === 'scartato' || (contact.prospectingStato === 'in_pausa' && (!contact.prospectingDataRisveglio || contact.prospectingDataRisveglio > now))) return [];
    const visit = visits.get(contact.id);
    if (visit?.outcomeType === 'rifiuto') return [];
    const reasons: { score: number; reason: string }[] = [];
    if (contact.priorityToVisit) reasons.push({ score: 90, reason: 'Segnalato da te come prioritario' });
    for (const t of openTodos.get(contact.id) || []) {
      const due = new Date(`${t.scadenza}T23:59:59`).getTime();
      if (Number.isFinite(due) && due <= now + 7 * DAY) reasons.push({ score: due < now ? 100 : 80, reason: `${due < now ? 'Attività scaduta' : 'Attività in scadenza'}: ${t.titolo}` });
    }
    for (const d of openDeals.get(contact.id) || []) {
      if (d.nextActionDeadline && d.nextActionDeadline <= now + 7 * DAY && d.nextAction) reasons.push({ score: d.nextActionDeadline < now ? 100 : 80, reason: `Prossima azione: ${d.nextAction}` });
      else if (visit?.outcomeType !== 'parziale') reasons.push({ score: 60, reason: 'Trattativa aperta' });
    }
    if (visit && ['richiesta-offerta', 'appuntamento-fissato', 'promessa-callback'].includes(visit.outcomeType || '')) reasons.push({ score: 75, reason: `Ultima visita: ${visit.outcomeType === 'richiesta-offerta' ? 'richiesta offerta' : visit.outcomeType === 'appuntamento-fissato' ? 'appuntamento fissato' : 'richiamare'}` });
    else if (visit && ['riuscita', 'parlato-decisore'].includes(visit.outcomeType || '')) reasons.push({ score: 45, reason: 'Ultima visita con esito positivo' });
    if (!reasons.length) return [];
    reasons.sort ( (a, b) => b.score - a.score );
    return [{ contact, score: reasons[0].score, reason: reasons[0].reason, visit, distKm: distance(contact) }];
  }).sort((a, b) => b.score - a.score || (a.distKm ?? Infinity) - (b.distKm ?? Infinity) || a.contact.company.localeCompare(b.contact.company));
}
