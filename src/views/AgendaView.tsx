import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Phone, MapPin, ExternalLink, Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight, Download, Upload, Search, Mic, MicOff, CheckCircle, Loader2, Calendar, Eye, MessageSquare } from 'lucide-react';
import { Activity, ActivityType, ActivityOutcome } from '../types';
import { useToast } from '../components/ui/ToastContext';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { ConversationRecorder, mergeProfilingPatch } from '../components/ai/ConversationRecorder';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  contactId: string;
  type: ActivityType;
  date: string;
  time: string;
  notes: string;
};

type CalendarMode = 'month' | 'week' | 'list';

const defaultForm = (): FormData => ({
  contactId: '',
  type: 'visita',
  date: '',
  time: '09:00',
  notes: '',
});

const TYPE_LABELS: Record<ActivityType, string> = {
  chiamata: 'Chiamata',
  email: 'Email',
  visita: 'Visita',
  nota: 'Nota',
  demo: 'Demo',
  'call-remota': 'Call Remota',
  sopralluogo: 'Sopralluogo',
  formazione: 'Formazione',
  'smart-working': 'Smart Working',
  ufficio: 'Ufficio',
};

// Categorie che non richiedono un'azienda/contatto per essere salvate
const NO_CONTACT_TYPES: ActivityType[] = ['smart-working', 'ufficio'];

const TYPE_COLORS: Record<ActivityType, string> = {
  visita: 'bg-indigo-500',
  chiamata: 'bg-green-500',
  email: 'bg-blue-500',
  nota: 'bg-yellow-400',
  demo: 'bg-purple-500',
  'call-remota': 'bg-teal-500',
  sopralluogo: 'bg-orange-500',
  formazione: 'bg-pink-500',
  'smart-working': 'bg-cyan-500',
  ufficio: 'bg-slate-500',
};

