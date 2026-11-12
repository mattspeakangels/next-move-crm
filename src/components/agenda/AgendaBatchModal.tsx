import { DialogFrame } from '../ui/DialogFrame';
import { X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaBatchModal({ v }: { v: AgendaCalendarModel }) {
  const { MAX_BATCH_SIZE, showBatchModal, setShowBatchModal, batchAnalyzing, batchError, setBatchError, batchGroups, setBatchGroups, setBatchAnalyzedIds, TODO_TO_ACTIVITY_TYPE, pendingBatchActivities, analyzeAllResoconti, confirmBatchTodos } = v;
  return (
    <>
      {showBatchModal && (
        <DialogFrame className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-panel max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
              <h2 className="text-xl font-semibold dark:text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-accent" /> Analisi AI batch
              </h2>
              <button
                onClick={() => { setShowBatchModal(false); setBatchGroups([]); setBatchAnalyzedIds([]); setBatchError(null); }}
                className="p-1.5 hover:bg-raised dark:hover:bg-raised rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-6 overflow-y-auto space-y-4">
              {batchGroups.length === 0 && (
                <>
                  <p className="text-sm text-secondary dark:text-muted">
                    Ci sono <strong className="text-foreground dark:text-muted">{pendingBatchActivities.length}</strong> visite chiuse non ancora analizzate.
                    {pendingBatchActivities.length > MAX_BATCH_SIZE && (
                      <> Questa analisi processerà le prime {MAX_BATCH_SIZE} (le più vecchie) in un'unica chiamata AI; ripeti l'operazione per le successive.</>
                    )}
                    {pendingBatchActivities.length <= MAX_BATCH_SIZE && (
                      <> Verranno analizzate tutte in un'unica chiamata AI.</>
                    )}
                  </p>

                  <button
                    onClick={analyzeAllResoconti}
                    disabled={batchAnalyzing || pendingBatchActivities.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-panel bg-action text-action-foreground text-sm font-semibold hover:bg-action-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {batchAnalyzing
                      ? <><Loader2 size={15} className="animate-spin" /> Analisi in corso...</>
                      : <><Sparkles size={15} /> Analizza {Math.min(pendingBatchActivities.length, MAX_BATCH_SIZE)} visite</>}
                  </button>

                  {batchError && (
                    <div className="flex items-center gap-2 bg-danger-soft dark:bg-danger-soft rounded-md p-3">
                      <AlertCircle size={13} className="text-danger flex-shrink-0" />
                      <p className="text-xs text-danger dark:text-danger">{batchError}</p>
                    </div>
                  )}
                </>
              )}

              {batchGroups.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-accent uppercase tracking-normal">
                      {batchGroups.reduce((n, g) => n + g.todos.filter(t => t.selected).length, 0)} attività estratte da {batchGroups.length} visite
                    </p>
                  </div>

                  {batchGroups.map((group, gi) => (
                    <div key={group.activityId} className="bg-accent-soft dark:bg-accent-soft/10 rounded-panel p-3 border border-accent dark:border-accent space-y-2">
                      <p className="text-xs font-semibold text-foreground dark:text-muted">
                        {group.contactName || 'Cliente'} · {new Date(group.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                      </p>
                      {group.todos.length === 0 && (
                        <p className="text-xs text-muted italic">Nessuna azione rilevata</p>
                      )}
                      {group.todos.map((todo, ti) => (
                        <div key={ti} className={`bg-surface dark:bg-surface rounded-md p-3 border-2 transition-all ${todo.selected ? 'border-accent dark:border-accent' : 'border-line dark:border-line opacity-50'}`}>
                          <div className="flex items-start gap-2">
                            <input type="checkbox" checked={todo.selected}
                              onChange={() => setBatchGroups(gs => gs.map((g, j) => j === gi ? { ...g, todos: g.todos.map((t, k) => k === ti ? { ...t, selected: !t.selected } : t) } : g))}
                              className="mt-0.5 flex-shrink-0 accent-purple-600" />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <p className="text-xs font-bold text-foreground dark:text-muted leading-snug">{todo.titolo}</p>
                              <div className="flex flex-wrap gap-1.5">
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${todo.priorita === 'alta' ? 'bg-danger-soft text-danger' : todo.priorita === 'media' ? 'bg-warning-soft text-warning' : 'bg-raised text-secondary'}`}>
                                  {todo.priorita}
                                </span>
                                {todo.scadenza && (
                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-raised text-secondary">
                                    entro {new Date(todo.scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                  </span>
                                )}
                              </div>
                              {TODO_TO_ACTIVITY_TYPE[todo.tipo] && todo.dataEsecuzione && (
                                <label className="flex items-center gap-1.5 text-xs font-bold text-secondary dark:text-muted">
                                  <input type="checkbox" checked={todo.creaAppuntamento}
                                    onChange={() => setBatchGroups(gs => gs.map((g, j) => j === gi ? { ...g, todos: g.todos.map((t, k) => k === ti ? { ...t, creaAppuntamento: !t.creaAppuntamento } : t) } : g))}
                                    className="accent-purple-600" />
                                  📅 Crea anche appuntamento il {new Date(todo.dataEsecuzione).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  <button
                    onClick={confirmBatchTodos}
                    className="w-full py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-colors"
                  >
                    {(() => {
                      const n = batchGroups.reduce((sum, g) => sum + g.todos.filter(t => t.selected).length, 0);
                      return n > 0 ? `Aggiungi ${n} attività al To Do` : 'Segna visite come analizzate';
                    })()}
                  </button>
                </div>
              )}
            </div>
          </div>
        </DialogFrame>
      )}
    </>
  );
}
