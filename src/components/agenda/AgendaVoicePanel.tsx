import { X, MicOff, Loader2 } from 'lucide-react';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaVoicePanel({ v }: { v: AgendaCalendarModel }) {
  const { voiceSched, voiceState, setVoiceState, voiceError, showVoicePanel, cancelVoiceSchedule } = v;
  return (
    <>
      {showVoicePanel && (
        <div className="bg-surface dark:bg-surface rounded-panel border-2 border-accent dark:border-accent p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold dark:text-foreground text-sm">Pianifica con la voce</p>
              <p className="text-xs text-muted mt-0.5">Es: "Visita da Rossi SRL venerdì alle 10 per i giubbotti nuovi"</p>
            </div>
            <button onClick={cancelVoiceSchedule} className="text-muted hover:text-secondary flex-shrink-0"><X size={18} /></button>
          </div>

          {/* Mic visual */}
          <div className="flex flex-col items-center gap-3 py-4">
            {voiceState === 'recording' ? (
              <>
                <button
                  onClick={() => { voiceSched.stop(); setVoiceState('parsing'); }}
                  className="w-16 h-16 rounded-full bg-danger text-status-foreground flex items-center justify-center shadow-panel animate-pulse"
                >
                  <MicOff size={28} />
                </button>
                <p className="text-xs text-muted font-bold">Registrazione in corso... (tocca per fermare)</p>
              </>
            ) : voiceState === 'parsing' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-accent-soft dark:bg-accent-soft/40 flex items-center justify-center">
                  <Loader2 size={28} className="text-accent animate-spin" />
                </div>
                <p className="text-xs text-muted font-bold">Analisi in corso...</p>
              </>
            ) : null}

            {voiceSched.transcript && (
              <div className="w-full bg-canvas dark:bg-raised rounded-panel px-4 py-3 text-sm text-foreground dark:text-muted italic min-h-[48px]">
                "{voiceSched.transcript}"
              </div>
            )}
            {voiceError && <p className="text-xs text-danger font-bold">{voiceError}</p>}
          </div>
        </div>
      )}
    </>
  );
}
