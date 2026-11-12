import { Plus, Download, Upload, Mic, Loader2, Sparkles } from 'lucide-react';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaHeader({ v }: { v: AgendaCalendarModel }) {
  const { selectedDay, voiceSched, voiceState, startVoiceSchedule, pendingBatchActivities, openBatchModal, openNew, pstInputRef, pstLoading, handlePSTUpload, handleExportICS } = v;
  return (
    <>
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div><h1 className="text-2xl dark:text-foreground">Agenda</h1>
          <p className="cockpit-page-description">Appuntamenti e attività, organizzati intorno alla tua giornata.</p></div>
        <div className="flex items-center flex-wrap gap-2">
          {/* Import da Outlook PST */}
          <input
            ref={pstInputRef}
            type="file"
            accept=".pst"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePSTUpload(f); e.target.value = ''; }}
          />
          <button
            onClick={() => pstInputRef.current?.click()}
            disabled={pstLoading}
            className="bg-accent-soft dark:bg-accent-soft/20 border-2 border-accent dark:border-accent text-accent dark:text-accent px-3 sm:px-4 py-2.5 rounded-panel font-bold flex items-center gap-2 hover:bg-accent-soft transition-colors text-sm disabled:opacity-60"
            title="Importa appuntamenti da file Outlook .pst"
          >
            {pstLoading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            <span className="hidden sm:inline">{pstLoading ? 'Lettura…' : 'Importa Outlook'}</span>
          </button>
          <button
            onClick={handleExportICS}
            className="bg-surface dark:bg-surface border-2 border-line dark:border-line text-secondary dark:text-muted px-3 sm:px-4 py-2.5 rounded-panel font-bold flex items-center gap-2 hover:border-accent hover:text-accent transition-colors text-sm"
            title="Esporta tutti gli appuntamenti futuri come file .ics"
          >
            <Download size={15} /> <span className="hidden sm:inline">Esporta .ics</span>
          </button>
          {voiceSched.isSupported && (
            <button
              onClick={startVoiceSchedule}
              disabled={voiceState !== 'idle'}
              className="bg-surface dark:bg-surface border-2 border-line dark:border-line text-secondary dark:text-muted p-2.5 rounded-panel font-bold flex items-center gap-2 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
              title="Pianifica con la voce"
            >
              <Mic size={16} />
            </button>
          )}
          {pendingBatchActivities.length > 0 && (
            <button
              onClick={openBatchModal}
              className="bg-accent-soft dark:bg-accent-soft/20 border-2 border-accent dark:border-accent text-accent dark:text-accent px-3 sm:px-4 py-2.5 rounded-panel font-bold flex items-center gap-2 hover:bg-accent-soft transition-colors text-sm"
              title="Analizza con AI tutte le visite chiuse non ancora processate, in un'unica chiamata"
            >
              <Sparkles size={15} />
              <span className="hidden sm:inline">Analizza AI visite</span>
              <span className="bg-action text-action-foreground rounded-full px-1.5 text-xs">{pendingBatchActivities.length}</span>
            </button>
          )}
          <button
            onClick={() => openNew(selectedDay ?? undefined)}
            className="bg-action text-action-foreground px-5 py-2.5 rounded-panel font-bold flex items-center gap-2 hover:bg-action-hover transition-colors text-sm"
          >
            <Plus size={16} /> Nuova
          </button>
        </div>
      </div>
    </>
  );
}
