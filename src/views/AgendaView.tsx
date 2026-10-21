import { confirmAction } from '../components/ui/Feedback';
import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Phone, MapPin, ExternalLink, Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight, Download, Upload, Mic, MicOff, CheckCircle, Loader2, Calendar, Eye, MessageSquare, Sparkles, AlertCircle, RotateCcw, Route } from 'lucide-react';
import { Activity, ActivityType, ActivityOutcome, TodoTipo, TodoPriorita, ProspectingSettore } from '../types';
import { callGeminiClient } from '../lib/geminiClient';
import { useToast } from '../components/ui/ToastContext';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../utils/search';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { ClockTimeInput } from '../components/ui/ClockTimeInput';
import { ConversationRecorder, mergeProfilingPatch } from '../components/ai/ConversationRecorder';
import { convertToLead, startSequenceForContact } from '../lib/prospecting';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  /** Clienti selezionati (uno solo per la maggior parte dei tipi, più di uno per Formazione). */
  contactIds: string[];
  type: ActivityType;
  date: string;
  time: string;
  endTime: string;
  /** Giorno di fine per attività multi-giorno (es. Fiera). Vuoto = un solo giorno. */
  endDateDay: string;
  /** Evento per tutto il giorno lavorativo (orari fissati a WORK_DAY_START/END). */
  allDay: boolean;
  notes: string;
};

type CalendarMode = 'month' | 'week' | 'list';

const WORK_DAY_START = '08:00';
const WORK_DAY_END = '18:00';

const defaultForm = (): FormData => ({
  contactIds: [],
  type: 'visita',
  date: '',
  time: '08:00',
  endTime: '09:00',
  endDateDay: '',
  allDay: false,
  notes: '',
});

// Somma minuti a un orario "HH:MM" restando nello stesso giorno (clamp a 23:59)
const addMinutesToTime = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number);
  const total = Math.max(0, Math.min(h * 60 + m + minutes, 23 * 60 + 59));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const TYPE_LABELS: Record<ActivityType, string> = {
  chiamata: 'Chiamata',
  email: 'Email',
  visita: 'Visita',
  'visita-freddo': 'Visita a freddo',
  nota: 'Nota',
  demo: 'Demo',
  'call-remota': 'Call Remota',
  sopralluogo: 'Sopralluogo',
  formazione: 'Formazione',
  'smart-working': 'Smart Working',
  ufficio: 'Ufficio',
  fiera: 'Fiera',
  'giornata-banco': 'Giornata al banco',
  'mini-fiera': 'Mini fiera dal cliente',
  'manutenzione-auto': 'Manutenzione auto',
};

// Categorie che non richiedono un'azienda/contatto per essere salvate
const NO_CONTACT_TYPES: ActivityType[] = ['smart-working', 'ufficio', 'fiera', 'manutenzione-auto'];

// Categorie che possono coinvolgere più clienti nello stesso appuntamento
const MULTI_CONTACT_TYPES: ActivityType[] = ['formazione'];

// Categorie che possono estendersi su più giorni consecutivi (mostra il campo "Fino al")
const MULTI_DAY_TYPES: ActivityType[] = ['fiera'];
// Tipologie "visita in loco": l'orario deve sempre restare nella fascia 08:00-18:00
const VISIT_TYPES: ActivityType[] = ['visita', 'visita-freddo', 'sopralluogo', 'demo'];

const TYPE_COLORS: Record<ActivityType, string> = {
  visita: 'bg-action text-action-foreground',
  'visita-freddo': 'bg-action text-action-foreground',
  chiamata: 'bg-success text-status-foreground',
  email: 'bg-action text-action-foreground',
  nota: 'bg-warning text-status-foreground',
  demo: 'bg-action text-action-foreground',
  'call-remota': 'bg-success text-status-foreground',
  sopralluogo: 'bg-warning text-status-foreground',
  formazione: 'bg-action text-action-foreground',
  'smart-working': 'bg-action text-action-foreground',
  ufficio: 'bg-raised',
  fiera: 'bg-action text-action-foreground',
  'giornata-banco': 'bg-warning text-status-foreground',
  'mini-fiera': 'bg-action text-action-foreground',
  'manutenzione-auto': 'bg-raised',
};

