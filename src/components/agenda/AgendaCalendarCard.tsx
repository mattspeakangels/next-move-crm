import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AGENDA_CATEGORIES } from '../../lib/agendaFilter';
import { CalendarMode, TYPE_LABELS, TYPE_COLORS } from './agendaShared';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaCalendarCard({ v }: { v: AgendaCalendarModel }) {
  const { calMode, setCalMode, categories, toggleCategory, prevPeriod, nextPeriod, goToday, renderMonthHeader, renderWeekHeader, renderMonthGrid, renderWeekGrid, renderWeekTimegrid } = v;
  return (
    <>
      <div className="bg-surface dark:bg-surface rounded-panel shadow-sm border border-line dark:border-line overflow-hidden">

        {/* Calendar toolbar */}
        <div className="agenda-toolbar flex flex-wrap items-center justify-between gap-3 px-3 sm:px-5 pt-4 pb-3 border-b border-line dark:border-line">
          <div className="agenda-period flex items-center gap-1 sm:gap-2">
            <button onClick={prevPeriod} className="p-1.5 rounded-md hover:bg-raised dark:hover:bg-raised text-muted transition-colors"><ChevronLeft size={18} /></button>
            <span className="font-semibold text-sm dark:text-foreground min-w-0 sm:min-w-[160px] text-center">
              {calMode === 'month' ? renderMonthHeader() : calMode === 'week' ? renderWeekHeader() : 'Tutte le attività'}
            </span>
            <button onClick={nextPeriod} className="p-1.5 rounded-md hover:bg-raised dark:hover:bg-raised text-muted transition-colors"><ChevronRight size={18} /></button>
            <button onClick={goToday} className="ml-1 text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/30 px-2.5 py-1 rounded-full uppercase tracking-wide hover:bg-accent-soft transition-colors">Oggi</button>
          </div>

          {/* View switcher */}
          <div className="agenda-view-switcher flex gap-1 bg-raised dark:bg-raised p-1 rounded-md">
            {(['month', 'week', 'list'] as CalendarMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setCalMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${
                  calMode === mode ? 'bg-surface dark:bg-surface text-accent shadow-sm' : 'text-muted hover:text-secondary'
                }`}
              >
                {mode === 'month' ? 'Mese' : mode === 'week' ? 'Sett.' : 'Lista'}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro categorie */}
        <div className="agenda-categories flex flex-wrap items-center gap-2 px-3 sm:px-5 pt-3" role="group" aria-label="Categorie mostrate">
          {AGENDA_CATEGORIES.map(c => {
            const active = categories.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${active ? 'bg-accent-soft text-accent dark:bg-accent-soft/40' : 'bg-raised text-muted hover:text-secondary dark:bg-raised'}`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Calendar grid */}
        {calMode !== 'list' && (
          <div className="p-4">
            {calMode === 'month' ? renderMonthGrid() : (
              <>
                {renderWeekGrid()}
                <div className="mt-3"><p className="mb-2 text-xs text-muted sm:hidden">Scorri la griglia per vedere tutti i giorni →</p>{renderWeekTimegrid()}</div>
              </>
            )}
          </div>
        )}

        {/* Legend */}
        {calMode !== 'list' && (
          <div className="flex gap-4 px-5 pb-4 flex-wrap">
            {AGENDA_CATEGORIES.filter(c => categories.includes(c.id)).flatMap(c => c.types).map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[t]}`} />
                <span className="text-xs font-bold text-muted">{TYPE_LABELS[t]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
