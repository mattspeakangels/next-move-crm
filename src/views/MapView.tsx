import { apiAuthHeaders } from '../lib/apiAuth';
import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, Marker, CircleMarker, Popup, Circle, ZoomControl } from 'react-leaflet';
import { useStore } from '../store/useStore';
import { ContactSegment } from '../types';
import { MapPin, Navigation, Phone, AlertTriangle, ExternalLink, Maximize2, X, SlidersHorizontal, List, Map as MapIcon, Building2, Sparkles, Route, Star } from 'lucide-react';
import { CatalogSuggestion } from '../hooks/useAICatalog';
import { MapBaseLayer, MapStyleButton } from '../components/ui/MapStyleControl';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../utils/search';
import { MarkerShape, DEFAULT_MARKER_STYLE, shapeDivIcon, priorityStarDivIcon, MARKER_ICON_PX, MARKER_CIRCLE_RADIUS } from '../lib/markerShapes';
import { sectorLabel } from '../lib/sectors';
import { resolveMarkerStyle, contactMarkerStyle, userIcon, ChangeView, DoubleClickHandler, FlyToContact, LocateButton, requestPosition, calculateDistance } from '../components/map/mapShared';
import { ItinerarioView } from '../components/map/ItinerarioView';
import { AICatalogPanel } from '../components/map/AICatalogPanel';
import 'leaflet/dist/leaflet.css';

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
  if (isFullscreen) {
    return (
      <DialogFrame className="fixed inset-0 z-50 bg-black overflow-hidden">
        <MapContainer
          center={defaultCenter}
          zoom={userPos ? 8 : 6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          doubleClickZoom={false}
          preferCanvas
        >
          <ZoomControl position="bottomright" />
          <MapBaseLayer />
          {userPos && <ChangeView center={userPos} />}
          {userPos && <Marker position={userPos} icon={userIcon}><Popup><strong>Tu sei qui</strong></Popup></Marker>}
          {userPos && <Circle center={userPos} radius={radius * 1000} pathOptions={{ color: '#c08d62', fillOpacity: 0.06, dashArray: '6 4' }} />}
          <DoubleClickHandler onDoubleClick={() => onExitFullscreen?.()} />
          <FlyToContact position={flyToTarget} />
          {visibleMarkers.map(c => {
            const isCliente = c.status === 'cliente';
            const distKm = userPos ? calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) : null;
            const popupContent = (
              <Popup minWidth={220}>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${isCliente ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning'}`}>
                      {isCliente ? '● Cliente' : '◆ Prospect'}
                    </span>
                    {c.sedeLabel && <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-raised text-secondary">{c.sedeLabel}</span>}
                    {distKm !== null && <span className="text-xs text-muted font-bold">{distKm.toFixed(0)} km</span>}
                  </div>
                  <h4 className="font-semibold uppercase text-foreground text-sm mb-1">{c.company}</h4>
                  {c.address && <p className="text-xs text-secondary flex items-center gap-1"><MapPin size={10} />{c.address}, {c.city}</p>}
                  {c.phone   && <p className="text-xs text-secondary flex items-center gap-1 mt-0.5"><Phone size={10} />{c.phone}</p>}
                  <button
                    onClick={() => onNavigateToContact(c.id)}
                    className="mt-2 w-full bg-action text-action-foreground py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={10} /> {isCliente ? 'Apri Cliente' : 'Apri Prospect'}
                  </button>
                  <button
                    onClick={() => updateContact(c.id, { priorityToVisit: !c.priorityToVisit })}
                    className={`mt-1 w-full py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5 ${c.priorityToVisit ? 'bg-warning text-status-foreground' : 'bg-warning-soft text-warning'}`}
                  >
                    <Star size={10} fill={c.priorityToVisit ? 'currentColor' : 'none'} /> {c.priorityToVisit ? 'Prioritario' : 'Segna prioritario'}
                  </button>
                  {c.lat && c.lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                      target="_blank" rel="noreferrer"
                      className="mt-1 w-full bg-raised text-foreground py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5"
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

        <MapStyleButton className="bottom-20 left-4" />

        {/* Filtri in alto, ricerca sotto: il dropdown dei risultati si apre libero, senza coprire/essere coperto dai filtri */}
        <div className="absolute top-[calc(env(safe-area-inset-top)+4.25rem)] left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(40rem,calc(100%-2rem))] z-[1000] flex flex-col items-stretch gap-2">
        {/* Filtri separati dalla ricerca e limitati in altezza sui telefoni. */}
        {showFilters && <div id="fullscreen-map-filters" className="flex items-center gap-2 flex-wrap max-h-[30dvh] overflow-y-auto overscroll-contain bg-surface/95 rounded-panel p-2 shadow-panel">
          {/* Toggle clienti/tutti/prospect */}
          <div className="bg-surface/90 backdrop-blur-sm rounded-panel p-1 flex gap-1 shadow-panel">
            {(['tutti', 'clienti', 'prospect'] as const).map(f => (
              <button key={f} onClick={() => setMapFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${mapFilter === f ? 'bg-action text-action-foreground' : 'text-secondary hover:bg-raised'}`}>
                {f === 'tutti' ? 'Tutti' : f === 'clienti' ? 'Clienti' : 'Prospect'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMapPriorityOnly(p => !p)}
            className={`px-3 py-1.5 rounded-panel text-xs font-semibold uppercase transition-all flex items-center gap-1 shadow-panel ${mapPriorityOnly ? 'bg-warning text-status-foreground' : 'bg-surface/90 backdrop-blur-sm text-secondary'}`}
          >
            <Star size={14} fill={mapPriorityOnly ? 'currentColor' : 'none'} /> Prioritari
          </button>

          {/* Filtro provincia */}
          {availableProvinces.length > 0 && (
            <select
              value={mapProvinceFilter}
              onChange={e => setMapProvinceFilter(e.target.value)}
              className="min-w-0 max-w-full flex-1 bg-surface/90 backdrop-blur-sm rounded-panel px-3 py-2 text-xs font-semibold text-foreground shadow-panel border-0 outline-none cursor-pointer"
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
              className="min-w-0 max-w-full flex-1 bg-surface/90 backdrop-blur-sm rounded-panel px-3 py-2 text-xs font-semibold text-foreground shadow-panel border-0 outline-none cursor-pointer"
            >
              <option value="">Tutti i settori</option>
              {availableSectors.map(s => (
                <option key={s} value={s}>{sectorLabel(s)}</option>
              ))}
            </select>
          )}
        </div>}

        {/* Barra di ricerca fullscreen */}
        <div className="w-full min-w-0">
          <SearchDropdown
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cerca cliente o prospect…"
            inputWrapperClassName={() => 'flex items-center gap-2 bg-surface/90 backdrop-blur-sm border-0 rounded-panel px-3 py-2.5 shadow-panel focus-within:ring-2 focus-within:ring-accent transition-all'}
            dropdownClassName="z-[1100] [&>div:last-child]:max-h-[25dvh]"
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
                    ? (isCliente ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning')
                    : 'bg-raised text-muted',
                },
              };
            })}
          />
          {locatingContactId && (
            <p className="mt-1.5 ml-1 text-xs text-foreground font-bold drop-shadow">Localizzo in mappa…</p>
          )}
          {searchGeocodeError && (
            <p className="mt-1.5 ml-1 text-xs bg-danger text-status-foreground font-bold rounded-md px-3 py-1.5 shadow-panel inline-block">{searchGeocodeError}</p>
          )}
        </div>

        </div>

        <button
          type="button"
          aria-expanded={showFilters}
          aria-controls="fullscreen-map-filters"
          onClick={() => setShowFilters(v => !v)}
          className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-3 z-[1000] min-h-11 bg-surface/95 text-foreground rounded-panel px-3 shadow-panel flex items-center gap-2 text-xs font-semibold"
        >
          <SlidersHorizontal size={16} /> Filtri
        </button>

        {/* Bottone chiudi */}
        <button
          onClick={onExitFullscreen}
          className="absolute top-[calc(env(safe-area-inset-top)+1rem)] right-3 z-[1000] bg-surface/90 backdrop-blur-sm text-foreground rounded-panel px-4 py-2.5 font-semibold uppercase text-xs flex items-center gap-2 shadow-panel"
        >
          <X size={16} /> Chiudi
        </button>

        {/* Geolocalizzazione */}
        <div className="absolute bottom-28 right-3 z-[1000] flex flex-col items-end gap-2">
          {geoMsg && (
            <div className="bg-danger text-status-foreground text-xs font-bold rounded-md px-3 py-2 max-w-[230px] shadow-panel">{geoMsg}</div>
          )}
          <LocateButton locating={isLocating} onClick={locateMe} />
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-3 right-14 md:right-auto z-[1000] bg-surface/90 backdrop-blur-sm rounded-panel px-4 py-2.5 shadow-panel">
          <p className="text-xs font-semibold text-foreground">
            <span className="text-accent">{nClienti}</span> clienti ·{' '}
            <span className="text-warning">{nProspect}</span> prospect
          </p>
          {markersCapped && (
            <p className="text-xs text-warning font-bold mt-0.5">
              Mostrati tutti i marker
            </p>
          )}
          <p className="text-xs text-muted font-bold mt-0.5">Doppio click per uscire</p>
        </div>
      </DialogFrame>
    );
  }

  // ── NORMAL MODE ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-w-0 flex-col min-h-[calc(100dvh-140px)] md:h-[calc(100dvh-88px)] md:min-h-[38rem]">

      {/* ── Header compatto ── */}
      <div className="bg-surface dark:bg-surface rounded-[1.5rem] px-4 py-3 shadow-sm border border-line dark:border-line mb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-lg  dark:text-foreground   flex items-center gap-2">
              <Navigation className="text-accent" size={20} /> Radar Clienti
            </h1>
            <p className="text-muted text-xs font-bold">
              <span className="text-accent font-semibold">{nClienti}</span> clienti ·{' '}
              <span className="text-warning font-semibold">{nProspect}</span> prospect · {allMapped.length}/{allContacts.length} mappati
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Itinerario */}
            <button
              onClick={() => { setShowItinerario(true); setItinerarioEverOpened(true); }}
              className="p-2.5 rounded-md border-2 border-warning text-warning hover:bg-warning-soft transition-all"
              title="Crea itinerario di viaggio"
            >
              <Route size={16} />
            </button>
            {/* AI Cataloga */}
            <button
              onClick={() => setShowAIPanel(true)}
              className="p-2.5 rounded-md border-2 border-accent text-accent hover:bg-accent-soft transition-all"
              title="AI Cataloga contatti"
            >
              <Sparkles size={16} />
            </button>
            {/* Toggle filtri */}
            <button
              onClick={() => setShowFilters(v => !v)}
              aria-label="Filtri mappa"
              aria-expanded={showFilters}
              aria-controls="map-filters"
              className={`p-2.5 rounded-xl border-2 transition-all ${showFilters ? 'bg-action border-accent text-action-foreground' : 'border-line dark:border-line text-secondary'}`}
            >
              <SlidersHorizontal size={16} />
            </button>
            {/* Espandi fullscreen */}
            {onGoFullscreen && (
              <button
                onClick={onGoFullscreen}
                className="p-2.5 rounded-md border-2 border-line dark:border-line text-secondary hover:bg-accent-soft hover:border-accent hover:text-accent transition-all"
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
          inputWrapperClassName={() => 'flex items-center gap-2 bg-canvas dark:bg-raised border-2 border-line dark:border-line rounded-panel px-3 py-2.5 focus-within:border-accent transition-colors'}
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
                  ? (isCliente ? 'bg-accent-soft text-accent dark:bg-accent-soft/40 dark:text-accent' : 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning')
                  : 'bg-raised text-muted dark:bg-raised dark:text-muted',
              },
            };
          })}
        />
        {locatingContactId && (
          <p className="mt-1.5 text-xs text-muted font-bold">Localizzo in mappa…</p>
        )}
        {searchGeocodeError && (
          <p className="mt-1.5 text-xs text-danger font-bold">{searchGeocodeError}</p>
        )}

        {/* Filtri collassabili */}
        {showFilters && (
          <div id="map-filters" className="mt-3 pt-3 max-h-[40dvh] overflow-y-auto overscroll-contain border-t border-line dark:border-line space-y-3">
            {/* Banner marker cap */}
            {markersCapped && (
              <div className="bg-accent-soft dark:bg-accent-soft/20 border border-accent dark:border-accent rounded-md px-3 py-2 flex items-center gap-2">
                <AlertTriangle size={13} className="text-accent flex-shrink-0" />
                <p className="text-xs font-bold text-accent dark:text-accent">
                  Mostrati tutti i marker
                </p>
              </div>
            )}

            {/* Banner geocoding */}
            {unmappedWithAddress.length > 0 && !isGeocoding && (
              <div className="bg-warning-soft dark:bg-warning-soft border border-warning dark:border-warning rounded-md px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-warning flex-shrink-0" />
                  <p className="text-xs font-bold text-warning dark:text-warning">
                    <span className="font-black">{unmappedWithAddress.length}</span> senza coordinate
                  </p>
                </div>
                <button onClick={geocodeContacts} className="flex-shrink-0 bg-warning text-status-foreground text-xs font-semibold uppercase px-3 py-1.5 rounded-lg">
                  Posiziona
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-muted uppercase tracking-normal">Raggio:</span>
              <select
                className="border-2 border-line dark:border-line rounded-md px-2 py-1.5 bg-surface dark:bg-surface dark:text-foreground font-bold outline-none text-xs"
                value={radius} onChange={e => setRadius(Number(e.target.value))}
              >
                {[10, 20, 50, 100, 500].map(r => <option key={r} value={r}>{r} km</option>)}
              </select>
              <button
                onClick={geocodeContacts} disabled={isGeocoding}
                className={`px-3 py-1.5 rounded-md font-semibold uppercase text-xs transition-all ${isGeocoding ? 'bg-raised text-secondary' : 'bg-action text-action-foreground'}`}
              >
                {isGeocoding ? 'Ricerca…' : 'Trova Coordinate'}
              </button>
              {debugMsg && <span className="text-xs text-warning font-bold">{debugMsg}</span>}
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
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${
                    mapFilter === key ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary dark:text-muted'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setMapSegmentFilter(null)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${mapSegmentFilter === null ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
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
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${mapSegmentFilter === key ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
                >
                  {icon} {label}
                </button>
              ))}
              <button
                onClick={() => setMapPriorityOnly(p => !p)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-1 ${mapPriorityOnly ? 'bg-warning text-status-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
              >
                <Star size={12} fill={mapPriorityOnly ? 'currentColor' : 'none'} /> Prioritari
              </button>
            </div>

            {/* Filtro provincia */}
            {availableProvinces.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-normal whitespace-nowrap">Provincia</span>
                <select
                  value={mapProvinceFilter}
                  onChange={e => setMapProvinceFilter(e.target.value)}
                  className="min-w-0 flex-1 px-3 py-1.5 bg-raised dark:bg-raised rounded-md text-xs font-bold text-foreground dark:text-muted border-0 outline-none cursor-pointer"
                >
                  <option value="">Tutte</option>
                  {availableProvinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {mapProvinceFilter && (
                  <button onClick={() => setMapProvinceFilter('')}
                    className="text-xs font-semibold text-accent hover:text-accent whitespace-nowrap">
                    Rimuovi
                  </button>
                )}
              </div>
            )}

            {/* Filtro settore */}
            {availableSectors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-normal whitespace-nowrap">Settore</span>
                <select
                  value={mapSectorFilter}
                  onChange={e => setMapSectorFilter(e.target.value)}
                  className="min-w-0 flex-1 px-3 py-1.5 bg-raised dark:bg-raised rounded-md text-xs font-bold text-foreground dark:text-muted border-0 outline-none cursor-pointer"
                >
                  <option value="">Tutti</option>
                  {availableSectors.map(s => (
                    <option key={s} value={s}>{sectorLabel(s)}</option>
                  ))}
                </select>
                {mapSectorFilter && (
                  <button onClick={() => setMapSectorFilter('')}
                    className="text-xs font-semibold text-accent hover:text-accent whitespace-nowrap">
                    Rimuovi
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tab Mappa / Lista (mobile only) ── */}
      <div className="flex gap-1 bg-raised dark:bg-surface p-1 rounded-panel w-full mb-3 md:hidden flex-shrink-0">
        <button
          onClick={() => setMobileTab('mappa')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold uppercase tracking-wide transition-all ${mobileTab === 'mappa' ? 'bg-surface dark:bg-raised shadow text-accent' : 'text-secondary'}`}
        >
          <MapIcon size={16} /> Mappa
        </button>
        <button
          onClick={() => setMobileTab('lista')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold uppercase tracking-wide transition-all ${mobileTab === 'lista' ? 'bg-surface dark:bg-raised shadow text-accent' : 'text-secondary'}`}
        >
          <List size={16} /> Lista
          <span className="text-xs bg-accent-soft dark:bg-accent-soft/40 text-accent px-1.5 py-0.5 rounded-full font-semibold">{filtered.length}</span>
        </button>
      </div>

      {/* ── Mappa (nascosta su mobile se tab=lista) ── */}
      <div className={`rounded-panel overflow-hidden shadow-panel h-[55dvh] min-h-[18rem] flex-none md:h-auto md:min-h-0 md:flex-1 relative z-0 border-4 border-line dark:border-line ${mobileTab === 'lista' ? 'hidden md:block' : 'block'}`}
      >
        <MapContainer
          center={defaultCenter}
          zoom={userPos ? 8 : 6}
          style={{ height: '100%', width: '100%' }}
          doubleClickZoom={false}
          preferCanvas
        >
          <MapBaseLayer />
          {userPos && <ChangeView center={userPos} />}
          {userPos && <Marker position={userPos} icon={userIcon}><Popup><strong>Tu sei qui</strong></Popup></Marker>}
          {userPos && <Circle center={userPos} radius={radius * 1000} pathOptions={{ color: '#c08d62', fillOpacity: 0.06, dashArray: '6 4' }} />}
          {onGoFullscreen && <DoubleClickHandler onDoubleClick={onGoFullscreen} />}
          <FlyToContact position={flyToTarget} />

          {visibleMarkers.map(c => {
            const isCliente = c.status === 'cliente';
            const distKm = userPos ? calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) : null;
            const popupContent = (
              <Popup minWidth={220}>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${isCliente ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning'}`}>
                      {isCliente ? '● Cliente' : '◆ Prospect'}
                    </span>
                    {c.sedeLabel && <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-raised text-secondary">{c.sedeLabel}</span>}
                    {distKm !== null && <span className="text-xs text-muted font-bold">{distKm.toFixed(0)} km</span>}
                  </div>
                  <h4 className="font-semibold uppercase text-foreground text-sm mb-1">{c.company}</h4>
                  {c.address && <p className="text-xs text-secondary flex items-center gap-1"><MapPin size={10} />{c.address}, {c.city}</p>}
                  {c.phone   && <p className="text-xs text-secondary flex items-center gap-1 mt-0.5"><Phone size={10} />{c.phone}</p>}
                  <div className="flex flex-col gap-1.5 pt-2 mt-2 border-t border-line">
                    <button
                      onClick={() => onNavigateToContact(c.id)}
                      className="w-full bg-action text-action-foreground py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5 hover:bg-action-hover"
                    >
                      <ExternalLink size={10} /> {isCliente ? 'Apri Cliente' : 'Apri Prospect'}
                    </button>
                    <button
                      onClick={() => updateContact(c.id, { priorityToVisit: !c.priorityToVisit })}
                      className={`w-full py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5 ${c.priorityToVisit ? 'bg-warning text-status-foreground hover:bg-warning' : 'bg-warning-soft text-warning hover:bg-warning-soft'}`}
                    >
                      <Star size={10} fill={c.priorityToVisit ? 'currentColor' : 'none'} /> {c.priorityToVisit ? 'Prioritario' : 'Segna prioritario'}
                    </button>
                    {c.lat && c.lng && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                        target="_blank" rel="noreferrer"
                        className="w-full bg-raised text-foreground py-1.5 rounded-lg font-semibold uppercase text-xs tracking-normal flex items-center justify-center gap-1.5 hover:bg-raised"
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

        <MapStyleButton className="bottom-3 left-3" />

        {/* Overlay hint doppio click */}
        {onGoFullscreen && (
          <div className="absolute bottom-3 right-3 z-[400] hidden md:block bg-surface/80 dark:bg-surface/80 backdrop-blur-sm rounded-md px-3 py-1.5 pointer-events-none">
            <p className="text-xs font-semibold text-secondary uppercase tracking-normal flex items-center gap-1.5">
              <Maximize2 size={10} /> Doppio click per fullscreen
            </p>
          </div>
        )}

        {/* Geolocalizzazione */}
        <div className="absolute bottom-14 right-3 z-[400] flex flex-col items-end gap-2">
          {geoMsg && (
            <div className="bg-danger text-status-foreground text-xs font-bold rounded-md px-3 py-2 max-w-[230px] shadow-panel">{geoMsg}</div>
          )}
          <LocateButton locating={isLocating} onClick={locateMe} />
        </div>

        {/* Legenda colori */}
        <div className="absolute top-3 right-3 z-[400] bg-surface/90 dark:bg-canvas/90 backdrop-blur-sm rounded-md px-3 py-2 shadow pointer-events-none">
          <div className="space-y-1">
            {([
              { category: 'cliente', label: 'Cliente' },
              { category: 'dealer', label: 'Dealer' },
              { category: 'edilizia', label: 'Edilizia' },
              { category: 'industria', label: 'Industria' },
              { category: 'altro', label: 'Non categ.' },
            ] as const).map(({ category, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div style={{ background: mapMarkerStyles[category]?.color || DEFAULT_MARKER_STYLE[category].color }} className="w-3 h-3 rounded-full flex-shrink-0" />
                <span className="text-xs font-medium text-secondary">{label}</span>
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
          <div className="text-center py-12 bg-surface dark:bg-surface rounded-panel">
            <MapPin size={32} className="mx-auto mb-3 text-muted" />
            <p className="text-sm font-bold text-muted uppercase tracking-normal">Nessun contatto mappato</p>
            <p className="text-xs text-muted mt-1">Apri i filtri e clicca "Trova Coordinate"</p>
          </div>
        ) : listContacts.map(c => {
          const isCliente = c.status === 'cliente';
          return (
            <div
              key={c.id}
              onClick={() => onNavigateToContact(c.id)}
              className={`bg-surface dark:bg-surface rounded-panel p-4 shadow-sm border-2 cursor-pointer transition-all ${isCliente ? 'border-line dark:border-line hover:border-accent' : 'border-warning dark:border-warning hover:border-warning'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCliente ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning'}`}>
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm dark:text-foreground uppercase truncate">{c.company}</p>
                    <p className="text-xs text-muted font-bold flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="flex-shrink-0" />
                      {c.city || '—'}{c.province ? ` (${c.province})` : ''}
                    </p>
                    {c.phone && (
                      <p className="text-xs text-muted font-bold flex items-center gap-1">
                        <Phone size={11} className="flex-shrink-0" /> {c.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${isCliente ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning'}`}>
                    {isCliente ? 'Cliente' : 'Prospect'}
                  </span>
                  {c.priorityToVisit && (
                    <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-warning text-status-foreground flex items-center gap-0.5">
                      <Star size={9} fill="currentColor" /> Prioritario
                    </span>
                  )}
                  {c.distKm !== null && (
                    <span className="text-xs font-semibold text-muted">
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
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-md bg-canvas dark:bg-raised text-secondary text-xs font-semibold uppercase hover:bg-accent-soft hover:text-accent transition-all"
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
        <div className="bg-surface dark:bg-surface rounded-panel px-4 py-2.5 border border-line dark:border-line flex items-center gap-3 mt-2 flex-shrink-0">
          <Navigation size={14} className="text-accent flex-shrink-0" />
          <p className="text-xs font-bold text-secondary dark:text-muted">
            <span className="font-semibold text-foreground dark:text-foreground">{nearby.length}</span> nel raggio di <span className="font-black">{radius} km</span>
            {' · '}<span className="text-accent font-semibold">{nearby.filter(c => c.status === 'cliente').length} clienti</span>
            {' · '}<span className="text-warning font-semibold">{nearby.filter(c => c.status === 'potenziale').length} prospect</span>
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
