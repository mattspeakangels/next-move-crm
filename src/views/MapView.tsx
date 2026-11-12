import React from 'react';
import { useMapView } from '../components/map/useMapView';
import { MapFullscreen } from '../components/map/MapFullscreen';
import { MapNormal } from '../components/map/MapNormal';
import 'leaflet/dist/leaflet.css';

// ── Component ─────────────────────────────────────────────────────────────────


export interface MapViewProps {
  onNavigateToContact: (contactId: string) => void;
  isFullscreen?: boolean;
  onGoFullscreen?: () => void;
  onExitFullscreen?: () => void;
  // Richiesta di apertura diretta dell'itinerario per una data (es. dal tasto "Vedi itinerario"
  // in Agenda). Consumata subito dopo l'apertura tramite onItineraryDateConsumed.
  initialItineraryDate?: string | null;
  onItineraryDateConsumed?: () => void;
}

export const MapView: React.FC<MapViewProps> = (props) => {
  const v = useMapView(props);
  // Schermo intero e vista normale condividono lo stesso stato
  if (props.isFullscreen) return <MapFullscreen v={v} />;
  return <MapNormal v={v} />;
};
