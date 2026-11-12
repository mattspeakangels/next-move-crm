import { DialogFrame } from '../ui/DialogFrame';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import { useStore } from '../../store/useStore';
import { ContactSegment } from '../../types';
import { Navigation, X, SlidersHorizontal, RotateCcw, Route, Home, CalendarCheck, GripVertical, Star, Eye, EyeOff } from 'lucide-react';
import L from 'leaflet';
import { MapBaseLayer, MapStyleButton } from '../ui/MapStyleControl';
import { SearchDropdown } from '../ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../../utils/search';
import { MarkerShape, shapeDivIcon, priorityStarDivIcon, MARKER_ICON_PX, MARKER_CIRCLE_RADIUS } from '../../lib/markerShapes';
import { sectorLabel } from '../../lib/sectors';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { resolveMarkerStyle, contactMarkerStyle, userIcon, FlyToContact, LocateButton, requestPosition, calculateDistance } from './mapShared';

// Itinerario del giorno: tappe ordinabili, percorso ottimizzato, mappa e foglio inferiore.
// ── Itinerario ────────────────────────────────────────────────────────────────

export const HOME = { lat: 45.5386, lng: 9.0667, label: 'Casa — Via Don Bianchi, Rho' };
export const AVG_SPEED_KMH = 70; // velocità media stradale stimata

// Chiave YYYY-MM-DD in orario locale, per confrontare un timestamp con il valore di un <input type="date">
export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtTime(km: number): string {
  const mins = Math.round((km / AVG_SPEED_KMH) * 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function nearestNeighbor(
  stops: { id: string; lat: number; lng: number }[],
): { id: string; lat: number; lng: number }[] {
  const unvisited = [...stops];
  const route: typeof stops = [];
  let curLat = HOME.lat, curLng = HOME.lng;
  while (unvisited.length > 0) {
    let minD = Infinity, minI = 0;
    unvisited.forEach((s, i) => {
      const d = calculateDistance(curLat, curLng, s.lat, s.lng);
      if (d < minD) { minD = d; minI = i; }
    });
    route.push(unvisited[minI]);
    curLat = unvisited[minI].lat;
    curLng = unvisited[minI].lng;
    unvisited.splice(minI, 1);
  }
  return route;
}

export const homeIcon = L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#c08d62;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
  </div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
});

export const stopIcon = (n: number) => L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#176f77;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:white;font-family:sans-serif;">${n}</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});


// Componente sortable per singola tappa — drag handle visibile
export const SortableTappa = React.memo(function SortableTappa({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-canvas dark:bg-surface rounded-panel px-3 py-2 flex items-center gap-2 select-none ${isDragging ? 'opacity-50 shadow-panel z-50 ring-2 ring-warning' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-muted hover:text-secondary cursor-grab active:cursor-grabbing touch-none"
        tabIndex={-1}
        aria-label="Trascina per riordinare"
      >
        <GripVertical size={15} />
      </button>
      {children}
    </div>
  );
});

// Vista fullscreen itinerario: mappa + bottom sheet
// Chiama map.invalidateSize() quando la mappa torna visibile dopo display:none
export const SizeInvalidator: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const map = useMap();
  useEffect(() => {
    if (isVisible) setTimeout(() => map.invalidateSize(), 50);
  }, [isVisible, map]);
  return null;
};

export interface ItinerarioViewProps {
  contacts: Record<string, any>;
  onClose: () => void;
  isVisible: boolean;
  // Data richiesta dall'esterno (es. dall'Agenda, "Vedi itinerario" per un giorno specifico).
  // `nonce` cambia ad ogni richiesta cosi' da poter ri-applicare anche la stessa data.
  requestedDate?: { date: string; nonce: number } | null;
}

