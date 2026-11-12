import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { ContactSegment } from '../../types';
import { matchSearch, sortByRelevance } from '../../utils/search';
import { MARKER_ICON_PX, MARKER_CIRCLE_RADIUS } from '../../lib/markerShapes';
import { PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { requestPosition, calculateDistance, hasCoords } from './mapShared';
import { HOME, AVG_SPEED_KMH, dateKey, nearestNeighbor } from './itinerarioShared';
import { ItinerarioViewProps } from './ItinerarioView';

// Stato e azioni dell'itinerario: tappe, ordine, orari, posizione e salvataggio in Agenda.
export function useItinerario(props: ItinerarioViewProps) {
  const { contacts, onClose, isVisible, requestedDate } = props;
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
          .filter(hasCoords)
          .filter((c) =>
            matchSearch(searchItinNorm, [c.company, c.contactName, c.city, c.province])
          ), (c) => [c.company, c.contactName])
          .slice(0, 6)
      : [],
    [searchItinNorm, allContactsList]
  );

  const mapped = useMemo(() =>
    Object.values(contacts).filter(hasCoords),
    [contacts]
  );

  const availableProvinces = useMemo(() =>
    [...new Set(mapped.map((c) => c.province).filter(Boolean))].sort() as string[]
  , [mapped]);
  const availableSectors = useMemo(() =>
    [...new Set(mapped.map((c) => c.sector).filter(Boolean))].sort() as string[]
  , [mapped]);

  const visible = useMemo(() => mapped.filter((c) => {
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
    () => onlyRouteOnMap ? visible.filter((c) => selectedIds.includes(c.id)) : visible,
    [visible, onlyRouteOnMap, selectedIds]
  );

  const toggle = (id: string) =>
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (next.length > 0) setSheetOpen(true);
      return next;
    });

  const optimizedRoute = useMemo(() =>
    nearestNeighbor(selectedIds.map(id => contacts[id]).filter(hasCoords).map((c) => ({ id: c.id, lat: c.lat, lng: c.lng }))),
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
      .filter((a) =>
        (a.type === 'visita' || a.type === 'sopralluogo') &&
        dateKey(a.date) === date &&
        contacts[a.contactId]?.lat && contacts[a.contactId]?.lng
      )
      .sort((a, b) => a.date - b.date)
      .filter((a) => {
        if (seenContacts.has(a.contactId)) return false; // una sola tappa per cliente/giorno
        seenContacts.add(a.contactId);
        return true;
      });
    if (saved.length === 0) return; // magari Firestore non ha ancora sincronizzato: riprova al prossimo update

    const ids = saved.map((a) => a.contactId as string);
    setSelectedIds(ids);
    setManualOrder(ids);
    const times: Record<string, string> = {};
    saved.forEach((a) => {
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
    const byId: Record<string, typeof optimizedRoute[number]> = {};
    optimizedRoute.forEach((s) => { byId[s.id] = s; });
    const ordered = manualOrder.filter(id => byId[id]).map(id => byId[id]);
    const extras = optimizedRoute.filter((s) => !manualOrder.includes(s.id));
    return [...ordered, ...extras];
  }, [optimizedRoute, manualOrder]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentOrder = activeRoute.map((s) => s.id as string);
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    setManualOrder(arrayMove(currentOrder, oldIndex, newIndex));
  };

  const legs = useMemo(() => {
    let cum = 0, cumMins = 0, prevLat = HOME.lat, prevLng = HOME.lng;
    return activeRoute.map((s) => {
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
      ? [[HOME.lat, HOME.lng], ...activeRoute.map((s) => [s.lat, s.lng] as [number, number])]
      : [],
    [activeRoute]
  );

  // Fetch real road geometry from OSRM whenever the route changes
  useEffect(() => {
    if (activeRoute.length === 0) { setRoadRouteCoords([]); return; }
    const waypoints = [[HOME.lng, HOME.lat], ...activeRoute.map((s) => [s.lng, s.lat])];
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
      activeRoute.map((s) => `${s.lat},${s.lng}`).join('/');
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
      .filter((a) =>
        dateKey(a.date) === date &&
        (a.id.startsWith('act_itin_') || ((a.type === 'visita' || a.type === 'sopralluogo') && stopIds.has(a.contactId)))
      )
      .forEach((a) => deleteActivity(a.id));

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
  return { contacts, onClose, isVisible, requestedDate, addActivity, deleteActivity, activities, mapMarkerStyles, mapMarkerSize, markerIconPx, markerRadiusPx, today, date, setDate, onlyRouteOnMap, setOnlyRouteOnMap, lastRequestNonceRef, selectedIds, setSelectedIds, sheetOpen, setSheetOpen, filterStatus, setFilterStatus, filterSegment, setFilterSegment, filterPriorityOnly, setFilterPriorityOnly, filterProvince, setFilterProvince, filterSector, setFilterSector, showFiltersBar, setShowFiltersBar, startTime, setStartTime, visitDuration, setVisitDuration, savedToAgenda, setSavedToAgenda, customTimes, setCustomTimes, searchItinQuery, setSearchItinQuery, itinFlyTo, setItinFlyTo, manualOrder, setManualOrder, roadRouteCoords, setRoadRouteCoords, loadedItinDateRef, itinUserPos, setItinUserPos, itinLocating, setItinLocating, itinGeoMsg, setItinGeoMsg, locateItin, allContactsList, searchItinNorm, itinSearchResults, mapped, availableProvinces, availableSectors, visible, itinActiveFilterCount, mapMarkersToShow, toggle, optimizedRoute, activeRoute, dndSensors, handleDragEnd, legs, totalKm, effectiveTimes, routeCoords, googleMapsUrl, addToAgenda };
}

export type ItinerarioModel = ReturnType<typeof useItinerario>;
