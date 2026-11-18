import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import type { ActivityOutcome, Contact } from '../../types';
import { calculateDistance, hasCoords } from './mapShared';
import { buildVisitSuggestions } from './commercialPriority';

interface Props {
  contacts: Contact[];
  userPos: [number, number] | null;
  radius: number;
  onOpenContact: (id: string) => void;
  onShowMap: (contact: Contact) => void;
  onCreateRoute: (ids: string[]) => void;
}

export function VisitSuggestions({ contacts, userPos, radius, onOpenContact, onShowMap, onCreateRoute }: Props) {
  const { activities, deals, todos, updateContact, updateActivity } = useStore();
  const [open, setOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const now = Date.now();
  const distance = (c: Contact) => userPos && hasCoords(c) ? calculateDistance(userPos[0], userPos[1], c.lat, c.lng) : null;
  const suggestions = useMemo(() => buildVisitSuggestions(contacts, Object.values(activities), Object.values(deals), Object.values(todos), now, distance), [contacts, activities, deals, todos, userPos]);
  const nearby = userPos ? suggestions.filter(s => s.distKm !== null && s.distKm <= radius) : suggestions;
  const hidden = contacts.filter(c => c.mapSuggestionHidden || (c.mapSuggestionSnoozeUntil || 0) > now);
  const missing = useMemo(() => {
    const latest = Object.values(activities).filter(a => ['visita', 'visita-freddo', 'sopralluogo'].includes(a.type) && a.date <= now && a.outcome !== 'da-fare').sort((a, b) => b.date - a.date);
    const seen = new Set<string>();
    const contactIds = new Set(contacts.map(c => c.id));
    return latest.filter(a => { if (seen.has(a.contactId)) return false; seen.add(a.contactId); return !a.outcomeType && contactIds.has(a.contactId); }).slice(0, 10);
  }, [activities, contacts]);
  const visibleIds = new Set(nearby.map(s => s.contact.id));
  const chosen = selected.filter(id => visibleIds.has(id));
  const outcome = (id: string, value: string) => { if (value) updateActivity(id, { outcomeType: value as ActivityOutcome }); };
  return <section className="mb-2 flex-shrink-0 rounded-panel border border-line bg-surface">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 p-3 text-left text-sm font-semibold text-foreground">
      <span>🎯 Visite consigliate <span className="text-muted">({nearby.length}{userPos ? ` entro ${radius} km` : ''})</span></span><span>{open ? '−' : '+'}</span>
    </button>
    {open && <div className="max-h-[50vh] overflow-y-auto border-t border-line p-3 space-y-3">
      {!userPos && <p className="text-xs text-muted">Posizione non disponibile: mostro i suggerimenti senza filtro distanza.</p>}
      {nearby.length === 0 && <p className="text-sm text-muted">Nessun suggerimento con i dati e i filtri attuali. Registra l’esito delle visite o una prossima azione.</p>}
      {nearby.slice(0, 50).map(({contact, reason, score, distKm}) => <div key={contact.id} className="rounded-md bg-raised p-3 space-y-2">
        <div className="flex items-start gap-2"><input aria-label={`Seleziona ${contact.company} per il giro`} type="checkbox" checked={chosen.includes(contact.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, contact.id] : prev.filter(id => id !== contact.id))} className="mt-1" />
          <button type="button" onClick={() => onOpenContact(contact.id)} className="flex-1 text-left"><span className="block text-sm font-semibold text-foreground">{contact.company}</span><span className="text-xs text-muted">{contact.city || 'Località non indicata'}{distKm !== null ? ` · ${distKm.toFixed(0)} km` : ''}</span></button>
          <span className="text-xs font-semibold text-accent">{score >= 75 ? 'Da rivedere' : 'Da coltivare'}</span></div>
        <p className="text-xs text-secondary">{reason}</p>
        <div className="flex flex-wrap gap-2"><button type="button" className="text-xs font-semibold text-accent" onClick={() => { onShowMap(contact); setOpen(false); }}>Vedi sulla mappa</button><button type="button" className="text-xs font-semibold text-accent" onClick={() => updateContact(contact.id, { mapSuggestionSnoozeUntil: Date.now() + 30 * 86400000 })}>Rimanda 30 giorni</button><button type="button" className="text-xs font-semibold text-muted" onClick={() => updateContact(contact.id, { mapSuggestionHidden: true })}>Non suggerire</button></div>
      </div>)}
      {nearby.length > 50 && <p className="text-xs text-muted">Mostrati i primi 50 suggerimenti. Restringi i filtri per vedere gli altri.</p>}
      {chosen.length > 0 && <button type="button" onClick={() => { onCreateRoute(chosen); setSelected([]); }} className="w-full rounded-md bg-accent p-3 text-sm font-semibold text-white">Crea giro con {chosen.length} {chosen.length === 1 ? 'cliente' : 'clienti'}</button>}
      {missing.length > 0 && <details><summary className="text-sm font-semibold text-foreground cursor-pointer">Completa l’esito delle ultime visite ({missing.length})</summary><div className="space-y-2 mt-2">{missing.map(a => <label key={a.id} className="block text-xs text-secondary">{contacts.find(c => c.id === a.contactId)?.company} · {new Date(a.date).toLocaleDateString('it-IT')}<select defaultValue="" onChange={e => outcome(a.id, e.target.value)} className="block w-full mt-1 rounded-md border border-line bg-surface p-2 text-foreground"><option value="">Scegli esito</option><option value="riuscita">Interessato / visita positiva</option><option value="promessa-callback">Da ricontattare</option><option value="parziale">Nessuna opportunità per ora</option><option value="rifiuto">Non interessato</option></select></label>)}</div></details>}
      {hidden.length > 0 && <details open={showHidden} onToggle={e => setShowHidden(e.currentTarget.open)}><summary className="text-sm font-semibold text-foreground cursor-pointer">Suggerimenti sospesi ({hidden.length})</summary><div className="space-y-2 mt-2">{hidden.map(c => <div key={c.id} className="flex justify-between gap-2 text-xs"><span>{c.company}{!c.mapSuggestionHidden && c.mapSuggestionSnoozeUntil ? ` · fino al ${new Date(c.mapSuggestionSnoozeUntil).toLocaleDateString('it-IT')}` : ''}</span><button type="button" className="text-accent font-semibold" onClick={() => updateContact(c.id, { mapSuggestionHidden: false, mapSuggestionSnoozeUntil: 0 })}>Ripristina</button></div>)}</div></details>}
    </div>}
  </section>;
}
