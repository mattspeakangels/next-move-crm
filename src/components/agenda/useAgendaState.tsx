import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Activity, ActivityOutcome, ProspectingSettore } from '../../types';
import { type CloseVisitType } from '../../lib/aiTasks';
import { loadAgendaCategories, saveAgendaCategories, type AgendaCategory } from '../../lib/agendaFilter';
import { useToast } from '../ui/ToastContext';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { AgendaViewProps } from '../../views/AgendaView';
import { FormData, CalendarMode, defaultForm, AiExtractedTodo, BatchGroup } from './agendaShared';

// Agenda: stato del calendario, delle finestre e delle analisi AI.
export function useAgendaState({ onNavigateToContact, onViewItinerary }: AgendaViewProps) {
  const {
    activities, addActivity, updateActivity, deleteActivity, contacts, updateContact, addTodo,
    sequences, prospectingTracks, addProspectingTrack, updateProspectingTrack, addProspectEmailDraftsBatch, addDeal,
  } = useStore();
  const { showToast } = useToast();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calendar state
  const [calMode, setCalMode] = useState<CalendarMode>('month');
  const [anchor, setAnchor] = useState(new Date()); // month or week anchor
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  // Categorie visibili in calendario e lista (di base solo gli appuntamenti)
  const [categories, setCategories] = useState<AgendaCategory[]>(loadAgendaCategories);
  const toggleCategory = (id: AgendaCategory) => {
    setCategories(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      if (next.length === 0) return prev; // almeno una categoria resta attiva
      saveAgendaCategories(next);
      return next;
    });
  };

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm());
  const [contactSearch, setContactSearch] = useState('');

  // ── Voice schedule ──
  const voiceSched = useVoiceInput();
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'parsing'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  // ── View activity detail ──
  const [viewActivity, setViewActivity] = useState<Activity | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);

  // ── Close activity ──
  const [closingActivity, setClosingActivity] = useState<Activity | null>(null);
  const [closeOutcome, setCloseOutcome] = useState<ActivityOutcome>('riuscita');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeSettore, setCloseSettore] = useState<ProspectingSettore>('industria');

  // Il "tipo di contatto" (prima visita / follow-up / offerta / chiamata) serve solo a dare
  // contesto al prompt AI del resoconto: prima richiedeva una scelta manuale sempre uguale
  // a "prima visita", ridondante con l'esito appena selezionato. Ora si deduce da solo da
  // tipo attività + esito + storico del contatto, senza uno step in più nel modale di chiusura.
  const derivedVisitType: CloseVisitType = useMemo(() => {
    if (!closingActivity) return 'prima-visita';
    if (closeOutcome === 'richiesta-offerta') return 'offerta';
    if (closingActivity.type === 'chiamata' || closingActivity.type === 'email') return 'chiamata';
    const hasPrior = Object.values(activities).some(
      a => a.contactId === closingActivity.contactId && a.id !== closingActivity.id && a.outcome !== 'da-fare'
    );
    return hasPrior ? 'follow-up' : 'prima-visita';
  }, [closingActivity, closeOutcome, activities]);

  // AI Todo extraction
  const [aiTodos, setAiTodos] = useState<AiExtractedTodo[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const voiceClose = useVoiceInput();

  // ── AI batch analysis (tutte le visite fatte, 1 sola chiamata) ──
  const MAX_BATCH_SIZE = 35;
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchGroups, setBatchGroups] = useState<BatchGroup[]>([]);
  const [batchAnalyzedIds, setBatchAnalyzedIds] = useState<string[]>([]);
  const voiceNotes = useVoiceInput();
  return { onNavigateToContact, onViewItinerary, activities, addActivity, updateActivity, deleteActivity, contacts, updateContact, addTodo, sequences, prospectingTracks, addProspectingTrack, updateProspectingTrack, addProspectEmailDraftsBatch, addDeal, showToast, today, calMode, setCalMode, anchor, setAnchor, selectedDay, setSelectedDay, categories, setCategories, toggleCategory, showModal, setShowModal, editingId, setEditingId, confirmDeleteId, setConfirmDeleteId, formData, setFormData, contactSearch, setContactSearch, voiceSched, voiceState, setVoiceState, voiceError, setVoiceError, showVoicePanel, setShowVoicePanel, viewActivity, setViewActivity, showRecorder, setShowRecorder, closingActivity, setClosingActivity, closeOutcome, setCloseOutcome, closeNotes, setCloseNotes, closeSettore, setCloseSettore, derivedVisitType, aiTodos, setAiTodos, aiAnalyzing, setAiAnalyzing, aiError, setAiError, voiceClose, MAX_BATCH_SIZE, showBatchModal, setShowBatchModal, batchAnalyzing, setBatchAnalyzing, batchError, setBatchError, batchGroups, setBatchGroups, batchAnalyzedIds, setBatchAnalyzedIds, voiceNotes };
}

export type AgendaStateModel = ReturnType<typeof useAgendaState>;
