import { DialogFrame } from '../ui/DialogFrame';
import { X, Route } from 'lucide-react';
import { fmtTime } from './itinerarioShared';
import { ItinerarioModel } from './useItinerario';
import { ItinerarioPanel } from './ItinerarioPanel';

export function ItinerarioSheet({ v }: { v: ItinerarioModel }) {
  const { selectedIds, sheetOpen, setSheetOpen, activeRoute, totalKm } = v;
  return (
    <>
      <div className="lg:hidden">
        {/* Pillola sempre visibile in basso */}
        <button
          onClick={() => setSheetOpen(v => !v)}
          className={`absolute bottom-4 left-4 right-4 z-[700] flex items-center justify-between rounded-panel px-4 py-3 shadow-panel transition-all ${
            selectedIds.length > 0
              ? 'bg-action text-action-foreground'
              : 'bg-surface/95 dark:bg-surface/95 backdrop-blur-sm text-foreground dark:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2 font-semibold text-xs uppercase">
            <Route size={14} className={selectedIds.length > 0 ? 'text-foreground' : 'text-warning'} />
            {selectedIds.length === 0
              ? 'Nessuna tappa selezionata'
              : `${activeRoute.length} tappe · ${totalKm.toFixed(0)} km · ${fmtTime(totalKm)}`}
          </span>
          <span className="text-xs font-bold opacity-70">{sheetOpen ? '▼' : '▲'}</span>
        </button>

        {/* Sheet slide-up */}
        {sheetOpen && (
          <DialogFrame className="fixed inset-0 z-[800] flex flex-col justify-end" onClick={() => setSheetOpen(false)}>
            <div
              className="bg-surface dark:bg-canvas rounded-t-panel shadow-panel flex flex-col overflow-hidden"
              style={{ maxHeight: '70vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex flex-col items-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-raised dark:bg-raised rounded-full mb-2" />
                <div className="flex items-center justify-between w-full px-5 pb-2 border-b border-line dark:border-line">
                  <span className="text-xs font-semibold uppercase text-foreground dark:text-foreground flex items-center gap-2">
                    <Route size={13} className="text-warning" />
                    {activeRoute.length} tappe · {totalKm.toFixed(0)} km · {fmtTime(totalKm)}
                  </span>
                  <button aria-label="Chiudi dialogo" data-dialog-close onClick={() => setSheetOpen(false)} className="text-muted hover:text-secondary">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <ItinerarioPanel v={v} />
            </div>
          </DialogFrame>
        )}
      </div>
    </>
  );
}
