import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useStore } from '../store/useStore';
import { MapPin, Navigation, Phone, AlertTriangle, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center, 12);
  return null;
};

interface MapViewProps {
  onNavigateToContact: (contactId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({ onNavigateToContact }) => {
  const { contacts, updateContact } = useStore();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(50);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [debugMsg, setDebugMsg] = useState('');

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setDebugMsg("Attenzione: GPS non autorizzato dal browser.") // <-- Corretto qui, niente più "err"
    );
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const geocodeContacts = async () => {
    setIsGeocoding(true);
    setDebugMsg('Ricerca coordinate in corso...');
    let successCount = 0;
    let failCount = 0;

    const contactsArray = Object.values(contacts);

    for (const contact of contactsArray) {
      if (!contact.lat && contact.address && contact.city) {
        try {
          const q = encodeURIComponent(`${contact.address}, ${contact.city}, Italy`);
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, {
            headers: { 'Accept-Language': 'it' }
          });
          const data = await res.json();
          
          if (data && data.length > 0) {
            updateContact(contact.id, { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            successCount++;
          } else {
            failCount++;
          }
          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {
          failCount++;
        }
      }
    }
    setIsGeocoding(false);
    setDebugMsg(`Ricerca finita. Trovate: ${successCount}, Non trovate: ${failCount}`);
  };

  const allContactsArray = Object.values(contacts);
  const mappedContacts = allContactsArray.filter(c => c.lat && c.lng);
  
  const nearbyContacts = mappedContacts.filter(c => {
    if (!userPos) return false;
    return calculateDistance(userPos[0], userPos[1], c.lat!, c.lng!) <= radius;
  });

  return (
    <div className="h-[calc(100vh-120px)] space-y-4 flex flex-col">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm border border-gray-50 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-2">
            <Navigation className="text-indigo-600" /> Radar Aziende
          </h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            Raggio: {radius}km | 
            <span className={mappedContacts.length > 0 ? 'text-green-500' : 'text-orange-500'}>
              Mappate {mappedContacts.length} su {allContactsArray.length}
            </span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {debugMsg && (
            <div className="bg-orange-50 text-orange-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={14}/> {debugMsg}
            </div>
          )}
          <select className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
            <option value={500}>500 km</option>
          </select>
          <button onClick={geocodeContacts} disabled={isGeocoding} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isGeocoding ? 'bg-gray-200 text-gray-500' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'}`}>
            {isGeocoding ? 'Ricerca in corso...' : 'Trova Coordinate'}
          </button>
        </div>
      </div>

      <div className="rounded-[2.5rem] overflow-hidden shadow-xl flex-1 relative z-0 border-4 border-white dark:border-gray-800">
        {userPos ? (
          <MapContainer center={userPos} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ChangeView center={userPos} />
            <Marker position={userPos}><Popup>Tu sei qui</Popup></Marker>
            <Circle center={userPos} radius={radius * 1000} pathOptions={{ color: '#4f46e5', fillOpacity: 0.1 }} />
            
            {nearbyContacts.map(c => (
              <Marker key={c.id} position={[c.lat!, c.lng!]}>
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-black uppercase text-indigo-600 text-sm mb-2">{c.company}</h4>
                    <p className="text-[10px] font-bold text-gray-500 uppercase"><MapPin size={10} className="inline mr-1"/>{c.address}, {c.city}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-3"><Phone size={10} className="inline mr-1"/>{c.phone}</p>
                    <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => onNavigateToContact(c.id)}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                      >
                        <ExternalLink size={11}/> Apri Azienda
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                      >
                        <Navigation size={11}/> Naviga verso
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <Navigation className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">In attesa del GPS...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
