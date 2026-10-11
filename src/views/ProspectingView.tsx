import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useMemo, useState } from 'react';
import {
  Radar, X, Mail, Phone, Linkedin, Clock, AlertCircle, CheckCircle2,
  Copy, Building2, PauseCircle, XCircle, TrendingUp, BarChart3, Calendar, Pencil, Trash2, History, BellRing, Plus, Sparkles,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/ToastContext';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { useClaudeAI } from '../hooks/useClaudeAI';
import { AiPanel } from '../components/ai/AiPanel';
import { matchSearch, sortByRelevance } from '../utils/search';
import type {
  Contact, ProspectingSettore, ProspectingStato, ProspectingMotivoScarto, ProspectingTrack, Sequence, Activity, NavView, ProspectHistoryEntry, ProspectEmailDraft,
} from '../types';
import { isNotificationSupported, requestProspectingNotificationPermission } from '../hooks/useProspectingReminders';
import {
  advanceTouch, getTouch, wakeUpIfDue, convertToLead, startSequenceForContact,
} from '../lib/prospecting';

const DAY_MS = 24 * 60 * 60 * 1000;

const SETTORE_LABEL: Record<ProspectingSettore, string> = {
  industria: 'Industria',
  edilizia: 'Edilizia',
  rivendita: 'Rivendita',
  ferramenta: 'Ferramenta',
};

const MOTIVO_SCARTO_LABEL: Record<ProspectingMotivoScarto, string> = {
  prodotto: 'Prodotto non adatto',
  momento: 'Momento sbagliato',
  prezzo: 'Prezzo',
  'fornitore-vincolato': 'Vincolato a fornitore',
  altro: 'Altro',
};

const STATO_BADGE: Record<ProspectingStato, { label: string; cls: string }> = {
  in_sequenza: { label: 'In sequenza', cls: 'bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent' },
  risposto: { label: 'Risposto', cls: 'bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent' },
  convertito: { label: 'Convertito', cls: 'bg-success-soft dark:bg-success-soft text-success dark:text-success' },
  in_pausa: { label: 'In pausa', cls: 'bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning' },
  scartato: { label: 'Scartato', cls: 'bg-danger-soft dark:bg-danger-soft text-danger dark:text-danger' },
};

function formatDate(ts?: number): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ts));
}

const inputCls = 'w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-2.5 text-sm font-bold dark:text-foreground outline-none focus:border-accent';
const labelCls = 'text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5';

// ─── Modale: scarto prospect ─────────────────────────────────────────────────

interface DiscardModalProps {
  contact: Contact;
  onClose: () => void;
}

