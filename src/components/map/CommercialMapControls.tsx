import L from 'leaflet';
import type { Contact, ActivityOutcome } from '../../types';
import { HEAT_COLORS, HEAT_LABELS, type MapHeat, type MapInsight } from './commercialMap';
import type { MapViewModel } from './useMapView';

const icons = new Map<string, L.DivIcon>();
export function commercialIcon(heat: MapHeat, size: number, selected: boolean): L.DivIcon {
  const width = Math.max(28, size + 6);
  const key = `${heat}-${width}-${selected}`;
  const cached = icons.get(key);
  if (cached) return cached;
  const symbol = selected ? '✓' : heat === 'hot' ? '!' : heat === 'warm' ? '•' : heat === 'cold' ? '−' : '?';
  const icon = L.divIcon({ className: '', html: `<div style="width:${width}px;height:${width}px;border-radius:50%;background:${HEAT_COLORS[heat]};border:3px solid white;box-shadow:0 2px 7px #0007;display:flex;align-items:center;justify-content:center;color:white;font:bold ${Math.round(width * .55)}px/1 sans-serif">${symbol}</div>`, iconSize: [width, width], iconAnchor: [width / 2, width / 2], popupAnchor: [0, -width / 2] });
  icons.set(key, icon);
  return icon;
}

export function commercialGroupColor(items: { id: string }[], insights: Map<string, MapInsight>): string {
  const heats = new Set(items.map(item => insights.get(item.id)?.heat || 'unknown'));
  const heat = (['hot', 'warm', 'cold', 'unknown'] as const).find(item => heats.has(item)) || 'unknown';
  return HEAT_COLORS[heat];
}

export function CommercialContact({ contact, insight, v }: { contact: Contact; insight?: MapInsight; v: MapViewModel }) {
  const selected = v.routeSelection.includes(contact.id);
  const heat = insight?.heat || 'unknown';
  const suspended = insight?.suppressed;
  const visit = insight?.visit;
  return <div className="space-y-2 text-left">
    <div className="flex items-center gap-2"><span style={{ background: HEAT_COLORS[heat] }} className="h-2.5 w-2.5 rounded-full shrink-0" /><span className="text-xs font-semibold text-foreground">{HEAT_LABELS[heat]}</span></div>
    <button type="button" className="block text-sm font-semibold text-foreground text-left" onClick={() => v.onNavigateToContact(contact.id)}>{contact.company}</button>
    <p className="text-xs text-secondary">{insight?.reason || 'Nessun segnale commerciale sufficiente'}{contact.city ? ` · ${contact.city}` : ''}</p>
    {visit && !visit.outcomeType && <label className="block text-xs text-secondary">Com’è andata l’ultima visita?
      <select aria-label={`Esito visita ${contact.company}`} defaultValue="" onChange={e => { if (e.target.value) v.updateActivity(visit.id, { outcomeType: e.target.value as ActivityOutcome }); }} className="mt-1 block w-full rounded-md border border-line bg-surface p-2 text-foreground">
        <option value="">Scegli esito</option><option value="riuscita">Interessato / visita positiva</option><option value="promessa-callback">Da ricontattare</option><option value="parziale">Nessuna opportunità per ora</option><option value="rifiuto">Non interessato</option>
      </select>
    </label>}
    <div className="flex flex-wrap gap-2 border-t border-line pt-2">
      <button type="button" className="rounded-md bg-action px-2.5 py-2 text-xs font-semibold text-action-foreground" onClick={() => v.toggleRouteContact(contact.id)}>{selected ? '✓ Nel giro' : '+ Aggiungi al giro'}</button>
      <button type="button" className="rounded-md bg-raised px-2.5 py-2 text-xs font-semibold text-foreground" onClick={() => v.onNavigateToContact(contact.id)}>Apri cliente</button>
    </div>
    {suspended ? <button type="button" className="text-xs font-semibold text-accent" onClick={() => v.updateContact(contact.id, { mapSuggestionHidden: false, mapSuggestionSnoozeUntil: 0 })}>Ripristina suggerimenti</button> : <div className="flex flex-wrap gap-3"><button type="button" className="text-xs text-secondary" onClick={() => v.updateContact(contact.id, { mapSuggestionSnoozeUntil: Date.now() + 30 * 86400000 })}>Rimanda 30 giorni</button><button type="button" className="text-xs text-secondary" onClick={() => v.updateContact(contact.id, { mapSuggestionHidden: true })}>Non suggerire</button></div>}
  </div>;
}

export function CommercialMapControls({ v, fullscreen = false }: { v: MapViewModel; fullscreen?: boolean }) {
  return <>
    <div className={`absolute z-[900] flex flex-wrap gap-2 ${fullscreen ? 'bottom-36 left-3 right-14' : 'top-3 left-14 right-3'}`}>
      <button type="button" aria-pressed={v.suggestedOnly} onClick={() => v.setSuggestedOnly(!v.suggestedOnly)} className={`rounded-full px-3 py-2 text-xs font-semibold shadow-panel ${v.suggestedOnly ? 'bg-action text-action-foreground' : 'bg-surface text-foreground'}`}>{v.suggestedOnly ? '✓ Consigliati' : 'Tutti · Consigliati'}</button>
      {v.routeSelection.length > 0 && <button type="button" onClick={v.createSuggestedRoute} className="rounded-full bg-action px-3 py-2 text-xs font-semibold text-action-foreground shadow-panel">Crea giro · {v.routeSelection.length}</button>}
    </div>
    <div aria-label="Legenda priorità commerciali" className={`absolute z-[400] flex flex-wrap gap-x-2 gap-y-1 rounded-md bg-surface/95 px-2.5 py-2 shadow-panel pointer-events-none ${fullscreen ? 'bottom-24 left-28 right-14' : 'bottom-16 left-3 right-16'}`}>
      {(['hot', 'warm', 'cold', 'unknown'] as const).map(heat => <span key={heat} className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground"><span style={{ background: HEAT_COLORS[heat] }} className="h-2 w-2 rounded-full" />{heat === 'hot' ? 'Presto' : heat === 'warm' ? 'Coltivare' : heat === 'cold' ? 'Freddi' : 'Da valutare'}</span>)}
    </div>
  </>;
}
