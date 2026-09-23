import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { useStore } from '../store/useStore';
import { ContactSegment } from '../types';
import { MapPin, Navigation, Phone, AlertTriangle, ExternalLink, Maximize2, X, SlidersHorizontal, List, Map as MapIcon, Building2, Sparkles, CheckCircle2, XCircle, RotateCcw, Clock, Route, Home, CalendarCheck, GripVertical, LocateFixed, Star, Eye, EyeOff } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAICatalog, CatalogSuggestion } from '../hooks/useAICatalog';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../utils/search';
import { MarkerShape, getMarkerCategory, DEFAULT_MARKER_STYLE, shapeDivIcon, priorityStarDivIcon, MARKER_ICON_PX, MARKER_CIRCLE_RADIUS } from '../lib/markerShapes';
import { sectorLabel } from '../lib/sectors';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Icone colorate via divIcon ─────────────────────────────────────────────────

type MapMarkerStyles = Record<string, { shape: string; color: string }>;

// Risolve forma+colore di un contatto: stile personalizzato da Impostazioni
// (per categoria stato/segmento) se presente, altrimenti il default.
function resolveMarkerStyle(status: string, segment: string | undefined, styles: MapMarkerStyles) {
  const category = getMarkerCategory(status, segment);
  const custom = styles[category];
  const base = DEFAULT_MARKER_STYLE[category];
  return {
    shape: (custom?.shape as MarkerShape) || base.shape,
    color: custom?.color || base.color,
  };
}

// I marker "cerchio" (il default) sono CircleMarker disegnati su canvas
// (preferCanvas): con centinaia di punti i divIcon DOM rendono la mappa
// inutilizzabile su smartphone. Le altre forme (personalizzate dall'utente)
// usano invece un divIcon SVG, pagato solo se l'utente sceglie una forma
// diversa dal cerchio.
const contactMarkerStyle = (status: string, segment: string | undefined, styles: MapMarkerStyles) => ({
  color: '#ffffff',
  weight: 2.5,
  fillColor: resolveMarkerStyle(status, segment, styles).color,
  fillOpacity: 1,
});

// CARTO ora richiede una API key sulle tile basemaps.cartocdn.com (tile
// placeholder "API KEY REQUIRED" senza autenticazione) → torniamo alle tile
// OSM standard, gratuite e senza registrazione.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap contributors';
// Posizione utente: stella verde con contorno giallo, lampeggiante — ben
// distinguibile dai marker circolari di clienti e prospect
const userIcon = L.divIcon({
  className: '',
  html: `<style>@keyframes nm-user-blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.85)}}</style>
  <div style="width:38px;height:38px;animation:nm-user-blink 1.2s ease-in-out infinite;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.45));">
    <svg viewBox="0 0 24 24" width="38" height="38">
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"
        fill="#22c55e" stroke="#facc15" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 8); }, [center]);
  return null;
};

const DoubleClickHandler = ({ onDoubleClick }: { onDoubleClick: () => void }) => {
  useMapEvents({ dblclick: () => { onDoubleClick(); } });
  return null;
};

const FlyToContact = ({ position }: { position: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 14, { duration: 1 });
  }, [position]);
  return null;
};

// Bottone "trova la mia posizione" — overlay condiviso dalle tre mappe
const LocateButton: React.FC<{ locating: boolean; onClick: () => void; className?: string }> = ({ locating, onClick, className }) => (
  <button
    onClick={onClick}
    title="Mostra la mia posizione"
    className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg text-[var(--accent-600)] dark:text-[var(--accent-400)] active:scale-95 transition-all ${className ?? ''}`}
  >
    <LocateFixed size={18} className={locating ? 'animate-pulse' : ''} />
  </button>
);

