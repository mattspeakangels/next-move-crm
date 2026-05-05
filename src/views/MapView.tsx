import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useStore } from '../store/useStore';
import { MapPin, Navigation, Phone, AlertTriangle, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Icone colorate via divIcon ─────────────────────────────────────────────────

const makeIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:28px; height:28px; border-radius:50% 50% 50% 0;
      background:${color}; border:3px solid white;
      transform:rotate(-45deg); box-shadow:0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });

const clienteIcon  = makeIcon('#4f46e5'); // indigo
const prospectIcon = makeIcon('#f59e0b'); // amber
const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:20px; height:20px; border-radius:50%;
    background:#ef4444; border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 8); }, [center]);
  return null;
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Component ─────────────────────────────────────────────────────────────────

type MapFilter = 'tutti' | 'clienti' | 'prospect';

interface MapViewProps {
  onNavigateToContact: (contactId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({ onNavigateToContact }) => {
  const { contacts, updateContact } = useStore();
  const [userPos, setUserPos]     = useState<[number, number] | null>(null);
  const [radius, setRadius]       = useState(50);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [debugMsg, setDebugMsg]   = useState('');
  const [mapFilter, setMapFilter] = useState<MapFilter>('tutti');

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      ()  => setDebugMsg('GPS non autorizzato — posizione non disponibile')
    );
  }, []);

  const geocodeContacts = async () => {
    setIsGeocoding(true);
    setDebugMsg('Ricerca coordinate in corso…');
    let ok = 0, fail = 0;
    const toGeocode = Object.values(contacts).filter(c => !c.lat && !c.lng && (c.address || c.city));
    console.log('Clienti da geocodificare:', toGeocode.length);
    
    for (const c of toGeocode) {
      const address = `${c.address || ''} ${c.city || ''}`.trim();
      if (!address) continue;
      
      try {
        const q   = encodeURIComponent(`${address}, Italy`);
        console.log('Geocodificando:', address);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, { headers: { 'User-Agent': 'NextMoveCRM' } });
        const data = await res.json();
        if (data?.length > 0) { 
          console.log('Trovato:', c.company, data[0].lat, data[0].lon);
          updateContact(c.id, { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }); 
          ok++; 
        } else {
          console.log('Non trovato:', address);
          fail++;
        }
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error('Errore geocodifica:', err);
        fail++;
      }
    }
    setIsGeocoding(false);
    setDebugMsg(`Trovate: ${ok}, Non trovate: ${fail}`);
  };

  const allContacts = Object.values(contacts);
  const allMapped   = allContacts.filter(c => c.lat && c.lng);

  const filtered = allMapped.filter(c => {
    if (mapFilter === 'clienti')  return c.status === 'cliente';
    if (mapFilter === 'prospect') return c.status === 'potenziale';
    return true;
  });

  const nearby = userPos
    ? filtered.filter(c => calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) <= radius)
    : [];

  const nClienti  = allMapped.filter(c => c.status === 'cliente').length;
  const nProspect = allMapped.filter(c => c.status === 'potenziale').length;

  const defaultCenter: [number, number] = userPos ?? [41.9, 12.5]; // default: Roma

  const unmappedWithAddress = allContacts.filter(c => !c.lat && !c.lng && (c.address || c.city));
  
  // Debug
  React.useEffect(() => {
    console.log('📍 MapView Debug:', {
      totalContacts: allContacts.length,
      mapped: allMapped.length,
      unmappedWithAddress: unmappedWithAddress.length,
      sample: unmappedWithAddress.slice(0, 3).map(c => ({ company: c.company, address: c.address, city: c.city }))
    });
  }, [allContacts, allMapped, unmappedWithAddress]);

  return (
    <div className="h-[calc(100vh-120px)] space-y-4 flex flex-col">

      {/* ── Banner geocoding needed ── */}
      {unmappedWithAddress.length > 0 && !isGeocoding && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              <span className="font-black">{unmappedWithAddress.length}</span> clienti con indirizzo non ancora posizionati sulla mappa
            </p>
          </div>
          <button
            onClick={geocodeContacts}
            className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors"
          >
            Posiziona ora
          </button>
        </div>
      )}

      {/* ── Controls ── */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] flex flex-col gap-4 shadow-sm border border-gray-50 dark:border-gray-700">

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <Navigation className="text-indigo-600" /> Radar Clienti
            </h1>
            <p className="text-gray-400 text-sm font-bold mt-0.5">
              <span className="text-indigo-600 font-black">{nClienti}</span> clienti ·{' '}
              <span className="text-amber-500 font-black">{nProspect}</span> prospect · mappati {allMapped.length}/{allContacts.length}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {debugMsg && (
              <div className="bg-orange-50 text-orange-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={13} /> {debugMsg}
              </div>
            )}
            <select
              className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-3 py-2.5 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-sm"
              value={radius} onChange={e => setRadius(Number(e.target.value))}
            >
              {[10, 20, 50, 100, 500].map(r => <option key={r} value={r}>{r} km</option>)}
            </select>
            <button
              onClick={geocodeContacts} disabled={isGeocoding}
              className={`px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isGeocoding ? 'bg-gray-200 text-gray-500' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'}`}
            >
              {isGeocoding ? 'Ricerca…' : 'Trova Coordinate'}
            </button>
          </div>
        </div>

        {/* ── Filtro tipo ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Mostra:</span>
          {([
            { key: 'tutti',    label: 'Tutti',    count: allMapped.length,  color: 'indigo' },
            { key: 'clienti',  label: 'Clienti',  count: nClienti,           color: 'indigo' },
            { key: 'prospect', label: 'Prospect', count: nProspect,          color: 'amber'  },
          ] as const).map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => setMapFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${
                mapFilter === key
                  ? color === 'amber'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-400'
              }`}
            >
              {key === 'clienti'  && <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />}
              {key === 'prospect' && <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />}
              {key === 'tutti'    && <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />}
              {label} <span className="opacity-70">({count})</span>
            </button>
          ))}

          {/* Legenda */}
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-400 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" /> Clienti
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Prospect
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Tu
            </span>
          </div>
        </div>
      </div>

      {/* ── Mappa ── */}
      <div className="rounded-[2.5rem] overflow-hidden shadow-xl flex-1 relative z-0 border-4 border-white dark:border-gray-800">
        <MapContainer center={defaultCenter} zoom={userPos ? 8 : 6} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
          {userPos && <ChangeView center={userPos} />}
          {userPos && <Marker position={userPos} icon={userIcon}><Popup><strong>Tu sei qui</strong></Popup></Marker>}
          {userPos && <Circle center={userPos} radius={radius * 1000} pathOptions={{ color: '#4f46e5', fillOpacity: 0.06, dashArray: '6 4' }} />}

          {filtered.map(c => {
            const isCliente = c.status === 'cliente';
            const distKm    = userPos ? calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) : null;
            return (
              <Marker key={c.id} position={[c.lat!, c.lng!]} icon={isCliente ? clienteIcon : prospectIcon}>
                <Popup minWidth={220}>
                  <div className="p-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isCliente ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isCliente ? '● Cliente' : '◆ Prospect'}
                      </span>
                      {distKm !== null && (
                        <span className="text-[9px] text-gray-400 font-bold">{distKm.toFixed(0)} km</span>
                      )}
                    </div>
                    <h4 className="font-black uppercase text-gray-800 text-sm mb-1">{c.company}</h4>
                    {c.address && <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={10} />{c.address}, {c.city}</p>}
                    {c.phone    && <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={10} />{c.phone}</p>}
                    <div className="flex flex-col gap-1.5 pt-2 mt-2 border-t border-gray-100">
                      <button
                        onClick={() => onNavigateToContact(c.id)}
                        className="w-full bg-indigo-600 text-white py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-colors"
                      >
                        <ExternalLink size={10} /> {isCliente ? 'Apri Cliente' : 'Apri Prospect'}
                      </button>
                      {c.lat && c.lng && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                          target="_blank" rel="noreferrer"
                          className="w-full bg-gray-100 text-gray-700 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors"
                        >
                          <Navigation size={10} /> Naviga
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* ── Nearby summary ── */}
      {userPos && nearby.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-3 border border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <Navigation size={16} className="text-indigo-500 flex-shrink-0" />
          <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
            <span className="font-black text-gray-900 dark:text-white">{nearby.length}</span> {mapFilter === 'tutti' ? 'contatti' : mapFilter} nel raggio di <span className="font-black">{radius} km</span>
            {' · '}<span className="text-indigo-600 font-black">{nearby.filter(c => c.status === 'cliente').length} clienti</span>
            {' · '}<span className="text-amber-500 font-black">{nearby.filter(c => c.status === 'potenziale').length} prospect</span>
          </p>
        </div>
      )}
    </div>
  );
};
