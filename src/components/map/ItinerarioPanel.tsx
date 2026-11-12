import { Navigation, X, RotateCcw, Home, CalendarCheck } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { HOME, SortableTappa } from './itinerarioShared';
import { ItinerarioModel } from './useItinerario';

export function ItinerarioPanel({ v }: { v: ItinerarioModel }) {
  const { contacts, selectedIds, setSelectedIds, startTime, setStartTime, visitDuration, setVisitDuration, savedToAgenda, setCustomTimes, manualOrder, setManualOrder, toggle, dndSensors, handleDragEnd, legs, effectiveTimes, googleMapsUrl, addToAgenda } = v;
  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Scrollabile */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
          {selectedIds.length === 0 ? (
            <p className="text-xs text-muted text-center py-6 font-bold">
              Tocca i clienti sulla mappa per costruire l'itinerario
            </p>
          ) : (
            <>
              {/* Partenza */}
              <div className="flex items-center gap-3 bg-accent-soft dark:bg-accent-soft/20 rounded-panel px-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-action flex items-center justify-center flex-shrink-0">
                  <Home size={13} className="text-action-foreground" />
                </div>
                <p className="text-xs font-semibold text-accent dark:text-accent truncate">{HOME.label}</p>
              </div>

              {/* Tappe — drag & drop */}
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={legs.map(l => l.stop.id)} strategy={verticalListSortingStrategy}>
                  {legs.map(({ stop, legDist, cumDist }, i) => {
                    const c = contacts[stop.id];
                    const et = effectiveTimes[i];
                    return (
                      <SortableTappa key={stop.id} id={stop.id}>
                        <div className="w-7 h-7 rounded-full bg-warning text-status-foreground flex items-center justify-center flex-shrink-0 text-xs font-semibold">{i + 1}</div>

                        {/* Orario editabile */}
                        <div className="flex-shrink-0">
                          <input
                            type="time"
                            min="08:00"
                            max="18:00"
                            value={et?.effective ?? ''}
                            onChange={e => setCustomTimes(prev => ({ ...prev, [stop.id]: e.target.value }))}
                            className={`w-[72px] text-xs font-semibold rounded-lg px-1.5 py-1 outline-none border transition-colors ${
                              et?.isCustom
                                ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent'
                                : 'border-line dark:border-line bg-surface dark:bg-raised text-foreground dark:text-muted'
                            }`}
                          />
                          {et?.isCustom && (
                            <button
                              onClick={() => setCustomTimes(prev => { const n = { ...prev }; delete n[stop.id]; return n; })}
                              className="block text-xs text-muted hover:text-accent font-bold mt-0.5 pl-1"
                            >↩ reset</button>
                          )}
                        </div>

                        {/* Info cliente */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold dark:text-foreground uppercase leading-tight break-words">{c?.company}</p>
                          <p className="text-xs text-muted font-bold">+{legDist.toFixed(0)} km · {cumDist.toFixed(0)} km tot</p>
                        </div>

                        <button onClick={() => toggle(stop.id)} className="text-muted hover:text-danger flex-shrink-0"><X size={14} /></button>
                      </SortableTappa>
                    );
                  })}
                </SortableContext>
              </DndContext>

              {/* Reset ordine automatico */}
              {manualOrder && (
                <button
                  onClick={() => setManualOrder(null)}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold text-accent hover:text-accent uppercase tracking-wider transition-colors"
                >
                  <RotateCcw size={11} /> Ottimizza ordine automatico
                </button>
              )}

              {/* Impostazioni orario */}
              <div className="bg-canvas dark:bg-surface/60 rounded-panel px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-normal">Impostazioni giornata</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted font-bold mb-1">Partenza</p>
                    <input type="time" min="08:00" max="18:00" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full bg-surface dark:bg-raised border border-line dark:border-line rounded-md px-3 py-2 text-sm font-semibold text-foreground dark:text-foreground outline-none" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted font-bold mb-1">Durata visita</p>
                    <select value={visitDuration} onChange={e => setVisitDuration(Number(e.target.value))}
                      className="w-full bg-surface dark:bg-raised border border-line dark:border-line rounded-md px-3 py-2 text-sm font-semibold text-foreground dark:text-foreground outline-none">
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 ora</option>
                      <option value={90}>1h 30min</option>
                      <option value={120}>2 ore</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-muted">Gli orari si calcolano automaticamente. Modificali direttamente su ogni tappa — le tappe successive si adattano.</p>
              </div>

              {/* Google Maps */}
              <a href={googleMapsUrl} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-panel bg-raised dark:bg-raised hover:bg-raised dark:hover:bg-raised text-foreground dark:text-muted font-semibold text-sm uppercase tracking-wide transition-all">
                <Navigation size={15} /> Apri in Google Maps
              </a>
              <button onClick={() => setSelectedIds([])} className="w-full py-2 text-xs text-danger font-bold hover:text-danger transition-colors">
                Azzera itinerario
              </button>
            </>
          )}
        </div>

        {/* Footer sticky con CTA */}
        {selectedIds.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-line dark:border-line">
            <button onClick={addToAgenda}
              className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-panel font-semibold text-sm uppercase tracking-wide transition-all shadow-panel ${
                savedToAgenda ? 'bg-success text-status-foreground' : 'bg-action active:bg-action text-action-foreground'
              }`}>
              <CalendarCheck size={17} />
              {savedToAgenda ? '✓ Salvato in Agenda!' : "Aggiungi all'Agenda"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
