import { apiAuthHeaders } from '../../lib/apiAuth';
import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { ContactSegment } from '../../types';
import { CatalogSuggestion } from '../../hooks/useAICatalog';
import { matchSearch, sortByRelevance } from '../../utils/search';
import { MARKER_ICON_PX, MARKER_CIRCLE_RADIUS } from '../../lib/markerShapes';
import { MapViewProps } from '../../views/MapView';
import { requestPosition, calculateDistance } from './mapShared';

type MapFilter = 'tutti' | 'clienti' | 'prospect';
type MobileTab = 'mappa' | 'lista';

// Stato, posizione, filtri e geocodifica della vista Mappa.
export function useMapView(props: MapViewProps) {
  const { onNavigateToContact, isFullscreen, onGoFullscreen, onExitFullscreen, initialItineraryDate, onItineraryDateConsumed } = props;
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
        const res = await fetch(`/api/geocode?${params}`, { headers: await apiAuthHeaders() });
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
      const res = await fetch(`/api/geocode?${params}`, { headers: await apiAuthHeaders() });
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
  return { onNavigateToContact, isFullscreen, onGoFullscreen, onExitFullscreen, initialItineraryDate, onItineraryDateConsumed, contacts, updateContact, mapMarkerStyles, mapMarkerSize, markerIconPx, markerRadiusPx, userPos, setUserPos, radius, setRadius, isGeocoding, setIsGeocoding, debugMsg, setDebugMsg, locatingContactId, setLocatingContactId, searchGeocodeError, setSearchGeocodeError, mapFilter, setMapFilter, mapSegmentFilter, setMapSegmentFilter, mapProvinceFilter, setMapProvinceFilter, mapSectorFilter, setMapSectorFilter, mapPriorityOnly, setMapPriorityOnly, mobileTab, setMobileTab, showFilters, setShowFilters, showAIPanel, setShowAIPanel, showItinerario, setShowItinerario, itinerarioEverOpened, setItinerarioEverOpened, itinRequestedDate, setItinRequestedDate, searchQuery, setSearchQuery, flyToTarget, setFlyToTarget, isLocating, setIsLocating, geoMsg, setGeoMsg, saveUserPos, locateMe, applyAISuggestions, geocodeContacts, selectSearchContact, allContacts, allMapped, nClienti, nProspect, searchNorm, searchResults, filtered, availableProvinces, availableSectors, nearby, listContacts, unmappedWithAddress, defaultCenter, visibleMarkers, markersCapped };
}

export type MapViewModel = ReturnType<typeof useMapView>;
