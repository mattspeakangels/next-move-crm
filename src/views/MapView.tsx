import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useStore } from '../store/useStore';
import { MapPin, Navigation, Phone, Info } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icone Leaflet usando direttamente i link CDN per evitare errori TypeScript con i file .png
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

export const MapView: React.FC = () => {
  const { contacts, updateContact } = useStore();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(20);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => console.error("Impossibile ottenere la posizione.")
    );
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const geocodeContacts = async () => {
    setIsGeocoding(true);
    for (const contact of Object.values(contacts)) {
      if (!contact.lat && contact.address && contact.city) {
        try {
          const query = encodeURIComponent(`${contact.address}, ${contact.city}, ${contact.province || ''}, Italy`);
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
          const data = await response.json();
          if (data && data[0]) {
            updateContact(contact.id, { 
              lat: parseFloat(data[0].lat), 
              lng: parseFloat(data[0].lon) 
            });
          }
          await new Promise(r => setTimeout(r, 1000));
        } catch (error) {
          console.error("Errore geocodifica:", contact.company);
        }
      }
    }
    setIsGeocoding(false);
  };

  const nearbyContacts = Object.values(contacts).filter(c => {
    if (!c.lat || !c.lng || !userPos) return false;
    const dist = calculateDistance(userPos[0], userPos[1], c.lat, c.lng);
    return dist <= radius;
  });

  return (
    <div className="h-[calc(100vh-120px)] space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-2">
            <Navigation className="text-indigo-600" /> Radar Aziende
          </h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Clienti nel raggio di {radius}km</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="flex-1 md:w-40 border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          >
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
          <button 
            onClick={geocodeContacts}
            disabled={isGeocoding}
            className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg ${
              isGeocoding ? 'bg-gray-200 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isGeocoding ? 'Mappatura...' : 'Aggiorna Coordinate'}
          </button>
        </div>
      </div>

      <div className="rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white dark:border-gray-800 h-full relative z-0">
        {userPos ? (
          <MapContainer center={userPos} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ChangeView center={userPos} />
            
            <Marker position={userPos}>
              <Popup>
                <div className="text-center font-black uppercase text-xs">Tu sei qui</div>
              </Popup>
            </Marker>

            <Circle 
              center={userPos} 
              radius={radius * 1000} 
              pathOptions={{ fillColor: '#4f46e5', fillOpacity: 0.1, color: '#4f46e5', weight: 1 }} 
            />

            {nearbyContacts.map(contact => (
              <Marker key={contact.id} position={[contact.lat!, contact.lng!]}>
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-black uppercase text-indigo-600 text-sm mb-2">{contact.company}</h4>
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                        <MapPin size={12}/> {contact.city}
                      </p>
                      <p className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                        <Phone size={12}/> {contact.phone}
                      </p>
                      <p className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase mt-2 pt-2 border-t">
                        <Info size={12}/> {contact.customerType === 'dealer' ? 'Dealer' : 'End User'}
                      </p>
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
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Acquisizione segnale GPS...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
