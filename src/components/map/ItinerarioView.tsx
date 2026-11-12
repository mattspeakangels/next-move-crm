import type { Contact } from '../../types';
import { DialogFrame } from '../ui/DialogFrame';
import React from 'react';
import { MapStyleButton } from '../ui/MapStyleControl';
import { LocateButton } from './mapShared';
import { useItinerario } from './useItinerario';
import { ItinerarioSidebar } from './ItinerarioSidebar';
import { ItinerarioSheet } from './ItinerarioSheet';
import { ItinerarioMap } from './ItinerarioMap';
import { ItinerarioTopBar } from './ItinerarioTopBar';

// Itinerario del giorno: tappe ordinabili, percorso ottimizzato, mappa e foglio inferiore.
export interface ItinerarioViewProps {
  contacts: Record<string, Contact>;
  onClose: () => void;
  isVisible: boolean;
  // Data richiesta dall'esterno (es. dall'Agenda, "Vedi itinerario" per un giorno specifico).
  // `nonce` cambia ad ogni richiesta cosi' da poter ri-applicare anche la stessa data.
  requestedDate?: { date: string; nonce: number } | null;
}

export const ItinerarioView: React.FC<ItinerarioViewProps> = (props) => {
  const v = useItinerario(props);
  const { isVisible, selectedIds, itinLocating, itinGeoMsg, locateItin } = v;
  const { } = v;
  return (
    <DialogFrame className="fixed inset-0 z-[600] flex bg-canvas" style={{ display: isVisible ? 'flex' : 'none' }}>

      {/* ── MAPPA (occupa tutto, o sx su desktop) ── */}
      <div className="flex-1 relative">

        {/* Top bar — sopra la mappa e sopra lo sheet tappe (z-800), altrimenti
            l'overlay dello sheet intercetta i tap sui risultati di ricerca */}
        <ItinerarioTopBar v={v} />

        {/* Mappa */}
        <ItinerarioMap v={v} />
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
        <ItinerarioSheet v={v} />
      </div>

      {/* ── DESKTOP: sidebar destra fissa ── */}
      <ItinerarioSidebar v={v} />
    </DialogFrame>
  );
};
