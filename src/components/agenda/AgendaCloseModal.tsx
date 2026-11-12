import { DialogFrame } from '../ui/DialogFrame';
import { X, Mic, MicOff, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { OUTCOME_OPTIONS, VISITA_FREDDO_OUTCOME_OPTIONS, SETTORE_OPTIONS, VISITA_FREDDO_AVVIA_SEQUENZA } from './agendaShared';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaCloseModal({ v }: { v: AgendaCalendarModel }) {
  const { contacts, closingActivity, setClosingActivity, closeOutcome, setCloseOutcome, closeNotes, setCloseNotes, closeSettore, setCloseSettore, derivedVisitType, aiTodos, setAiTodos, aiAnalyzing, aiError, setAiError, voiceClose, TODO_TO_ACTIVITY_TYPE, analyzeResoconto, confirmAiTodos, handleCloseActivity } = v;
  return (
    <>
      {closingActivity && (
        <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-surface dark:bg-surface w-full sm:max-w-md rounded-t-panel sm:rounded-panel shadow-panel flex flex-col max-h-[92vh]">

            {/* Header — sticky */}
            <div className="flex justify-between items-start px-6 pt-6 pb-4 sm:px-8 sm:pt-8 flex-shrink-0 border-b border-line dark:border-line">
            <div className="flex justify-between items-start w-full mb-0">
              <div>
                <h2 className="text-xl font-semibold dark:text-foreground">{closingActivity.outcome !== 'da-fare' ? 'Modifica Esito' : 'Chiudi Appuntamento'}</h2>
                <p className="text-sm text-muted font-bold mt-0.5">
                  {contacts[closingActivity.contactId]?.company ?? 'Azienda'} ·{' '}
                  {new Date(closingActivity.date).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => { setClosingActivity(null); voiceClose.stop(); voiceClose.reset(); }}
                className="p-2 hover:bg-raised dark:hover:bg-raised rounded-full"
              >
                <X size={22} className="text-muted" />
              </button>
            </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 pb-6 sm:px-8 sm:pb-8 pt-5 space-y-4">

            {/* Outcome */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-normal mb-2">Come è andata?</p>
              <div className="grid grid-cols-2 gap-2">
                {(closingActivity?.type === 'visita-freddo' ? VISITA_FREDDO_OUTCOME_OPTIONS : OUTCOME_OPTIONS).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCloseOutcome(opt.value)}
                    className={`py-3 px-3 rounded-panel border-2 font-semibold text-sm transition-all flex items-center gap-2 ${
                      closeOutcome === opt.value ? opt.color + ' border-current' : 'border-line dark:border-line text-muted bg-transparent'
                    }`}
                  >
                    <span>{opt.emoji}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Settore prospecting: richiesto solo se la visita a freddo avvia una sequenza.
                Nascosto in modifica esito (attività già chiusa): la sequenza è già stata avviata
                una volta e non viene ri-attivata cambiando qui il settore. */}
            {closingActivity?.type === 'visita-freddo' && closingActivity.outcome === 'da-fare' && VISITA_FREDDO_AVVIA_SEQUENZA.includes(closeOutcome) && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-normal mb-2">Settore (per la sequenza di follow-up)</p>
                <div className="grid grid-cols-2 gap-2">
                  {SETTORE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCloseSettore(opt.value)}
                      className={`py-2.5 px-3 rounded-panel border-2 font-semibold text-xs transition-all ${
                        closeSettore === opt.value
                          ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent'
                          : 'border-line dark:border-line text-muted bg-transparent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes / Resoconto */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-muted uppercase tracking-normal">Resoconto</p>
                {voiceClose.isSupported && (
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceClose.isRecording) {
                        voiceClose.stop();
                      } else {
                        voiceClose.start({
                          continuous: true,
                          onFinal: (text) => setCloseNotes(prev => prev ? prev + ' ' + text : text),
                        });
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      voiceClose.isRecording
                        ? 'bg-danger text-status-foreground animate-pulse'
                        : 'bg-raised dark:bg-raised text-secondary dark:text-muted hover:bg-accent-soft hover:text-accent'
                    }`}
                  >
                    {voiceClose.isRecording ? <MicOff size={12} /> : <Mic size={12} />}
                    {voiceClose.isRecording ? 'Stop' : 'Ditta'}
                  </button>
                )}
              </div>
              <textarea
                rows={4}
                value={closeNotes}
                onChange={e => setCloseNotes(e.target.value)}
                placeholder="Descrivi come è andata la visita, cosa è stato discusso, prossimi passi..."
                className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-transparent dark:text-foreground outline-none focus:border-accent text-sm resize-none"
              />
              {voiceClose.isRecording && voiceClose.transcript && (
                <p className="text-xs text-accent italic mt-1.5 px-1">"{voiceClose.transcript}"</p>
              )}
              {voiceClose.error && <p className="text-xs text-danger mt-1 px-1">{voiceClose.error}</p>}
            </div>

            {/* AI Analysis: esclusa dalla visita a freddo — il prospecting resta un processo
                manuale, guidato solo dalle scelte dell'utente (esito, settore, resoconto). */}
            {closingActivity?.type !== 'visita-freddo' && (
            <div className="space-y-3">
                <button
                  onClick={analyzeResoconto}
                  disabled={aiAnalyzing || !closeNotes.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-panel border-2 border-dashed border-accent dark:border-accent text-accent dark:text-accent text-xs font-semibold hover:bg-accent-soft dark:hover:bg-accent-soft/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {aiAnalyzing
                    ? <><Loader2 size={13} className="animate-spin" /> Analisi in corso...</>
                    : derivedVisitType === 'prima-visita'
                      ? <><Sparkles size={13} /> Analizza con AI — profilazione + To Do</>
                      : <><Sparkles size={13} /> Analizza con AI — genera To Do</>}
                </button>

                {aiError && (
                  <div className="flex items-center gap-2 bg-danger-soft dark:bg-danger-soft rounded-md p-3">
                    <AlertCircle size={13} className="text-danger flex-shrink-0" />
                    <p className="text-xs text-danger dark:text-danger">{aiError}</p>
                  </div>
                )}

                {aiTodos.length > 0 && (
                  <div className="bg-accent-soft dark:bg-accent-soft/20 rounded-panel p-4 space-y-3 border border-accent dark:border-accent">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-accent uppercase tracking-normal">
                        <Sparkles size={10} className="inline mr-1" />
                        {aiTodos.filter(t => t.selected).length} attività estratte
                      </p>
                      <button
                        onClick={() => { const allSel = aiTodos.every(t => t.selected); setAiTodos(ts => ts.map(t => ({ ...t, selected: !allSel }))); }}
                        className="text-xs font-semibold text-accent hover:text-accent uppercase tracking-wide"
                      >
                        {aiTodos.every(t => t.selected) ? 'Deseleziona tutte' : 'Seleziona tutte'}
                      </button>
                    </div>

                    {aiTodos.map((todo, i) => (
                      <div key={i} className={`bg-surface dark:bg-surface rounded-md p-3 border-2 transition-all ${todo.selected ? 'border-accent dark:border-accent' : 'border-line dark:border-line opacity-50'}`}>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" checked={todo.selected}
                            onChange={() => setAiTodos(ts => ts.map((t, j) => j === i ? { ...t, selected: !t.selected } : t))}
                            className="mt-0.5 flex-shrink-0 accent-accent" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-bold text-foreground dark:text-muted leading-snug">{todo.titolo}</p>
                              <button
                                onClick={() => setAiTodos(ts => ts.filter((_, j) => j !== i))}
                                className="p-0.5 flex-shrink-0 text-muted hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft rounded transition-colors"
                                title="Rimuovi"
                              >
                                <X size={13} />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${todo.priorita === 'alta' ? 'bg-danger-soft text-danger' : todo.priorita === 'media' ? 'bg-warning-soft text-warning' : 'bg-raised text-secondary'}`}>
                                {todo.priorita}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-xs text-muted font-bold uppercase block mb-0.5">Esecuzione</label>
                                <input type="date" value={todo.dataEsecuzione}
                                  onChange={e => setAiTodos(ts => ts.map((t, j) => j === i ? { ...t, dataEsecuzione: e.target.value } : t))}
                                  className="w-full text-xs bg-canvas dark:bg-raised border border-line dark:border-line rounded-lg px-2 py-1 font-bold dark:text-foreground outline-none focus:border-accent" />
                              </div>
                              <div>
                                <label className="text-xs text-muted font-bold uppercase block mb-0.5">Scadenza</label>
                                <input type="date" value={todo.scadenza}
                                  onChange={e => setAiTodos(ts => ts.map((t, j) => j === i ? { ...t, scadenza: e.target.value } : t))}
                                  className="w-full text-xs bg-canvas dark:bg-raised border border-line dark:border-line rounded-lg px-2 py-1 font-bold dark:text-foreground outline-none focus:border-accent" />
                              </div>
                            </div>
                            {TODO_TO_ACTIVITY_TYPE[todo.tipo] && (
                              <label className="flex items-center gap-1.5 text-xs font-bold text-secondary dark:text-muted">
                                <input type="checkbox" checked={todo.creaAppuntamento}
                                  onChange={() => setAiTodos(ts => ts.map((t, j) => j === i ? { ...t, creaAppuntamento: !t.creaAppuntamento } : t))}
                                  className="accent-accent" />
                                📅 Crea anche appuntamento in Agenda
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={confirmAiTodos}
                      disabled={!aiTodos.some(t => t.selected)}
                      className="w-full py-2.5 rounded-md bg-action text-action-foreground font-semibold text-xs hover:bg-action-hover transition-colors disabled:opacity-40"
                    >
                      Aggiungi {aiTodos.filter(t => t.selected).length} attività al To Do
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setClosingActivity(null); voiceClose.stop(); voiceClose.reset(); setAiTodos([]); setAiError(null); }}
                className="flex-1 py-3.5 rounded-panel font-semibold bg-raised dark:bg-raised text-secondary dark:text-muted"
              >
                Annulla
              </button>
              <button
                onClick={handleCloseActivity}
                className="flex-1 py-3.5 rounded-panel font-semibold bg-success text-status-foreground hover:bg-success transition-colors"
              >
                {closingActivity.outcome !== 'da-fare' ? 'Salva Esito' : 'Chiudi Appuntamento'}
              </button>
            </div>

            </div>{/* end scrollable body */}
          </div>
        </DialogFrame>
      )}
    </>
  );
}
