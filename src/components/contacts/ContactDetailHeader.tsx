import { MapPin, Trash2, ArrowLeft, History, StickyNote, Star } from 'lucide-react';
import { ContactsModel } from './useContactsView';

export function ContactDetailHeader({ v }: { v: ContactsModel }) {
  const { contacts, setDetailContact, editingContact, setEditingContact, setHistoryContact, geoLoading, geoStatus, setConfirmDeleteId, handleGeocode, handleSave } = v;
  return (
    <>
      <div className="sticky top-0 z-20 bg-surface dark:bg-surface border-b border-line dark:border-line px-4 md:px-8 py-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDetailContact(null)}
              className="p-2 rounded-md hover:bg-raised dark:hover:bg-raised transition-colors text-secondary flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-semibold text-lg dark:text-foreground  tracking-tight truncate">
                  {editingContact?.company || 'Nuova Azienda'}
                </h2>
                <button
                  onClick={() => setEditingContact({ ...editingContact, priorityToVisit: !editingContact?.priorityToVisit })}
                  title={editingContact?.priorityToVisit ? 'Rimuovi priorità' : 'Segna come prioritario'}
                  className={`p-1 rounded-lg transition-colors flex-shrink-0 ${editingContact?.priorityToVisit ? 'text-warning' : 'text-muted hover:text-warning'}`}
                >
                  <Star size={18} fill={editingContact?.priorityToVisit ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="text-xs text-muted font-bold uppercase tracking-normal">Scheda Azienda</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex-shrink-0 bg-action text-action-foreground px-5 sm:px-6 py-2.5 rounded-panel font-semibold uppercase text-xs tracking-normal shadow-panel hover:bg-action-hover transition-colors"
          >
            Salva
          </button>
        </div>
        <div className="flex items-start gap-2 bg-accent-soft dark:bg-accent-soft/10 border-2 border-accent dark:border-accent rounded-panel px-3 py-2">
          <StickyNote size={14} className="text-accent flex-shrink-0 mt-1" />
          <textarea
            rows={2}
            placeholder="Note rapide di identificazione (es. portineria, referente in loco, orari, accessi particolari...)"
            className="w-full bg-transparent resize-none outline-none text-xs font-bold text-accent dark:text-accent placeholder:text-accent placeholder:font-semibold max-h-20 overflow-y-auto"
            value={editingContact?.notes || ''}
            onChange={e => setEditingContact({ ...editingContact, notes: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {editingContact?.id && contacts[editingContact.id] && (
            <button
              onClick={() => setHistoryContact(contacts[editingContact.id ?? ''])}
              className="flex items-center gap-1.5 bg-accent-soft dark:bg-accent-soft/30 text-accent px-3 py-2.5 rounded-panel font-semibold uppercase text-xs tracking-normal hover:bg-accent-soft transition-colors"
            >
              <History size={14} /> <span className="hidden sm:inline">Storico</span>
            </button>
          )}
          {/* Bottone sincronizzazione mappa — visibile se mancano le coordinate */}
          {!(editingContact?.lat && editingContact?.lng) && (editingContact?.city || editingContact?.address) && (
            <button
              onClick={handleGeocode}
              disabled={geoLoading}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-panel font-semibold uppercase text-xs tracking-normal transition-colors border ${
                geoStatus === 'ok'
                  ? 'bg-success-soft border-success text-success'
                  : geoStatus === 'error'
                  ? 'bg-danger-soft border-danger text-danger'
                  : 'bg-warning-soft border-warning text-warning hover:bg-warning-soft'
              } disabled:opacity-60`}
            >
              <MapPin size={14} className={geoLoading ? 'animate-bounce' : ''} />
              <span className="hidden sm:inline">
                {geoLoading ? 'Ricerca…' : geoStatus === 'ok' ? 'Posizionato!' : geoStatus === 'error' ? 'Non trovato' : 'Posiziona su Mappa'}
              </span>
            </button>
          )}
          {(editingContact?.lat && editingContact?.lng) && (
            <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-success uppercase tracking-normal">
              <MapPin size={11} /> In mappa
            </span>
          )}
          <button
            onClick={() => setConfirmDeleteId(editingContact?.id ?? null)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-panel border-2 border-danger dark:border-danger text-danger hover:bg-danger-soft dark:hover:bg-danger-soft font-semibold uppercase text-xs tracking-normal transition-colors"
          >
            <Trash2 size={13} /> Elimina
          </button>
        </div>
      </div>
    </>
  );
}