function requestPosition(
  onOk: (pos: [number, number]) => void,
  onErr: (msg: string) => void,
  setLocating: (v: boolean) => void,
) {
  if (!navigator.geolocation) {
    onErr('GPS non disponibile su questo dispositivo/browser.');
    return;
  }
  setLocating(true);
  navigator.geolocation.getCurrentPosition(
    pos => {
      setLocating(false);
      onOk([pos.coords.latitude, pos.coords.longitude]);
    },
    err => {
      setLocating(false);
      onErr(err.code === 1
        ? 'Permesso posizione negato. Abilita il GPS per questo sito nelle impostazioni del browser.'
        : 'Posizione non disponibile. Verifica che il GPS sia attivo e riprova.');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  );
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Itinerario ────────────────────────────────────────────────────────────────

const HOME = { lat: 45.5386, lng: 9.0667, label: 'Casa — Via Don Bianchi, Rho' };
const AVG_SPEED_KMH = 70; // velocità media stradale stimata

// Chiave YYYY-MM-DD in orario locale, per confrontare un timestamp con il valore di un <input type="date">
function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(km: number): string {
  const mins = Math.round((km / AVG_SPEED_KMH) * 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function nearestNeighbor(
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

const homeIcon = L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#4f46e5;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
  </div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
});

const stopIcon = (n: number) => L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:white;font-family:sans-serif;">${n}</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});


// Componente sortable per singola tappa — drag handle visibile
const SortableTappa = React.memo(function SortableTappa({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-gray-50 dark:bg-gray-800 rounded-2xl px-3 py-2 flex items-center gap-2 select-none ${isDragging ? 'opacity-50 shadow-xl z-50 ring-2 ring-orange-400' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
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
const SizeInvalidator: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const map = useMap();
  useEffect(() => {
    if (isVisible) setTimeout(() => map.invalidateSize(), 50);
  }, [isVisible, map]);
  return null;
};

interface ItinerarioViewProps {
  contacts: Record<string, any>;
  onClose: () => void;
  isVisible: boolean;
  // Data richiesta dall'esterno (es. dall'Agenda, "Vedi itinerario" per un giorno specifico).
  // `nonce` cambia ad ogni richiesta cosi' da poter ri-applicare anche la stessa data.
  requestedDate?: { date: string; nonce: number } | null;
}

const ItinerarioView: React.FC<ItinerarioViewProps> = ({ contacts, onClose, isVisible, requestedDate }) => {
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
          <p className="text-xs text-gray-400 text-center py-6 font-bold">
            Tocca i clienti sulla mappa per costruire l'itinerario
          </p>
        ) : (
          <>
            {/* Partenza */}
            <div className="flex items-center gap-3 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-[var(--accent-600)] flex items-center justify-center flex-shrink-0">
                <Home size={13} className="text-white" />
              </div>
              <p className="text-xs font-black text-[var(--accent-700)] dark:text-[var(--accent-300)] truncate">{HOME.label}</p>
            </div>

            {/* Tappe — drag & drop */}
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={legs.map(l => l.stop.id)} strategy={verticalListSortingStrategy}>
                {legs.map(({ stop, legDist, cumDist }, i) => {
                  const c = contacts[stop.id];
                  const et = effectiveTimes[i];
                  return (
                    <SortableTappa key={stop.id} id={stop.id}>
                      <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-black">{i + 1}</div>

                      {/* Orario editabile */}
                      <div className="flex-shrink-0">
                        <input
                          type="time"
                          min="08:00"
                          max="18:00"
                          value={et?.effective ?? ''}
                          onChange={e => setCustomTimes(prev => ({ ...prev, [stop.id]: e.target.value }))}
                          className={`w-[72px] text-xs font-black rounded-lg px-1.5 py-1 outline-none border transition-colors ${
                            et?.isCustom
                              ? 'border-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                          }`}
                        />
                        {et?.isCustom && (
                          <button
                            onClick={() => setCustomTimes(prev => { const n = { ...prev }; delete n[stop.id]; return n; })}
                            className="block text-[9px] text-gray-400 hover:text-[var(--accent-500)] font-bold mt-0.5 pl-1"
                          >↩ reset</button>
                        )}
                      </div>

                      {/* Info cliente */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black dark:text-white uppercase leading-tight break-words">{c?.company}</p>
                        <p className="text-[10px] text-gray-400 font-bold">+{legDist.toFixed(0)} km · {cumDist.toFixed(0)} km tot</p>
                      </div>

                      <button onClick={() => toggle(stop.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
                    </SortableTappa>
                  );
                })}
              </SortableContext>
            </DndContext>

            {/* Reset ordine automatico */}
            {manualOrder && (
              <button
                onClick={() => setManualOrder(null)}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[10px] font-black text-[var(--accent-500)] hover:text-[var(--accent-700)] uppercase tracking-wider transition-colors"
              >
                <RotateCcw size={11} /> Ottimizza ordine automatico
              </button>
            )}

            {/* Impostazioni orario */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl px-4 py-3 space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Impostazioni giornata</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 font-bold mb-1">Partenza</p>
                  <input type="time" min="08:00" max="18:00" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-black text-gray-800 dark:text-white outline-none" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 font-bold mb-1">Durata visita</p>
                  <select value={visitDuration} onChange={e => setVisitDuration(Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-black text-gray-800 dark:text-white outline-none">
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 ora</option>
                    <option value={90}>1h 30min</option>
                    <option value={120}>2 ore</option>
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-gray-400">Gli orari si calcolano automaticamente. Modificali direttamente su ogni tappa — le tappe successive si adattano.</p>
            </div>

            {/* Google Maps */}
            <a href={googleMapsUrl} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-black text-sm uppercase tracking-wide transition-all">
              <Navigation size={15} /> Apri in Google Maps
            </a>
            <button onClick={() => setSelectedIds([])} className="w-full py-2 text-xs text-red-400 font-bold hover:text-red-600 transition-colors">
              Azzera itinerario
            </button>
          </>
        )}
      </div>

      {/* Footer sticky con CTA */}
      {selectedIds.length > 0 && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <button onClick={addToAgenda}
            className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wide transition-all shadow-lg ${
              savedToAgenda ? 'bg-green-500 text-white' : 'bg-[var(--accent-600)] active:bg-[var(--accent-700)] text-white'
            }`}>
            <CalendarCheck size={17} />
            {savedToAgenda ? '✓ Salvato in Agenda!' : "Aggiungi all'Agenda"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[600] flex bg-gray-900" style={{ display: isVisible ? 'flex' : 'none' }}>

      {/* ── MAPPA (occupa tutto, o sx su desktop) ── */}
      <div className="flex-1 relative">

        {/* Top bar — sopra la mappa */}
        <div className="absolute top-0 left-0 right-0 z-[700] px-4 pt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 w-full">
            <button onClick={onClose}
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm text-gray-700 dark:text-white rounded-2xl px-4 py-2.5 font-black text-xs uppercase flex items-center gap-2 shadow-lg flex-shrink-0">
              <X size={14} /> Chiudi
            </button>

            <div className="flex-1 flex items-center gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg">
              <Route size={14} className="text-orange-500 flex-shrink-0" />
              <input type="date" value={date} onChange={e => {
              const newDate = e.target.value;
              setDate(newDate);
              setSelectedIds([]);
              setManualOrder(null);
              setCustomTimes({});
              loadedItinDateRef.current = null;
            }}
                className="flex-1 bg-transparent text-sm font-black text-gray-800 dark:text-white outline-none" />
            </div>

            <button onClick={() => setShowFiltersBar(v => !v)}
              className={`relative p-2.5 rounded-xl shadow-lg flex-shrink-0 transition-all ${showFiltersBar ? 'bg-[var(--accent-600)] text-white' : 'bg-white/95 dark:bg-gray-800/95 text-gray-600 dark:text-white'}`}>
              <SlidersHorizontal size={16} />
              {itinActiveFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-white text-[9px] font-black flex items-center justify-center">
                  {itinActiveFilterCount}
                </span>
              )}
            </button>

            {selectedIds.length > 0 && (
              <button onClick={() => setOnlyRouteOnMap(v => !v)}
                title={onlyRouteOnMap ? 'Mostra tutti i clienti sulla mappa' : 'Mostra solo le tappe di questo itinerario'}
                className={`p-2.5 rounded-xl shadow-lg flex-shrink-0 transition-all ${onlyRouteOnMap ? 'bg-orange-500 text-white' : 'bg-white/95 dark:bg-gray-800/95 text-gray-600 dark:text-white'}`}>
                {onlyRouteOnMap ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>

          {showFiltersBar && (
            <div className="w-full flex flex-wrap items-center gap-1.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-2 shadow-lg mt-1">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                className="flex-1 min-w-[100px] bg-gray-50 dark:bg-gray-900 rounded-xl px-2.5 py-1.5 text-xs font-black uppercase text-gray-600 dark:text-white outline-none">
                <option value="tutti">Tutti</option>
                <option value="clienti">Clienti</option>
                <option value="prospect">Prospect</option>
              </select>
              <select value={filterSegment ?? ''} onChange={e => setFilterSegment((e.target.value || null) as any)}
                className="flex-1 min-w-[120px] bg-gray-50 dark:bg-gray-900 rounded-xl px-2.5 py-1.5 text-xs font-black uppercase text-gray-600 dark:text-white outline-none">
                <option value="">Tutti i segmenti</option>
                <option value="dealer">🏪 Dealer</option>
                <option value="industria">🏭 Industria</option>
                <option value="edilizia">🏗️ Edilizia</option>
                <option value="end-user">👤 End User</option>
              </select>
              {availableProvinces.length > 0 && (
                <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)}
                  className="flex-1 min-w-[100px] bg-gray-50 dark:bg-gray-900 rounded-xl px-2.5 py-1.5 text-xs font-black uppercase text-gray-600 dark:text-white outline-none">
                  <option value="">Tutte le prov.</option>
                  {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              {availableSectors.length > 0 && (
                <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                  className="flex-1 min-w-[120px] bg-gray-50 dark:bg-gray-900 rounded-xl px-2.5 py-1.5 text-xs font-black uppercase text-gray-600 dark:text-white outline-none">
                  <option value="">Tutti i settori</option>
                  {availableSectors.map(s => <option key={s} value={s}>{sectorLabel(s)}</option>)}
                </select>
              )}
              <button onClick={() => setFilterPriorityOnly(v => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1 flex-shrink-0 ${filterPriorityOnly ? 'bg-amber-400 text-white' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400'}`}>
                <Star size={12} fill={filterPriorityOnly ? 'currentColor' : 'none'} /> Prioritari
              </button>
              {itinActiveFilterCount > 0 && (
                <button onClick={() => { setFilterStatus('tutti'); setFilterSegment(null); setFilterProvince(''); setFilterSector(''); setFilterPriorityOnly(false); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black uppercase text-red-400 hover:text-red-600 flex-shrink-0">
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
            inputWrapperClassName={() => 'flex items-center gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl px-3 py-2.5 shadow-lg focus-within:ring-2 focus-within:ring-orange-400 transition-all'}
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
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300'
                    : isCliente ? 'bg-[var(--accent-100)] text-[var(--accent-600)] dark:bg-[var(--accent-900)]/40 dark:text-[var(--accent-300)]' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
                },
              };
            })}
          />
        </div>

        {/* Mappa */}
        <MapContainer center={[HOME.lat, HOME.lng]} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl={false} preferCanvas>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
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
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%', padding: '3px 6px', borderRadius: 6, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', background: selected ? '#fee2e2' : '#f97316', color: selected ? '#dc2626' : '#fff', border: 'none', cursor: 'pointer' }}>
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
            <Polyline positions={roadRouteCoords} pathOptions={{ color: '#f97316', weight: 5, opacity: 0.85 }} />
          )}
        </MapContainer>

        {/* Geolocalizzazione */}
        <div className="absolute bottom-20 right-4 z-[700] flex flex-col items-end gap-2">
          {itinGeoMsg && (
            <div className="bg-red-600 text-white text-[10px] font-bold rounded-xl px-3 py-2 max-w-[230px] shadow-lg">{itinGeoMsg}</div>
          )}
          <LocateButton locating={itinLocating} onClick={locateItin} />
        </div>

        {/* Hint iniziale */}
        {selectedIds.length === 0 && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[700] lg:hidden bg-black/70 backdrop-blur-sm text-white rounded-2xl px-5 py-3 text-xs font-bold text-center pointer-events-none">
            Tocca un cliente sulla mappa per aggiungerlo all'itinerario
          </div>
        )}

        {/* ── MOBILE: pillola collassata + sheet ── */}
        <div className="lg:hidden">
          {/* Pillola sempre visibile in basso */}
          <button
            onClick={() => setSheetOpen(v => !v)}
            className={`absolute bottom-4 left-4 right-4 z-[700] flex items-center justify-between rounded-2xl px-4 py-3 shadow-2xl transition-all ${
              selectedIds.length > 0
                ? 'bg-[var(--accent-600)] text-white'
                : 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm text-gray-700 dark:text-white'
            }`}
          >
            <span className="flex items-center gap-2 font-black text-xs uppercase">
              <Route size={14} className={selectedIds.length > 0 ? 'text-white' : 'text-orange-500'} />
              {selectedIds.length === 0
                ? 'Nessuna tappa selezionata'
                : `${activeRoute.length} tappe · ${totalKm.toFixed(0)} km · ${fmtTime(totalKm)}`}
            </span>
            <span className="text-[10px] font-bold opacity-70">{sheetOpen ? '▼' : '▲'}</span>
          </button>

          {/* Sheet slide-up */}
          {sheetOpen && (
            <div className="fixed inset-0 z-[800] flex flex-col justify-end" onClick={() => setSheetOpen(false)}>
              <div
                className="bg-white dark:bg-gray-900 rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: '70vh' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Handle */}
                <div className="flex flex-col items-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-2" />
                  <div className="flex items-center justify-between w-full px-5 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-black uppercase text-gray-700 dark:text-white flex items-center gap-2">
                      <Route size={13} className="text-orange-500" />
                      {activeRoute.length} tappe · {totalKm.toFixed(0)} km · {fmtTime(totalKm)}
                    </span>
                    <button onClick={() => setSheetOpen(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                {itineraryPanel}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP: sidebar destra fissa ── */}
      <div className="hidden lg:flex flex-col w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl">
        {/* Header sidebar */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-sm uppercase text-gray-800 dark:text-white flex items-center gap-2">
              <Route size={15} className="text-orange-500" /> Itinerario
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={16} />
            </button>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex gap-3 text-center">
              <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 rounded-xl py-2">
                <p className="text-xs font-black text-orange-600">{totalKm.toFixed(0)} km</p>
                <p className="text-[10px] text-gray-400 font-bold">totale</p>
              </div>
              <div className="flex-1 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20 rounded-xl py-2">
                <p className="text-xs font-black text-[var(--accent-600)]">{fmtTime(totalKm)}</p>
                <p className="text-[10px] text-gray-400 font-bold">in viaggio</p>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl py-2">
                <p className="text-xs font-black text-gray-700 dark:text-white">{activeRoute.length}</p>
                <p className="text-[10px] text-gray-400 font-bold">tappe</p>
              </div>
            </div>
          )}
        </div>
        {itineraryPanel}
      </div>
    </div>
  );
};

// ── AI Catalog Panel ──────────────────────────────────────────────────────────

const SEGMENT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  dealer:    { bg: 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/40', text: 'text-[var(--accent-700)] dark:text-[var(--accent-300)]', label: '🏪 Dealer' },
  edilizia:  { bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-700 dark:text-amber-300',   label: '🏗️ Edilizia' },
  industria: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', label: '🏭 Industria' },
};

const PRIORITY_COLORS: Record<string, string> = {
  alta:  'text-emerald-600 font-black',
  media: 'text-amber-500 font-bold',
  bassa: 'text-gray-400 font-bold',
};

interface AICatalogPanelProps {
  onClose: () => void;
  onApply: (suggestions: CatalogSuggestion[]) => void;
}

const AICatalogPanel: React.FC<AICatalogPanelProps> = ({ onClose, onApply }) => {
  const { contacts } = useStore();
  const {
    suggestions, processedIds, progress, loading, error, rateLimitReset,
    run, toggleApproval, setAllApproved, clearResults,
  } = useAICatalog();

  const [onlyUncategorized, setOnlyUncategorized] = useState(true);

  const allContacts = Object.values(contacts);
  const uncategorized = allContacts.filter(c => !c.segment);
  const targetContacts = onlyUncategorized ? uncategorized : allContacts;
  const remaining = targetContacts.filter(c => !processedIds.includes(c.id));
  const approvedCount = suggestions.filter(s => s.approved).length;

  const resetMins = rateLimitReset
    ? Math.ceil((rateLimitReset - Date.now()) / 60000)
    : 0;

  const progressPct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-2 md:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--accent-500)]" /> AI Cataloga Contatti
              </h2>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                Classifica segment + priorità con Claude Haiku
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Tab: non categ. vs tutti */}
          <div className="flex gap-1.5 mt-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setOnlyUncategorized(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${onlyUncategorized ? 'bg-white dark:bg-gray-700 shadow text-[var(--accent-600)]' : 'text-gray-500'}`}
            >
              Non categ. ({uncategorized.length})
            </button>
            <button
              onClick={() => setOnlyUncategorized(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${!onlyUncategorized ? 'bg-white dark:bg-gray-700 shadow text-[var(--accent-600)]' : 'text-gray-500'}`}
            >
              Tutti ({allContacts.length})
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ minHeight: 0 }}>

          {/* Progress bar */}
          {(loading || (progress && progress.done > 0)) && (
            <div className="bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-[var(--accent-700)] dark:text-[var(--accent-300)] uppercase tracking-wide">
                  {loading ? `Elaborazione… ${progress?.done ?? 0}/${progress?.total ?? 0}` : `Completato ${progress?.done}/${progress?.total}`}
                </span>
                <span className="text-xs font-black text-[var(--accent-500)]">{progressPct}%</span>
              </div>
              <div className="h-2 bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-500)] rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {!loading && remaining.length > 0 && (
                <p className="text-[10px] text-[var(--accent-400)] font-bold mt-1.5">
                  {remaining.length} contatti rimanenti — clicca "Continua" per completare
                </p>
              )}
            </div>
          )}

          {/* Errore / rate limit */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-3 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-red-700 dark:text-red-400">{error}</p>
                {rateLimitReset && (
                  <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> Riprendi tra {resetMins} {resetMins === 1 ? 'minuto' : 'minuti'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Lista suggerimenti */}
          {suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {suggestions.length} catalogati
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setAllApproved(true)} className="text-[10px] font-black text-[var(--accent-600)] uppercase hover:underline">Seleziona tutto</button>
                  <button onClick={() => setAllApproved(false)} className="text-[10px] font-black text-gray-400 uppercase hover:underline">Deseleziona</button>
                </div>
              </div>

              {suggestions.map(s => {
                const seg = SEGMENT_COLORS[s.segment] ?? SEGMENT_COLORS.industria;
                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl border-2 p-3 transition-all cursor-pointer ${s.approved ? 'border-[var(--accent-200)] dark:border-[var(--accent-700)] bg-white dark:bg-gray-800' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60'}`}
                    onClick={() => toggleApproval(s.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black dark:text-white uppercase truncate">{s.company}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-bold truncate">{s.note}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${seg.bg} ${seg.text}`}>
                          {seg.label}
                        </span>
                        {s.approved
                          ? <CheckCircle2 size={16} className="text-[var(--accent-500)]" />
                          : <XCircle size={16} className="text-gray-300" />
                        }
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <span className={`text-[9px] uppercase tracking-wide ${PRIORITY_COLORS[s.priority]}`}>
                        ● {s.priority} priorità
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {suggestions.length === 0 && !loading && !error && (
            <div className="text-center py-8">
              <Sparkles size={28} className="mx-auto mb-3 text-[var(--accent-200)]" />
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Nessun risultato</p>
              <p className="text-xs text-gray-300 mt-1">Avvia l'analisi per catalogare i contatti</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 space-y-2">
          {/* Reset */}
          {suggestions.length > 0 && !loading && (
            <button
              onClick={clearResults}
              className="w-full text-xs text-gray-400 font-bold flex items-center justify-center gap-1.5 hover:text-red-500 transition-colors py-1"
            >
              <RotateCcw size={12} /> Azzera risultati salvati
            </button>
          )}

          {/* Avvia / Continua */}
          {remaining.length > 0 && (
            <button
              onClick={() => run(targetContacts)}
              disabled={loading}
              className={`w-full py-3 rounded-2xl font-black uppercase text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                loading ? 'bg-gray-200 dark:bg-gray-700 text-gray-400' : 'bg-[var(--accent-600)] hover:bg-[var(--accent-700)] text-white shadow-lg'
              }`}
            >
              <Sparkles size={16} />
              {loading
                ? 'Analisi in corso…'
                : processedIds.length > 0
                  ? `Continua (${remaining.length} rimanenti)`
                  : `Analizza ${remaining.length} contatti`
              }
            </button>
          )}

          {/* Applica */}
          {approvedCount > 0 && !loading && (
            <button
              onClick={() => { onApply(suggestions.filter(s => s.approved)); onClose(); }}
              className="w-full py-3 rounded-2xl font-black uppercase text-sm tracking-wide bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle2 size={16} /> Applica {approvedCount} selezionati
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

type MapFilter = 'tutti' | 'clienti' | 'prospect';
type MobileTab = 'mappa' | 'lista';

interface MapViewProps {
  onNavigateToContact: (contactId: string) => void;
  isFullscreen?: boolean;
  onGoFullscreen?: () => void;
  onExitFullscreen?: () => void;
  // Richiesta di apertura diretta dell'itinerario per una data (es. dal tasto "Vedi itinerario"
  // in Agenda). Consumata subito dopo l'apertura tramite onItineraryDateConsumed.
  initialItineraryDate?: string | null;
  onItineraryDateConsumed?: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  onNavigateToContact,
  isFullscreen = false,
  onGoFullscreen,
  onExitFullscreen,
  initialItineraryDate,
  onItineraryDateConsumed,
}) => {
  const { contacts, updateContact, mapMarkerStyles, mapMarkerSize } = useStore();
  const markerIconPx = MARKER_ICON_PX[mapMarkerSize];
  const markerRadiusPx = MARKER_CIRCLE_RADIUS[mapMarkerSize];
  const [userPos, setUserPos]     = useState<[number, number] | null>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('nextmove_last_userpos') || 'null');
      if (cached && Array.isArray(cached.pos) && Date.now() - cached.ts < 30 * 60 * 1000) {
        return cached.pos;
      }
    } catch {}
    return null;
  });
  const [radius, setRadius]       = useState(50);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [debugMsg, setDebugMsg]   = useState('');
  const [locatingContactId, setLocatingContactId] = useState<string | null>(null);
  const [searchGeocodeError, setSearchGeocodeError] = useState('');
  const [mapFilter, setMapFilter] = useState<MapFilter>('tutti');
  const [mapSegmentFilter, setMapSegmentFilter] = useState<ContactSegment | null>(null);
  const [mapProvinceFilter, setMapProvinceFilter] = useState<string>('');
  const [mapSectorFilter, setMapSectorFilter] = useState<string>('');
  const [mapPriorityOnly, setMapPriorityOnly] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('mappa');
  const [showFilters, setShowFilters] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showItinerario, setShowItinerario] = useState(false);
  const [itinerarioEverOpened, setItinerarioEverOpened] = useState(false);
  const [itinRequestedDate, setItinRequestedDate] = useState<{ date: string; nonce: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');

  // Apertura diretta dell'itinerario per una data richiesta dall'esterno (es. Agenda).
  useEffect(() => {
    if (!initialItineraryDate) return;
    setItinRequestedDate({ date: initialItineraryDate, nonce: Date.now() });
    setItinerarioEverOpened(true);
    setShowItinerario(true);
    onItineraryDateConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItineraryDate]);

  const saveUserPos = (p: [number, number]) => {
    setUserPos(p);
    try {
      localStorage.setItem('nextmove_last_userpos', JSON.stringify({ pos: p, ts: Date.now() }));
    } catch {}
  };

  const locateMe = () => {
    setGeoMsg('');
    requestPosition(
      p => {
        saveUserPos(p);
        setFlyToTarget([...p] as [number, number]);
      },
      msg => {
        setGeoMsg(msg);
        setTimeout(() => setGeoMsg(''), 6000);
      },
      setIsLocating,
    );
  };

  const applyAISuggestions = (suggestions: CatalogSuggestion[]) => {
    suggestions.forEach(s => {
      updateContact(s.id, { segment: s.segment });
    });
  };

  useEffect(() => {
    // Se abbiamo già una posizione recente (cache locale) non richiediamo di nuovo il permesso al browser
    if (userPos) return;

    const fetchPosition = () => {
      navigator.geolocation.getCurrentPosition(
        pos => saveUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => setDebugMsg('GPS non autorizzato'),
        { maximumAge: 10 * 60 * 1000, timeout: 10000 }
      );
    };

    // Se il browser espone lo stato del permesso, evitiamo di richiamare l'API quando è già negato
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then(status => {
          if (status.state !== 'denied') fetchPosition();
        })
        .catch(fetchPosition);
    } else {
      fetchPosition();
    }
  }, []);

  const geocodeContacts = async () => {
    setIsGeocoding(true);
    let ok = 0, fail = 0;

    // Raccogli tutti i contatti senza coordinate che hanno almeno city o province
    const unmapped = Object.values(contacts).filter(c => !c.lat && (c.city || c.province));

    // Deduplica per città: geocodifico ogni città UNA sola volta
    const cityGroups = new Map<string, typeof unmapped>();
    for (const c of unmapped) {
      const key = (c.city || c.province || '').trim().toLowerCase();
      if (!key) continue;
      if (!cityGroups.has(key)) cityGroups.set(key, []);
      cityGroups.get(key)!.push(c);
    }

    const cities = Array.from(cityGroups.entries());
    setDebugMsg(`Trovate ${cities.length} città da geocodificare…`);

    for (let i = 0; i < cities.length; i++) {
      const [, group] = cities[i];
      const sample = group[0];
      const city = sample.city || sample.province || '';
      const prov = sample.province || '';

      setDebugMsg(`Città ${i + 1}/${cities.length}: ${city} (${group.length} contatti)`);

      try {
        const params = new URLSearchParams({ city });
        if (prov) params.set('province', prov);
        const res = await fetch(`/api/geocode?${params}`);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const baseLat = parseFloat(data[0].lat);
          const baseLng = parseFloat(data[0].lon);
          // Applica a tutti i contatti della città con piccolo offset (≈300m) per distinguerli
          for (const c of group) {
            const jitter = () => (Math.random() - 0.5) * 0.006;
            updateContact(c.id, { lat: baseLat + jitter(), lng: baseLng + jitter() });
            ok++;
          }
        } else {
          fail += group.length;
        }
        await new Promise(r => setTimeout(r, 1200));
      } catch {
        fail += group.length;
      }
    }

    setIsGeocoding(false);
    setDebugMsg(`Mappati: ${ok}, Non trovati: ${fail}`);
  };

  // Selezione di un contatto dalla barra di ricerca mappa: se non ha ancora
  // coordinate lo geocodifica al volo (invece di aprire subito il profilo),
  // così l'obiettivo "vederlo posizionato in mappa" funziona sempre.
  const selectSearchContact = async (
    c: { id: string; lat?: number; lng?: number; city?: string; province?: string; address?: string },
    onFly: (pos: [number, number]) => void
  ) => {
    setSearchGeocodeError('');

    if (c.lat && c.lng) {
      onFly([c.lat, c.lng]);
      return;
    }

    if (!c.city && !c.address) {
      setSearchGeocodeError('Contatto senza città/indirizzo: impossibile posizionarlo in mappa.');
      return;
    }

    setLocatingContactId(c.id);
    try {
      const params = new URLSearchParams();
      if (c.address) params.set('address', c.address);
      if (c.city) params.set('city', c.city);
      if (c.province) params.set('province', c.province);
      const res = await fetch(`/api/geocode?${params}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        updateContact(c.id, { lat, lng });
        onFly([lat, lng]);
      } else {
        setSearchGeocodeError('Indirizzo non trovato: impossibile posizionarlo in mappa.');
      }
    } catch {
      setSearchGeocodeError('Geocodifica fallita: impossibile posizionarlo in mappa.');
    } finally {
      setLocatingContactId(null);
    }
  };

  const allContacts  = Object.values(contacts);
  const allMapped    = allContacts.filter(c => c.lat && c.lng);
  const nClienti     = allMapped.filter(c => c.status === 'cliente').length;
  const nProspect    = allMapped.filter(c => c.status === 'potenziale').length;

  const searchNorm = searchQuery.trim();
  const searchResults = searchNorm.length >= 1
    ? sortByRelevance(searchNorm, allContacts
        .filter(c => matchSearch(searchNorm, [c.company, c.contactName, c.city, c.province, c.phone, c.email])), c => [c.company, c.contactName])
        .slice(0, 7)
    : [];

  const filtered = allMapped.filter(c => {
    if (mapFilter === 'clienti')  return c.status === 'cliente';
    if (mapFilter === 'prospect') return c.status === 'potenziale';
    return true;
  }).filter(c => !mapSegmentFilter || c.segment === mapSegmentFilter)
    .filter(c => !mapProvinceFilter || c.province === mapProvinceFilter)
    .filter(c => !mapSectorFilter || c.sector === mapSectorFilter)
    .filter(c => !mapPriorityOnly || c.priorityToVisit === true)
    .filter(c => matchSearch(searchNorm, [c.company, c.contactName, c.city, c.province, c.phone, c.email]));

  // Province disponibili nei contatti geocodificati
  const availableProvinces = useMemo(() =>
    [...new Set(allMapped.map(c => c.province).filter(Boolean))].sort() as string[]
  , [allMapped]);
  const availableSectors = useMemo(() =>
    [...new Set(allMapped.map(c => c.sector).filter(Boolean))].sort() as string[]
  , [allMapped]);

  const nearby = userPos
    ? filtered.filter(c => calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) <= radius)
    : [];

  const listContacts = filtered.map(c => ({
    ...c,
    distKm: userPos ? calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) : null,
  })).sort((a, b) => (a.distKm ?? 9999) - (b.distKm ?? 9999));

  const unmappedWithAddress = allContacts.filter(c => !c.lat && (c.city || c.province));
  const defaultCenter: [number, number] = userPos ?? [45.5, 9.2]; // default: Milano

  // Marker principali + un marker per ogni sede secondaria geocodificata (locations[])
  const visibleMarkers = useMemo(() => {
    const primary = filtered.map((c: any) => ({ ...c, markerKey: c.id, sedeLabel: null }));
    const secondary = filtered.flatMap((c: any) =>
      (c.locations || [])
        .filter((l: any) => l.lat && l.lng)
        .map((l: any) => ({
          ...c,
          markerKey: `${c.id}__${l.id}`,
          lat: l.lat,
          lng: l.lng,
          address: l.address || c.address,
          city: l.city || c.city,
          sedeLabel: l.label || 'Sede secondaria',
        }))
    );
    return [...primary, ...secondary];
  }, [filtered]);
  const markersCapped = false;

  // ── FULLSCREEN MODE ─────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <MapContainer
          center={defaultCenter}
          zoom={userPos ? 8 : 6}
          style={{ height: '100%', width: '100%' }}
          doubleClickZoom={false}
          preferCanvas
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          {userPos && <ChangeView center={userPos} />}
          {userPos && <Marker position={userPos} icon={userIcon}><Popup><strong>Tu sei qui</strong></Popup></Marker>}
          {userPos && <Circle center={userPos} radius={radius * 1000} pathOptions={{ color: '#4f46e5', fillOpacity: 0.06, dashArray: '6 4' }} />}
          <DoubleClickHandler onDoubleClick={() => onExitFullscreen?.()} />
          <FlyToContact position={flyToTarget} />
          {visibleMarkers.map(c => {
            const isCliente = c.status === 'cliente';
            const distKm = userPos ? calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) : null;
            const popupContent = (
              <Popup minWidth={220}>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isCliente ? 'bg-[var(--accent-100)] text-[var(--accent-700)]' : 'bg-amber-100 text-amber-700'}`}>
                      {isCliente ? '● Cliente' : '◆ Prospect'}
                    </span>
                    {c.sedeLabel && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{c.sedeLabel}</span>}
                    {distKm !== null && <span className="text-[9px] text-gray-400 font-bold">{distKm.toFixed(0)} km</span>}
                  </div>
                  <h4 className="font-black uppercase text-gray-800 text-sm mb-1">{c.company}</h4>
                  {c.address && <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={10} />{c.address}, {c.city}</p>}
                  {c.phone   && <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={10} />{c.phone}</p>}
                  <button
                    onClick={() => onNavigateToContact(c.id)}
                    className="mt-2 w-full bg-[var(--accent-600)] text-white py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={10} /> {isCliente ? 'Apri Cliente' : 'Apri Prospect'}
                  </button>
                  <button
                    onClick={() => updateContact(c.id, { priorityToVisit: !c.priorityToVisit })}
                    className={`mt-1 w-full py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 ${c.priorityToVisit ? 'bg-amber-400 text-white' : 'bg-amber-50 text-amber-600'}`}
                  >
                    <Star size={10} fill={c.priorityToVisit ? 'currentColor' : 'none'} /> {c.priorityToVisit ? 'Prioritario' : 'Segna prioritario'}
                  </button>
                  {c.lat && c.lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                      target="_blank" rel="noreferrer"
                      className="mt-1 w-full bg-gray-100 text-gray-700 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5"
                    >
                      <Navigation size={10} /> Naviga
                    </a>
                  )}
                </div>
              </Popup>
            );
            if (c.priorityToVisit) {
              return (
                <Marker key={c.markerKey} position={[c.lat!, c.lng!]} icon={priorityStarDivIcon(markerIconPx + 2)}>
                  {popupContent}
                </Marker>
              );
            }
            const style = resolveMarkerStyle(c.status, c.segment, mapMarkerStyles);
            return style.shape !== 'circle' ? (
              <Marker key={c.markerKey} position={[c.lat!, c.lng!]} icon={shapeDivIcon(style.shape as MarkerShape, style.color, markerIconPx)}>
                {popupContent}
              </Marker>
            ) : (
              <CircleMarker key={c.markerKey} center={[c.lat!, c.lng!]} radius={markerRadiusPx} pathOptions={contactMarkerStyle(c.status, c.segment, mapMarkerStyles)}>
                {popupContent}
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Barra di ricerca fullscreen */}
        <div className="absolute top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 z-[1000]">
          <SearchDropdown
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cerca cliente o prospect…"
            inputWrapperClassName={() => 'flex items-center gap-2 bg-white/90 backdrop-blur-sm border-0 rounded-2xl px-3 py-2.5 shadow-lg focus-within:ring-2 focus-within:ring-[var(--accent-400)] transition-all'}
            dropdownClassName="z-[1100]"
            onSelect={c => {
              setSearchQuery(c.company);
              selectSearchContact(c, setFlyToTarget);
            }}
            results={searchResults.map(c => {
              const isCliente = c.status === 'cliente';
              const hasPinned = !!(c.lat && c.lng);
              return {
                key: c.id,
                item: c,
                label: c.company,
                sublabel: c.city || '—',
                badge: {
                  text: hasPinned ? (isCliente ? 'Cliente' : 'Prospect') : 'no pin',
                  className: hasPinned
                    ? (isCliente ? 'bg-[var(--accent-100)] text-[var(--accent-600)]' : 'bg-amber-100 text-amber-600')
                    : 'bg-gray-100 text-gray-400',
                },
              };
            })}
          />
          {locatingContactId && (
            <p className="mt-1.5 ml-1 text-[10px] text-white font-bold drop-shadow">Localizzo in mappa…</p>
          )}
          {searchGeocodeError && (
            <p className="mt-1.5 ml-1 text-[10px] bg-red-600 text-white font-bold rounded-xl px-3 py-1.5 shadow-lg inline-block">{searchGeocodeError}</p>
          )}
        </div>

        {/* Overlay filtri fullscreen */}
        <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 flex-wrap justify-center">
          {/* Toggle clienti/tutti/prospect */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-1 flex gap-1 shadow-lg">
            {(['tutti', 'clienti', 'prospect'] as const).map(f => (
              <button key={f} onClick={() => setMapFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${mapFilter === f ? 'bg-[var(--accent-600)] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {f === 'tutti' ? 'Tutti' : f === 'clienti' ? 'Clienti' : 'Prospect'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMapPriorityOnly(p => !p)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-black uppercase transition-all flex items-center gap-1 shadow-lg ${mapPriorityOnly ? 'bg-amber-400 text-white' : 'bg-white/90 backdrop-blur-sm text-gray-500'}`}
          >
            <Star size={14} fill={mapPriorityOnly ? 'currentColor' : 'none'} /> Prioritari
          </button>

          {/* Filtro provincia */}
          {availableProvinces.length > 0 && (
            <select
              value={mapProvinceFilter}
              onChange={e => setMapProvinceFilter(e.target.value)}
              className="bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2 text-xs font-black text-gray-700 shadow-lg border-0 outline-none cursor-pointer"
            >
              <option value="">Tutte le province</option>
              {availableProvinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}

          {/* Filtro settore */}
          {availableSectors.length > 0 && (
            <select
              value={mapSectorFilter}
              onChange={e => setMapSectorFilter(e.target.value)}
              className="bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2 text-xs font-black text-gray-700 shadow-lg border-0 outline-none cursor-pointer"
            >
              <option value="">Tutti i settori</option>
              {availableSectors.map(s => (
                <option key={s} value={s}>{sectorLabel(s)}</option>
              ))}
            </select>
          )}
        </div>

        {/* Bottone chiudi */}
        <button
          onClick={onExitFullscreen}
          className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm text-gray-800 rounded-2xl px-4 py-2.5 font-black uppercase text-xs flex items-center gap-2 shadow-lg"
        >
          <X size={16} /> Chiudi
        </button>

        {/* Geolocalizzazione */}
        <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2">
          {geoMsg && (
            <div className="bg-red-600 text-white text-[10px] font-bold rounded-xl px-3 py-2 max-w-[230px] shadow-lg">{geoMsg}</div>
          )}
          <LocateButton locating={isLocating} onClick={locateMe} />
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-lg">
          <p className="text-xs font-black text-gray-700">
            <span className="text-[var(--accent-600)]">{nClienti}</span> clienti ·{' '}
            <span className="text-amber-500">{nProspect}</span> prospect
          </p>
          {markersCapped && (
            <p className="text-[10px] text-amber-600 font-bold mt-0.5">
              Mostrati tutti i marker
            </p>
          )}
          <p className="text-[10px] text-gray-400 font-bold mt-0.5">Doppio click per uscire</p>
        </div>
      </div>
    );
  }

  // ── NORMAL MODE ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] md:h-[calc(100vh-70px)]">

      {/* ── Header compatto ── */}
      <div className="bg-white dark:bg-gray-800 rounded-[1.5rem] px-4 py-3 shadow-sm border border-gray-50 dark:border-gray-700 mb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-lg font-black dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <Navigation className="text-[var(--accent-600)]" size={20} /> Radar Clienti
            </h1>
            <p className="text-gray-400 text-xs font-bold">
              <span className="text-[var(--accent-600)] font-black">{nClienti}</span> clienti ·{' '}
              <span className="text-amber-500 font-black">{nProspect}</span> prospect · {allMapped.length}/{allContacts.length} mappati
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Itinerario */}
            <button
              onClick={() => { setShowItinerario(true); setItinerarioEverOpened(true); }}
              className="p-2.5 rounded-xl border-2 border-orange-200 text-orange-500 hover:bg-orange-50 transition-all"
              title="Crea itinerario di viaggio"
            >
              <Route size={16} />
            </button>
            {/* AI Cataloga */}
            <button
              onClick={() => setShowAIPanel(true)}
              className="p-2.5 rounded-xl border-2 border-[var(--accent-200)] text-[var(--accent-600)] hover:bg-[var(--accent-50)] transition-all"
              title="AI Cataloga contatti"
            >
              <Sparkles size={16} />
            </button>
            {/* Toggle filtri */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`p-2.5 rounded-xl border-2 transition-all ${showFilters ? 'bg-[var(--accent-600)] border-[var(--accent-600)] text-white' : 'border-gray-200 dark:border-gray-600 text-gray-500'}`}
            >
              <SlidersHorizontal size={16} />
            </button>
            {/* Espandi fullscreen */}
            {onGoFullscreen && (
              <button
                onClick={onGoFullscreen}
                className="p-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-[var(--accent-50)] hover:border-[var(--accent-200)] hover:text-[var(--accent-600)] transition-all"
                title="Espandi a tutto schermo"
              >
                <Maximize2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ── Barra di ricerca ── */}
        <SearchDropdown
          className="mt-3"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cerca cliente o prospect…"
          inputWrapperClassName={() => 'flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-3 py-2.5 focus-within:border-[var(--accent-400)] transition-colors'}
          dropdownClassName="z-[500]"
          onSelect={c => {
            setSearchQuery(c.company);
            setMobileTab('mappa');
            selectSearchContact(c, setFlyToTarget);
          }}
          results={searchResults.map(c => {
            const isCliente = c.status === 'cliente';
            const hasPinned = !!(c.lat && c.lng);
            return {
              key: c.id,
              item: c,
              label: c.company,
              sublabel: c.city || '—',
              badge: {
                text: hasPinned ? (isCliente ? 'Cliente' : 'Prospect') : 'no pin',
                className: hasPinned
                  ? (isCliente ? 'bg-[var(--accent-100)] text-[var(--accent-600)] dark:bg-[var(--accent-900)]/40 dark:text-[var(--accent-300)]' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300')
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400',
              },
            };
          })}
        />
        {locatingContactId && (
          <p className="mt-1.5 text-[10px] text-gray-400 font-bold">Localizzo in mappa…</p>
        )}
        {searchGeocodeError && (
          <p className="mt-1.5 text-[10px] text-red-600 font-bold">{searchGeocodeError}</p>
        )}

        {/* Filtri collassabili */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
            {/* Banner marker cap */}
            {markersCapped && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-3 py-2 flex items-center gap-2">
                <AlertTriangle size={13} className="text-blue-400 flex-shrink-0" />
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                  Mostrati tutti i marker
                </p>
              </div>
            )}

            {/* Banner geocoding */}
            {unmappedWithAddress.length > 0 && !isGeocoding && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    <span className="font-black">{unmappedWithAddress.length}</span> senza coordinate
                  </p>
                </div>
                <button onClick={geocodeContacts} className="flex-shrink-0 bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg">
                  Posiziona
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Raggio:</span>
              <select
                className="border-2 border-gray-100 dark:border-gray-700 rounded-xl px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-xs"
                value={radius} onChange={e => setRadius(Number(e.target.value))}
              >
                {[10, 20, 50, 100, 500].map(r => <option key={r} value={r}>{r} km</option>)}
              </select>
              <button
                onClick={geocodeContacts} disabled={isGeocoding}
                className={`px-3 py-1.5 rounded-xl font-black uppercase text-[10px] transition-all ${isGeocoding ? 'bg-gray-200 text-gray-500' : 'bg-[var(--accent-600)] text-white'}`}
              >
                {isGeocoding ? 'Ricerca…' : 'Trova Coordinate'}
              </button>
              {debugMsg && <span className="text-[10px] text-orange-600 font-bold">{debugMsg}</span>}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {([
                { key: 'tutti',    label: 'Tutti',    count: allMapped.length },
                { key: 'clienti',  label: 'Clienti',  count: nClienti },
                { key: 'prospect', label: 'Prospect', count: nProspect },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setMapFilter(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                    mapFilter === key ? 'bg-[var(--accent-600)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setMapSegmentFilter(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${mapSegmentFilter === null ? 'bg-[var(--accent-600)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
              >
                Tutti
              </button>
              {([
                { key: 'dealer',    icon: '🏪', label: 'Dealer' },
                { key: 'industria', icon: '🏭', label: 'Industria' },
                { key: 'edilizia',  icon: '🏗️', label: 'Edilizia' },
                { key: 'end-user',  icon: '👤', label: 'End User' },
              ] as const).map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => setMapSegmentFilter(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${mapSegmentFilter === key ? 'bg-[var(--accent-600)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                >
                  {icon} {label}
                </button>
              ))}
              <button
                onClick={() => setMapPriorityOnly(p => !p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1 ${mapPriorityOnly ? 'bg-amber-400 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
              >
                <Star size={12} fill={mapPriorityOnly ? 'currentColor' : 'none'} /> Prioritari
              </button>
            </div>

            {/* Filtro provincia */}
            {availableProvinces.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Provincia</span>
                <select
                  value={mapProvinceFilter}
                  onChange={e => setMapProvinceFilter(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 border-0 outline-none cursor-pointer"
                >
                  <option value="">Tutte</option>
                  {availableProvinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {mapProvinceFilter && (
                  <button onClick={() => setMapProvinceFilter('')}
                    className="text-[10px] font-black text-[var(--accent-600)] hover:text-[var(--accent-800)] whitespace-nowrap">
                    Rimuovi
                  </button>
                )}
              </div>
            )}

            {/* Filtro settore */}
            {availableSectors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Settore</span>
                <select
                  value={mapSectorFilter}
                  onChange={e => setMapSectorFilter(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 border-0 outline-none cursor-pointer"
                >
                  <option value="">Tutti</option>
                  {availableSectors.map(s => (
                    <option key={s} value={s}>{sectorLabel(s)}</option>
                  ))}
                </select>
                {mapSectorFilter && (
                  <button onClick={() => setMapSectorFilter('')}
                    className="text-[10px] font-black text-[var(--accent-600)] hover:text-[var(--accent-800)] whitespace-nowrap">
                    Rimuovi
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tab Mappa / Lista (mobile only) ── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-full mb-3 md:hidden flex-shrink-0">
        <button
          onClick={() => setMobileTab('mappa')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${mobileTab === 'mappa' ? 'bg-white dark:bg-gray-700 shadow text-[var(--accent-600)]' : 'text-gray-500'}`}
        >
          <MapIcon size={16} /> Mappa
        </button>
        <button
          onClick={() => setMobileTab('lista')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${mobileTab === 'lista' ? 'bg-white dark:bg-gray-700 shadow text-[var(--accent-600)]' : 'text-gray-500'}`}
        >
          <List size={16} /> Lista
          <span className="text-xs bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/40 text-[var(--accent-600)] px-1.5 py-0.5 rounded-full font-black">{filtered.length}</span>
        </button>
      </div>

      {/* ── Mappa (nascosta su mobile se tab=lista) ── */}
      <div className={`rounded-[2rem] overflow-hidden shadow-xl flex-1 relative z-0 border-4 border-white dark:border-gray-800 ${mobileTab === 'lista' ? 'hidden md:block' : 'block'}`}
        style={{ minHeight: 0 }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={userPos ? 8 : 6}
          style={{ height: '100%', width: '100%' }}
          doubleClickZoom={false}
          preferCanvas
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          {userPos && <ChangeView center={userPos} />}
          {userPos && <Marker position={userPos} icon={userIcon}><Popup><strong>Tu sei qui</strong></Popup></Marker>}
          {userPos && <Circle center={userPos} radius={radius * 1000} pathOptions={{ color: '#4f46e5', fillOpacity: 0.06, dashArray: '6 4' }} />}
          {onGoFullscreen && <DoubleClickHandler onDoubleClick={onGoFullscreen} />}
          <FlyToContact position={flyToTarget} />

          {visibleMarkers.map(c => {
            const isCliente = c.status === 'cliente';
            const distKm = userPos ? calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) : null;
            const popupContent = (
              <Popup minWidth={220}>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isCliente ? 'bg-[var(--accent-100)] text-[var(--accent-700)]' : 'bg-amber-100 text-amber-700'}`}>
                      {isCliente ? '● Cliente' : '◆ Prospect'}
                    </span>
                    {c.sedeLabel && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{c.sedeLabel}</span>}
                    {distKm !== null && <span className="text-[9px] text-gray-400 font-bold">{distKm.toFixed(0)} km</span>}
                  </div>
                  <h4 className="font-black uppercase text-gray-800 text-sm mb-1">{c.company}</h4>
                  {c.address && <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={10} />{c.address}, {c.city}</p>}
                  {c.phone   && <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={10} />{c.phone}</p>}
                  <div className="flex flex-col gap-1.5 pt-2 mt-2 border-t border-gray-100">
                    <button
                      onClick={() => onNavigateToContact(c.id)}
                      className="w-full bg-[var(--accent-600)] text-white py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 hover:bg-[var(--accent-700)]"
                    >
                      <ExternalLink size={10} /> {isCliente ? 'Apri Cliente' : 'Apri Prospect'}
                    </button>
                    <button
                      onClick={() => updateContact(c.id, { priorityToVisit: !c.priorityToVisit })}
                      className={`w-full py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 ${c.priorityToVisit ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                    >
                      <Star size={10} fill={c.priorityToVisit ? 'currentColor' : 'none'} /> {c.priorityToVisit ? 'Prioritario' : 'Segna prioritario'}
                    </button>
                    {c.lat && c.lng && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                        target="_blank" rel="noreferrer"
                        className="w-full bg-gray-100 text-gray-700 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 hover:bg-gray-200"
                      >
                        <Navigation size={10} /> Naviga
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            );
            if (c.priorityToVisit) {
              return (
                <Marker key={c.markerKey} position={[c.lat!, c.lng!]} icon={priorityStarDivIcon(markerIconPx + 2)}>
                  {popupContent}
                </Marker>
              );
            }
            const style = resolveMarkerStyle(c.status, c.segment, mapMarkerStyles);
            return style.shape !== 'circle' ? (
              <Marker key={c.markerKey} position={[c.lat!, c.lng!]} icon={shapeDivIcon(style.shape as MarkerShape, style.color, markerIconPx)}>
                {popupContent}
              </Marker>
            ) : (
              <CircleMarker key={c.markerKey} center={[c.lat!, c.lng!]} radius={markerRadiusPx} pathOptions={contactMarkerStyle(c.status, c.segment, mapMarkerStyles)}>
                {popupContent}
              </CircleMarker>
            );
          })}

        </MapContainer>

        {/* Overlay hint doppio click */}
        {onGoFullscreen && (
          <div className="absolute bottom-3 right-3 z-[400] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-1.5 pointer-events-none">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Maximize2 size={10} /> Doppio click per fullscreen
            </p>
          </div>
        )}

        {/* Geolocalizzazione */}
        <div className="absolute bottom-14 right-3 z-[400] flex flex-col items-end gap-2">
          {geoMsg && (
            <div className="bg-red-600 text-white text-[10px] font-bold rounded-xl px-3 py-2 max-w-[230px] shadow-lg">{geoMsg}</div>
          )}
          <LocateButton locating={isLocating} onClick={locateMe} />
        </div>

        {/* Legenda colori */}
        <div className="absolute top-3 left-3 z-[400] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow pointer-events-none">
          <div className="space-y-1">
            {[
              { color: '#22c55e', label: 'Cliente' },
              { color: '#38bdf8', label: 'Dealer' },
              { color: '#eab308', label: 'Edilizia' },
              { color: '#f87171', label: 'Industria' },
              { color: '#94a3b8', label: 'Non categ.' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div style={{ background: color }} className="w-3 h-3 rounded-full flex-shrink-0" />
                <span className="text-[9px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lista clienti (mobile tab=lista + desktop sidebar) ── */}
      <div className={`flex-1 overflow-y-auto space-y-2 ${mobileTab === 'mappa' ? 'hidden md:hidden' : 'block'} md:hidden`}
        style={{ minHeight: 0 }}
      >
        {listContacts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
            <MapPin size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nessun contatto mappato</p>
            <p className="text-xs text-gray-300 mt-1">Apri i filtri e clicca "Trova Coordinate"</p>
          </div>
        ) : listContacts.map(c => {
          const isCliente = c.status === 'cliente';
          return (
            <div
              key={c.id}
              onClick={() => onNavigateToContact(c.id)}
              className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border-2 cursor-pointer transition-all ${isCliente ? 'border-gray-100 dark:border-gray-700 hover:border-[var(--accent-200)]' : 'border-amber-100 dark:border-amber-900/30 hover:border-amber-300'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCliente ? 'bg-[var(--accent-50)] text-[var(--accent-600)]' : 'bg-amber-50 text-amber-500'}`}>
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm dark:text-white uppercase truncate">{c.company}</p>
                    <p className="text-xs text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="flex-shrink-0" />
                      {c.city || '—'}{c.province ? ` (${c.province})` : ''}
                    </p>
                    {c.phone && (
                      <p className="text-xs text-gray-400 font-bold flex items-center gap-1">
                        <Phone size={11} className="flex-shrink-0" /> {c.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isCliente ? 'bg-[var(--accent-100)] text-[var(--accent-700)]' : 'bg-amber-100 text-amber-700'}`}>
                    {isCliente ? 'Cliente' : 'Prospect'}
                  </span>
                  {c.priorityToVisit && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-white flex items-center gap-0.5">
                      <Star size={9} fill="currentColor" /> Prioritario
                    </span>
                  )}
                  {c.distKm !== null && (
                    <span className="text-[10px] font-black text-gray-400">
                      {c.distKm.toFixed(0)} km
                    </span>
                  )}
                </div>
              </div>
              {c.address && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                  target="_blank" rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 text-xs font-black uppercase hover:bg-[var(--accent-50)] hover:text-[var(--accent-600)] transition-all"
                >
                  <Navigation size={12} /> Naviga
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Nearby summary (solo se mappa visibile) ── */}
      {userPos && nearby.length > 0 && mobileTab === 'mappa' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-2.5 border border-gray-100 dark:border-gray-700 flex items-center gap-3 mt-2 flex-shrink-0">
          <Navigation size={14} className="text-[var(--accent-500)] flex-shrink-0" />
          <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
            <span className="font-black text-gray-900 dark:text-white">{nearby.length}</span> nel raggio di <span className="font-black">{radius} km</span>
            {' · '}<span className="text-[var(--accent-600)] font-black">{nearby.filter(c => c.status === 'cliente').length} clienti</span>
            {' · '}<span className="text-amber-500 font-black">{nearby.filter(c => c.status === 'potenziale').length} prospect</span>
          </p>
        </div>
      )}

      {/* ── Itinerario View — keep-alive: montato una volta, nascosto con display:none ── */}
      {itinerarioEverOpened && (
        <ItinerarioView
          contacts={contacts}
          onClose={() => setShowItinerario(false)}
          isVisible={showItinerario}
          requestedDate={itinRequestedDate}
        />
      )}

      {/* ── AI Catalog Panel ── */}
      {showAIPanel && (
        <AICatalogPanel
          onClose={() => setShowAIPanel(false)}
          onApply={applyAISuggestions}
        />
      )}
    </div>
  );
};
