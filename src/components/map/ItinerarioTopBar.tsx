import { X, SlidersHorizontal, Route, Star, Eye, EyeOff } from 'lucide-react';
import { SearchDropdown } from '../ui/SearchDropdown';
import { sectorLabel } from '../../lib/sectors';
import { ItinerarioModel } from './useItinerario';

export function ItinerarioTopBar({ v }: { v: ItinerarioModel }) {
  const { onClose, date, setDate, onlyRouteOnMap, setOnlyRouteOnMap, selectedIds, setSelectedIds, setSheetOpen, filterStatus, setFilterStatus, filterSegment, setFilterSegment, filterPriorityOnly, setFilterPriorityOnly, filterProvince, setFilterProvince, filterSector, setFilterSector, showFiltersBar, setShowFiltersBar, setCustomTimes, searchItinQuery, setSearchItinQuery, setItinFlyTo, setManualOrder, loadedItinDateRef, itinSearchResults, availableProvinces, availableSectors, itinActiveFilterCount } = v;
  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-[900] px-4 pt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 w-full">
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose}
            className="bg-surface/95 dark:bg-surface/95 backdrop-blur-sm text-foreground dark:text-foreground rounded-panel px-4 py-2.5 font-semibold text-xs uppercase flex items-center gap-2 shadow-panel flex-shrink-0">
            <X size={14} /> Chiudi
          </button>

          <div className="min-w-0 flex-1 flex items-center gap-2 bg-surface/95 dark:bg-surface/95 backdrop-blur-sm rounded-panel px-4 py-2 shadow-panel">
            <Route size={14} className="text-warning flex-shrink-0" />
            <input type="date" value={date} onChange={e => {
            const newDate = e.target.value;
            setDate(newDate);
            setSelectedIds([]);
            setManualOrder(null);
            setCustomTimes({});
            loadedItinDateRef.current = null;
          }}
              className="min-w-0 w-full flex-1 bg-transparent text-sm font-semibold text-foreground dark:text-foreground outline-none" />
          </div>

          <button onClick={() => setShowFiltersBar(v => !v)}
            className={`relative p-2.5 rounded-xl shadow-panel flex-shrink-0 transition-all ${showFiltersBar ? 'bg-action text-action-foreground' : 'bg-surface/95 dark:bg-surface/95 text-secondary dark:text-foreground'}`}>
            <SlidersHorizontal size={16} />
            {itinActiveFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-warning text-status-foreground text-xs font-semibold flex items-center justify-center">
                {itinActiveFilterCount}
              </span>
            )}
          </button>

          {selectedIds.length > 0 && (
            <button onClick={() => setOnlyRouteOnMap(v => !v)}
              title={onlyRouteOnMap ? 'Mostra tutti i clienti sulla mappa' : 'Mostra solo le tappe di questo itinerario'}
              className={`p-2.5 rounded-xl shadow-panel flex-shrink-0 transition-all ${onlyRouteOnMap ? 'bg-warning text-status-foreground' : 'bg-surface/95 dark:bg-surface/95 text-secondary dark:text-foreground'}`}>
              {onlyRouteOnMap ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>

        {showFiltersBar && (
          <div className="w-full max-h-[30dvh] overflow-y-auto overscroll-contain flex flex-wrap items-center gap-1.5 bg-surface/95 dark:bg-surface/95 backdrop-blur-sm rounded-panel p-2 shadow-panel mt-1">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="flex-1 min-w-[100px] bg-canvas dark:bg-canvas rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-secondary dark:text-foreground outline-none">
              <option value="tutti">Tutti</option>
              <option value="clienti">Clienti</option>
              <option value="prospect">Prospect</option>
            </select>
            <select value={filterSegment ?? ''} onChange={e => setFilterSegment((e.target.value || null) as any)}
              className="flex-1 min-w-[120px] bg-canvas dark:bg-canvas rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-secondary dark:text-foreground outline-none">
              <option value="">Tutti i segmenti</option>
              <option value="dealer">🏪 Dealer</option>
              <option value="industria">🏭 Industria</option>
              <option value="edilizia">🏗️ Edilizia</option>
              <option value="end-user">👤 End User</option>
            </select>
            {availableProvinces.length > 0 && (
              <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)}
                className="flex-1 min-w-[100px] bg-canvas dark:bg-canvas rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-secondary dark:text-foreground outline-none">
                <option value="">Tutte le prov.</option>
                {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {availableSectors.length > 0 && (
              <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                className="flex-1 min-w-[120px] bg-canvas dark:bg-canvas rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-secondary dark:text-foreground outline-none">
                <option value="">Tutti i settori</option>
                {availableSectors.map(s => <option key={s} value={s}>{sectorLabel(s)}</option>)}
              </select>
            )}
            <button onClick={() => setFilterPriorityOnly(v => !v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all flex items-center gap-1 flex-shrink-0 ${filterPriorityOnly ? 'bg-warning text-status-foreground' : 'bg-canvas dark:bg-canvas text-secondary dark:text-muted'}`}>
              <Star size={12} fill={filterPriorityOnly ? 'currentColor' : 'none'} /> Prioritari
            </button>
            {itinActiveFilterCount > 0 && (
              <button onClick={() => { setFilterStatus('tutti'); setFilterSegment(null); setFilterProvince(''); setFilterSector(''); setFilterPriorityOnly(false); }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase text-danger hover:text-danger flex-shrink-0">
                Reset
              </button>
            )}
          </div>
        )}

        {/* Barra di ricerca cliente */}
        <SearchDropdown
          className="w-full mt-1"
          value={searchItinQuery}
          onChange={setSearchItinQuery}
          placeholder="Cerca cliente per nome o città…"
          inputWrapperClassName={() => 'flex items-center gap-2 bg-surface/95 dark:bg-surface/95 backdrop-blur-sm rounded-panel px-3 py-2.5 shadow-panel focus-within:ring-2 focus-within:ring-warning transition-all'}
          dropdownClassName="z-[800]"
          onSelect={(c: any) => {
            const already = selectedIds.includes(c.id);
            if (!already) {
              setSelectedIds(prev => [...prev, c.id]);
              setSheetOpen(true);
            }
            setItinFlyTo([c.lat, c.lng]);
            setSearchItinQuery('');
          }}
          results={itinSearchResults.map((c: any) => {
            const already = selectedIds.includes(c.id);
            const isCliente = c.status === 'cliente';
            return {
              key: c.id,
              item: c,
              label: c.company,
              sublabel: c.city || '—',
              badge: {
                text: already ? 'in itinerario' : `${isCliente ? 'Cliente' : 'Prospect'}`,
                className: already
                  ? 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning'
                  : isCliente ? 'bg-accent-soft text-accent dark:bg-accent-soft/40 dark:text-accent' : 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning',
              },
            };
          })}
        />
      </div>
    </>
  );
}
