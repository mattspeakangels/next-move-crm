import { Navigation, List, Map as MapIcon } from 'lucide-react';
import { ItinerarioView } from './ItinerarioView';
import { AICatalogPanel } from './AICatalogPanel';
import { MapViewModel } from './useMapView';
import { MapHeader } from './MapHeader';
import { MapCanvas } from './MapCanvas';
import { MapContactList } from './MapContactList';

export function MapNormal({ v }: { v: MapViewModel }) {
  const { contacts, userPos, radius, mobileTab, setMobileTab, showAIPanel, setShowAIPanel, showItinerario, setShowItinerario, itinerarioEverOpened, itinRequestedDate, applyAISuggestions, filtered, nearby } = v;
  return (
    <div className="flex min-w-0 flex-col min-h-[calc(100dvh-140px)] md:h-[calc(100dvh-88px)] md:min-h-[38rem]">

      {/* ── Header compatto ── */}
      <MapHeader v={v} />

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
      <MapCanvas v={v} />

      {/* ── Lista clienti (mobile tab=lista + desktop sidebar) ── */}
      <MapContactList v={v} />

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
}
