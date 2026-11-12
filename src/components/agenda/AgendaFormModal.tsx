import { DialogFrame } from '../ui/DialogFrame';
import { X, Mic, MicOff } from 'lucide-react';
import { ActivityType } from '../../types';
import { SearchDropdown } from '../ui/SearchDropdown';
import { ClockTimeInput } from '../ui/ClockTimeInput';
import { WORK_DAY_START, WORK_DAY_END, addMinutesToTime, TYPE_LABELS, NO_CONTACT_TYPES, MULTI_CONTACT_TYPES, MULTI_DAY_TYPES, VISIT_TYPES } from './agendaShared';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaFormModal({ v }: { v: AgendaCalendarModel }) {
  const { contacts, showModal, editingId, formData, setFormData, contactSearch, setContactSearch, voiceNotes, filteredContacts, closeModal, handleSave } = v;
  return (
    <>
      {showModal && (
        <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface dark:bg-surface w-full max-w-md rounded-panel p-8 shadow-panel max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h2 className="text-xl font-semibold dark:text-foreground">{editingId ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}</h2>
              <button onClick={closeModal}><X size={24} className="text-muted" /></button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col min-h-0 flex-1">
              {/* Contact picker - fisso nell'header, nascosto per smart-working/ufficio */}
              {!NO_CONTACT_TYPES.includes(formData.type) && (
              <div className="relative z-10 flex-shrink-0 pb-4">
                <label className="text-xs font-semibold text-muted uppercase mb-1 block">
                  {MULTI_CONTACT_TYPES.includes(formData.type) ? 'Clienti' : 'Cliente / Azienda'}
                  {!MULTI_CONTACT_TYPES.includes(formData.type) && formData.contactIds.length > 0 && (
                    <span className="ml-2 normal-case font-bold text-accent">✓ selezionato</span>
                  )}
                </label>
                {MULTI_CONTACT_TYPES.includes(formData.type) && formData.contactIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.contactIds.map(id => (
                      <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent">
                        {contacts[id]?.company || '(senza nome)'}
                        <button type="button" aria-label="Rimuovi cliente" onClick={() => setFormData({ ...formData, contactIds: formData.contactIds.filter(x => x !== id) })}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <SearchDropdown
                  value={contactSearch}
                  onChange={v => {
                    setContactSearch(v);
                    if (!MULTI_CONTACT_TYPES.includes(formData.type) && formData.contactIds.length > 0) setFormData({ ...formData, contactIds: [] });
                  }}
                  onSelect={c => {
                    if (MULTI_CONTACT_TYPES.includes(formData.type)) {
                      setFormData({ ...formData, contactIds: [...formData.contactIds, c.id] });
                      setContactSearch('');
                    } else {
                      setFormData({ ...formData, contactIds: [c.id] });
                      setContactSearch(c.company || '(senza nome)');
                    }
                  }}
                  results={(MULTI_CONTACT_TYPES.includes(formData.type) ? filteredContacts.filter(c => !formData.contactIds.includes(c.id)) : filteredContacts).map(c => ({
                    key: c.id,
                    item: c,
                    label: c.company || '(senza nome)',
                    sublabel: c.contactName || undefined,
                    badge: {
                      text: c.status === 'cliente' ? 'Cliente' : 'Prospect',
                      className: c.status === 'cliente'
                        ? 'bg-success-soft text-success dark:bg-success-soft dark:text-success'
                        : 'bg-accent-soft text-accent dark:bg-accent-soft/40 dark:text-accent',
                    },
                  }))}
                  totalCount={Object.keys(contacts).length}
                  showWhenEmpty
                  autoFocus={!editingId}
                  placeholder={`Scrivi il nome... (${Object.keys(contacts).length} contatti)`}
                  emptyTitle={Object.keys(contacts).length === 0 ? '📋 Rubrica vuota' : '🔍 Nessun risultato'}
                  emptySubtitle={Object.keys(contacts).length === 0 ? 'Aggiungi contatti dalla sezione Clienti' : 'Prova con un termine diverso'}
                />
              </div>
              )}
              <div className="overflow-y-auto min-h-0 flex-1 space-y-4 -mx-1 px-1">
              <div>
                <label className="text-xs font-semibold text-muted uppercase mb-1 block">Tipo</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TYPE_LABELS) as ActivityType[]).map(t => (
                    <button key={t} type="button" onClick={() => setFormData({ ...formData, type: t, contactIds: MULTI_CONTACT_TYPES.includes(t) ? formData.contactIds : formData.contactIds.slice(0, 1) })} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${formData.type === t ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary dark:text-muted'}`}>{TYPE_LABELS[t]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase mb-1 block">{MULTI_DAY_TYPES.includes(formData.type) ? 'Dal giorno' : 'Data'}</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full border-2 border-line dark:border-line rounded-panel p-4 bg-transparent dark:text-foreground outline-none focus:border-accent" />
              </div>
              {MULTI_DAY_TYPES.includes(formData.type) && (
                <div>
                  <label className="text-xs font-semibold text-muted uppercase mb-1 block">Al giorno (opzionale, per eventi su più giorni)</label>
                  <input
                    type="date"
                    min={formData.date}
                    value={formData.endDateDay}
                    onChange={e => setFormData({ ...formData, endDateDay: e.target.value })}
                    className="w-full border-2 border-line dark:border-line rounded-panel p-4 bg-transparent dark:text-foreground outline-none focus:border-accent"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setFormData(prev => prev.allDay
                  ? { ...prev, allDay: false, time: '08:00', endTime: '09:00' }
                  : { ...prev, allDay: true, time: WORK_DAY_START, endTime: WORK_DAY_END })}
                className={`w-full flex items-center justify-between border-2 rounded-panel p-4 font-bold text-sm transition-all ${formData.allDay ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' : 'border-line dark:border-line text-secondary dark:text-muted'}`}
              >
                Tutto il giorno
                <span className="text-xs font-semibold uppercase tracking-normal">{formData.allDay ? `${WORK_DAY_START}–${WORK_DAY_END}` : 'No'}</span>
              </button>
              {!formData.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted uppercase mb-1 block">Ora inizio</label>
                  <ClockTimeInput
                    min={VISIT_TYPES.includes(formData.type) ? '08:00' : undefined}
                    max={VISIT_TYPES.includes(formData.type) ? '18:00' : undefined}
                    value={formData.time}
                    onChange={newTime => {
                      // Sposta l'ora di fine mantenendo la stessa durata, così non finisce mai prima dell'inizio
                      const prevMins = formData.time.split(':').map(Number);
                      const nextMins = newTime.split(':').map(Number);
                      const deltaMin = (nextMins[0] * 60 + nextMins[1]) - (prevMins[0] * 60 + prevMins[1]);
                      setFormData({ ...formData, time: newTime, endTime: addMinutesToTime(formData.endTime, deltaMin) });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase mb-1 block">Ora fine</label>
                  <ClockTimeInput
                    min={VISIT_TYPES.includes(formData.type) ? '08:00' : undefined}
                    max={VISIT_TYPES.includes(formData.type) ? '18:00' : undefined}
                    value={formData.endTime}
                    onChange={endTime => setFormData({ ...formData, endTime })}
                  />
                </div>
              </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted uppercase block">Note</label>
                  {voiceNotes.isSupported && (
                    <button
                      type="button"
                      onClick={() => {
                        if (voiceNotes.isRecording) {
                          voiceNotes.stop();
                        } else {
                          voiceNotes.start({
                            continuous: true,
                            onFinal: (text) => setFormData(prev => ({ ...prev, notes: prev.notes ? prev.notes + ' ' + text : text })),
                          });
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        voiceNotes.isRecording
                          ? 'bg-danger text-status-foreground animate-pulse'
                          : 'bg-raised dark:bg-raised text-secondary dark:text-muted hover:bg-accent-soft hover:text-accent'
                      }`}
                    >
                      {voiceNotes.isRecording ? <MicOff size={12} /> : <Mic size={12} />}
                      {voiceNotes.isRecording ? 'Stop' : 'Detta'}
                    </button>
                  )}
                </div>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Obiettivo della visita, dettagli..." rows={2} className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-transparent dark:text-foreground outline-none focus:border-accent text-sm resize-none" />
                {voiceNotes.isRecording && voiceNotes.transcript && (
                  <p className="text-xs text-accent italic mt-1.5 px-1">"{voiceNotes.transcript}"</p>
                )}
                {voiceNotes.error && <p className="text-xs text-danger mt-1 px-1">{voiceNotes.error}</p>}
              </div>
              <button type="submit" className="w-full bg-action text-action-foreground font-semibold py-4 rounded-panel uppercase tracking-normal hover:bg-action-hover transition-colors">
                {editingId ? 'Aggiorna' : 'Salva'}
              </button>
              </div>
            </form>
          </div>
        </DialogFrame>
      )}
    </>
  );
}