const DiscardModal: React.FC<DiscardModalProps> = ({ contact, onClose }) => {
  const { updateContact, prospectingTracks, updateProspectingTrack } = useStore();
  const [motivo, setMotivo] = useState<ProspectingMotivoScarto>('momento');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateContact(contact.id, { prospectingStato: 'scartato', prospectingMotivoScarto: motivo, prospectingMotivoScartoNote: note.trim() || undefined });
    const active = Object.values(prospectingTracks).find(t => t.contactId === contact.id && t.stato === 'attiva');
    if (active) updateProspectingTrack(active.id, { stato: 'stoppata' });
    onClose();
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground">Scarta {contact.company}</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
        </div>
        <div>
          <label className={labelCls}>Motivo *</label>
          <select value={motivo} onChange={e => setMotivo(e.target.value as ProspectingMotivoScarto)} className={inputCls}>
            {Object.entries(MOTIVO_SCARTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" className="flex-1 py-3 rounded-panel bg-danger text-status-foreground font-semibold text-sm hover:bg-danger transition-colors">Scarta prospect</button>
          <button type="button" onClick={onClose} className="px-5 py-3 rounded-panel bg-raised dark:bg-surface text-secondary dark:text-muted font-semibold text-sm hover:bg-raised transition-colors">Annulla</button>
        </div>
      </form>
    </DialogFrame>
  );
};

// ─── Modale: conversione manuale prospect → Lead ─────────────────────────────
// Copre il caso in cui il prospect ottiene appuntamento/offerta senza un tocco
// "in coda" da registrare (es. dopo il sesto tocco, in pausa/risvegliato, o
// contatto arrivato da fuori sequenza).

interface ConvertModalProps {
  contact: Contact;
  onClose: () => void;
}

const ConvertModal: React.FC<ConvertModalProps> = ({ contact, onClose }) => {
  const { updateContact, addDeal, prospectingTracks, updateProspectingTrack } = useStore();
  const { showToast } = useToast();

  const handleConvert = (esito: 'richiesta-offerta' | 'appuntamento-fissato') => {
    const { deal, contactUpdates } = convertToLead(contact);
    addDeal(deal);
    updateContact(contact.id, contactUpdates);
    const active = Object.values(prospectingTracks).find(t => t.contactId === contact.id && t.stato === 'attiva');
    if (active) updateProspectingTrack(active.id, { stato: 'stoppata' });
    showToast(
      esito === 'richiesta-offerta' ? 'Prospect convertito in Lead: richiede offerta' : 'Prospect convertito in Lead: appuntamento fissato',
      'success',
    );
    onClose();
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground">Converti {contact.company} in Lead</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
        </div>
        <p className="text-xs text-muted">Qual è stato l'esito che sposta il prospect in pipeline?</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => handleConvert('richiesta-offerta')} className="w-full py-3 rounded-panel bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent font-semibold text-sm hover:bg-accent-soft transition-colors">Richiede offerta</button>
          <button onClick={() => handleConvert('appuntamento-fissato')} className="w-full py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-colors">Appuntamento fissato</button>
          <button type="button" onClick={onClose} className="w-full py-3 rounded-panel bg-raised dark:bg-surface text-secondary dark:text-muted font-semibold text-sm hover:bg-raised transition-colors">Annulla</button>
        </div>
      </div>
    </DialogFrame>
  );
};

// ─── Modale: modifica / elimina attività di prospecting ───────────────────────

interface EditProspectModalProps {
  contact: Contact;
  onClose: () => void;
}

const EditProspectModal: React.FC<EditProspectModalProps> = ({ contact, onClose }) => {
  const { prospectingTracks, sequences, updateContact, updateProspectingTrack, deleteProspectingTrack } = useStore();
  const { showToast } = useToast();

  const track = useMemo(() => {
    const tracks = Object.values(prospectingTracks).filter(t => t.contactId === contact.id);
    return tracks.find(t => t.stato === 'attiva') || tracks.sort((a, b) => b.dataG0 - a.dataG0)[0];
  }, [prospectingTracks, contact.id]);
  const sequence = track ? sequences[track.sequenceId] : undefined;

  const [settore, setSettore] = useState<ProspectingSettore>(contact.prospectingSettore || 'industria');
  const [stato, setStato] = useState<ProspectingStato>(contact.prospectingStato || 'in_sequenza');
  const [tocco, setTocco] = useState(track?.toccoCorrente || 1);
  const [dataProssimoTocco, setDataProssimoTocco] = useState(
    track ? new Date(track.dataProssimoTocco).toISOString().slice(0, 10) : ''
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateContact(contact.id, { prospectingSettore: settore, prospectingStato: stato, updatedAt: Date.now() });
    if (track) {
      updateProspectingTrack(track.id, {
        toccoCorrente: tocco,
        dataProssimoTocco: dataProssimoTocco ? new Date(dataProssimoTocco).getTime() : track.dataProssimoTocco,
        stato: stato === 'in_sequenza' ? 'attiva' : track.stato,
      });
    }
    showToast('Prospect aggiornato', 'success');
    onClose();
  };

  const handleDelete = () => {
    if (track) deleteProspectingTrack(track.id);
    updateContact(contact.id, {
      prospectingStato: undefined,
      prospectingSettore: undefined,
      prospectingDataRisveglio: undefined,
      prospectingMotivoScarto: undefined,
      prospectingMotivoScartoNote: undefined,
      convertedToDealId: undefined,
      updatedAt: Date.now(),
    });
    showToast('Attività di prospecting eliminata', 'success');
    onClose();
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground">Modifica {contact.company}</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
        </div>

        <div>
          <label className={labelCls}>Settore</label>
          <select value={settore} onChange={e => setSettore(e.target.value as ProspectingSettore)} className={inputCls}>
            {Object.entries(SETTORE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Stato</label>
          <select value={stato} onChange={e => setStato(e.target.value as ProspectingStato)} className={inputCls}>
            {Object.entries(STATO_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {track && sequence && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tocco corrente</label>
              <select value={tocco} onChange={e => setTocco(Number(e.target.value))} className={inputCls}>
                {sequence.touches.map(t => <option key={t.ordine} value={t.ordine}>{t.ordine}/{sequence.touches.length}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prossima azione</label>
              <input type="date" value={dataProssimoTocco} onChange={e => setDataProssimoTocco(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" className="flex-1 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-colors">Salva</button>
          <button type="button" onClick={onClose} className="px-5 py-3 rounded-panel bg-raised dark:bg-surface text-secondary dark:text-muted font-semibold text-sm hover:bg-raised transition-colors">Annulla</button>
        </div>

        <div className="pt-2 border-t border-line dark:border-line">
          {confirmDelete ? (
            <div className="flex items-center gap-2 pt-2">
              <p className="flex-1 text-xs font-bold text-danger">Eliminare definitivamente questa attività di prospecting?</p>
              <button type="button" onClick={handleDelete} className="px-3 py-2 rounded-md bg-danger text-status-foreground text-xs font-semibold hover:bg-danger">Conferma</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-md bg-raised dark:bg-surface text-secondary text-xs font-semibold">Annulla</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger hover:text-danger">
              <Trash2 size={13} />Elimina attività di prospecting
            </button>
          )}
        </div>
      </form>
    </DialogFrame>
  );
};

// ─── Modale: personalizza l'email prima dell'invio ─────────────────────────
// La sequenza propone una bozza semi-personalizzata; qui l'utente scrive la
// versione definitiva che invierà davvero al prospect (`modificataAMano: true`
// serve solo a distinguerla in UI/storico dalla bozza generata automaticamente).

interface EditEmailDraftModalProps {
  draft: ProspectEmailDraft;
  onClose: () => void;
}

const EditEmailDraftModal: React.FC<EditEmailDraftModalProps> = ({ draft, onClose }) => {
  const { updateProspectEmailDraft } = useStore();
  const { showToast } = useToast();
  const [oggetto, setOggetto] = useState(draft.oggetto);
  const [corpo, setCorpo] = useState(draft.corpo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProspectEmailDraft(draft.id, { oggetto: oggetto.trim(), corpo, modificataAMano: true });
    showToast('Email personalizzata salvata', 'success');
    onClose();
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-surface dark:bg-canvas w-full sm:max-w-lg sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground">Personalizza email</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
        </div>
        <div>
          <label className={labelCls}>Oggetto</label>
          <input value={oggetto} onChange={e => setOggetto(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Corpo</label>
          <textarea value={corpo} onChange={e => setCorpo(e.target.value)} rows={10} className={inputCls + ' resize-none'} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" className="flex-1 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-colors">Salva email personalizzata</button>
          <button type="button" onClick={onClose} className="px-5 py-3 rounded-panel bg-raised dark:bg-surface text-secondary dark:text-muted font-semibold text-sm hover:bg-raised transition-colors">Annulla</button>
        </div>
      </form>
    </DialogFrame>
  );
};

// ─── Cronostoria prospecting per azienda ────────────────────────────────────

const ESITO_LABEL: Record<ProspectHistoryEntry['esito'], { label: string; color: string }> = {
  inviata: { label: 'Inviata', color: 'text-accent bg-accent-soft dark:bg-accent-soft/30' },
  risposta: { label: 'Risposta ricevuta', color: 'text-success bg-success-soft dark:bg-success-soft' },
  'nessuna-risposta': { label: 'Nessuna risposta', color: 'text-secondary bg-raised dark:bg-surface' },
  'richiesta-offerta': { label: 'Richiede offerta → Lead', color: 'text-accent bg-accent-soft dark:bg-accent-soft/30' },
  'appuntamento-fissato': { label: 'Appuntamento fissato → Lead', color: 'text-accent bg-accent-soft dark:bg-accent-soft/30' },
};

interface HistoryModalProps {
  contact: Contact;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ contact, onClose }) => {
  const { prospectHistory } = useStore();
  const { result: aiResult, loading: aiLoading, error: aiError, run: aiRun, reset: aiReset } = useClaudeAI();
  const [showAiPanel, setShowAiPanel] = useState(false);

  const entries = useMemo(
    () => Object.values(prospectHistory)
      .filter(h => h.contactId === contact.id)
      .sort((a, b) => a.date - b.date),
    [prospectHistory, contact.id]
  );

  const runAnalysis = () => {
    setShowAiPanel(true);
    aiRun('analizza-prospecting', {
      company: contact.company,
      entries: entries.map(e => ({
        tocco: e.tocco,
        tipo: e.tipo,
        esito: e.esito,
        oggetto: e.oggetto,
        corpo: e.corpo,
        note: e.note,
        data: new Date(e.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }),
      })),
    });
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface dark:bg-canvas w-full sm:max-w-3xl sm:rounded-panel rounded-t-3xl p-6 shadow-panel h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-muted" />
            <h2 className="text-base font-semibold text-foreground dark:text-foreground">Cronostoria — {contact.company}</h2>
          </div>
          <div className="flex items-center gap-2">
            {entries.length >= 2 && (
              <button
                type="button"
                onClick={runAnalysis}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-action hover:bg-action-hover text-action-foreground text-xs font-semibold rounded-md transition-all"
              >
                <Sparkles size={14} /> Analizza con AI
              </button>
            )}
            <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-muted font-bold text-center py-8">Nessuna azione registrata finora per questo prospect.</p>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1">
            {entries.map(e => (
              <div key={e.id} className="border-2 border-line dark:border-line rounded-panel p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {e.tipo === 'email' ? <Mail size={14} className="text-muted" /> : <Phone size={14} className="text-muted" />}
                    <span className="text-xs font-semibold text-foreground dark:text-muted">Tocco {e.tocco}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESITO_LABEL[e.esito].color}`}>{ESITO_LABEL[e.esito].label}</span>
                  </div>
                  <span className="text-xs font-bold text-muted">{new Date(e.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {e.oggetto && <p className="text-xs font-semibold text-secondary dark:text-muted mt-1">{e.oggetto}</p>}
                {e.corpo && <p className="text-xs text-secondary dark:text-muted mt-1 whitespace-pre-wrap">{e.corpo}</p>}
                {e.note && (
                  <div className="mt-1.5 bg-canvas dark:bg-surface/60 rounded-lg p-2">
                    <p className="text-xs font-semibold text-muted uppercase tracking-normal mb-0.5">Risposta del prospect</p>
                    <p className="text-xs text-secondary dark:text-muted whitespace-pre-wrap">{e.note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAiPanel && (
        <AiPanel
          title="Analisi cronostoria"
          subtitle={contact.company}
          loading={aiLoading}
          result={aiResult}
          error={aiError}
          onClose={() => { setShowAiPanel(false); aiReset(); }}
          onRetry={runAnalysis}
        />
      )}
    </DialogFrame>
  );
};

// ─── Riga coda "Oggi" ────────────────────────────────────────────────────────

interface QueueRowProps {
  contact: Contact;
  track: ProspectingTrack;
  sequence: Sequence;
  onDiscard: () => void;
  onEdit: () => void;
  onHistory: () => void;
}

const QueueRow: React.FC<QueueRowProps> = ({ contact, track, sequence, onDiscard, onEdit, onHistory }) => {
  const { updateContact, updateProspectingTrack, prospectEmailDrafts, updateProspectEmailDraft, addProspectHistoryEntry, addDeal } = useStore();
  const { showToast } = useToast();
  const [editingDraft, setEditingDraft] = useState(false);
  const [pendingEsito, setPendingEsito] = useState<null | 'risposta' | 'richiesta-offerta' | 'appuntamento-fissato'>(null);
  const [rispostaTesto, setRispostaTesto] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const apriModalRisposta = (esito: 'risposta' | 'richiesta-offerta' | 'appuntamento-fissato') => {
    setRispostaTesto('');
    setPendingEsito(esito);
  };

  const touch = getTouch(sequence, track.toccoCorrente);
  const draft = touch?.tipo === 'email' ? Object.values(prospectEmailDrafts).find(d => d.trackId === track.id && d.tocco === track.toccoCorrente) : undefined;

  const now = Date.now();
  const overdue = track.dataProssimoTocco < now;
  const ritardoGiorni = Math.floor((now - track.dataProssimoTocco) / DAY_MS);

  // Registra il tocco nella cronostoria dedicata al prospecting: NON in `activities`,
  // che è l'agenda degli appuntamenti fissati e non deve mostrare i tocchi di sequenza.
  const logStorico = (tipo: 'email' | 'chiamata', esito: ProspectHistoryEntry['esito'], note?: string) => {
    addProspectHistoryEntry({
      id: `psh_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      contactId: contact.id,
      trackId: track.id,
      tocco: track.toccoCorrente,
      tipo,
      esito,
      oggetto: tipo === 'email' ? draft?.oggetto : undefined,
      corpo: tipo === 'email' ? draft?.corpo : undefined,
      note,
      date: Date.now(),
      createdAt: Date.now(),
    });
  };

  const avanza = () => {
    const result = advanceTouch(sequence, track);
    updateProspectingTrack(track.id, result.track);
    if (result.completata) updateContact(contact.id, { prospectingStato: 'in_pausa', prospectingDataRisveglio: Date.now() + 30 * DAY_MS });
  };

  const segnaInviata = () => {
    if (draft) updateProspectEmailDraft(draft.id, { inviataIl: Date.now() });
    logStorico('email', 'inviata');
    avanza();
    showToast('Email segnata come inviata, sequenza avanzata', 'success');
  };

  // Richiesta offerta o appuntamento fissato: sposta il prospect direttamente in Lead,
  // qualunque sia il tocco in corso (anche dopo il sesto e ultimo tocco della sequenza).
  const convertiInLead = (tipo: 'email' | 'chiamata', esito: 'richiesta-offerta' | 'appuntamento-fissato', note?: string) => {
    logStorico(tipo, esito, note);
    const { deal, contactUpdates } = convertToLead(contact);
    addDeal(deal);
    updateContact(contact.id, contactUpdates);
    updateProspectingTrack(track.id, { stato: 'stoppata' });
    showToast(
      esito === 'richiesta-offerta' ? 'Prospect convertito in Lead: richiede offerta' : 'Prospect convertito in Lead: appuntamento fissato',
      'success',
    );
  };

  const registraRisposta = (esito: 'risposta' | 'richiesta-offerta' | 'appuntamento-fissato', note?: string) => {
    if (esito !== 'risposta') {
      convertiInLead(touch?.tipo === 'email' ? 'email' : 'chiamata', esito, note);
      return;
    }
    logStorico(touch?.tipo === 'email' ? 'email' : 'chiamata', 'risposta', note);
    updateContact(contact.id, { prospectingStato: 'risposto' });
    updateProspectingTrack(track.id, { stato: 'stoppata' });
    showToast('Risposta registrata, sequenza fermata', 'success');
  };

  const posticipa = () => {
    updateProspectingTrack(track.id, { dataProssimoTocco: Date.now() + 3 * DAY_MS });
    showToast('Tocco posticipato di 3 giorni', 'info');
  };

  const apriModalSchedula = () => {
    const d = new Date(Math.max(track.dataProssimoTocco, Date.now()));
    setScheduleDate(d.toISOString().slice(0, 10));
    setShowScheduleModal(true);
  };

  const confermaSchedula = () => {
    if (!scheduleDate) return;
    // Mezzogiorno locale per evitare che il fuso orario faccia scivolare la data al giorno prima.
    const data = new Date(`${scheduleDate}T12:00:00`).getTime();
    updateProspectingTrack(track.id, { dataProssimoTocco: data });
    setShowScheduleModal(false);
    showToast(`Tocco schedulato per ${formatDate(data)}`, 'info');
  };

  const esitoTelefonata = (esito: 'risposta' | 'nessuna-risposta' | 'richiesta-offerta' | 'appuntamento-fissato') => {
    if (esito === 'richiesta-offerta' || esito === 'appuntamento-fissato') {
      convertiInLead('chiamata', esito);
      return;
    }
    logStorico('chiamata', esito);
    if (esito === 'risposta') {
      updateContact(contact.id, { prospectingStato: 'risposto' });
      updateProspectingTrack(track.id, { stato: 'stoppata' });
      showToast('Risposta registrata, sequenza fermata', 'success');
    } else {
      avanza();
      showToast('Nessuna risposta, sequenza avanzata', 'info');
    }
  };

  const copia = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => showToast(`${label} copiato`, 'success'));
  };

  // Apre il client mail predefinito (es. Outlook) con oggetto/corpo già pronti.
  // Non segna nulla come inviato: quello resta un'azione separata ("Segna inviata"),
  // perché aprire la bozza non significa che l'email sia stata effettivamente spedita.
  const apriEmail = () => {
    if (!draft || !contact.email) return;
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(draft.oggetto)}&body=${encodeURIComponent(draft.corpo)}`;
  };

  if (!touch) return null;

  return (
    <div className={`bg-surface dark:bg-surface rounded-panel p-4 border-2 ${overdue ? 'border-danger dark:border-danger' : 'border-line dark:border-line'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground dark:text-foreground">{contact.company}</p>
            {contact.prospectingSettore && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-raised dark:bg-raised text-secondary">{SETTORE_LABEL[contact.prospectingSettore]}</span>}
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-soft dark:bg-accent-soft/40 text-accent">Tocco {track.toccoCorrente}/{sequence.touches.length}</span>
          </div>
          {contact.contactName && <p className="text-xs text-muted mt-0.5">{contact.contactName}{contact.role ? ` · ${contact.role}` : ''}</p>}
          <p className={`flex items-center gap-1 text-xs font-bold mt-1 ${overdue ? 'text-danger' : 'text-muted'}`}>
            <Clock size={10} />
            {overdue ? `In ritardo di ${ritardoGiorni}g` : `Previsto ${formatDate(track.dataProssimoTocco)}`}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onHistory} title="Cronostoria" className="p-1.5 text-muted hover:text-secondary dark:hover:text-muted rounded-lg hover:bg-raised dark:hover:bg-raised">
            <History size={16} />
          </button>
          <button onClick={onEdit} title="Modifica" className="p-1.5 text-muted hover:text-accent rounded-lg hover:bg-accent-soft dark:hover:bg-accent-soft/20">
            <Pencil size={16} />
          </button>
          <button onClick={onDiscard} title="Scarta prospect" className="p-1.5 text-muted hover:text-danger rounded-lg hover:bg-danger-soft dark:hover:bg-danger-soft">
            <XCircle size={16} />
          </button>
        </div>
      </div>

      {touch.tipo === 'email' && draft && (
        <div className="mt-3 bg-canvas dark:bg-canvas/50 rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-foreground dark:text-muted flex-1">{draft.oggetto}</p>
            {draft.modificataAMano && (
              <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-success-soft dark:bg-success-soft text-success">Personalizzata</span>
            )}
          </div>
          <p className="text-xs text-secondary dark:text-muted whitespace-pre-line line-clamp-3">{draft.corpo}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => setEditingDraft(true)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-accent-soft dark:bg-accent-soft/30 border border-accent dark:border-accent text-accent dark:text-accent"><Pencil size={10} />Personalizza</button>
            <button onClick={() => copia(draft.oggetto, 'Oggetto')} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-surface dark:bg-surface border border-line dark:border-line text-secondary dark:text-muted"><Copy size={10} />Oggetto</button>
            <button onClick={() => copia(draft.corpo, 'Corpo')} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-surface dark:bg-surface border border-line dark:border-line text-secondary dark:text-muted"><Copy size={10} />Corpo</button>
            {!contact.email && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-warning-soft dark:bg-warning-soft text-warning">Nessuna email sul contatto: aggiungila per inviare direttamente</span>
            )}
          </div>
          {touch.messaggioLinkedin && (
            <div className="pt-1 border-t border-line dark:border-line mt-2">
              <p className="text-xs font-semibold text-muted uppercase mb-1 flex items-center gap-1"><Linkedin size={10} />LinkedIn{touch.linkedinSaltabile ? ' (saltabile)' : ''}</p>
              <p className="text-xs text-secondary dark:text-muted line-clamp-2">{touch.messaggioLinkedin}</p>
              <button onClick={() => copia(touch.messaggioLinkedin!, 'Messaggio LinkedIn')} className="mt-1 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-surface dark:bg-surface border border-line dark:border-line text-secondary dark:text-muted"><Copy size={10} />Copia</button>
            </div>
          )}
        </div>
      )}

      {touch.tipo === 'telefonata' && (
        <div className="mt-3 bg-canvas dark:bg-canvas/50 rounded-md p-3 space-y-2">
          <p className="text-xs font-bold text-foreground dark:text-muted whitespace-pre-line line-clamp-4">{touch.scriptTelefonata}</p>
          {contact.phone && <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-surface dark:bg-surface border border-line dark:border-line text-secondary dark:text-muted"><Phone size={10} />{contact.phone}</a>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {touch.tipo === 'email' ? (
          <>
            {draft && contact.email && (
              <button onClick={apriEmail} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-action text-action-foreground hover:bg-action-hover"><Mail size={13} />Invia email</button>
            )}
            <button onClick={segnaInviata} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent"><CheckCircle2 size={13} />Segna inviata</button>
            <button onClick={() => apriModalRisposta('risposta')} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-success-soft dark:bg-success-soft text-success dark:text-success"><Mail size={13} />Registra risposta</button>
          </>
        ) : (
          <button onClick={() => esitoTelefonata('risposta')} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-action text-action-foreground hover:bg-action-hover"><Phone size={13} />Registra esito chiamata</button>
        )}
        {touch.tipo === 'telefonata' && (
          <button onClick={() => esitoTelefonata('nessuna-risposta')} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-raised dark:bg-raised text-secondary dark:text-muted">Nessuna risposta</button>
        )}
        {/* Sempre visibili: non si presuppone di dover completare tutti i 6 tocchi
            prima di ottenere l'obiettivo (offerta/appuntamento) su qualunque tocco. */}
        <button
          onClick={() => (touch.tipo === 'email' ? apriModalRisposta('richiesta-offerta') : esitoTelefonata('richiesta-offerta'))}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent"
        >Richiede offerta</button>
        <button
          onClick={() => (touch.tipo === 'email' ? apriModalRisposta('appuntamento-fissato') : esitoTelefonata('appuntamento-fissato'))}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-action text-action-foreground hover:bg-action-hover"
        >Appuntamento fissato</button>
        <button onClick={posticipa} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-raised dark:bg-raised text-secondary dark:text-muted"><Clock size={13} />Posticipa 3gg</button>
        <button onClick={apriModalSchedula} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-md bg-raised dark:bg-raised text-secondary dark:text-muted"><Calendar size={13} />Schedula</button>
      </div>

      {editingDraft && draft && <EditEmailDraftModal draft={draft} onClose={() => setEditingDraft(false)} />}

      {showScheduleModal && (
        <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowScheduleModal(false); }}>
          <div className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-3 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground dark:text-foreground">Schedula prossimo tocco</h2>
              <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={() => setShowScheduleModal(false)} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
            </div>
            <p className="text-xs text-muted font-bold">Scegli quando far ricomparire {contact.company} in coda, ad esempio al rientro dalle ferie.</p>
            <input
              type="date"
              autoFocus
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent text-sm"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confermaSchedula}
                disabled={!scheduleDate}
                className="flex-1 py-2.5 rounded-md bg-action text-action-foreground font-semibold hover:bg-action-hover disabled:opacity-50"
              >
                Schedula
              </button>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2.5 rounded-md bg-raised dark:bg-surface text-secondary font-semibold"
              >
                Annulla
              </button>
            </div>
          </div>
        </DialogFrame>
      )}

      {pendingEsito && (
        <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setPendingEsito(null); }}>
          <div className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-3 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground dark:text-foreground">Testo della risposta ricevuta</h2>
              <button type="button" onClick={() => setPendingEsito(null)} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
            </div>
            <p className="text-xs text-muted font-bold">Incolla qui cosa ha risposto {contact.company}, per tenerne traccia nella cronostoria (facoltativo).</p>
            <textarea
              autoFocus
              value={rispostaTesto}
              onChange={e => setRispostaTesto(e.target.value)}
              rows={5}
              placeholder="Es. Al momento non siamo interessati..."
              className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent resize-none text-sm"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { registraRisposta(pendingEsito, rispostaTesto.trim() || undefined); setPendingEsito(null); }}
                className="flex-1 py-2.5 rounded-md bg-action text-action-foreground font-semibold hover:bg-action-hover"
              >
                Salva
              </button>
              <button
                type="button"
                onClick={() => setPendingEsito(null)}
                className="px-4 py-2.5 rounded-md bg-raised dark:bg-surface text-secondary font-semibold"
              >
                Annulla
              </button>
            </div>
          </div>
        </DialogFrame>
      )}
    </div>
  );
};

// ─── Tab: Oggi ───────────────────────────────────────────────────────────────

interface OggiTabProps {
  onNavigate?: (view: NavView) => void;
}

const OggiTab: React.FC<OggiTabProps> = ({ onNavigate }) => {
  const { contacts, prospectingTracks, sequences, activities, updateContact } = useStore();
  const [discardContact, setDiscardContact] = useState<Contact | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);

  const now = Date.now();

  const queue = useMemo(() => {
    return Object.values(prospectingTracks)
      .filter(t => t.stato === 'attiva')
      .map(t => ({ track: t, contact: contacts[t.contactId], sequence: sequences[t.sequenceId] }))
      .filter((x): x is { track: ProspectingTrack; contact: Contact; sequence: Sequence } => !!x.contact && !!x.sequence)
      .sort((a, b) => a.track.dataProssimoTocco - b.track.dataProssimoTocco);
  }, [prospectingTracks, contacts, sequences]);

  // Visite a freddo già in agenda ma non ancora chiuse: senza questa sezione il
  // prospect non compariva in Prospecting finché l'appuntamento non veniva
  // completato, anche se già collegato a un contatto potenziale.
  const inProgramma = useMemo(() => {
    return Object.values(activities)
      .filter(a => a.type === 'visita-freddo' && a.outcome !== 'fatto')
      .map(a => ({ activity: a, contact: contacts[a.contactId || ''] }))
      .filter((x): x is { activity: Activity; contact: Contact } => !!x.contact)
      .sort((a, b) => a.activity.date - b.activity.date);
  }, [activities, contacts]);

  const risvegliati = useMemo(() => wakeUpIfDue(Object.values(contacts), now), [contacts, now]);

  const inRitardo = queue.filter(q => q.track.dataProssimoTocco < now).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs font-bold text-secondary">
        <span>{queue.length} in coda</span>
        {inRitardo > 0 && <span className="text-danger flex items-center gap-1"><AlertCircle size={12} />{inRitardo} in ritardo</span>}
      </div>

      {inProgramma.length > 0 && (
        <div className="bg-accent-soft dark:bg-accent-soft/20 border-2 border-accent dark:border-accent rounded-panel p-4 space-y-2">
          <p className="text-xs font-semibold text-accent dark:text-accent flex items-center gap-1.5"><Calendar size={14} />Visite a freddo in programma ({inProgramma.length})</p>
          <p className="text-xs text-accent">Per avviare la sequenza email/chiamate registra l'esito della visita dall'Agenda: gli step 1-2-3-4 compaiono qui sotto solo dopo la chiusura.</p>
          {inProgramma.map(({ activity, contact }) => (
            <button
              key={activity.id}
              onClick={() => onNavigate?.('agenda')}
              className="w-full flex items-center justify-between bg-surface dark:bg-surface rounded-md px-3 py-2 text-left hover:bg-accent-soft/60 dark:hover:bg-accent-soft/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground dark:text-muted truncate">{contact.company}</p>
                <p className="text-xs text-muted">{new Date(activity.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</p>
              </div>
              <span className="text-xs font-semibold text-accent uppercase flex-shrink-0">Chiudi in Agenda →</span>
            </button>
          ))}
        </div>
      )}

      {risvegliati.length > 0 && (
        <div className="bg-warning-soft dark:bg-warning-soft border-2 border-warning dark:border-warning rounded-panel p-4 space-y-2">
          <p className="text-xs font-semibold text-warning dark:text-warning flex items-center gap-1.5"><PauseCircle size={14} />Prospect risvegliati ({risvegliati.length})</p>
          {risvegliati.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-surface dark:bg-surface rounded-md px-3 py-2">
              <span className="text-xs font-bold text-foreground dark:text-muted">{c.company}</span>
              <button onClick={() => updateContact(c.id, { prospectingStato: undefined, prospectingDataRisveglio: undefined })} className="text-xs font-semibold text-accent">Rimetti in gioco</button>
            </div>
          ))}
        </div>
      )}

      {queue.length === 0 ? (
        <EmptyState icon={Radar} title="Coda vuota" description="Nessun tocco in programma oggi. Registra una visita a freddo dall'Agenda per avviare una sequenza." />
      ) : (
        <div className="space-y-3">
          {queue.map(({ track, contact, sequence }) => (
            <QueueRow key={track.id} contact={contact} track={track} sequence={sequence} onDiscard={() => setDiscardContact(contact)} onEdit={() => setEditContact(contact)} onHistory={() => setHistoryContact(contact)} />
          ))}
        </div>
      )}

      {discardContact && <DiscardModal contact={discardContact} onClose={() => setDiscardContact(null)} />}
      {editContact && <EditProspectModal contact={editContact} onClose={() => setEditContact(null)} />}
      {historyContact && <HistoryModal contact={historyContact} onClose={() => setHistoryContact(null)} />}
    </div>
  );
};

// ─── Tab: Prospect ───────────────────────────────────────────────────────────

const ProspectTab: React.FC = () => {
  const { contacts } = useStore();
  const [filter, setFilter] = useState<ProspectingStato | 'tutti'>('tutti');
  const [discardContact, setDiscardContact] = useState<Contact | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);
  const [convertContact, setConvertContact] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    return Object.values(contacts)
      .filter(c => !!c.prospectingStato)
      .filter(c => filter === 'tutti' || c.prospectingStato === filter)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [contacts, filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setFilter('tutti')} className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold border-2 ${filter === 'tutti' ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent' : 'border-transparent bg-raised dark:bg-raised text-secondary'}`}>Tutti</button>
        {(Object.keys(STATO_BADGE) as ProspectingStato[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold border-2 ${filter === s ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent' : `border-transparent ${STATO_BADGE[s].cls}`}`}>{STATO_BADGE[s].label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Nessun prospect in lavorazione" description="Registra una visita a freddo dall'Agenda per iniziare a mappare le azioni verso un appuntamento." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map(contact => (
            <div key={contact.id} className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground dark:text-foreground truncate">{contact.company}</p>
                  {contact.prospectingStato && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATO_BADGE[contact.prospectingStato].cls}`}>{STATO_BADGE[contact.prospectingStato].label}</span>}
                  {contact.prospectingSettore && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-raised dark:bg-raised text-secondary">{SETTORE_LABEL[contact.prospectingSettore]}</span>}
                </div>
                {contact.contactName && <p className="text-xs text-muted mt-0.5">{contact.contactName}{contact.role ? ` · ${contact.role}` : ''}</p>}
                {contact.prospectingMotivoScarto && <p className="text-xs text-danger mt-0.5">{MOTIVO_SCARTO_LABEL[contact.prospectingMotivoScarto]}{contact.prospectingMotivoScartoNote ? ` — ${contact.prospectingMotivoScartoNote}` : ''}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setHistoryContact(contact)} title="Cronostoria" className="p-1.5 text-muted hover:text-secondary dark:hover:text-muted rounded-lg hover:bg-raised dark:hover:bg-raised"><History size={16} /></button>
                <button onClick={() => setEditContact(contact)} title="Modifica o elimina" className="p-1.5 text-muted hover:text-accent rounded-lg hover:bg-accent-soft dark:hover:bg-accent-soft/20"><Pencil size={16} /></button>
                {contact.prospectingStato !== 'scartato' && contact.prospectingStato !== 'convertito' && (
                  <>
                    <button onClick={() => setConvertContact(contact)} title="Converti in Lead" className="p-1.5 text-muted hover:text-accent rounded-lg hover:bg-accent-soft dark:hover:bg-accent-soft/20"><CheckCircle2 size={16} /></button>
                    <button onClick={() => setDiscardContact(contact)} title="Scarta prospect" className="p-1.5 text-muted hover:text-warning rounded-lg hover:bg-warning-soft dark:hover:bg-warning-soft"><XCircle size={16} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {discardContact && <DiscardModal contact={discardContact} onClose={() => setDiscardContact(null)} />}
      {editContact && <EditProspectModal contact={editContact} onClose={() => setEditContact(null)} />}
      {historyContact && <HistoryModal contact={historyContact} onClose={() => setHistoryContact(null)} />}
      {convertContact && <ConvertModal contact={convertContact} onClose={() => setConvertContact(null)} />}
    </div>
  );
};

// ─── Tab: Report / KPI ───────────────────────────────────────────────────────

interface Benchmark { label: string; value: number; unit: '%'; low: number; high: number; }

const BenchmarkBar: React.FC<Benchmark> = ({ label, value, low, high }) => {
  const color = value < low ? 'bg-danger' : value <= high ? 'bg-warning' : 'bg-success';
  const textColor = value < low ? 'text-danger' : value <= high ? 'text-warning' : 'text-success';
  return (
    <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-secondary dark:text-muted">{label}</span>
        <span className={`text-sm font-semibold ${textColor}`}>{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-raised dark:bg-raised rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <p className="text-xs font-bold text-muted mt-1">Benchmark: {low}-{high}%</p>
    </div>
  );
};

const ReportTab: React.FC = () => {
  const { contacts, prospectingTracks, sequences } = useStore();

  const stats = useMemo(() => {
    const prospects = Object.values(contacts).filter(c => !!c.prospectingStato);
    const allTracks = Object.values(prospectingTracks);

    const sequenzeAvviate = allTracks.length;
    const risposteRicevute = prospects.filter(c => c.prospectingStato === 'risposto' || c.prospectingStato === 'convertito').length;
    const tassoRisposta = sequenzeAvviate > 0 ? (risposteRicevute / sequenzeAvviate) * 100 : 0;

    const completate = allTracks.filter(t => t.stato === 'completata' || t.stato === 'stoppata').length;
    const convertiti = prospects.filter(c => c.prospectingStato === 'convertito').length;
    const conversioneSuSequenze = completate > 0 ? (convertiti / completate) * 100 : 0;

    // risposte arrivate proprio sull'ultimo tocco (break-up)
    const risposteBreakup = allTracks.filter(t => {
      if (t.stato !== 'stoppata') return false;
      const seq = sequences[t.sequenceId];
      return seq && t.toccoCorrente === seq.touches.length;
    }).length;
    const quotaBreakup = risposteRicevute > 0 ? (risposteBreakup / risposteRicevute) * 100 : 0;

    const conversioneLeadDeal = prospects.length > 0 ? (convertiti / prospects.length) * 100 : 0;

    const scartati = prospects.filter(c => c.prospectingStato === 'scartato');
    const motiviScarto = scartati.reduce((acc, c) => {
      if (c.prospectingMotivoScarto) acc[c.prospectingMotivoScarto] = (acc[c.prospectingMotivoScarto] || 0) + 1;
      return acc;
    }, {} as Record<ProspectingMotivoScarto, number>);

    const perSettore = (Object.keys(SETTORE_LABEL) as ProspectingSettore[]).map(settore => {
      const prospectsSettore = prospects.filter(c => c.prospectingSettore === settore);
      return { settore, totale: prospectsSettore.length, convertiti: prospectsSettore.filter(c => c.prospectingStato === 'convertito').length };
    });

    return { sequenzeAvviate, tassoRisposta, conversioneSuSequenze, quotaBreakup, conversioneLeadDeal, motiviScarto, perSettore };
  }, [contacts, prospectingTracks, sequences]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
          <p className="text-xs font-semibold text-muted uppercase">Sequenze avviate</p>
          <p className="text-2xl font-semibold text-foreground dark:text-foreground mt-1">{stats.sequenzeAvviate}</p>
        </div>
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
          <p className="text-xs font-semibold text-muted uppercase">Prospect → Lead</p>
          <p className="text-2xl font-semibold text-foreground dark:text-foreground mt-1">{stats.conversioneLeadDeal.toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BenchmarkBar label="Tasso di risposta" value={stats.tassoRisposta} unit="%" low={15} high={25} />
        <BenchmarkBar label="Conversioni / sequenze completate" value={stats.conversioneSuSequenze} unit="%" low={8} high={15} />
        <BenchmarkBar label="Risposte da break-up" value={stats.quotaBreakup} unit="%" low={20} high={30} />
      </div>

      <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
        <p className="text-xs font-semibold text-secondary uppercase tracking-normal mb-3 flex items-center gap-1.5"><BarChart3 size={13} />Per settore</p>
        <div className="space-y-2">
          {stats.perSettore.map(s => (
            <div key={s.settore} className="flex items-center justify-between text-sm">
              <span className="font-bold text-secondary dark:text-muted">{SETTORE_LABEL[s.settore]}</span>
              <span className="text-muted text-xs">{s.totale} prospect · {s.convertiti} convertiti</span>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(stats.motiviScarto).length > 0 && (
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
          <p className="text-xs font-semibold text-secondary uppercase tracking-normal mb-3">Motivi di scarto</p>
          <div className="space-y-2">
            {Object.entries(stats.motiviScarto).map(([motivo, count]) => (
              <div key={motivo} className="flex items-center justify-between text-sm">
                <span className="font-bold text-secondary dark:text-muted">{MOTIVO_SCARTO_LABEL[motivo as ProspectingMotivoScarto]}</span>
                <span className="text-muted text-xs">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Avvio manuale sequenza post visita a freddo ─────────────────────────────

const NewSequenceModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { contacts, sequences, prospectingTracks, addProspectingTrack, addProspectEmailDraftsBatch, updateContact } = useStore();
  const { showToast } = useToast();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [settore, setSettore] = useState<ProspectingSettore>('industria');
  const [dettaglioVisita, setDettaglioVisita] = useState('');

  const activeContactIds = useMemo(
    () => new Set(Object.values(prospectingTracks).filter(t => t.stato === 'attiva').map(t => t.contactId)),
    [prospectingTracks]
  );

  const contactResults = useMemo(
    () => sortByRelevance(contactSearch, Object.values(contacts)
      .filter(c => c.status === 'potenziale' && !activeContactIds.has(c.id))
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city]))
      .sort((a, b) => a.company.localeCompare(b.company, 'it')), c => [c.company, c.contactName]),
    [contacts, activeContactIds, contactSearch]
  );

  const handleStart = () => {
    if (!selectedContact) return;
    const sequence = Object.values(sequences).find(s => s.settore === settore);
    if (!sequence) {
      showToast('Nessuna sequenza trovata per questo settore', 'error');
      return;
    }
    const { track, emailDrafts } = startSequenceForContact(selectedContact, sequence, dettaglioVisita.trim() || undefined);
    addProspectingTrack(track);
    addProspectEmailDraftsBatch(emailDrafts);
    updateContact(selectedContact.id, { prospectingStato: 'in_sequenza', prospectingSettore: settore });
    showToast(`Sequenza "${sequence.nome}" avviata per ${selectedContact.company}`, 'success');
    onClose();
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground">Nuova sequenza post visita a freddo</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
        </div>

        {selectedContact ? (
          <div className="flex items-center gap-3 bg-canvas dark:bg-surface rounded-md p-3">
            <Building2 size={16} className="text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground dark:text-foreground truncate">{selectedContact.company}</p>
              {selectedContact.city && <p className="text-xs text-muted">{selectedContact.city}</p>}
            </div>
            <button onClick={() => setSelectedContact(null)} className="text-muted hover:text-secondary"><X size={14} /></button>
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Prospect visitato</label>
            <SearchDropdown
              value={contactSearch}
              onChange={setContactSearch}
              onSelect={c => { setSelectedContact(c); setContactSearch(''); }}
              results={contactResults.map(c => ({
                key: c.id,
                item: c,
                label: c.company || '(senza nome)',
                sublabel: [c.contactName, c.city].filter(Boolean).join(' · ') || undefined,
              }))}
              showWhenEmpty
              placeholder="Cerca un prospect già in rubrica..."
              emptyTitle="🔍 Nessun prospect trovato"
              emptySubtitle="Solo prospect senza una sequenza già attiva"
              autoFocus
            />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Settore</label>
          <select
            value={settore}
            onChange={e => setSettore(e.target.value as ProspectingSettore)}
            className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent"
          >
            {Object.entries(SETTORE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Dettaglio visita (facoltativo)</label>
          <textarea
            value={dettaglioVisita}
            onChange={e => setDettaglioVisita(e.target.value)}
            rows={3}
            placeholder="Es. Lasciato il catalogo, parlato con il titolare..."
            className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent resize-none text-sm"
          />
          <p className="text-xs text-muted mt-1">Viene usato per personalizzare i template email della sequenza.</p>
        </div>

        <button
          onClick={handleStart}
          disabled={!selectedContact}
          className="w-full py-3 rounded-md bg-action text-action-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-action-hover"
        >
          Avvia sequenza
        </button>
      </div>
    </DialogFrame>
  );
};

// ─── Main View ───────────────────────────────────────────────────────────────

interface ProspectingViewProps {
  onNavigate?: (view: NavView) => void;
}

export const ProspectingView: React.FC<ProspectingViewProps> = ({ onNavigate }) => {
  const [tab, setTab] = useState<'oggi' | 'prospect' | 'report'>('oggi');
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | 'unsupported'>(
    isNotificationSupported() ? Notification.permission : 'unsupported'
  );
  const [showNewSequence, setShowNewSequence] = useState(false);

  const tabs: { id: typeof tab; label: string; icon: typeof Radar }[] = [
    { id: 'oggi', label: 'Oggi', icon: Clock },
    { id: 'prospect', label: 'Prospect', icon: Building2 },
    { id: 'report', label: 'Report', icon: TrendingUp },
  ];

  return (
    <div className="space-y-5 pb-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 pt-1 pb-2 bg-canvas dark:bg-canvas">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl  text-foreground dark:text-foreground flex items-center gap-2.5">
            <Radar size={24} className="text-accent" />
            Prospecting
          </h1>
          <button
            onClick={() => setShowNewSequence(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-colors shadow-panel  "
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nuova sequenza</span>
          </button>
        </div>
        <p className="text-xs text-muted font-bold mt-1">
          Registra le visite a freddo dall'Agenda: qui gestisci i tocchi email/telefonata che portano il prospect a richiedere un'offerta.
        </p>
        <div className="flex gap-2 mt-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === id ? 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' : 'text-muted hover:bg-raised dark:hover:bg-surface'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {notifStatus === 'default' && (
        <div className="flex items-center justify-between gap-3 bg-accent-soft dark:bg-accent-soft/20 border-2 border-accent dark:border-accent rounded-panel px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BellRing size={16} className="text-accent flex-shrink-0" />
            <p className="text-xs font-bold text-accent dark:text-accent">Attiva le notifiche per essere avvisato quando è il momento di fare un tocco.</p>
          </div>
          <button
            onClick={async () => setNotifStatus(await requestProspectingNotificationPermission())}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md bg-action text-action-foreground hover:bg-action-hover"
          >
            Attiva
          </button>
        </div>
      )}

      {tab === 'oggi' && <OggiTab onNavigate={onNavigate} />}
      {tab === 'prospect' && <ProspectTab />}
      {tab === 'report' && <ReportTab />}

      {showNewSequence && <NewSequenceModal onClose={() => setShowNewSequence(false)} />}
    </div>
  );
};
