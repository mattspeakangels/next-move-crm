import { X, Route } from 'lucide-react';
import { fmtTime } from './itinerarioShared';
import { ItinerarioModel } from './useItinerario';
import { ItinerarioPanel } from './ItinerarioPanel';

export function ItinerarioSidebar({ v }: { v: ItinerarioModel }) {
  const { onClose, selectedIds, activeRoute, totalKm } = v;
  return (
    <>
      <div className="hidden lg:flex flex-col w-80 bg-surface dark:bg-canvas border-l border-line dark:border-line shadow-panel">
        {/* Header sidebar */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-line dark:border-line">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm  text-foreground dark:text-foreground flex items-center gap-2">
              <Route size={15} className="text-warning" /> Itinerario
            </h2>
            <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="text-muted hover:text-secondary dark:hover:text-muted">
              <X size={16} />
            </button>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex gap-3 text-center">
              <div className="flex-1 bg-warning-soft dark:bg-warning-soft rounded-md py-2">
                <p className="text-xs font-semibold text-warning">{totalKm.toFixed(0)} km</p>
                <p className="text-xs text-muted font-bold">totale</p>
              </div>
              <div className="flex-1 bg-accent-soft dark:bg-accent-soft/20 rounded-md py-2">
                <p className="text-xs font-semibold text-accent">{fmtTime(totalKm)}</p>
                <p className="text-xs text-muted font-bold">in viaggio</p>
              </div>
              <div className="flex-1 bg-canvas dark:bg-surface rounded-md py-2">
                <p className="text-xs font-semibold text-foreground dark:text-foreground">{activeRoute.length}</p>
                <p className="text-xs text-muted font-bold">tappe</p>
              </div>
            </div>
          )}
        </div>
        <ItinerarioPanel v={v} />
      </div>
    </>
  );
}
