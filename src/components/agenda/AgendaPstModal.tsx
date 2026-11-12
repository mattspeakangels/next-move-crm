import { DialogFrame } from '../ui/DialogFrame';
import { X, CheckCircle, Calendar } from 'lucide-react';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaPstModal({ v }: { v: AgendaCalendarModel }) {
  const { contacts, pstEvents, pstSelected, setPstSelected, pstModalOpen, setPstModalOpen, pstContactOverrides, setPstContactOverrides, handlePSTImport } = v;
  return (
    <>
      {pstModalOpen && (
        <DialogFrame className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
          <div className="bg-surface dark:bg-canvas rounded-panel shadow-panel w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line dark:border-line flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold dark:text-foreground flex items-center gap-2">
                  <Calendar size={20} className="text-accent" /> Importa da Outlook
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {pstSelected.size} / {pstEvents.filter((e: any) => e.start).length} eventi selezionati
                </p>
              </div>
              <button aria-label="Chiudi dialogo" data-dialog-close onClick={() => setPstModalOpen(false)} className="text-muted hover:text-secondary">
                <X size={20} />
              </button>
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
              {pstEvents.map((ev: any) => {
                const sel = pstSelected.has(ev._idx);
                const overrideId = pstContactOverrides[ev._idx] ?? '';
                const startDate = ev.start ? new Date(ev.start) : null;
                const hasDate = !!startDate;
                const sortedContacts = Object.values(contacts as any).sort((a: any, b: any) =>
                  (a.company || '').localeCompare(b.company || '', 'it')
                );
                return (
                  <div
                    key={ev._idx}
                    onClick={() => {
                      if (!hasDate) return;
                      setPstSelected(prev => {
                        const n = new Set(prev);
                        if (n.has(ev._idx)) n.delete(ev._idx); else n.add(ev._idx);
                        return n;
                      });
                    }}
                    className={`flex items-start gap-3 p-3 rounded-panel border-2 transition-all ${
                      !hasDate ? 'opacity-40 cursor-not-allowed border-line dark:border-line' :
                      ev._duplicate ? 'border-warning bg-warning-soft dark:bg-warning-soft cursor-pointer' :
                      sel ? 'border-accent bg-accent-soft dark:bg-accent-soft/20 cursor-pointer' :
                      'border-line dark:border-line bg-canvas dark:bg-surface/50 cursor-pointer hover:border-line'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md flex-shrink-0 mt-0.5 border-2 flex items-center justify-center ${
                      sel && hasDate ? 'bg-action border-accent' : 'border-line'
                    }`}>
                      {sel && hasDate && <CheckCircle size={12} className="text-action-foreground" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold dark:text-foreground truncate">{ev.subject || '(senza titolo)'}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {startDate ? (
                          <span className="text-xs font-bold text-secondary">
                            {startDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' '}
                            {startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-danger">Nessuna data</span>
                        )}
                        {ev.location && <span className="text-xs text-muted">📍 {ev.location}</span>}
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                          ev._type === 'call-remota' ? 'bg-accent-soft text-accent' :
                          ev._type === 'formazione' ? 'bg-success-soft text-success' :
                          'bg-accent-soft text-accent'
                        }`}>{ev._type}</span>
                        {/* Dropdown selezione cliente */}
                        <select
                          value={overrideId}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            e.stopPropagation();
                            setPstContactOverrides(prev => ({ ...prev, [ev._idx]: e.target.value }));
                          }}
                          className={`text-xs font-bold rounded-full px-2 py-0.5 border outline-none cursor-pointer max-w-[180px] ${
                            overrideId
                              ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent'
                              : 'border-line dark:border-line bg-raised dark:bg-raised text-muted'
                          }`}
                        >
                          <option value="">— Nessun cliente —</option>
                          {(sortedContacts as any[]).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.company}</option>
                          ))}
                        </select>
                        {ev._duplicate && (
                          <span className="text-xs font-bold text-warning bg-warning-soft px-2 py-0.5 rounded-full">
                            ⚠ già presente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between px-6 py-4 border-t border-line dark:border-line flex-shrink-0 gap-3">
              <button
                onClick={() => {
                  const allSelectable = pstEvents.filter((e: any) => e.start && !e._duplicate).map((e: any) => e._idx);
                  setPstSelected(new Set(allSelectable));
                }}
                className="text-xs font-bold text-secondary hover:text-accent transition-colors"
              >
                Seleziona tutti
              </button>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setPstModalOpen(false)}
                  className="px-5 py-2.5 rounded-panel text-sm font-bold text-secondary hover:text-foreground transition-colors">
                  Annulla
                </button>
                <button
                  onClick={handlePSTImport}
                  disabled={pstSelected.size === 0}
                  className="bg-action hover:bg-action-hover disabled:opacity-50 text-action-foreground px-6 py-2.5 rounded-panel text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={15} /> Importa {pstSelected.size} eventi
                </button>
              </div>
            </div>
          </div>
        </DialogFrame>
      )}
    </>
  );
}