export const ItinerarioView: React.FC<ItinerarioViewProps> = ({ contacts, onClose, isVisible, requestedDate }) => {
  const { addActivity, deleteActivity, activities, mapMarkerStyles, mapMarkerSize } = useStore();
  const markerIconPx = MARKER_ICON_PX[mapMarkerSize];
  const markerRadiusPx = MARKER_CIRCLE_RADIUS[mapMarkerSize];
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  // Quando aperto dall'Agenda per un giorno specifico: mostra sulla mappa solo le tappe
  // dell'itinerario di quel giorno, non tutti i clienti/prospect.
  const [onlyRouteOnMap, setOnlyRouteOnMap] = useState(false);
  const lastRequestNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (requestedDate && requestedDate.nonce !== lastRequestNonceRef.current) {
      lastRequestNonceRef.current = requestedDate.nonce;
      setDate(requestedDate.date);
      setOnlyRouteOnMap(true);
    }
  }, [requestedDate]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'tutti' | 'clienti' | 'prospect'>('tutti');
  const [filterSegment, setFilterSegment] = useState<ContactSegment | null>(null);
  const [filterPriorityOnly, setFilterPriorityOnly] = useState(false);
  const [filterProvince, setFilterProvince] = useState<string>('');
  const [filterSector, setFilterSector] = useState<string>('');
  const [showFiltersBar, setShowFiltersBar] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [visitDuration, setVisitDuration] = useState(60);
  const [savedToAgenda, setSavedToAgenda] = useState(false);
  const [customTimes, setCustomTimes] = useState<Record<string, string>>({});
  const [searchItinQuery, setSearchItinQuery] = useState('');
  const [itinFlyTo, setItinFlyTo] = useState<[number, number] | null>(null);
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const [roadRouteCoords, setRoadRouteCoords] = useState<[number, number][]>([]);
  const loadedItinDateRef = useRef<string | null>(null);
  const [itinUserPos, setItinUserPos] = useState<[number, number] | null>(null);
  const [itinLocating, setItinLocating] = useState(false);
  const [itinGeoMsg, setItinGeoMsg] = useState('');

  const locateItin = () => {
    setItinGeoMsg('');
    requestPosition(
      p => {
        setItinUserPos(p);
        setItinFlyTo([...p] as [number, number]);
      },
      msg => {
        setItinGeoMsg(msg);
        setTimeout(() => setItinGeoMsg(''), 6000);
      },
      setItinLocating,
    );
  };

  const allContactsList = useMemo(() => Object.values(contacts), [contacts]);

  const searchItinNorm = useMemo(() => searchItinQuery.trim(), [searchItinQuery]);
  const itinSearchResults = useMemo(() =>
    searchItinNorm.length >= 1
      ? sortByRelevance(searchItinNorm, allContactsList
          .filter((c: any) =>
            c.lat && c.lng &&
            matchSearch(searchItinNorm, [c.company, c.contactName, c.city, c.province])
          ), (c: any) => [c.company, c.contactName])
          .slice(0, 6)
      : [],
    [searchItinNorm, allContactsList]
  );

  const mapped = useMemo(() =>
    Object.values(contacts).filter((c: any) => c.lat && c.lng),
    [contacts]
  );

  const availableProvinces = useMemo(() =>
    [...new Set(mapped.map((c: any) => c.province).filter(Boolean))].sort() as string[]
  , [mapped]);
  const availableSectors = useMemo(() =>
    [...new Set(mapped.map((c: any) => c.sector).filter(Boolean))].sort() as string[]
  , [mapped]);

  const visible = useMemo(() => mapped.filter((c: any) => {
    if (filterStatus === 'clienti' && c.status !== 'cliente') return false;
    if (filterStatus === 'prospect' && c.status !== 'potenziale') return false;
    if (filterSegment && c.segment !== filterSegment) return false;
    if (filterPriorityOnly && c.priorityToVisit !== true) return false;
    if (filterProvince && c.province !== filterProvince) return false;
    if (filterSector && c.sector !== filterSector) return false;
    return true;
  }), [mapped, filterStatus, filterSegment, filterPriorityOnly, filterProvince, filterSector]);

  const itinActiveFilterCount =
    (filterStatus !== 'tutti' ? 1 : 0) +
    (filterSegment ? 1 : 0) +
    (filterProvince ? 1 : 0) +
    (filterSector ? 1 : 0) +
    (filterPriorityOnly ? 1 : 0);

  // In modalita' "solo itinerario" (attivata quando si arriva dall'Agenda per un giorno
  // specifico) la mappa mostra solo le tappe già selezionate, non tutti i clienti/prospect.
  const mapMarkersToShow = useMemo(
    () => onlyRouteOnMap ? visible.filter((c: any) => selectedIds.includes(c.id)) : visible,
    [visible, onlyRouteOnMap, selectedIds]
  );

  const toggle = (id: string) =>
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (next.length > 0) setSheetOpen(true);
      return next;
    });

  const optimizedRoute = useMemo(() =>
    nearestNeighbor(selectedIds.map(id => contacts[id]).filter(Boolean).map((c: any) => ({ id: c.id, lat: c.lat, lng: c.lng }))),
    [selectedIds, contacts]
  );

  // Quando selectedIds cambia, sincronizza manualOrder (aggiungi nuovi in fondo, rimuovi quelli tolti)
  useEffect(() => {
    if (!manualOrder) return;
    const valid = manualOrder.filter(id => selectedIds.includes(id));
    const newIds = selectedIds.filter(id => !manualOrder.includes(id));
    const updated = [...valid, ...newIds];
    setManualOrder(updated.length > 0 ? updated : null);
  }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ripristina l'itinerario per la data corrente a partire dalle attività in Agenda — sia quelle
  // create dall'itinerario stesso (prefisso act_itin_) sia quelle compilate a mano in Agenda
  // (visita/sopralluogo su un cliente mappato): la calendarizzazione è reciproca, un appuntamento
  // fissato in Agenda deve comparire come tappa qui senza dover passare dalla mappa.
  // Non sovrascrive modifiche già in corso: una volta caricato per una data, resta "fermo" finché
  // la data non cambia.
  useEffect(() => {
    if (loadedItinDateRef.current === date) return;
    // Match sulla data reale dell'attività (non sulla data nell'id): se l'appuntamento è stato
    // spostato di giorno dall'Agenda, l'id resta quello originale ma va comunque a comparire
    // nell'itinerario del nuovo giorno, non di quello in cui era stato creato.
    const seenContacts = new Set<string>();
    const saved = Object.values(activities)
      .filter((a: any) =>
        (a.type === 'visita' || a.type === 'sopralluogo') &&
        dateKey(a.date) === date &&
        contacts[a.contactId]?.lat && contacts[a.contactId]?.lng
      )
      .sort((a: any, b: any) => a.date - b.date)
      .filter((a: any) => {
        if (seenContacts.has(a.contactId)) return false; // una sola tappa per cliente/giorno
        seenContacts.add(a.contactId);
        return true;
      });
    if (saved.length === 0) return; // magari Firestore non ha ancora sincronizzato: riprova al prossimo update

    const ids = saved.map((a: any) => a.contactId as string);
    setSelectedIds(ids);
    setManualOrder(ids);
    const times: Record<string, string> = {};
    saved.forEach((a: any) => {
      const d = new Date(a.date);
      times[a.contactId] = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    setCustomTimes(times);
    setSheetOpen(true);
    loadedItinDateRef.current = date;
  }, [date, activities]);

  // Route attiva: manuale (drag) oppure auto-ottimizzata
  const activeRoute = useMemo(() => {
    if (!manualOrder) return optimizedRoute;
    const byId: Record<string, any> = {};
    optimizedRoute.forEach((s: any) => { byId[s.id] = s; });
    const ordered = manualOrder.filter(id => byId[id]).map(id => byId[id]);
    const extras = optimizedRoute.filter((s: any) => !manualOrder.includes(s.id));
    return [...ordered, ...extras];
  }, [optimizedRoute, manualOrder]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentOrder = activeRoute.map((s: any) => s.id as string);
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    setManualOrder(arrayMove(currentOrder, oldIndex, newIndex));
  };

  const legs = useMemo(() => {
    let cum = 0, cumMins = 0, prevLat = HOME.lat, prevLng = HOME.lng;
    return activeRoute.map((s: any) => {
      const d = calculateDistance(prevLat, prevLng, s.lat, s.lng);
      const legMins = Math.round((d / AVG_SPEED_KMH) * 60);
      cum += d; cumMins += legMins;
      prevLat = s.lat; prevLng = s.lng;
      return { stop: s, legDist: d, cumDist: cum, legMins, cumMins };
    });
  }, [activeRoute]);

  const totalKm = legs.length > 0 ? legs[legs.length - 1].cumDist : 0;

  // Orari effettivi per tappa: calcolati ma sovrascrivibili dall'utente
  const effectiveTimes = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    let cursor = sh * 60 + sm;
    return legs.map(({ stop, legDist }) => {
      cursor += Math.round((legDist / AVG_SPEED_KMH) * 60);
      const calcH = Math.floor(cursor / 60), calcM = cursor % 60;
      const calcTime = `${String(calcH).padStart(2,'0')}:${String(calcM).padStart(2,'0')}`;
      const effective = customTimes[stop.id] ?? calcTime;
      const [eh, em] = effective.split(':').map(Number);
      cursor = eh * 60 + em + visitDuration;
      return { stopId: stop.id, calcTime, effective, isCustom: !!customTimes[stop.id] };
    });
  }, [legs, startTime, visitDuration, customTimes]);

  const routeCoords: [number, number][] = useMemo(() =>
    activeRoute.length > 0
      ? [[HOME.lat, HOME.lng], ...activeRoute.map((s: any) => [s.lat, s.lng] as [number, number])]
      : [],
    [activeRoute]
  );

  // Fetch real road geometry from OSRM whenever the route changes
  useEffect(() => {
    if (activeRoute.length === 0) { setRoadRouteCoords([]); return; }
    const waypoints = [[HOME.lng, HOME.lat], ...activeRoute.map((s: any) => [s.lng, s.lat])];
    const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    let cancelled = false;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const geom: [number, number][] = data?.routes?.[0]?.geometry?.coordinates
          ?.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]) ?? [];
        setRoadRouteCoords(geom.length > 0 ? geom : routeCoords);
      })
      .catch(() => { if (!cancelled) setRoadRouteCoords(routeCoords); });
    return () => { cancelled = true; };
  }, [activeRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  const googleMapsUrl = useMemo(() => {
    if (activeRoute.length === 0) return '';
    return `https://www.google.com/maps/dir/${HOME.lat},${HOME.lng}/` +
      activeRoute.map((s: any) => `${s.lat},${s.lng}`).join('/');
  }, [activeRoute]);

  const addToAgenda = () => {
    const baseDate = new Date(`${date}T00:00:00`);
    const label = new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

    // Rimuove le voci di un salvataggio precedente dello stesso itinerario per questo giorno,
    // per evitare doppioni quando si preme più volte "Aggiungi all'Agenda". Si basa sulla data
    // reale dell'attività (non sul prefisso dell'id): se una tappa è stata spostata ad un altro
    // giorno dall'Agenda, il suo id resta quello originale ma non va cancellata da qui.
    // Rimuove anche eventuali visite/sopralluoghi compilati a mano in Agenda per i clienti che
    // fanno parte di questo itinerario (calendarizzazione reciproca: la voce viene sostituita,
    // non duplicata, dalla tappa dell'itinerario).
    const stopIds = new Set(effectiveTimes.map(({ stopId }) => stopId));
    Object.values(activities)
      .filter((a: any) =>
        dateKey(a.date) === date &&
        (a.id.startsWith('act_itin_') || ((a.type === 'visita' || a.type === 'sopralluogo') && stopIds.has(a.contactId)))
      )
      .forEach((a: any) => deleteActivity(a.id));

    const prefix = `act_itin_${date}_`;
    effectiveTimes.forEach(({ stopId, effective }) => {
      const [h, m] = effective.split(':').map(Number);
      const visitDate = new Date(baseDate);
      visitDate.setHours(h, m, 0, 0);
      addActivity({
        id: `${prefix}${stopId}`,
        contactId: stopId,
        type: 'visita',
        date: visitDate.getTime(),
        outcome: 'da-fare',
        notes: `Visita pianificata — Itinerario del ${label}`,
        createdAt: Date.now(),
      });
    });
    setSavedToAgenda(true);
    setTimeout(() => setSavedToAgenda(false), 3000);
  };

  // Pannello itinerario — contenuto condiviso tra sidebar desktop e sheet mobile
  const itineraryPanel = (
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
  );

  return (
    <DialogFrame className="fixed inset-0 z-[600] flex bg-canvas" style={{ display: isVisible ? 'flex' : 'none' }}>

      {/* ── MAPPA (occupa tutto, o sx su desktop) ── */}
      <div className="flex-1 relative">

        {/* Top bar — sopra la mappa e sopra lo sheet tappe (z-800), altrimenti
            l'overlay dello sheet intercetta i tap sui risultati di ricerca */}
        <div className="absolute top-0 left-0 right-0 z-[900] px-4 pt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 w-full">
            <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose}
              className="bg-surface/95 dark:bg-surface/95 backdrop-blur-sm text-foreground dark:text-foreground rounded-panel px-4 py-2.5 font-semibold text-xs uppercase flex items-center gap-2 shadow-panel flex-shrink-0">
              <X size={14} /> Chiudi
            </button>

            <div className="min-w-0 flex-1 flex items-center gap-2 bg-surface/95 dark:bg-surface/95 backdrop-blur-sm rounded-panel px-4 py-2 shadow-panel">
              <Route size={14} className="text-warning flex-shrink-0" />
              <input type="date" value={date} onChange={e => {
              const newDate = e.target.value;
              setDate(newDate);
              setSelectedIds([]);
              setManualOrder(null);
              setCustomTimes({});
              loadedItinDateRef.current = null;
            }}
                className="min-w-0 w-full flex-1 bg-transparent text-sm font-semibold text-foreground dark:text-foreground outline-none" />
            </div>

            <button onClick={() => setShowFiltersBar(v => !v)}
              className={`relative p-2.5 rounded-xl shadow-panel flex-shrink-0 transition-all ${showFiltersBar ? 'bg-action text-action-foreground' : 'bg-surface/95 dark:bg-surface/95 text-secondary dark:text-foreground'}`}>
              <SlidersHorizontal size={16} />
              {itinActiveFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-warning text-status-foreground text-xs font-semibold flex items-center justify-center">
                  {itinActiveFilterCount}
                </span>
              )}
            </button>

            {selectedIds.length > 0 && (
              <button onClick={() => setOnlyRouteOnMap(v => !v)}
                title={onlyRouteOnMap ? 'Mostra tutti i clienti sulla mappa' : 'Mostra solo le tappe di questo itinerario'}
                className={`p-2.5 rounded-xl shadow-panel flex-shrink-0 transition-all ${onlyRouteOnMap ? 'bg-warning text-status-foreground' : 'bg-surface/95 dark:bg-surface/95 text-secondary dark:text-foreground'}`}>
                {onlyRouteOnMap ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>

          {showFiltersBar && (
            <div className="w-full max-h-[30dvh] overflow-y-auto overscroll-contain flex flex-wrap items-center gap-1.5 bg-surface/95 dark:bg-surface/95 backdrop-blur-sm rounded-panel p-2 shadow-panel mt-1">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                className="flex-1 min-w-[100px] bg-canvas dark:bg-canvas rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-secondary dark:text-foreground outline-none">
                <option value="tutti">Tutti</option>
                <option value="clienti">Clienti</option>
                <option value="prospect">Prospect</option>
              </select>
              <select value={filterSegment ?? ''} onChange={e => setFilterSegment((e.target.value || null) as any)}
                className="flex-1 min-w-[120px] bg-canvas dark:bg-canvas rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-secondary dark:text-foreground outline-none">
                <option value="">Tutti i segmenti</option>
                <option value="dealer">🏪 Dealer</option>
                <option value="industria">🏭 Industria</option>
                <option value="edilizia">🏗️ Edilizia</option>
                <option value="end-user">👤 End User</option>
              </select>
              {availableProvinces.length > 0 && (
                <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)}
                  className="flex-1 min-w-[100px] bg-canvas dark:bg-canvas rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-secondary dark:text-foreground outline-none">
                  <option value="">Tutte le prov.</option>
                  {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              {availableSectors.length > 0 && (
                <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                  className="flex-1 min-w-[120px] bg-canvas dark:bg-canvas rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-secondary dark:text-foreground outline-none">
                  <option value="">Tutti i settori</option>
                  {availableSectors.map(s => <option key={s} value={s}>{sectorLabel(s)}</option>)}
                </select>
              )}
              <button onClick={() => setFilterPriorityOnly(v => !v)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all flex items-center gap-1 flex-shrink-0 ${filterPriorityOnly ? 'bg-warning text-status-foreground' : 'bg-canvas dark:bg-canvas text-secondary dark:text-muted'}`}>
                <Star size={12} fill={filterPriorityOnly ? 'currentColor' : 'none'} /> Prioritari
              </button>
              {itinActiveFilterCount > 0 && (
                <button onClick={() => { setFilterStatus('tutti'); setFilterSegment(null); setFilterProvince(''); setFilterSector(''); setFilterPriorityOnly(false); }}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase text-danger hover:text-danger flex-shrink-0">
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Barra di ricerca cliente */}
          <SearchDropdown
            className="w-full mt-1"
            value={searchItinQuery}
            onChange={setSearchItinQuery}
            placeholder="Cerca cliente per nome o città…"
            inputWrapperClassName={() => 'flex items-center gap-2 bg-surface/95 dark:bg-surface/95 backdrop-blur-sm rounded-panel px-3 py-2.5 shadow-panel focus-within:ring-2 focus-within:ring-warning transition-all'}
            dropdownClassName="z-[800]"
            onSelect={(c: any) => {
              const already = selectedIds.includes(c.id);
              if (!already) {
                setSelectedIds(prev => [...prev, c.id]);
                setSheetOpen(true);
              }
              setItinFlyTo([c.lat, c.lng]);
              setSearchItinQuery('');
            }}
            results={itinSearchResults.map((c: any) => {
              const already = selectedIds.includes(c.id);
              const isCliente = c.status === 'cliente';
              return {
                key: c.id,
                item: c,
                label: c.company,
                sublabel: c.city || '—',
                badge: {
                  text: already ? 'in itinerario' : `${isCliente ? 'Cliente' : 'Prospect'}`,
                  className: already
                    ? 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning'
                    : isCliente ? 'bg-accent-soft text-accent dark:bg-accent-soft/40 dark:text-accent' : 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning',
                },
              };
            })}
          />
        </div>

        {/* Mappa */}
        <MapContainer center={[HOME.lat, HOME.lng]} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl={false} preferCanvas>
          <MapBaseLayer />
          <SizeInvalidator isVisible={isVisible} />
          <FlyToContact position={itinFlyTo} />
          <Marker position={[HOME.lat, HOME.lng]} icon={homeIcon}>
            <Popup><strong>Partenza — {HOME.label}</strong></Popup>
          </Marker>
          {itinUserPos && <Marker position={itinUserPos} icon={userIcon}><Popup><strong>Tu sei qui</strong></Popup></Marker>}
          {mapMarkersToShow.map((c: any) => {
            const selected = selectedIds.includes(c.id);
            const stopIdx = activeRoute.findIndex((s: any) => s.id === c.id);
            const popup = (
              <Popup minWidth={90} maxWidth={160} className="compact-popup">
                <div style={{ padding: '2px 0', lineHeight: 1.2 }}>
                  <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company}</p>
                  <button onClick={() => toggle(c.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%', padding: '3px 6px', borderRadius: 6, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', background: selected ? '#fee2e2' : '#176f77', color: selected ? '#dc2626' : '#fff', border: 'none', cursor: 'pointer' }}>
                    {selected ? '− Rimuovi' : '+ Aggiungi'}
                  </button>
                </div>
              </Popup>
            );
            // Tappe selezionate: marker DOM numerato (poche unità). Il resto:
            // CircleMarker su canvas, veloce anche con centinaia di contatti.
            if (stopIdx >= 0) {
              return (
                <Marker key={c.id} position={[c.lat, c.lng]} icon={stopIcon(stopIdx + 1)} eventHandlers={{ click: () => toggle(c.id) }}>
                  {popup}
                </Marker>
              );
            }
            if (c.priorityToVisit) {
              return (
                <Marker key={c.id} position={[c.lat, c.lng]} icon={priorityStarDivIcon(markerIconPx + 2)} eventHandlers={{ click: () => toggle(c.id) }}>
                  {popup}
                </Marker>
              );
            }
            const style = resolveMarkerStyle(c.status, c.segment, mapMarkerStyles);
            return style.shape !== 'circle' ? (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={shapeDivIcon(style.shape as MarkerShape, style.color, markerIconPx)} eventHandlers={{ click: () => toggle(c.id) }}>
                {popup}
              </Marker>
            ) : (
              <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={markerRadiusPx} pathOptions={contactMarkerStyle(c.status, c.segment, mapMarkerStyles)} eventHandlers={{ click: () => toggle(c.id) }}>
                {popup}
              </CircleMarker>
            );
          })}
          {roadRouteCoords.length > 1 && (
            <Polyline positions={roadRouteCoords} pathOptions={{ color: '#176f77', weight: 5, opacity: 0.85 }} />
          )}
        </MapContainer>

        <MapStyleButton className="bottom-20 left-4 lg:bottom-4" />

        {/* Geolocalizzazione */}
        <div className="absolute bottom-20 right-4 z-[700] flex flex-col items-end gap-2">
          {itinGeoMsg && (
            <div className="bg-danger text-status-foreground text-xs font-bold rounded-md px-3 py-2 max-w-[230px] shadow-panel">{itinGeoMsg}</div>
          )}
          <LocateButton locating={itinLocating} onClick={locateItin} />
        </div>

        {/* Hint iniziale */}
        {selectedIds.length === 0 && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[700] lg:hidden bg-black/70 backdrop-blur-sm text-foreground rounded-panel px-5 py-3 text-xs font-bold text-center pointer-events-none">
            Tocca un cliente sulla mappa per aggiungerlo all'itinerario
          </div>
        )}

        {/* ── MOBILE: pillola collassata + sheet ── */}
        <div className="lg:hidden">
          {/* Pillola sempre visibile in basso */}
          <button
            onClick={() => setSheetOpen(v => !v)}
            className={`absolute bottom-4 left-4 right-4 z-[700] flex items-center justify-between rounded-panel px-4 py-3 shadow-panel transition-all ${
              selectedIds.length > 0
                ? 'bg-action text-action-foreground'
                : 'bg-surface/95 dark:bg-surface/95 backdrop-blur-sm text-foreground dark:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2 font-semibold text-xs uppercase">
              <Route size={14} className={selectedIds.length > 0 ? 'text-foreground' : 'text-warning'} />
              {selectedIds.length === 0
                ? 'Nessuna tappa selezionata'
                : `${activeRoute.length} tappe · ${totalKm.toFixed(0)} km · ${fmtTime(totalKm)}`}
            </span>
            <span className="text-xs font-bold opacity-70">{sheetOpen ? '▼' : '▲'}</span>
          </button>

          {/* Sheet slide-up */}
          {sheetOpen && (
            <DialogFrame className="fixed inset-0 z-[800] flex flex-col justify-end" onClick={() => setSheetOpen(false)}>
              <div
                className="bg-surface dark:bg-canvas rounded-t-panel shadow-panel flex flex-col overflow-hidden"
                style={{ maxHeight: '70vh' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Handle */}
                <div className="flex flex-col items-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 bg-raised dark:bg-raised rounded-full mb-2" />
                  <div className="flex items-center justify-between w-full px-5 pb-2 border-b border-line dark:border-line">
                    <span className="text-xs font-semibold uppercase text-foreground dark:text-foreground flex items-center gap-2">
                      <Route size={13} className="text-warning" />
                      {activeRoute.length} tappe · {totalKm.toFixed(0)} km · {fmtTime(totalKm)}
                    </span>
                    <button aria-label="Chiudi dialogo" data-dialog-close onClick={() => setSheetOpen(false)} className="text-muted hover:text-secondary">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                {itineraryPanel}
              </div>
            </DialogFrame>
          )}
        </div>
      </div>

      {/* ── DESKTOP: sidebar destra fissa ── */}
      <div className="hidden lg:flex flex-col w-80 bg-surface dark:bg-canvas border-l border-line dark:border-line shadow-panel">
        {/* Header sidebar */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-line dark:border-line">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm  text-foreground dark:text-foreground flex items-center gap-2">
              <Route size={15} className="text-warning" /> Itinerario
            </h2>
            <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="text-muted hover:text-secondary dark:hover:text-muted">
              <X size={16} />
            </button>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex gap-3 text-center">
              <div className="flex-1 bg-warning-soft dark:bg-warning-soft rounded-md py-2">
                <p className="text-xs font-semibold text-warning">{totalKm.toFixed(0)} km</p>
                <p className="text-xs text-muted font-bold">totale</p>
              </div>
              <div className="flex-1 bg-accent-soft dark:bg-accent-soft/20 rounded-md py-2">
                <p className="text-xs font-semibold text-accent">{fmtTime(totalKm)}</p>
                <p className="text-xs text-muted font-bold">in viaggio</p>
              </div>
              <div className="flex-1 bg-canvas dark:bg-surface rounded-md py-2">
                <p className="text-xs font-semibold text-foreground dark:text-foreground">{activeRoute.length}</p>
                <p className="text-xs text-muted font-bold">tappe</p>
              </div>
            </div>
          )}
        </div>
        {itineraryPanel}
      </div>
    </DialogFrame>
  );
};