const TYPE_BG: Record<ActivityType, string> = {
  visita: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  chiamata: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  email: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  nota: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  demo: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'call-remota': 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  sopralluogo: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  formazione: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  'smart-working': 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  ufficio: 'bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300',
};

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const OUTCOME_OPTIONS: { value: ActivityOutcome; label: string; emoji: string; color: string }[] = [
  { value: 'riuscita',          label: 'Positivo',    emoji: '✅', color: 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  { value: 'parziale',          label: 'Parziale',    emoji: '🟡', color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  { value: 'promessa-callback', label: 'Richiamata',  emoji: '📞', color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 'rifiuto',           label: 'Non riuscita',emoji: '❌', color: 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
      className={`rounded-xl px-2 py-1.5 text-white text-[10px] font-black truncate cursor-grab active:cursor-grabbing select-none transition-opacity ${TYPE_COLORS[activity.type]} ${isDragging ? 'opacity-40' : 'opacity-100'}`}
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
          ? 'border-gray-200 dark:border-gray-700'
          : 'border-gray-100 dark:border-gray-800'
      } ${isOver ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
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
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border flex items-center justify-between gap-4 ${isDone ? 'border-green-100 dark:border-green-900/40 opacity-75' : 'border-gray-50 dark:border-gray-700'}`}>
      <div className="flex gap-3 items-center flex-1 min-w-0 cursor-pointer" onClick={onView} title="Apri per vedere i dettagli">
        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${TYPE_BG[activity.type]}`}>
          {activity.type === 'visita' ? <MapPin size={16} /> : activity.type === 'chiamata' ? <Phone size={16} /> : <span className="text-xs font-black">{TYPE_LABELS[activity.type][0]}</span>}
        </div>
        <div className="min-w-0">
          {onNavigateToContact && activity.contactId ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onNavigateToContact(activity.contactId); }}
              className="font-black text-sm text-indigo-600 dark:text-indigo-400 truncate hover:underline text-left"
            >{companyName}</button>
          ) : (
            <p className="font-black text-sm dark:text-white truncate">{companyName}</p>
          )}
          <p className="text-xs text-gray-400 font-bold">
            {new Date(activity.date).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
          {activity.notes && <p className="text-[11px] text-gray-400 truncate mt-0.5">{activity.notes}</p>}
          {activity.results && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate mt-0.5 italic">✓ {activity.results}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_BG[activity.type]}`}>
              {TYPE_LABELS[activity.type]}
            </span>
            {isDone && activity.outcomeType && (
              <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                {OUTCOME_OPTIONS.find(o => o.value === activity.outcomeType)?.label ?? activity.outcomeType}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isDone && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            title="Chiudi appuntamento"
          >
            <CheckCircle size={16} />
          </button>
        )}
        <button onClick={onView} className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Apri / vedi dettagli"><Eye size={14} /></button>
        <button onClick={onExport} className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Aggiungi a Outlook"><ExternalLink size={14} /></button>
        <button onClick={onEdit} className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Modifica"><Pencil size={14} /></button>
        <button onClick={onDelete} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Elimina"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AgendaViewProps {
  onNavigateToContact?: (contactId: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({ onNavigateToContact }) => {
  const { activities, addActivity, updateActivity, deleteActivity, contacts, updateContact } = useStore();
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
  const [showContactList, setShowContactList] = useState(false);
  const contactPickerRef = useRef<HTMLDivElement>(null);

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
  const voiceClose = useVoiceInput();
  const voiceNotes = useVoiceInput();

  useEffect(() => {
    if (!showContactList) return;
    const handler = (e: MouseEvent) => {
      if (contactPickerRef.current && !contactPickerRef.current.contains(e.target as Node)) {
        setShowContactList(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showContactList]);

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
        contactId: matchedContact?.id ?? '',
        type,
        date,
        time,
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
    setCloseOutcome('riuscita');
    setCloseNotes('');
    voiceClose.reset();
  };

  const handleCloseActivity = () => {
    if (!closingActivity) return;
    updateActivity(closingActivity.id, {
      outcome: 'fatto',
      outcomeType: closeOutcome,
      results: closeNotes || undefined,
    });
    showToast('Appuntamento chiuso!', 'success');
    setClosingActivity(null);
    setCloseNotes('');
  };

  const allActivities = Object.values(activities);

  // Filtered contacts for picker — computed outside JSX for reliability
  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase().trim();
    return Object.values(contacts)
      .filter(c =>
        !q ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.contactName ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => (a.company ?? '').localeCompare(b.company ?? ''));
  }, [contacts, contactSearch]);

  // Activities for a given day
  const activitiesForDay = (day: Date) =>
    allActivities.filter(a => isSameDay(new Date(a.date), day)).sort((a, b) => a.date - b.date);

  // Activities shown in list (all upcoming or selected day)
  const listActivities = selectedDay
    ? activitiesForDay(selectedDay)
    : allActivities.filter(a => a.date >= today.getTime()).sort((a, b) => a.date - b.date);

  // ── Modal helpers ──

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const openNew = (prefillDate?: Date) => {
    setEditingId(null);
    const d = prefillDate ?? new Date();
    setFormData({
      ...defaultForm(),
      date: toLocalDateStr(d),
      time: d.toTimeString().slice(0, 5),
    });
    setShowModal(true);
  };

  const openEdit = (activity: Activity) => {
    const d = new Date(activity.date);
    setEditingId(activity.id);
    setFormData({
      contactId: activity.contactId,
      type: activity.type,
      date: toLocalDateStr(d),
      time: d.toTimeString().slice(0, 5),
      notes: activity.notes || '',
    });
    setContactSearch(contacts[activity.contactId]?.company || '');
    setShowModal(true);
  };

  const closeModal = () => { if (voiceNotes.isRecording) voiceNotes.stop(); setShowModal(false); setEditingId(null); setFormData(defaultForm()); setContactSearch(''); setShowContactList(false); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const noContact = NO_CONTACT_TYPES.includes(formData.type);
    if (!noContact && !formData.contactId) { showToast("Seleziona un'azienda", 'error'); return; }
    const contactId = noContact ? '' : formData.contactId;
    const dateTime = new Date(`${formData.date}T${formData.time}`).getTime();
    if (editingId) {
      updateActivity(editingId, { contactId, type: formData.type, date: dateTime, notes: formData.notes });
      showToast('Attività aggiornata!', 'success');
    } else {
      addActivity({ id: `act_${Date.now()}`, contactId, type: formData.type, date: dateTime, outcome: 'da-fare', notes: formData.notes, createdAt: Date.now() });
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
    const end   = new Date(activity.date + 60 * 60 * 1000); // +1h
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
      'PRODID:-//NextMove CRM//IT',
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
            <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-2">{d}</div>
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
                className={`relative flex flex-col items-center py-2 rounded-xl transition-all text-sm font-bold min-h-[52px] ${
                  isSelected
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                    : isToday
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 ring-2 ring-indigo-300 ring-offset-1'
                    : isCurrentMonth
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                <span className={`text-xs font-black ${isToday && !isSelected ? 'text-indigo-600' : ''}`}>{day.getDate()}</span>
                {/* Activity dots */}
                {dayActivities.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
                    {dayActivities.slice(0, 3).map((a, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : TYPE_COLORS[a.type]}`} />
                    ))}
                    {dayActivities.length > 3 && (
                      <span className={`text-[8px] font-black ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>+{dayActivities.length - 3}</span>
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
              className={`flex flex-col items-center py-3 rounded-2xl transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                  : isToday
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 ring-2 ring-indigo-300 ring-offset-1'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wide mb-1 opacity-70">{DAYS_IT[i]}</span>
              <span className="text-lg font-black">{day.getDate()}</span>
              {dayActivities.length > 0 && (
                <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                  {dayActivities.slice(0, 3).map((a, j) => (
                    <span key={j} className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/80' : TYPE_COLORS[a.type]}`} />
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
    updateActivity(String(active.id), { date: newDate.getTime() });
  };

  // ── Week timegrid con drag & drop ─────────────────────────────────────────

  const renderWeekTimegrid = () => {
    const days = getWeekDays(anchor);
    const activeActivity = activeActivityId ? activities[activeActivityId] : null;

    // Per ogni giorno × slot: quali attività ci sono?
    const slotMap = new Map<string, Activity[]>();
    Object.values(activities).forEach(a => {
      const d = new Date(a.date);
      const dayIdx = days.findIndex(day => isSameDay(day, d));
      if (dayIdx < 0) return;
      const totalMins = d.getHours() * 60 + d.getMinutes();
      const startMins = HOUR_START * 60;
      const slotIdx   = Math.floor((totalMins - startMins) / SLOT_MINS);
      if (slotIdx < 0 || slotIdx >= SLOTS_PER_DAY) return;
      const key = slotId(dayIdx, slotIdx);
      if (!slotMap.has(key)) slotMap.set(key, []);
      slotMap.get(key)!.push(a);
    });

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
          {/* Intestazione giorni */}
          <div className="grid border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            <div className="border-r border-gray-100 dark:border-gray-700" />
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} className={`py-2 text-center border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{DAYS_IT[i]}</p>
                  <p className={`text-sm font-black ${isToday ? 'text-indigo-600' : 'dark:text-white'}`}>{day.getDate()}</p>
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
                    <div key={si} className="border-b border-gray-100 dark:border-gray-800 border-r border-r-gray-200 dark:border-r-gray-700 flex items-start justify-end pr-1.5" style={{ height: 28 }}>
                      {showLabel && <span className="text-[9px] font-black text-gray-400 -mt-2">{String(h).padStart(2,'0')}:00</span>}
                    </div>
                  );
                })}
              </div>

              {/* Colonne giorni */}
              {days.map((_, dayIdx) => (
                <div key={dayIdx} className="border-r border-gray-100 dark:border-gray-700 last:border-r-0">
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
                            className="absolute inset-0 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors"
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
            <div className={`rounded-xl px-2 py-1.5 text-white text-[10px] font-black shadow-xl ${TYPE_COLORS[activeActivity.type]}`}>
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
        <h1 className="text-2xl font-black dark:text-white">Agenda</h1>
        <div className="flex items-center gap-2">
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
            className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors text-sm disabled:opacity-60"
            title="Importa appuntamenti da file Outlook .pst"
          >
            {pstLoading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {pstLoading ? 'Lettura…' : 'Importa Outlook'}
          </button>
          <button
            onClick={handleExportICS}
            className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:border-indigo-400 hover:text-indigo-600 transition-colors text-sm"
            title="Esporta tutti gli appuntamenti futuri come file .ics"
          >
            <Download size={15} /> Esporta .ics
          </button>
          {voiceSched.isSupported && (
            <button
              onClick={startVoiceSchedule}
              disabled={voiceState !== 'idle'}
              className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 p-2.5 rounded-2xl font-bold flex items-center gap-2 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
              title="Pianifica con la voce"
            >
              <Mic size={16} />
            </button>
          )}
          <button
            onClick={() => openNew(selectedDay ?? undefined)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus size={16} /> Nuova
          </button>
        </div>
      </div>

      {/* Voice schedule panel */}
      {showVoicePanel && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border-2 border-indigo-200 dark:border-indigo-700 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-black dark:text-white text-sm">Pianifica con la voce</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Es: "Visita da Rossi SRL venerdì alle 10 per i giubbotti nuovi"</p>
            </div>
            <button onClick={cancelVoiceSchedule} className="text-gray-300 hover:text-gray-500 flex-shrink-0"><X size={18} /></button>
          </div>

          {/* Mic visual */}
          <div className="flex flex-col items-center gap-3 py-4">
            {voiceState === 'recording' ? (
              <>
                <button
                  onClick={() => { voiceSched.stop(); setVoiceState('parsing'); }}
                  className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg animate-pulse"
                >
                  <MicOff size={28} />
                </button>
                <p className="text-xs text-gray-400 font-bold">Registrazione in corso... (tocca per fermare)</p>
              </>
            ) : voiceState === 'parsing' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <Loader2 size={28} className="text-indigo-600 animate-spin" />
                </div>
                <p className="text-xs text-gray-400 font-bold">Analisi in corso...</p>
              </>
            ) : null}

            {voiceSched.transcript && (
              <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200 italic min-h-[48px]">
                "{voiceSched.transcript}"
              </div>
            )}
            {voiceError && <p className="text-xs text-red-500 font-bold">{voiceError}</p>}
          </div>
        </div>
      )}

      {/* Calendar card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-700 overflow-hidden">

        {/* Calendar toolbar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button onClick={prevPeriod} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><ChevronLeft size={18} /></button>
            <span className="font-black text-sm dark:text-white min-w-[160px] text-center">
              {calMode === 'month' ? renderMonthHeader() : calMode === 'week' ? renderWeekHeader() : 'Tutte le attività'}
            </span>
            <button onClick={nextPeriod} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><ChevronRight size={18} /></button>
            <button onClick={goToday} className="ml-1 text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full uppercase tracking-wide hover:bg-indigo-100 transition-colors">Oggi</button>
          </div>

          {/* View switcher */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
            {(['month', 'week', 'list'] as CalendarMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setCalMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                  calMode === mode ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
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
                <span className="text-[10px] font-bold text-gray-400">{TYPE_LABELS[t]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {selectedDay
              ? `${selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : calMode === 'list' ? 'Tutti i prossimi appuntamenti' : 'Seleziona un giorno'
            }
          </h2>
          {selectedDay && (
            <button onClick={() => openNew(selectedDay)} className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full uppercase tracking-wide hover:bg-indigo-100 transition-colors">
              + Aggiungi in questa data
            </button>
          )}
        </div>

        {listActivities.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
            <p className="text-gray-300 dark:text-gray-600 font-black uppercase tracking-widest text-xs">
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
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}
                  <span className="ml-2 text-gray-300 dark:text-gray-600">({items.length})</span>
                </p>
                {items.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Eliminare tutti i ${items.length} appuntamenti del ${date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}?`)) {
                        items.forEach(a => deleteActivity(a.id));
                      }
                    }}
                    className="flex items-center gap-1 text-[10px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors uppercase tracking-wide"
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewActivity(null)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="min-w-0">
                {onNavigateToContact && viewActivity.contactId ? (
                  <button
                    type="button"
                    onClick={() => { setViewActivity(null); onNavigateToContact(viewActivity.contactId); }}
                    className="text-xl font-black text-indigo-600 dark:text-indigo-400 truncate hover:underline text-left"
                  >{contacts[viewActivity.contactId]?.company || 'Azienda'}</button>
                ) : (
                  <h2 className="text-xl font-black dark:text-white truncate">{contacts[viewActivity.contactId]?.company || (NO_CONTACT_TYPES.includes(viewActivity.type) ? TYPE_LABELS[viewActivity.type] : 'Azienda')}</h2>
                )}
                <p className="text-xs text-gray-400 font-bold mt-1">
                  {new Date(viewActivity.date).toLocaleString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setViewActivity(null)}><X size={24} className="text-gray-400" /></button>
            </div>

            <div className="flex items-center gap-1.5 mb-6">
              <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full ${TYPE_BG[viewActivity.type]}`}>
                {TYPE_LABELS[viewActivity.type]}
              </span>
              {viewActivity.outcome !== 'da-fare' && viewActivity.outcomeType && (
                <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  {OUTCOME_OPTIONS.find(o => o.value === viewActivity.outcomeType)?.label ?? viewActivity.outcomeType}
                </span>
              )}
            </div>

            {/* Conversation Recorder Button */}
            {viewActivity.contactId && contacts[viewActivity.contactId] &&
              ['visita', 'chiamata', 'demo', 'call-remota', 'sopralluogo'].includes(viewActivity.type) && (
              <div className="mb-5">
                {viewActivity.transcript ? (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                        <MessageSquare size={10} /> Conversazione registrata
                      </span>
                      <button
                        onClick={() => setShowRecorder(true)}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wide"
                      >
                        Analizza di nuovo
                      </button>
                    </div>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 line-clamp-2">{viewActivity.transcript}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRecorder(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-xs font-black hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <MessageSquare size={14} /> Registra Conversazione con Cliente
                  </button>
                )}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Note</label>
                {viewActivity.notes
                  ? <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{viewActivity.notes}</p>
                  : <p className="text-sm text-gray-300 dark:text-gray-600 italic">Nessuna nota</p>}
              </div>
              {viewActivity.results && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Resoconto</label>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap break-words">{viewActivity.results}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => { const a = viewActivity; setViewActivity(null); openEdit(a); }}
              className="mt-8 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl transition-colors"
            >
              <Pencil size={16} /> Modifica
            </button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black dark:text-white">{editingId ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}</h2>
              <button onClick={closeModal}><X size={24} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Contact picker - nascosto per smart-working/ufficio */}
              {!NO_CONTACT_TYPES.includes(formData.type) && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">
                  Cliente / Azienda
                  {formData.contactId && (
                    <span className="ml-2 normal-case font-bold text-indigo-600">✓ selezionato</span>
                  )}
                </label>
                <div ref={contactPickerRef} className="relative">
                  <div className={`w-full border-2 rounded-2xl px-4 py-3 flex items-center gap-2 bg-white dark:bg-gray-800 transition-colors ${showContactList ? 'border-indigo-400' : formData.contactId ? 'border-green-400' : 'border-gray-100 dark:border-gray-700'}`}>
                    <Search size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      autoFocus={!editingId}
                      value={contactSearch}
                      onChange={e => {
                        setContactSearch(e.target.value);
                        if (formData.contactId) setFormData({ ...formData, contactId: '' });
                        setShowContactList(true);
                      }}
                      onFocus={() => setShowContactList(true)}
                      placeholder={`Scrivi il nome... (${Object.keys(contacts).length} contatti)`}
                      className="flex-1 bg-transparent outline-none text-sm dark:text-white placeholder-gray-400 font-bold min-w-0"
                    />
                    {contactSearch && (
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { setContactSearch(''); setFormData({ ...formData, contactId: '' }); setShowContactList(true); }}
                        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {showContactList && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-gray-600 rounded-2xl shadow-2xl overflow-hidden">
                      {/* Header count */}
                      <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
                          {contactSearch
                            ? `${filteredContacts.length} risultat${filteredContacts.length === 1 ? 'o' : 'i'}`
                            : `${Object.keys(contacts).length} contatti`}
                        </span>
                        {contactSearch && filteredContacts.length > 0 && (
                          <span className="text-[10px] text-gray-300">↵ o click per selezionare</span>
                        )}
                      </div>

                      <div className="max-h-52 overflow-y-auto">
                        {filteredContacts.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm font-black text-gray-300">
                              {Object.keys(contacts).length === 0 ? '📋 Rubrica vuota' : '🔍 Nessun risultato'}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {Object.keys(contacts).length === 0
                                ? 'Aggiungi contatti dalla sezione Clienti'
                                : `Prova con un termine diverso`}
                            </p>
                          </div>
                        ) : filteredContacts.map(c => {
                          const q = contactSearch.toLowerCase().trim();
                          const company = c.company || '(senza nome)';
                          const hiIdx = q ? company.toLowerCase().indexOf(q) : -1;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => {
                                setFormData({ ...formData, contactId: c.id });
                                setContactSearch(company);
                                setShowContactList(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${formData.contactId === c.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                            >
                              <div className="min-w-0 flex-1 mr-3">
                                <p className="text-sm font-black dark:text-white truncate">
                                  {hiIdx >= 0 ? (
                                    <>
                                      {company.slice(0, hiIdx)}
                                      <mark className="bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200 rounded px-0.5 not-italic">{company.slice(hiIdx, hiIdx + q.length)}</mark>
                                      {company.slice(hiIdx + q.length)}
                                    </>
                                  ) : company}
                                </p>
                                {c.contactName && (
                                  <p className="text-[11px] text-gray-400 truncate">{c.contactName}</p>
                                )}
                              </div>
                              <span className={`flex-shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${c.status === 'cliente' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                {c.status === 'cliente' ? 'Cliente' : 'Prospect'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Tipo</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TYPE_LABELS) as ActivityType[]).map(t => (
                    <button key={t} type="button" onClick={() => setFormData({ ...formData, type: t })} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${formData.type === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>{TYPE_LABELS[t]}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Data</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ora</label>
                  <input type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white outline-none focus:border-indigo-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase block">Note</label>
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all ${
                        voiceNotes.isRecording
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                    >
                      {voiceNotes.isRecording ? <MicOff size={12} /> : <Mic size={12} />}
                      {voiceNotes.isRecording ? 'Stop' : 'Detta'}
                    </button>
                  )}
                </div>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Obiettivo della visita, dettagli..." rows={2} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-transparent dark:text-white outline-none focus:border-indigo-400 text-sm resize-none" />
                {voiceNotes.isRecording && voiceNotes.transcript && (
                  <p className="text-xs text-indigo-500 italic mt-1.5 px-1">"{voiceNotes.transcript}"</p>
                )}
                {voiceNotes.error && <p className="text-xs text-red-500 mt-1 px-1">{voiceNotes.error}</p>}
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-indigo-700 transition-colors">
                {editingId ? 'Aggiorna' : 'Salva'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
            <p className="font-black text-lg dark:text-white mb-2">Elimina appuntamento?</p>
            <p className="text-sm text-gray-400 mb-6">Questa azione non è reversibile.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-2xl font-black bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Annulla</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 py-3 rounded-2xl font-black bg-red-500 text-white hover:bg-red-600 transition-colors">Elimina</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chiudi Appuntamento Modal ── */}
      {closingActivity && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl">

            {/* Header */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-xl font-black dark:text-white">Chiudi Appuntamento</h2>
                <p className="text-sm text-gray-400 font-bold mt-0.5">
                  {contacts[closingActivity.contactId]?.company ?? 'Azienda'} ·{' '}
                  {new Date(closingActivity.date).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => { setClosingActivity(null); voiceClose.stop(); voiceClose.reset(); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X size={22} className="text-gray-400" />
              </button>
            </div>

            {/* Outcome */}
            <div className="mb-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Come è andata?</p>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCloseOutcome(opt.value)}
                    className={`py-3 px-3 rounded-2xl border-2 font-black text-sm transition-all flex items-center gap-2 ${
                      closeOutcome === opt.value ? opt.color + ' border-current' : 'border-gray-100 dark:border-gray-700 text-gray-400 bg-transparent'
                    }`}
                  >
                    <span>{opt.emoji}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Resoconto */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resoconto</p>
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all ${
                      voiceClose.isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600'
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
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-transparent dark:text-white outline-none focus:border-indigo-400 text-sm resize-none"
              />
              {voiceClose.isRecording && voiceClose.transcript && (
                <p className="text-xs text-indigo-500 italic mt-1.5 px-1">"{voiceClose.transcript}"</p>
              )}
              {voiceClose.error && <p className="text-xs text-red-500 mt-1 px-1">{voiceClose.error}</p>}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setClosingActivity(null); voiceClose.stop(); voiceClose.reset(); }}
                className="flex-1 py-3.5 rounded-2xl font-black bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={handleCloseActivity}
                className="flex-1 py-3.5 rounded-2xl font-black bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                Chiudi Appuntamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Import PST ── */}
      {pstModalOpen && (
        <div className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h2 className="text-lg font-black dark:text-white flex items-center gap-2">
                  <Calendar size={20} className="text-blue-500" /> Importa da Outlook
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {pstSelected.size} / {pstEvents.filter((e: any) => e.start).length} eventi selezionati
                </p>
              </div>
              <button onClick={() => setPstModalOpen(false)} className="text-gray-400 hover:text-gray-600">
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
                    className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all ${
                      !hasDate ? 'opacity-40 cursor-not-allowed border-gray-100 dark:border-gray-800' :
                      ev._duplicate ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 cursor-pointer' :
                      sel ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 cursor-pointer' :
                      'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-gray-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md flex-shrink-0 mt-0.5 border-2 flex items-center justify-center ${
                      sel && hasDate ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {sel && hasDate && <CheckCircle size={12} className="text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black dark:text-white truncate">{ev.subject || '(senza titolo)'}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {startDate ? (
                          <span className="text-xs font-bold text-gray-500">
                            {startDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' '}
                            {startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-400">Nessuna data</span>
                        )}
                        {ev.location && <span className="text-xs text-gray-400">📍 {ev.location}</span>}
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          ev._type === 'call-remota' ? 'bg-purple-100 text-purple-600' :
                          ev._type === 'formazione' ? 'bg-green-100 text-green-600' :
                          'bg-indigo-100 text-indigo-600'
                        }`}>{ev._type}</span>
                        {/* Dropdown selezione cliente */}
                        <select
                          value={overrideId}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            e.stopPropagation();
                            setPstContactOverrides(prev => ({ ...prev, [ev._idx]: e.target.value }));
                          }}
                          className={`text-[11px] font-bold rounded-full px-2 py-0.5 border outline-none cursor-pointer max-w-[180px] ${
                            overrideId
                              ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-400'
                          }`}
                        >
                          <option value="">— Nessun cliente —</option>
                          {(sortedContacts as any[]).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.company}</option>
                          ))}
                        </select>
                        {ev._duplicate && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 gap-3">
              <button
                onClick={() => {
                  const allSelectable = pstEvents.filter((e: any) => e.start && !e._duplicate).map((e: any) => e._idx);
                  setPstSelected(new Set(allSelectable));
                }}
                className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Seleziona tutti
              </button>
              <div className="flex gap-2">
                <button onClick={() => setPstModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
                  Annulla
                </button>
                <button
                  onClick={handlePSTImport}
                  disabled={pstSelected.size === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-2xl text-sm font-black transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={15} /> Importa {pstSelected.size} eventi
                </button>
              </div>
            </div>
          </div>
        </div>
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