const TYPE_BG: Record<ActivityType, string> = {
  visita: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'visita-freddo': 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  chiamata: 'bg-success-soft dark:bg-success-soft text-success dark:text-success',
  email: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  nota: 'bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning',
  demo: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'call-remota': 'bg-accent-soft text-accent',
  sopralluogo: 'bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning',
  formazione: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'smart-working': 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  ufficio: 'bg-raised dark:bg-raised/40 text-foreground dark:text-muted',
  fiera: 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'giornata-banco': 'bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning',
  'mini-fiera': 'bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent',
  'manutenzione-auto': 'bg-raised dark:bg-raised/40 text-foreground dark:text-muted',
};

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const OUTCOME_OPTIONS: { value: ActivityOutcome; label: string; emoji: string; color: string }[] = [
  { value: 'riuscita',          label: 'Positivo',    emoji: '✅', color: 'border-success bg-success-soft dark:bg-success-soft text-success dark:text-success' },
  { value: 'parziale',          label: 'Parziale',    emoji: '🟡', color: 'border-warning bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning' },
  { value: 'promessa-callback', label: 'Richiamata',  emoji: '📞', color: 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' },
  { value: 'rifiuto',           label: 'Non riuscita',emoji: '❌', color: 'border-danger bg-danger-soft dark:bg-danger-soft text-danger dark:text-danger' },
  { value: 'richiesta-offerta', label: 'Richiesta offerta', emoji: '📄', color: 'border-success bg-success-soft dark:bg-success-soft text-success dark:text-success' },
];

// Esiti specifici per "Visita a freddo" (Manuale Prospezione Blaklader §4)
const VISITA_FREDDO_OUTCOME_OPTIONS: { value: ActivityOutcome; label: string; emoji: string; color: string }[] = [
  { value: 'nessuno-trovato',      label: 'Nessuno trovato',       emoji: '🚪', color: 'border-line bg-canvas dark:bg-raised/30 text-foreground dark:text-muted' },
  { value: 'parlato-influente',    label: 'Parlato con influente', emoji: '🗣️', color: 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' },
  { value: 'parlato-decisore',     label: 'Parlato col decisore',  emoji: '🎯', color: 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' },
  { value: 'appuntamento-fissato', label: 'Appuntamento fissato',  emoji: '📅', color: 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent' },
  { value: 'richiesta-offerta',    label: 'Richiesta offerta',     emoji: '📄', color: 'border-success bg-success-soft dark:bg-success-soft text-success dark:text-success' },
];

const SETTORE_OPTIONS: { value: ProspectingSettore; label: string }[] = [
  { value: 'industria',  label: 'Industria' },
  { value: 'edilizia',   label: 'Edilizia' },
  { value: 'rivendita',  label: 'Rivendita' },
  { value: 'ferramenta', label: 'Ferramenta' },
];

// Esiti visita a freddo che avviano una sequenza di prospecting (tocco iniziale > 0)
const VISITA_FREDDO_AVVIA_SEQUENZA: ActivityOutcome[] = ['nessuno-trovato', 'parlato-influente', 'parlato-decisore'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Chiave numerica giorno (ignora l'orario) per confrontare/ordinare date senza problemi di fuso
function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// Un'attività "occupa" un giorno se questo cade tra il giorno di inizio e quello di fine
// (endDate può ricadere su un giorno diverso per eventi multi-giorno tipo Fiera)
function activityOccursOnDay(a: Activity, day: Date): boolean {
  const k = dayKey(day);
  const startKey = dayKey(new Date(a.date));
  const endKey = a.endDate ? dayKey(new Date(a.endDate)) : startKey;
  return k >= startKey && k <= endKey;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day; // lunedì
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  // Pad to Monday
  let start = startOfWeek(firstDay);
  // Generate 6 weeks
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start));
    start = new Date(start);
    start.setDate(start.getDate() + 1);
  }
  return days;
}

function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// ─── Week Timegrid DnD ───────────────────────────────────────────────────────

const HOUR_START = 7;   // 07:00
const HOUR_END   = 21;  // 21:00
const SLOT_MINS  = 30;  // slot da 30 min
const SLOTS_PER_DAY = ((HOUR_END - HOUR_START) * 60) / SLOT_MINS; // 28

function slotId(dayIdx: number, slotIdx: number) {
  return `slot-${dayIdx}-${slotIdx}`;
}

function slotToTime(slotIdx: number): { h: number; m: number } {
  const totalMins = HOUR_START * 60 + slotIdx * SLOT_MINS;
  return { h: Math.floor(totalMins / 60), m: totalMins % 60 };
}

interface DraggableCardProps {
  activity: Activity;
  company: string;
  onEdit: () => void;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ activity, company, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: activity.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 999 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-md px-2 py-1.5 text-xs font-semibold truncate cursor-grab active:cursor-grabbing select-none transition-opacity ${TYPE_COLORS[activity.type]} ${isDragging ? 'opacity-40' : 'opacity-100'}`}
      onClick={e => { e.stopPropagation(); onEdit(); }}
    >
      {company}
    </div>
  );
};

interface DroppableSlotProps {
  id: string;
  children?: React.ReactNode;
  isHour: boolean;
}

const DroppableSlot: React.FC<DroppableSlotProps> = ({ id, children, isHour }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`relative border-b transition-colors ${
        isHour
          ? 'border-line dark:border-line'
          : 'border-line dark:border-line'
      } ${isOver ? 'bg-accent-soft dark:bg-accent-soft/20' : ''}`}
      style={{ height: 28 }}
    >
      {children}
    </div>
  );
};

// ─── Activity Card ────────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: Activity;
  companyName: string;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClose: () => void;
  onView: () => void;
  onNavigateToContact?: (contactId: string) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, companyName, onEdit, onDelete, onExport, onClose, onView, onNavigateToContact }) => {
  const isDone = activity.outcome !== 'da-fare';
  return (
    <div className={`bg-surface dark:bg-surface p-4 rounded-panel shadow-sm border flex items-center justify-between gap-4 ${isDone ? 'border-success dark:border-success opacity-75' : 'border-line dark:border-line'}`}>
      <div className="flex gap-3 items-center flex-1 min-w-0 cursor-pointer" onClick={onView} title="Apri per vedere i dettagli">
        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${TYPE_BG[activity.type]}`}>
          {activity.type === 'visita' ? <MapPin size={16} /> : activity.type === 'chiamata' ? <Phone size={16} /> : <span className="text-xs font-semibold">{TYPE_LABELS[activity.type][0]}</span>}
        </div>
        <div className="min-w-0">
          {onNavigateToContact && activity.contactId ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onNavigateToContact(activity.contactId); }}
              className="font-semibold text-sm text-accent dark:text-accent truncate hover:underline text-left"
            >{companyName}</button>
          ) : (
            <p className="font-semibold text-sm dark:text-foreground truncate">{companyName}</p>
          )}
          <p className="text-xs text-muted font-bold">
            {new Date(activity.date).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {activity.endDate && ` – ${new Date(activity.endDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
          {activity.notes && <p className="text-xs text-muted truncate mt-0.5">{activity.notes}</p>}
          {activity.results && (
            <p className="text-xs text-success dark:text-success truncate mt-0.5 italic">✓ {activity.results}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_BG[activity.type]}`}>
              {TYPE_LABELS[activity.type]}
            </span>
            {isDone && activity.outcomeType && (
              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-success-soft text-success dark:bg-success-soft dark:text-success">
                {OUTCOME_OPTIONS.find(o => o.value === activity.outcomeType)?.label ?? activity.outcomeType}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onClose}
          className={`p-2 rounded-xl transition-colors ${isDone ? 'text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/20' : 'text-muted hover:text-success hover:bg-success-soft dark:hover:bg-success-soft'}`}
          title={isDone ? 'Modifica esito' : 'Chiudi appuntamento'}
        >
          {isDone ? <RotateCcw size={16} /> : <CheckCircle size={16} />}
        </button>
        <button onClick={onView} className="p-2 rounded-md text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/30 transition-colors" title="Apri / vedi dettagli"><Eye size={14} /></button>
        <button onClick={onExport} className="p-2 rounded-md text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/30 transition-colors" title="Aggiungi a Outlook"><ExternalLink size={14} /></button>
        <button onClick={onEdit} className="p-2 rounded-md text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/30 transition-colors" title="Modifica"><Pencil size={14} /></button>
        <button onClick={onDelete} className="p-2 rounded-md text-muted hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors" title="Elimina"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AgendaViewProps {
  onNavigateToContact?: (contactId: string) => void;
  onViewItinerary?: (date: string) => void;
}

type CloseVisitType = 'prima-visita' | 'follow-up' | 'offerta' | 'chiamata';

export const AgendaView: React.FC<AgendaViewProps> = ({ onNavigateToContact, onViewItinerary }) => {
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
  interface AiExtractedTodo {
    titolo: string;
    tipo: TodoTipo;
    priorita: TodoPriorita;
    dataEsecuzione: string;
    scadenza: string;
    note: string;
    selected: boolean;
    creaAppuntamento: boolean;
  }
  const [aiTodos, setAiTodos] = useState<AiExtractedTodo[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const voiceClose = useVoiceInput();

  // ── AI batch analysis (tutte le visite fatte, 1 sola chiamata) ──
  interface BatchGroup {
    activityId: string;
    contactName: string;
    date: number;
    todos: AiExtractedTodo[];
  }
  const MAX_BATCH_SIZE = 35;
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchGroups, setBatchGroups] = useState<BatchGroup[]>([]);
  const [batchAnalyzedIds, setBatchAnalyzedIds] = useState<string[]>([]);
  const voiceNotes = useVoiceInput();

  // ── Voice schedule: parse transcript → pre-fill form ──
  const parseVoiceActivity = async (transcript: string) => {
    setVoiceState('parsing');
    setVoiceError(null);
    try {
      const token = import.meta.env.VITE_ADMIN_TOKEN;
      const contactList = Object.values(contacts).map(c => ({ id: c.id, company: c.company }));
      const res = await fetch('/api/parse-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ transcript, contacts: contactList }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as {
        type?: string;
        companyName?: string;
        date?: string;
        time?: string;
        notes?: string;
      };

      // Find best contact match
      const matchedContact = data.companyName
        ? Object.values(contacts).find(c =>
            c.company.toLowerCase().includes(data.companyName!.toLowerCase()) ||
            data.companyName!.toLowerCase().includes(c.company.toLowerCase())
          )
        : null;

      const type = (data.type as ActivityType) ?? 'visita';
      const date = data.date ?? new Date().toISOString().split('T')[0];
      const time = data.time ?? '09:00';

      setFormData({
        contactIds: matchedContact ? [matchedContact.id] : [],
        endDateDay: '',
        type,
        date,
        time,
        endTime: addMinutesToTime(time, 60),
        allDay: false,
        notes: data.notes ?? '',
      });
      setContactSearch(matchedContact?.company ?? data.companyName ?? '');
      setShowModal(true);
      setShowVoicePanel(false);
      setVoiceState('idle');
      voiceSched.reset();
    } catch (err) {
      setVoiceError(`Errore parsing: ${String(err)}`);
      setVoiceState('idle');
    }
  };

  const startVoiceSchedule = () => {
    setShowVoicePanel(true);
    setVoiceError(null);
    setVoiceState('recording');
    voiceSched.start({ onFinal: (text) => parseVoiceActivity(text) });
  };

  const cancelVoiceSchedule = () => {
    voiceSched.stop();
    voiceSched.reset();
    setVoiceState('idle');
    setShowVoicePanel(false);
    setVoiceError(null);
  };

  // ── Close activity ──
  const openCloseModal = (activity: Activity) => {
    setClosingActivity(activity);
    setCloseNotes(activity.results || '');
    const defaultOutcome = activity.type === 'visita-freddo' ? 'nessuno-trovato' : 'riuscita';
    setCloseOutcome((activity.outcome === 'fatto' && activity.outcomeType ? activity.outcomeType : defaultOutcome) as ActivityOutcome);
    setCloseSettore(contacts[activity.contactId]?.prospectingSettore || 'industria');
    setAiTodos([]);
    setAiError(null);
    voiceClose.reset();
  };

  // Tipi di to-do che rappresentano un contatto reale col cliente a una data precisa
  // (visita, richiamata, demo) → possono generare anche un appuntamento in Agenda.
  const TODO_TO_ACTIVITY_TYPE: Partial<Record<TodoTipo, ActivityType>> = {
    visita: 'visita',
    'chiamata-follow': 'chiamata',
    demo: 'demo',
  };

  const analyzeResoconto = async () => {
    if (!closeNotes.trim()) return;
    const apiKey = useStore.getState().claudeApiKey.trim();
    if (!apiKey) { setAiError('API Key assente. Vai in Impostazioni → Gemini AI e inserisci la tua chiave Gemini.'); return; }

    setAiAnalyzing(true);
    setAiError(null);
    setAiTodos([]);

    const today = new Date().toISOString().split('T')[0];
    const contactName = closingActivity?.contactId ? contacts[closingActivity.contactId]?.company ?? '' : '';

    const visitContext: Record<CloseVisitType, string> = {
      'prima-visita': `prima visita commerciale / demo prodotto. Estrai tutte le azioni concrete emerse (offerte, campionature, schede tecniche, appuntamenti di follow-up, ecc.). Presta attenzione a eventuali impegni presi con il cliente.`,
      'follow-up': `visita di follow-up / ricontatto. Estrai le azioni di continuità: invii promessi, conferme, appuntamenti successivi, eventuali offerte da aggiornare.`,
      'offerta': `visita per presentazione/consegna offerta o quotazione. Estrai le azioni legate alla trattativa: follow-up sull'offerta, richieste di modifica prezzi, date di risposta attese dal cliente.`,
      'chiamata': `chiamata telefonica o email. Estrai solo le azioni concrete emerse: risposte da dare, materiali da inviare, appuntamenti da fissare.`,
    };

    try {
      const prompt = `Sei un assistente per un agente commerciale Blaklader (workwear premium).
Data oggi: ${today}. Cliente: "${contactName}".
Tipo di contatto: ${visitContext[derivedVisitType]}

Dal seguente resoconto, estrai TUTTE le azioni concrete da fare.
Per ogni azione specifica una data di esecuzione (quando farlo) e una scadenza massima, basandoti sulle urgenze menzionate nel testo.

RESOCONTO:
---
${closeNotes}
---

Rispondi SOLO con un array JSON valido:
[
  {
    "titolo": "descrizione concisa dell'azione",
    "tipo": "offerta"|"scheda-tecnica"|"email-info"|"chiamata-follow"|"campionatura"|"demo"|"visita"|"altro",
    "priorita": "alta"|"media"|"bassa",
    "dataEsecuzione": "YYYY-MM-DD",
    "scadenza": "YYYY-MM-DD",
    "note": "dettaglio utile (opzionale, stringa vuota se non necessario)"
  }
]

Regole:
- "alta" se c'è urgenza esplicita (entro oggi/domani/48h/fine settimana)
- "media" se entro 1-2 settimane
- "bassa" se non c'è urgenza definita
- dataEsecuzione = quando iniziare; scadenza = deadline massima
- Se il testo non menziona date, usa buon senso commerciale (offerta: 2gg, chiamata follow: 1 sett, campionatura: 2 sett)
- Includi SOLO azioni concrete, non osservazioni generiche

Regole per il campo "tipo" (fondamentale per non perdere appuntamenti):
- Usa "visita" quando si fissa un incontro di persona con il cliente a una data precisa (es. "fissato appuntamento", "ci vediamo", "passo a trovarlo", "devo tornare/ripassare da lui")
- Usa "chiamata-follow" quando si tratta di richiamarlo telefonicamente a una data precisa, senza incontro di persona
- Usa "demo" quando si tratta di una dimostrazione prodotto pianificata a una data precisa
- Qualsiasi frase che indica un impegno preso con il cliente per una data specifica (appuntamento, visita, richiamata, demo) DEVE avere dataEsecuzione valorizzata con la data esatta, non lasciata vuota
- Per le date relative usa Data oggi come riferimento: "giovedì della prossima settimana" = il giovedì della settimana successiva a quella corrente (non della settimana in corso), "lunedì prossimo"/"martedì prossimo" ecc. = stessa logica`;

      const raw = (await callGeminiClient(apiKey, prompt)).trim();
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Risposta non valida');
      const parsed: Omit<AiExtractedTodo, 'selected' | 'creaAppuntamento'>[] = JSON.parse(match[0]);
      setAiTodos(parsed.map(t => ({ ...t, selected: true, creaAppuntamento: !!TODO_TO_ACTIVITY_TYPE[t.tipo] })));
    } catch (err: any) {
      setAiError(err.message ?? 'Errore analisi. Riprova.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Se l'AI estrae un'azione con una data di esecuzione esplicita e l'utente non ha
  // disattivato il toggle "crea anche appuntamento", crea subito l'appuntamento in Agenda
  // oltre al To Do.
  const scheduleActivityIfNeeded = (t: AiExtractedTodo, contactId?: string, dealId?: string): boolean => {
    const activityType = TODO_TO_ACTIVITY_TYPE[t.tipo];
    if (!activityType || !t.creaAppuntamento || !t.dataEsecuzione || !contactId) return false;
    const date = new Date(`${t.dataEsecuzione}T09:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    addActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      contactId,
      dealId,
      type: activityType,
      date: date.getTime(),
      outcome: 'da-fare',
      notes: t.note || t.titolo,
      createdAt: Date.now(),
    });
    return true;
  };

  const confirmAiTodos = () => {
    const selected = aiTodos.filter(t => t.selected);
    let scheduled = 0;
    for (const t of selected) {
      addTodo({
        titolo: t.titolo,
        tipo: t.tipo,
        priorita: t.priorita,
        scadenza: t.scadenza || undefined,
        note: (t.note || undefined),
        contactId: closingActivity?.contactId || undefined,
        status: 'da-fare',
        source: 'visita',
        sourceActivityId: closingActivity?.id,
      });
      if (scheduleActivityIfNeeded(t, closingActivity?.contactId, closingActivity?.dealId)) scheduled++;
    }
    if (selected.length > 0) showToast(`${selected.length} attività aggiunte al To Do${scheduled > 0 ? ` · ${scheduled} appuntamento/i creato/i in Agenda` : ''}`, 'success');
    setAiTodos([]);
  };

  // Visite chiuse con un resoconto, non ancora passate per l'analisi AI batch
  const pendingBatchActivities = useMemo(() => (
    Object.values(activities)
      .filter(a => a.outcome === 'fatto' && a.results?.trim() && !a.aiAnalyzedAt)
      .sort((a, b) => a.date - b.date)
  ), [activities]);

  const openBatchModal = () => {
    setShowBatchModal(true);
    setBatchError(null);
    setBatchGroups([]);
    setBatchAnalyzedIds([]);
  };

  const analyzeAllResoconti = async () => {
    const apiKey = useStore.getState().claudeApiKey.trim();
    if (!apiKey) { setBatchError('API Key assente. Vai in Impostazioni → Gemini AI e inserisci la tua chiave Gemini.'); return; }
    const batch = pendingBatchActivities.slice(0, MAX_BATCH_SIZE);
    if (batch.length === 0) return;

    setBatchAnalyzing(true);
    setBatchError(null);
    setBatchGroups([]);

    const today = new Date().toISOString().split('T')[0];
    const items = batch.map(a => ({
      id: a.id,
      contactName: a.contactId ? contacts[a.contactId]?.company ?? '' : '',
      date: new Date(a.date).toISOString().split('T')[0],
      notes: a.results || '',
    }));

    try {
      const prompt = `Sei un assistente per un agente commerciale Blaklader (workwear premium).
Data oggi: ${today}.

Di seguito trovi i resoconti di ${items.length} visite/appuntamenti commerciali GIA CONCLUSI, ognuno identificato da un "id" esatto. Per OGNUNO, estrai TUTTE le azioni concrete da fare (offerte, campionature, schede tecniche, follow-up, appuntamenti, ecc.), con data di esecuzione e scadenza basate sulle urgenze menzionate nel testo.

VISITE:
---
${items.map(it => `[id: ${it.id}] Cliente: "${it.contactName}" | Data visita: ${it.date}\nResoconto: ${it.notes}`).join('\n---\n')}
---

Rispondi SOLO con un array JSON valido, UN elemento per OGNI id fornito (anche con "todos": [] se non ci sono azioni concrete), in questo formato:
[
  {
    "id": "<id esatto fornito>",
    "todos": [
      {
        "titolo": "descrizione concisa dell'azione",
        "tipo": "offerta"|"scheda-tecnica"|"email-info"|"chiamata-follow"|"campionatura"|"demo"|"visita"|"altro",
        "priorita": "alta"|"media"|"bassa",
        "dataEsecuzione": "YYYY-MM-DD",
        "scadenza": "YYYY-MM-DD",
        "note": "dettaglio utile (opzionale, stringa vuota se non necessario)"
      }
    ]
  }
]

Regole:
- "alta" se c'è urgenza esplicita (entro oggi/domani/48h/fine settimana)
- "media" se entro 1-2 settimane
- "bassa" se non c'è urgenza definita
- dataEsecuzione = quando iniziare; scadenza = deadline massima
- Se il testo non menziona date, usa buon senso commerciale (offerta: 2gg, chiamata follow: 1 sett, campionatura: 2 sett)
- Includi SOLO azioni concrete, non osservazioni generiche
- Non omettere nessun id: se una visita non genera azioni, restituisci "todos": []

Regole per il campo "tipo" (fondamentale per non perdere appuntamenti):
- Usa "visita" quando si fissa un incontro di persona con il cliente a una data precisa (es. "fissato appuntamento", "ci vediamo", "passo a trovarlo", "devo tornare/ripassare da lui")
- Usa "chiamata-follow" quando si tratta di richiamarlo telefonicamente a una data precisa, senza incontro di persona
- Usa "demo" quando si tratta di una dimostrazione prodotto pianificata a una data precisa
- Qualsiasi frase che indica un impegno preso con il cliente per una data specifica (appuntamento, visita, richiamata, demo) DEVE avere dataEsecuzione valorizzata con la data esatta, non lasciata vuota
- Per le date relative usa Data oggi come riferimento: "giovedì della prossima settimana" = il giovedì della settimana successiva a quella corrente (non della settimana in corso), "lunedì prossimo"/"martedì prossimo" ecc. = stessa logica`;

      const raw = (await callGeminiClient(apiKey, prompt, Math.min(8192, 500 + items.length * 300))).trim();
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Risposta non valida');
      const parsed: { id: string; todos: Omit<AiExtractedTodo, 'selected' | 'creaAppuntamento'>[] }[] = JSON.parse(match[0]);

      const groups: BatchGroup[] = parsed.map(p => {
        const activity = batch.find(a => a.id === p.id);
        return {
          activityId: p.id,
          contactName: activity?.contactId ? contacts[activity.contactId]?.company ?? '' : '',
          date: activity?.date ?? 0,
          todos: (p.todos || []).map(t => ({ ...t, selected: true, creaAppuntamento: !!TODO_TO_ACTIVITY_TYPE[t.tipo] })),
        };
      });
      setBatchGroups(groups);
      setBatchAnalyzedIds(batch.map(a => a.id));
    } catch (err: any) {
      setBatchError(err.message ?? 'Errore analisi. Riprova.');
    } finally {
      setBatchAnalyzing(false);
    }
  };

  const confirmBatchTodos = () => {
    let count = 0;
    let scheduled = 0;
    for (const group of batchGroups) {
      const sourceActivity = activities[group.activityId];
      for (const t of group.todos) {
        if (!t.selected) continue;
        addTodo({
          titolo: t.titolo,
          tipo: t.tipo,
          priorita: t.priorita,
          scadenza: t.scadenza || undefined,
          note: t.note || undefined,
          contactId: sourceActivity?.contactId || undefined,
          status: 'da-fare',
          source: 'visita',
          sourceActivityId: group.activityId,
        });
        count++;
        if (scheduleActivityIfNeeded(t, sourceActivity?.contactId, sourceActivity?.dealId)) scheduled++;
      }
    }
    // Segna come analizzate tutte le visite passate nel batch, anche quelle senza azioni,
    // così la prossima analisi batch non le riconsidera.
    for (const activityId of batchAnalyzedIds) {
      updateActivity(activityId, { aiAnalyzedAt: Date.now() });
    }
    if (count > 0) showToast(`${count} attività aggiunte al To Do da ${batchAnalyzedIds.length} visite${scheduled > 0 ? ` · ${scheduled} appuntamento/i creato/i in Agenda` : ''}`, 'success');
    setBatchGroups([]);
    setBatchAnalyzedIds([]);
    setShowBatchModal(false);
  };

  const handleCloseActivity = () => {
    if (!closingActivity) return;
    // Se l'attività era già chiusa, questa è una correzione a posteriori dell'esito:
    // aggiorniamo solo i campi dell'attività e saltiamo tutti gli effetti collaterali
    // (avvio sequenza, conversione a lead, todo automatici), che sono scattati già una
    // volta alla prima chiusura e non vanno ripetuti/duplicati.
    const wasAlreadyClosed = closingActivity.outcome !== 'da-fare';

    updateActivity(closingActivity.id, {
      outcome: 'fatto',
      outcomeType: closeOutcome,
      results: closeNotes || undefined,
    });

    if (wasAlreadyClosed) {
      showToast('Esito aggiornato!', 'success');
      setClosingActivity(null);
      setCloseNotes('');
      setAiTodos([]);
      setAiError(null);
      return;
    }

    const contact = closingActivity.contactId ? contacts[closingActivity.contactId] : null;

    // ── Prospecting: "Richiesta offerta" è l'esito trasversale che converte il prospect in
    // Lead e lo sposta in Pipeline, qualunque sia il tipo di attività chiusa (visita, chiamata, email...).
    if (contact && closeOutcome === 'richiesta-offerta') {
      const { deal, contactUpdates } = convertToLead(contact);
      addDeal(deal);
      updateContact(contact.id, contactUpdates);
      const activeTrack = Object.values(prospectingTracks).find(t => t.contactId === contact.id && t.stato === 'attiva');
      if (activeTrack) updateProspectingTrack(activeTrack.id, { stato: 'stoppata' });
      showToast('Richiesta offerta registrata: prospect spostato in Pipeline come Lead!', 'success');
    }
    // ── Visita a freddo con esito che avvia una sequenza di prospecting per settore ──
    else if (contact && closingActivity.type === 'visita-freddo' && VISITA_FREDDO_AVVIA_SEQUENZA.includes(closeOutcome)) {
      const sequence = Object.values(sequences).find(s => s.settore === closeSettore);
      if (sequence) {
        const { track, emailDrafts } = startSequenceForContact(contact, sequence, closeNotes);
        addProspectingTrack(track);
        addProspectEmailDraftsBatch(emailDrafts);
        updateContact(contact.id, { prospectingStato: 'in_sequenza', prospectingSettore: closeSettore });
        showToast(`Sequenza prospecting "${sequence.nome}" avviata!`, 'success');
      } else {
        showToast('Nessuna sequenza trovata per questo settore: riprova, ricaricando la pagina se persiste.', 'error');
      }
    }
    // ── Una risposta positiva su un'attività di follow-up ferma l'avanzamento automatico
    // della sequenza (regola "solo il silenzio fa avanzare il tocco") ──
    else if (contact && contact.prospectingStato === 'in_sequenza' && (closeOutcome === 'riuscita' || closeOutcome === 'parziale')) {
      const activeTrack = Object.values(prospectingTracks).find(t => t.contactId === contact.id && t.stato === 'attiva');
      if (activeTrack) updateProspectingTrack(activeTrack.id, { stato: 'stoppata' });
      updateContact(contact.id, { prospectingStato: 'risposto' });
    }

    // Auto-generazione Todo dai next step della profilazione
    const profiling = contact?.profiling;
    if (profiling?.nextStepAzioni?.length) {
      const MAP: Record<string, { tipo: import('../types').TodoTipo; priorita: import('../types').TodoPriorita }> = {
        'Email entro 24h con scheda tecnica / campionatura': { tipo: 'email-info',      priorita: 'alta'  },
        'Demo B2B Webshop':                                 { tipo: 'demo',             priorita: 'media' },
        'Demo Webshop B2B':                                 { tipo: 'demo',             priorita: 'media' },
        'Visita formazione venditori':                      { tipo: 'visita',           priorita: 'media' },
        'Proposta commerciale':                             { tipo: 'offerta',          priorita: 'alta'  },
        'Co-presenza fiera / evento':                       { tipo: 'visita',           priorita: 'bassa' },
        'Campionatura 30 giorni su cantiere':               { tipo: 'campionatura',     priorita: 'media' },
        'Riunione RSPP + Acquisti':                         { tipo: 'visita',           priorita: 'alta'  },
        'Schede EN per DVR':                                { tipo: 'scheda-tecnica',   priorita: 'media' },
        'Calcolo TCO condiviso':                            { tipo: 'altro',            priorita: 'bassa' },
      };
      let created = 0;
      for (const azione of profiling.nextStepAzioni) {
        if (azione === 'Archivia') continue;
        const cfg = MAP[azione] ?? { tipo: 'altro' as const, priorita: 'media' as const };
        addTodo({
          titolo: azione,
          tipo: cfg.tipo,
          priorita: cfg.priorita,
          scadenza: profiling.nextStepData || undefined,
          contactId: closingActivity.contactId || undefined,
          note: profiling.nextStepNote || undefined,
          status: 'da-fare',
          source: 'visita',
          sourceActivityId: closingActivity.id,
        });
        created++;
      }
      if (created > 0) {
        showToast(`${created} attività aggiunte al To Do`, 'success');
      }
    }

    showToast('Appuntamento chiuso!', 'success');
    setClosingActivity(null);
    setCloseNotes('');
    setAiTodos([]);
    setAiError(null);
  };

  const allActivities = Object.values(activities);

  // Filtered contacts for picker — computed outside JSX for reliability
  const filteredContacts = useMemo(() => {
    return sortByRelevance(contactSearch, Object.values(contacts)
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city, c.phone, c.email]))
      .sort((a, b) => (a.company ?? '').localeCompare(b.company ?? '')), c => [c.company, c.contactName]);
  }, [contacts, contactSearch]);

  // Activities for a given day (include eventi multi-giorno, es. Fiera, su ogni giorno coperto)
  const activitiesForDay = (day: Date) =>
    allActivities.filter(a => activityOccursOnDay(a, day)).sort((a, b) => a.date - b.date);

  // Activities shown in list (all upcoming or selected day)
  const listActivities = selectedDay
    ? activitiesForDay(selectedDay)
    : allActivities.filter(a => a.date >= today.getTime()).sort((a, b) => a.date - b.date);

  // Il giorno selezionato ha almeno una visita/sopralluogo con un cliente geolocalizzato?
  // Serve per mostrare il tasto "Vedi itinerario" solo quando ha senso aprire la mappa.
  const dayHasMappedVisits = !!selectedDay && listActivities.some(a =>
    (a.type === 'visita' || a.type === 'sopralluogo') &&
    contacts[a.contactId]?.lat && contacts[a.contactId]?.lng
  );

  // ── Modal helpers ──

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const openNew = (prefillDate?: Date) => {
    setEditingId(null);
    const d = prefillDate ?? new Date();
    const time = d.toTimeString().slice(0, 5);
    setFormData({
      ...defaultForm(),
      date: toLocalDateStr(d),
      time,
      endTime: addMinutesToTime(time, 60),
    });
    setShowModal(true);
  };

  const openEdit = (activity: Activity) => {
    const d = new Date(activity.date);
    const time = d.toTimeString().slice(0, 5);
    const endD = activity.endDate ? new Date(activity.endDate) : null;
    setEditingId(activity.id);
    const contactIds = activity.contactIds?.length ? activity.contactIds : (activity.contactId ? [activity.contactId] : []);
    setFormData({
      contactIds,
      type: activity.type,
      date: toLocalDateStr(d),
      time,
      endTime: endD ? endD.toTimeString().slice(0, 5) : addMinutesToTime(time, 60),
      endDateDay: endD && !isSameDay(d, endD) ? toLocalDateStr(endD) : '',
      allDay: !!activity.allDay,
      notes: activity.notes || '',
    });
    setContactSearch(MULTI_CONTACT_TYPES.includes(activity.type) ? '' : contacts[activity.contactId]?.company || '');
    setShowModal(true);
  };

  const closeModal = () => { if (voiceNotes.isRecording) voiceNotes.stop(); setShowModal(false); setEditingId(null); setFormData(defaultForm()); setContactSearch(''); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const noContact = NO_CONTACT_TYPES.includes(formData.type);
    if (!noContact && formData.contactIds.length === 0) { showToast("Seleziona un'azienda", 'error'); return; }
    const contactIds = noContact ? [] : formData.contactIds;
    const contactId = contactIds[0] ?? '';
    const dateTime = new Date(`${formData.date}T${formData.time}`).getTime();
    const endDay = (MULTI_DAY_TYPES.includes(formData.type) && formData.endDateDay) ? formData.endDateDay : formData.date;
    const endDateTime = formData.endTime ? new Date(`${endDay}T${formData.endTime}`).getTime() : undefined;
    if (endDateTime !== undefined && endDateTime <= dateTime) {
      showToast(endDay !== formData.date ? "La data/ora di fine deve essere dopo l'inizio" : "L'ora di fine deve essere dopo l'ora di inizio", 'error');
      return;
    }
    if (editingId) {
      updateActivity(editingId, { contactId, contactIds, type: formData.type, date: dateTime, endDate: endDateTime, allDay: formData.allDay, notes: formData.notes });
      showToast('Attività aggiornata!', 'success');
    } else {
      addActivity({ id: `act_${Date.now()}`, contactId, contactIds, type: formData.type, date: dateTime, endDate: endDateTime, allDay: formData.allDay, outcome: 'da-fare', notes: formData.notes, createdAt: Date.now() });
      showToast('Attività salvata!', 'success');
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteActivity(id);
    setConfirmDeleteId(null);
    showToast('Attività eliminata', 'success');
  };

  // ── Outlook deep-link export (single activity) ──
  const handleExport = (activity: Activity) => {
    const contact = contacts[activity.contactId];
    const title = encodeURIComponent(`${TYPE_LABELS[activity.type]} - ${contact?.company || 'Cliente'}`);
    const start = new Date(activity.date);
    const end   = new Date(activity.endDate ?? activity.date + 60 * 60 * 1000); // usa la durata reale se impostata, altrimenti +1h
    // Outlook Web deep-link format: YYYY-MM-DDTHH:MM:SS (no trailing Z = local time)
    const fmtOutlook = (d: Date) =>
      d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + 'T' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':00';
    const body = encodeURIComponent(activity.notes || '');
    window.open(
      `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&startdt=${encodeURIComponent(fmtOutlook(start))}&enddt=${encodeURIComponent(fmtOutlook(end))}&body=${body}`,
      '_blank'
    );
  };

  // ── PST Import da Outlook ──
  const pstInputRef = useRef<HTMLInputElement>(null);
  const [pstLoading, setPstLoading] = useState(false);
  const [pstEvents, setPstEvents] = useState<any[]>([]);
  const [pstSelected, setPstSelected] = useState<Set<number>>(new Set());
  const [pstModalOpen, setPstModalOpen] = useState(false);
  const [pstContactOverrides, setPstContactOverrides] = useState<Record<number, string>>({});

  const inferActivityType = (subject: string, location: string): string => {
    const s = (subject + ' ' + location).toLowerCase();
    if (s.includes('teams') || s.includes('meet.google') || s.includes('zoom') || s.includes('call') || s.includes('remota')) return 'call-remota';
    if (s.includes('formazione') || s.includes('corso') || s.includes('training') || s.includes('eloomi')) return 'formazione';
    if (s.includes('demo')) return 'demo';
    if (s.includes('sopralluogo')) return 'sopralluogo';
    return 'visita';
  };

  const matchContact = (subject: string): string => {
    const s = subject.toLowerCase();
    // Estrai la parte prima del trattino (es. "ECSA - Blåkläder" → "ecsa")
    const beforeDash = s.split(/\s*[-–]\s*/)[0].trim();
    const allContacts = Object.values(contacts);
    // Match esatto o parziale
    const exact = allContacts.find((c: any) =>
      c.company.toLowerCase() === beforeDash || s.includes(c.company.toLowerCase())
    );
    if (exact) return (exact as any).id;
    // Match fuzzy: ogni parola del subject lunga >3 char
    const words = beforeDash.split(/\s+/).filter(w => w.length > 3);
    for (const w of words) {
      const hit = allContacts.find((c: any) => c.company.toLowerCase().includes(w));
      if (hit) return (hit as any).id;
    }
    return '';
  };

  const bufToBase64 = (buf: ArrayBuffer): string => {
    const bytes = new Uint8Array(buf);
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as unknown as number[]));
    }
    return btoa(binary);
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    // Metodo 1: arrayBuffer diretto
    try {
      return bufToBase64(await file.arrayBuffer());
    } catch { /* prova metodo 2 */ }

    // Metodo 2: blob URL (aggira restrizioni cloud sync su Safari/Chrome)
    const blobUrl = URL.createObjectURL(file);
    try {
      const res = await fetch(blobUrl);
      return bufToBase64(await res.arrayBuffer());
    } catch { /* prova metodo 3 */ } finally {
      URL.revokeObjectURL(blobUrl);
    }

    // Metodo 3: FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        try { resolve(bufToBase64(reader.result as ArrayBuffer)); } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error(
        'File non leggibile. Verifica in Finder che il file non abbia un\'icona ☁️ (iCloud non scaricato): clic destro → "Scarica ora", poi riprova.'
      ));
    });
  };

  const handlePSTUpload = async (file: File) => {
    setPstLoading(true);
    try {
      const base64 = await fileToBase64(file);

      const res = await fetch('/api/parse-pst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Errore parsing PST');

      const enriched = (json.events as any[]).map((ev: any, i: number) => ({
        ...ev,
        _idx: i,
        _contactId: matchContact(ev.subject),
        _type: inferActivityType(ev.subject, ev.location),
        _duplicate: ev.start
          ? Object.values(activities).some((a: any) =>
              Math.abs(a.date - new Date(ev.start).getTime()) < 60000 &&
              a.notes?.includes(ev.subject)
            )
          : false,
      }));

      // Pre-seleziona tutto tranne duplicati e senza data
      const sel = new Set<number>(
        enriched.filter((e: any) => e.start && !e._duplicate).map((e: any) => e._idx)
      );
      // Inizializza override con auto-match
      const overrides: Record<number, string> = {};
      enriched.forEach((e: any) => { overrides[e._idx] = e._contactId || ''; });
      setPstEvents(enriched);
      setPstSelected(sel);
      setPstContactOverrides(overrides);
      setPstModalOpen(true);
    } catch (err: any) {
      showToast(`Errore: ${err.message}`, 'error');
    } finally {
      setPstLoading(false);
    }
  };

  const handlePSTImport = () => {
    let imported = 0;
    pstEvents.forEach((ev: any) => {
      if (!pstSelected.has(ev._idx) || !ev.start) return;
      const ts = new Date(ev.start).getTime();
      addActivity({
        id: `pst_${Date.now()}_${ev._idx}`,
        contactId: pstContactOverrides[ev._idx] ?? ev._contactId ?? '',
        type: ev._type as any,
        date: ts,
        outcome: 'da-fare',
        notes: [ev.subject, ev.location ? `📍 ${ev.location}` : '', ev.body].filter(Boolean).join('\n').trim(),
        createdAt: Date.now(),
      });
      imported++;
    });
    setPstModalOpen(false);
    setPstEvents([]);
    showToast(`${imported} appuntamenti importati da Outlook`, 'success');
  };

  // ── ICS bulk export (all upcoming activities) ──
  const handleExportICS = () => {
    const upcoming = allActivities
      .filter(a => a.date >= today.getTime())
      .sort((a, b) => a.date - b.date);

    if (upcoming.length === 0) { showToast('Nessun appuntamento futuro da esportare', 'error'); return; }

    const fmtICS = (ms: number) => {
      const d = new Date(ms);
      return (
        d.getUTCFullYear() +
        String(d.getUTCMonth() + 1).padStart(2, '0') +
        String(d.getUTCDate()).padStart(2, '0') + 'T' +
        String(d.getUTCHours()).padStart(2, '0') +
        String(d.getUTCMinutes()).padStart(2, '0') + '00Z'
      );
    };

    const events = upcoming
      .map(a => {
        const contact = contacts[a.contactId];
        const summary = `${TYPE_LABELS[a.type]} - ${contact?.company || 'Cliente'}`;
        const location = contact?.address ? `${contact.address}, ${contact.city || ''}`.trim().replace(/,$/, '') : '';
        const lines = [
          'BEGIN:VEVENT',
          `UID:${a.id}@nextmove-crm`,
          `DTSTART:${fmtICS(a.date)}`,
          `DTEND:${fmtICS(a.date + 60 * 60 * 1000)}`,
          `SUMMARY:${summary.replace(/[\\;,]/g, c => '\\' + c)}`,
          a.notes   ? `DESCRIPTION:${a.notes.replace(/\n/g, '\\n').replace(/[\\;,]/g, c => '\\' + c)}` : null,
          location  ? `LOCATION:${location.replace(/[\\;,]/g, c => '\\' + c)}` : null,
          'STATUS:CONFIRMED',
          'END:VEVENT',
        ].filter(Boolean) as string[];
        return lines.join('\r\n');
      })
      .join('\r\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SYRIO//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nextmove-agenda.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`${upcoming.length} appuntamenti esportati (.ics)`, 'success');
  };

  // ── Navigation ──

  const prevPeriod = () => {
    const d = new Date(anchor);
    if (calMode === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setAnchor(d);
  };

  const nextPeriod = () => {
    const d = new Date(anchor);
    if (calMode === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setAnchor(d);
  };

  const goToday = () => { setAnchor(new Date()); setSelectedDay(new Date()); };

  // ── Calendar renders ──

  const renderMonthHeader = () => `${MONTHS_IT[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const renderWeekHeader = () => {
    const days = getWeekDays(anchor);
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${MONTHS_IT[start.getMonth()]} ${start.getFullYear()}`;
    return `${start.getDate()} ${MONTHS_IT[start.getMonth()]} – ${end.getDate()} ${MONTHS_IT[end.getMonth()]} ${end.getFullYear()}`;
  };

  // Month grid
  const renderMonthGrid = () => {
    const days = getDaysInMonth(anchor.getFullYear(), anchor.getMonth());
    const currentMonth = anchor.getMonth();

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_IT.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted uppercase tracking-normal py-2">{d}</div>
          ))}
        </div>
        {/* Day cells — 6 rows × 7 cols */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const dayActivities = activitiesForDay(day);

            return (
              <button
                key={i}
                onClick={() => { setSelectedDay(selectedDay && isSameDay(day, selectedDay) ? null : day); }}
                className={`relative flex flex-col items-center py-2 rounded-md transition-all text-sm font-bold min-h-[52px] ${
                  isSelected
                    ? 'bg-action text-action-foreground ring-2 ring-accent ring-offset-1'
                    : isToday
                    ? 'bg-accent-soft dark:bg-accent-soft/30 text-accent ring-2 ring-accent ring-offset-1'
                    : isCurrentMonth
                    ? 'hover:bg-canvas dark:hover:bg-raised text-foreground dark:text-muted'
                    : 'text-muted dark:text-secondary'
                }`}
              >
                <span className={`text-xs font-semibold ${isToday && !isSelected ? 'text-accent' : ''}`}>{day.getDate()}</span>
                {/* Activity dots */}
                {dayActivities.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
                    {dayActivities.slice(0, 3).map((a, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-surface/80' : TYPE_COLORS[a.type]}`} />
                    ))}
                    {dayActivities.length > 3 && (
                      <span className={`text-xs font-semibold ${isSelected ? 'text-foreground/80' : 'text-muted'}`}>+{dayActivities.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Week strip
  const renderWeekGrid = () => {
    const days = getWeekDays(anchor);
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const dayActivities = activitiesForDay(day);

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`flex flex-col items-center py-3 rounded-panel transition-all ${
                isSelected
                  ? 'bg-action text-action-foreground ring-2 ring-accent ring-offset-1'
                  : isToday
                  ? 'bg-accent-soft dark:bg-accent-soft/30 text-accent ring-2 ring-accent ring-offset-1'
                  : 'hover:bg-canvas dark:hover:bg-raised text-foreground dark:text-muted'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">{DAYS_IT[i]}</span>
              <span className="text-lg font-semibold">{day.getDate()}</span>
              {dayActivities.length > 0 && (
                <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                  {dayActivities.slice(0, 3).map((a, j) => (
                    <span key={j} className={`w-2 h-2 rounded-full ${isSelected ? 'bg-surface/80' : TYPE_COLORS[a.type]}`} />
                  ))}
                </div>
              )}
              {dayActivities.length === 0 && <span className="w-2 h-2 mt-1.5" />}
            </button>
          );
        })}
      </div>
    );
  };

  // ── DnD sensors ──────────────────────────────────────────────────────────────
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragStart = (e: DragStartEvent) => setActiveActivityId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveActivityId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith('slot-')) return;
    const [, dayIdxStr, slotIdxStr] = overId.split('-');
    const dayIdx  = parseInt(dayIdxStr);
    const slotIdx = parseInt(slotIdxStr);
    const days    = getWeekDays(anchor);
    const day     = days[dayIdx];
    const { h, m } = slotToTime(slotIdx);
    const newDate = new Date(day);
    newDate.setHours(h, m, 0, 0);
    const dragged = activities[String(active.id)];
    const newEndDate = dragged?.endDate ? newDate.getTime() + (dragged.endDate - dragged.date) : undefined;
    updateActivity(String(active.id), { date: newDate.getTime(), endDate: newEndDate });
  };

  // ── Week timegrid con drag & drop ─────────────────────────────────────────

  const renderWeekTimegrid = () => {
    const days = getWeekDays(anchor);
    const activeActivity = activeActivityId ? activities[activeActivityId] : null;

    // Per ogni giorno × slot: quali attività ci sono? (le attività multi-giorno, es. Fiera,
    // compaiono in ogni giorno della settimana che coprono, allo stesso orario)
    const slotMap = new Map<string, Activity[]>();
    Object.values(activities).forEach(a => {
      const d = new Date(a.date);
      const totalMins = d.getHours() * 60 + d.getMinutes();
      const startMins = HOUR_START * 60;
      const slotIdx   = Math.floor((totalMins - startMins) / SLOT_MINS);
      if (slotIdx < 0 || slotIdx >= SLOTS_PER_DAY) return;
      days.forEach((day, dayIdx) => {
        if (!activityOccursOnDay(a, day)) return;
        const key = slotId(dayIdx, slotIdx);
        if (!slotMap.has(key)) slotMap.set(key, []);
        slotMap.get(key)!.push(a);
      });
    });

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="bg-surface dark:bg-surface rounded-panel overflow-hidden border border-line dark:border-line">
          {/* Intestazione giorni */}
          <div className="grid border-b border-line dark:border-line" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            <div className="border-r border-line dark:border-line" />
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} className={`py-2 text-center border-r border-line dark:border-line last:border-r-0 ${isToday ? 'bg-accent-soft dark:bg-accent-soft/20' : ''}`}>
                  <p className="text-xs font-semibold text-muted uppercase tracking-normal">{DAYS_IT[i]}</p>
                  <p className={`text-sm font-semibold ${isToday ? 'text-accent' : 'dark:text-foreground'}`}>{day.getDate()}</p>
                </div>
              );
            })}
          </div>

          {/* Griglia ore */}
          <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
            <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
              {/* Colonna ore */}
              <div>
                {Array.from({ length: SLOTS_PER_DAY }, (_, si) => {
                  const { h, m } = slotToTime(si);
                  const showLabel = m === 0;
                  return (
                    <div key={si} className="border-b border-line dark:border-line border-r border-r-gray-200 dark:border-r-gray-700 flex items-start justify-end pr-1.5" style={{ height: 28 }}>
                      {showLabel && <span className="text-xs font-semibold text-muted -mt-2">{String(h).padStart(2,'0')}:00</span>}
                    </div>
                  );
                })}
              </div>

              {/* Colonne giorni */}
              {days.map((_, dayIdx) => (
                <div key={dayIdx} className="border-r border-line dark:border-line last:border-r-0">
                  {Array.from({ length: SLOTS_PER_DAY }, (_, slotIdx) => {
                    const key = slotId(dayIdx, slotIdx);
                    const slotActivities = slotMap.get(key) ?? [];
                    const { h, m } = slotToTime(slotIdx);
                    return (
                      <DroppableSlot key={key} id={key} isHour={m === 0}>
                        <div className="absolute inset-0 flex flex-col gap-0.5 px-0.5 py-0.5 overflow-hidden">
                          {slotActivities.map(a => (
                            <DraggableCard
                              key={a.id}
                              activity={a}
                              company={contacts[a.contactId]?.company ?? '—'}
                              onEdit={() => openEdit(a)}
                            />
                          ))}
                        </div>
                        {/* Click su slot vuoto per nuovo appuntamento */}
                        {slotActivities.length === 0 && (
                          <div
                            className="absolute inset-0 cursor-pointer hover:bg-accent-soft/50 dark:hover:bg-accent-soft/10 transition-colors"
                            onClick={() => {
                              const day = getWeekDays(anchor)[dayIdx];
                              const d = new Date(day);
                              d.setHours(h, m, 0, 0);
                              openNew(d);
                            }}
                          />
                        )}
                      </DroppableSlot>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overlay durante il drag */}
        <DragOverlay>
          {activeActivity && (
            <div className={`rounded-md px-2 py-1.5 text-xs font-semibold shadow-panel ${TYPE_COLORS[activeActivity.type]}`}>
              {contacts[activeActivity.contactId]?.company ?? '—'}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-20">

      {/* Header */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h1 className="text-2xl  dark:text-foreground">Agenda</h1>
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

      {/* Voice schedule panel */}
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

      {/* Calendar card */}
      <div className="bg-surface dark:bg-surface rounded-panel shadow-sm border border-line dark:border-line overflow-hidden">

        {/* Calendar toolbar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line dark:border-line">
          <div className="flex items-center gap-2">
            <button onClick={prevPeriod} className="p-1.5 rounded-md hover:bg-raised dark:hover:bg-raised text-muted transition-colors"><ChevronLeft size={18} /></button>
            <span className="font-semibold text-sm dark:text-foreground min-w-[160px] text-center">
              {calMode === 'month' ? renderMonthHeader() : calMode === 'week' ? renderWeekHeader() : 'Tutte le attività'}
            </span>
            <button onClick={nextPeriod} className="p-1.5 rounded-md hover:bg-raised dark:hover:bg-raised text-muted transition-colors"><ChevronRight size={18} /></button>
            <button onClick={goToday} className="ml-1 text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/30 px-2.5 py-1 rounded-full uppercase tracking-wide hover:bg-accent-soft transition-colors">Oggi</button>
          </div>

          {/* View switcher */}
          <div className="flex gap-1 bg-raised dark:bg-raised p-1 rounded-md">
            {(['month', 'week', 'list'] as CalendarMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setCalMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${
                  calMode === mode ? 'bg-surface dark:bg-surface text-accent shadow-sm' : 'text-muted hover:text-secondary'
                }`}
              >
                {mode === 'month' ? 'Mese' : mode === 'week' ? 'Sett.' : 'Lista'}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        {calMode !== 'list' && (
          <div className="p-4">
            {calMode === 'month' ? renderMonthGrid() : (
              <>
                {renderWeekGrid()}
                <div className="mt-3">{renderWeekTimegrid()}</div>
              </>
            )}
          </div>
        )}

        {/* Legend */}
        {calMode !== 'list' && (
          <div className="flex gap-4 px-5 pb-4 flex-wrap">
            {(Object.keys(TYPE_LABELS) as ActivityType[]).map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[t]}`} />
                <span className="text-xs font-bold text-muted">{TYPE_LABELS[t]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted  ">
            {selectedDay
              ? `${selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : calMode === 'list' ? 'Tutti i prossimi appuntamenti' : 'Seleziona un giorno'
            }
          </h2>
          {selectedDay && (
            <div className="flex items-center gap-2">
              {dayHasMappedVisits && onViewItinerary && (
                <button onClick={() => onViewItinerary(toLocalDateStr(selectedDay))}
                  className="flex items-center gap-1 text-xs font-semibold text-warning bg-warning-soft dark:bg-warning-soft px-3 py-1 rounded-full uppercase tracking-wide hover:bg-warning-soft transition-colors">
                  <Route size={11} /> Vedi itinerario
                </button>
              )}
              <button onClick={() => openNew(selectedDay)} className="text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/30 px-3 py-1 rounded-full uppercase tracking-wide hover:bg-accent-soft transition-colors">
                + Aggiungi in questa data
              </button>
            </div>
          )}
        </div>

        {listActivities.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-line dark:border-line rounded-panel">
            <p className="text-muted dark:text-secondary font-semibold uppercase tracking-normal text-xs">
              {selectedDay ? 'Nessun appuntamento in questa data' : 'Nessun appuntamento futuro'}
            </p>
          </div>
        )}

        {/* Raggruppamento per giorno con tasto elimina tutti */}
        {(() => {
          // Raggruppa per giorno (chiave YYYY-MM-DD locale)
          const groups: { key: string; date: Date; items: Activity[] }[] = [];
          listActivities.forEach(act => {
            const d = new Date(act.date);
            const key = toLocalDateStr(d);
            const existing = groups.find(g => g.key === key);
            if (existing) existing.items.push(act);
            else groups.push({ key, date: d, items: [act] });
          });

          return groups.map(({ key, date, items }) => (
            <div key={key} className="space-y-2">
              {/* Header giorno */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs font-semibold uppercase tracking-normal text-muted dark:text-secondary">
                  {date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}
                  <span className="ml-2 text-muted dark:text-secondary">({items.length})</span>
                </p>
                {items.length > 0 && (
                  <button
                    onClick={async () => {
                      if (await confirmAction(`Eliminare tutti i ${items.length} appuntamenti del ${date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}?`)) {
                        items.forEach(a => deleteActivity(a.id));
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-danger hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft px-2 py-1 rounded-lg transition-colors uppercase tracking-wide"
                    title="Elimina tutti gli appuntamenti di questo giorno"
                  >
                    <Trash2 size={10} /> Elimina tutti
                  </button>
                )}
              </div>
              {items.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  companyName={contacts[activity.contactId]?.company || (NO_CONTACT_TYPES.includes(activity.type) ? TYPE_LABELS[activity.type] : 'Azienda')}
                  onEdit={() => openEdit(activity)}
                  onDelete={() => setConfirmDeleteId(activity.id)}
                  onExport={() => handleExport(activity)}
                  onClose={() => openCloseModal(activity)}
                  onView={() => setViewActivity(activity)}
                  onNavigateToContact={onNavigateToContact}
                />
              ))}
            </div>
          ));
        })()}
      </div>

      {/* ── Detail / View Modal ── */}
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

      {/* ── Add / Edit Modal ── */}
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

      {/* ── Modal Analisi AI Batch (tutte le visite in una chiamata) ── */}
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

      {/* ── Modal Import PST ── */}
      {pstModalOpen && (
        <DialogFrame className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
          <div className="bg-surface dark:bg-canvas rounded-panel shadow-panel w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line dark:border-line flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold dark:text-foreground flex items-center gap-2">
                  <Calendar size={20} className="text-accent" /> Importa da Outlook
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {pstSelected.size} / {pstEvents.filter((e: any) => e.start).length} eventi selezionati
                </p>
              </div>
              <button aria-label="Chiudi dialogo" data-dialog-close onClick={() => setPstModalOpen(false)} className="text-muted hover:text-secondary">
                <X size={20} />
              </button>
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
              {pstEvents.map((ev: any) => {
                const sel = pstSelected.has(ev._idx);
                const overrideId = pstContactOverrides[ev._idx] ?? '';
                const startDate = ev.start ? new Date(ev.start) : null;
                const hasDate = !!startDate;
                const sortedContacts = Object.values(contacts as any).sort((a: any, b: any) =>
                  (a.company || '').localeCompare(b.company || '', 'it')
                );
                return (
                  <div
                    key={ev._idx}
                    onClick={() => {
                      if (!hasDate) return;
                      setPstSelected(prev => {
                        const n = new Set(prev);
                        if (n.has(ev._idx)) n.delete(ev._idx); else n.add(ev._idx);
                        return n;
                      });
                    }}
                    className={`flex items-start gap-3 p-3 rounded-panel border-2 transition-all ${
                      !hasDate ? 'opacity-40 cursor-not-allowed border-line dark:border-line' :
                      ev._duplicate ? 'border-warning bg-warning-soft dark:bg-warning-soft cursor-pointer' :
                      sel ? 'border-accent bg-accent-soft dark:bg-accent-soft/20 cursor-pointer' :
                      'border-line dark:border-line bg-canvas dark:bg-surface/50 cursor-pointer hover:border-line'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md flex-shrink-0 mt-0.5 border-2 flex items-center justify-center ${
                      sel && hasDate ? 'bg-action border-accent' : 'border-line'
                    }`}>
                      {sel && hasDate && <CheckCircle size={12} className="text-action-foreground" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold dark:text-foreground truncate">{ev.subject || '(senza titolo)'}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {startDate ? (
                          <span className="text-xs font-bold text-secondary">
                            {startDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' '}
                            {startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-danger">Nessuna data</span>
                        )}
                        {ev.location && <span className="text-xs text-muted">📍 {ev.location}</span>}
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                          ev._type === 'call-remota' ? 'bg-accent-soft text-accent' :
                          ev._type === 'formazione' ? 'bg-success-soft text-success' :
                          'bg-accent-soft text-accent'
                        }`}>{ev._type}</span>
                        {/* Dropdown selezione cliente */}
                        <select
                          value={overrideId}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            e.stopPropagation();
                            setPstContactOverrides(prev => ({ ...prev, [ev._idx]: e.target.value }));
                          }}
                          className={`text-xs font-bold rounded-full px-2 py-0.5 border outline-none cursor-pointer max-w-[180px] ${
                            overrideId
                              ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent'
                              : 'border-line dark:border-line bg-raised dark:bg-raised text-muted'
                          }`}
                        >
                          <option value="">— Nessun cliente —</option>
                          {(sortedContacts as any[]).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.company}</option>
                          ))}
                        </select>
                        {ev._duplicate && (
                          <span className="text-xs font-bold text-warning bg-warning-soft px-2 py-0.5 rounded-full">
                            ⚠ già presente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between px-6 py-4 border-t border-line dark:border-line flex-shrink-0 gap-3">
              <button
                onClick={() => {
                  const allSelectable = pstEvents.filter((e: any) => e.start && !e._duplicate).map((e: any) => e._idx);
                  setPstSelected(new Set(allSelectable));
                }}
                className="text-xs font-bold text-secondary hover:text-accent transition-colors"
              >
                Seleziona tutti
              </button>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setPstModalOpen(false)}
                  className="px-5 py-2.5 rounded-panel text-sm font-bold text-secondary hover:text-foreground transition-colors">
                  Annulla
                </button>
                <button
                  onClick={handlePSTImport}
                  disabled={pstSelected.size === 0}
                  className="bg-action hover:bg-action-hover disabled:opacity-50 text-action-foreground px-6 py-2.5 rounded-panel text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={15} /> Importa {pstSelected.size} eventi
                </button>
              </div>
            </div>
          </div>
        </DialogFrame>
      )}

      {/* Conversation Recorder Modal */}
      {showRecorder && viewActivity && viewActivity.contactId && contacts[viewActivity.contactId] && (
        <ConversationRecorder
          contact={contacts[viewActivity.contactId]}
          onClose={() => setShowRecorder(false)}
          onSave={(transcript, result) => {
            updateActivity(viewActivity.id, { transcript });
            const contact = contacts[viewActivity.contactId];
            const isDealer = contact.customerType === 'dealer' || contact.segment === 'dealer';
            const existingProfiling = contact.profiling ?? (isDealer
              ? { type: 'dealer' as const, dataVisita: new Date().toISOString().split('T')[0], segmento: '', numDipendenti: '', fatturatoEst: '', canaleVendita: [], modelloOrdini: [], clienteFinale: [], percWorkwear: '', brandAttuali: [], brandAltro: '', brandDominante: '', dpiCatIII: '', dpiParziale: '', reclamiResi: '', reclamiMotivo: '', processoRiordino: [], painPoints: [], painAltro: '', painPrioritario: '', fraseEsatta: '', prodottiInteresse: [], prodottiAltro: '', campionaturaLasciata: '', qualificazione: { esigenzaReale: 1, decisionMaker: 1, aperturaFornitore: 1, timeline: 1, budget: 1 }, noteQualificazione: '', competitor: [], nextStepAzioni: [], nextStepData: '', nextStepNote: '' }
              : { type: 'end-user' as const, dataVisita: new Date().toISOString().split('T')[0], rsppNome: '', respAcquisti: '', segmentoEdilizia: '', segmentoIndustria: '', numDipendentiTotali: '', numDipendentiDPI: '', fatturatoStimato: '', certificazioni: [], obiettiviESG: '', livelloDPI: '', rischiSpecifici: [], dvrAggiornato: '', ispezioniRecenti: '', ispezioniEsito: '', schedeEN: '', fornitoreAttuale: '', canaleAcquisto: [], frequenzaRinnovo: '', durataMediaCapo: '', spesaDipAnno: '', lamenteleLavoratori: '', chiGestisceLogistica: [], painPoints: [], painAltro: '', painPrioritario: '', fraseEsatta: '', tcoCostoCapo: '', tcoDurataMesi: '', tcoNumDipendenti: '', tcoCostoFlotta: '', tcoNote: '', prodottiInteresse: [], prodottiAltro: '', campionaturaLasciata: '', qualificazione: { esigenzaReale: 1, decisionMaker: 1, aperturaFornitore: 1, timeline: 1, budget: 1 }, noteQualificazione: '', nextStepAzioni: [], nextStepData: '', nextStepNote: '' }
            );
            const merged = mergeProfilingPatch(existingProfiling, result.profiling as any, result.obiezioni);
            updateContact(contact.id, { profiling: merged, updatedAt: Date.now() });
            setShowRecorder(false);
            showToast(`Profilazione aggiornata: ${result.obiezioni.length > 0 ? `${result.obiezioni.length} obiezioni salvate` : 'dati estratti applicati'}`, 'success');
          }}
        />
      )}
    </div>
  );
};
