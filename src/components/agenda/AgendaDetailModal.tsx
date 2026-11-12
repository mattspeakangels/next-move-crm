import { DialogFrame } from '../ui/DialogFrame';
import { X, Pencil, MessageSquare } from 'lucide-react';
import { TYPE_LABELS, NO_CONTACT_TYPES, TYPE_BG, OUTCOME_OPTIONS } from './agendaShared';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaDetailModal({ v }: { v: AgendaCalendarModel }) {
  const { onNavigateToContact, contacts, viewActivity, setViewActivity, setShowRecorder, openCloseModal, openEdit } = v;
  return (
    <>
      {viewActivity && (
        <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewActivity(null)}>
          <div className="bg-surface dark:bg-surface w-full max-w-md rounded-panel p-8 shadow-panel max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="min-w-0">
                {onNavigateToContact && viewActivity.contactId ? (
                  <button
                    type="button"
                    onClick={() => { setViewActivity(null); onNavigateToContact(viewActivity.contactId); }}
                    className="text-xl font-semibold text-accent dark:text-accent truncate hover:underline text-left"
                  >{contacts[viewActivity.contactId]?.company || 'Azienda'}</button>
                ) : (
                  <h2 className="text-xl font-semibold dark:text-foreground truncate">{contacts[viewActivity.contactId]?.company || (NO_CONTACT_TYPES.includes(viewActivity.type) ? TYPE_LABELS[viewActivity.type] : 'Azienda')}</h2>
                )}
                <p className="text-xs text-muted font-bold mt-1">
                  {new Date(viewActivity.date).toLocaleString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {viewActivity.endDate && ` – ${new Date(viewActivity.endDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
              <button onClick={() => setViewActivity(null)}><X size={24} className="text-muted" /></button>
            </div>

            <div className="flex items-center gap-1.5 mb-6">
              <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${TYPE_BG[viewActivity.type]}`}>
                {TYPE_LABELS[viewActivity.type]}
              </span>
              {viewActivity.outcome !== 'da-fare' && viewActivity.outcomeType && (
                <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-success-soft text-success dark:bg-success-soft dark:text-success">
                  {OUTCOME_OPTIONS.find(o => o.value === viewActivity.outcomeType)?.label ?? viewActivity.outcomeType}
                </span>
              )}
            </div>

            {/* Conversation Recorder Button */}
            {viewActivity.contactId && contacts[viewActivity.contactId] &&
              ['visita', 'chiamata', 'demo', 'call-remota', 'sopralluogo'].includes(viewActivity.type) && (
              <div className="mb-5">
                {viewActivity.transcript ? (
                  <div className="bg-accent-soft dark:bg-accent-soft/20 rounded-panel p-3 border border-accent dark:border-accent">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-accent uppercase tracking-normal flex items-center gap-1">
                        <MessageSquare size={10} /> Conversazione registrata
                      </span>
                      <button
                        onClick={() => setShowRecorder(true)}
                        className="text-xs font-semibold text-accent hover:text-accent uppercase tracking-wide"
                      >
                        Analizza di nuovo
                      </button>
                    </div>
                    <p className="text-xs text-accent dark:text-accent line-clamp-2">{viewActivity.transcript}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRecorder(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-panel border-2 border-dashed border-accent dark:border-accent text-accent dark:text-accent text-xs font-semibold hover:bg-accent-soft dark:hover:bg-accent-soft/20 transition-colors"
                  >
                    <MessageSquare size={14} /> Registra Conversazione con Cliente
                  </button>
                )}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted uppercase mb-1 block">Note</label>
                {viewActivity.notes
                  ? <p className="text-sm text-foreground dark:text-muted whitespace-pre-wrap break-words">{viewActivity.notes}</p>
                  : <p className="text-sm text-muted dark:text-secondary italic">Nessuna nota</p>}
              </div>
              {viewActivity.outcome !== 'da-fare' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-muted uppercase block">Resoconto</label>
                    <button
                      onClick={() => { setViewActivity(null); openCloseModal(viewActivity); }}
                      className="text-xs font-semibold text-accent hover:text-accent uppercase tracking-wide"
                    >
                      Modifica
                    </button>
                  </div>
                  {viewActivity.results
                    ? <p className="text-sm text-success dark:text-success whitespace-pre-wrap break-words">{viewActivity.results}</p>
                    : <p className="text-sm text-muted dark:text-secondary italic">Nessun resoconto</p>}
                </div>
              )}
            </div>

            <button
              onClick={() => { const a = viewActivity; setViewActivity(null); openEdit(a); }}
              className="mt-8 w-full flex items-center justify-center gap-2 bg-action hover:bg-action-hover text-action-foreground font-semibold py-3 rounded-panel transition-colors"
            >
              <Pencil size={16} /> Modifica
            </button>
          </div>
        </DialogFrame>
      )}
    </>
  );
}
