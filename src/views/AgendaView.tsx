import { DialogFrame } from '../components/ui/DialogFrame';
import React from 'react';
import { useAgendaState } from '../components/agenda/useAgendaState';
import { useAgendaAi } from '../components/agenda/useAgendaAi';
import { useAgendaClose } from '../components/agenda/useAgendaClose';
import { useAgendaForm } from '../components/agenda/useAgendaForm';
import { useAgendaImport } from '../components/agenda/useAgendaImport';
import { useAgendaCalendar } from '../components/agenda/useAgendaCalendar';
import { AgendaActivityList } from '../components/agenda/AgendaActivityList';
import { AgendaBatchModal } from '../components/agenda/AgendaBatchModal';
import { AgendaCalendarCard } from '../components/agenda/AgendaCalendarCard';
import { AgendaCloseModal } from '../components/agenda/AgendaCloseModal';
import { AgendaDetailModal } from '../components/agenda/AgendaDetailModal';
import { AgendaFormModal } from '../components/agenda/AgendaFormModal';
import { AgendaHeader } from '../components/agenda/AgendaHeader';
import { AgendaPstModal } from '../components/agenda/AgendaPstModal';
import { AgendaRecorderPanel } from '../components/agenda/AgendaRecorderPanel';
import { AgendaVoicePanel } from '../components/agenda/AgendaVoicePanel';

// ─── Types ────────────────────────────────────────────────────────────────────


export interface AgendaViewProps {
  onNavigateToContact?: (contactId: string) => void;
  onViewItinerary?: (date: string) => void;
}


export const AgendaView: React.FC<AgendaViewProps> = (props) => {
  // Lo stato è diviso in hook in sequenza: ognuno riceve il modello del precedente
  const v = useAgendaCalendar(useAgendaImport(useAgendaForm(useAgendaClose(useAgendaAi(useAgendaState(props))))));
  const { confirmDeleteId, setConfirmDeleteId, handleDelete } = v;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-20">

      {/* Header */}
      <AgendaHeader v={v} />

      {/* Voice schedule panel */}
      <AgendaVoicePanel v={v} />

      {/* Calendar card */}
      <AgendaCalendarCard v={v} />

      {/* Activity list */}
      <AgendaActivityList v={v} />

      {/* ── Detail / View Modal ── */}
      <AgendaDetailModal v={v} />

      {/* ── Add / Edit Modal ── */}
      <AgendaFormModal v={v} />

      {/* ── Confirm Delete ── */}
      {confirmDeleteId && (
        <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface dark:bg-surface w-full max-w-sm rounded-panel p-8 shadow-panel text-center">
            <p className="font-semibold text-lg dark:text-foreground mb-2">Elimina appuntamento?</p>
            <p className="text-sm text-muted mb-6">Questa azione non è reversibile.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-panel font-semibold bg-raised dark:bg-raised text-secondary dark:text-muted">Annulla</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 py-3 rounded-panel font-semibold bg-danger text-status-foreground hover:bg-danger transition-colors">Elimina</button>
            </div>
          </div>
        </DialogFrame>
      )}

      {/* ── Chiudi Appuntamento Modal ── */}
      <AgendaCloseModal v={v} />

      {/* ── Modal Analisi AI Batch (tutte le visite in una chiamata) ── */}
      <AgendaBatchModal v={v} />

      {/* ── Modal Import PST ── */}
      <AgendaPstModal v={v} />

      {/* Conversation Recorder Modal */}
      <AgendaRecorderPanel v={v} />
    </div>
  );
};
