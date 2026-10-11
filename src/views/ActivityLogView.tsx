import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Phone, MapPin, Mail, FileText, Target, Plus, X, Pencil,
  ChevronDown, ChevronUp, TrendingUp, Activity, ChevronLeft, ChevronRight,
  Video, MonitorPlay, Wrench, GraduationCap, Laptop, Building2, Store, Car,
} from 'lucide-react';
import { ActivityType, Activity as ActivityRecord } from '../types';
import { useToast } from '../components/ui/ToastContext';
import { PdfButton } from '../components/ui/PdfButton';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../utils/search';

// ─── Tipi evento ──────────────────────────────────────────────────────────────

type EventKind = 'activity' | 'deal' | 'offer';

interface LogEvent {
  id: string;
  kind: EventKind;
  contactId: string;
  ts: number;          // timestamp preciso per ordinamento
  dayKey: string;      // 'YYYY-MM-DD'
  // activity
  activityType?: ActivityType;
  notes?: string;
  // deal
  dealStage?: string;
  dealValue?: number;
  // offer
  offerNumber?: string;
  offerStatus?: string;
  offerTotal?: number;
  offerPdfUrl?: string;
  offerPdfName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(dayKey: string): string {
  const d = new Date(dayKey + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (toDayKey(today.getTime()) === dayKey) return 'Oggi';
  if (toDayKey(yesterday.getTime()) === dayKey) return 'Ieri';
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function startOfWeekTs(): number {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const ACTIVITY_ICON: Record<ActivityType, React.ReactNode> = {
  visita:       <MapPin size={14} />,
  'visita-freddo': <MapPin size={14} />,
  chiamata:     <Phone size={14} />,
  email:        <Mail size={14} />,
  nota:         <FileText size={14} />,
  demo:         <MonitorPlay size={14} />,
  'call-remota': <Video size={14} />,
  sopralluogo:  <Wrench size={14} />,
  formazione:   <GraduationCap size={14} />,
  'smart-working': <Laptop size={14} />,
  ufficio:      <Building2 size={14} />,
  fiera:        <MapPin size={14} />,
  'giornata-banco': <Store size={14} />,
  'mini-fiera':  <MapPin size={14} />,
  'manutenzione-auto': <Car size={14} />,
};

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  visita:       'bg-accent-soft dark:bg-accent-soft/40 text-accent',
  'visita-freddo': 'bg-accent-soft dark:bg-accent-soft/40 text-accent',
  chiamata:     'bg-success-soft dark:bg-success-soft text-success',
  email:        'bg-accent-soft dark:bg-accent-soft/40 text-accent',
  nota:         'bg-warning-soft dark:bg-warning-soft text-warning',
  demo:         'bg-accent-soft dark:bg-accent-soft/40 text-accent',
  'call-remota': 'bg-accent-soft dark:bg-accent-soft/40 text-accent',
  sopralluogo:  'bg-warning-soft dark:bg-warning-soft text-warning',
  formazione:   'bg-accent-soft dark:bg-accent-soft/40 text-accent',
  'smart-working': 'bg-accent-soft dark:bg-accent-soft/40 text-accent',
  ufficio:      'bg-raised dark:bg-raised/40 text-secondary',
  fiera:        'bg-accent-soft dark:bg-accent-soft/40 text-accent',
  'giornata-banco': "bg-warning-soft dark:bg-warning-soft text-warning",
  'mini-fiera':  "bg-accent-soft dark:bg-accent-soft/40 text-accent",
  'manutenzione-auto': "bg-raised dark:bg-raised/40 text-secondary",
};

const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', qualificato: 'Qualificato', proposta: 'Proposta', negoziazione: 'Trattativa',
  'chiuso-vinto': 'Vinto 🎉', 'chiuso-perso': 'Perso',
};
const STAGE_COLOR: Record<string, string> = {
  lead: 'bg-accent-soft text-accent', qualificato: 'bg-accent-soft text-accent',
  proposta: 'bg-warning-soft text-warning', negoziazione: 'bg-accent-soft text-accent',
  'chiuso-vinto': 'bg-success-soft text-success', 'chiuso-perso': 'bg-danger-soft text-danger',
};
const OFFER_COLOR: Record<string, string> = {
  bozza: 'bg-raised text-secondary', inviata: 'bg-accent-soft text-accent',
  accettata: 'bg-success-soft text-success', rifiutata: 'bg-danger-soft text-danger',
};

// ─── Quick-add form ───────────────────────────────────────────────────────────

interface QuickAddProps {
  contacts: Record<string, { company: string; contactName?: string; city?: string; email?: string; phone?: string }>;
  onSave: (contactId: string, type: ActivityType, notes: string) => void;
  onClose: () => void;
}

const QuickAdd: React.FC<QuickAddProps> = ({ contacts, onSave, onClose }) => {
  const [contactId, setContactId] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [type, setType] = useState<ActivityType>('visita');
  const [notes, setNotes] = useState('');

  const TYPES: ActivityType[] = ['visita', 'chiamata', 'email', 'nota', 'demo', 'call-remota', 'sopralluogo', 'formazione', 'smart-working', 'ufficio', 'giornata-banco', 'mini-fiera', 'manutenzione-auto'];
  const TYPE_LABELS: Record<ActivityType, string> = {
    visita: 'Visita', 'visita-freddo': 'Visita a freddo', chiamata: 'Chiamata', email: 'Email', nota: 'Nota',
    demo: 'Demo', 'call-remota': 'Call Rem.', sopralluogo: 'Sopralluogo', formazione: 'Formazione',
    'smart-working': 'Smart Working', ufficio: 'Ufficio', fiera: 'Fiera',
    'giornata-banco': 'Giornata al banco', 'mini-fiera': 'Mini fiera dal cliente', 'manutenzione-auto': 'Manutenzione auto',
  };

  return (
    <div className="bg-surface dark:bg-surface rounded-panel border-2 border-accent dark:border-accent p-5 shadow-panel">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-semibold dark:text-foreground">Registra attività</p>
        <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose}><X size={18} className="text-muted" /></button>
      </div>
      <div className="space-y-3">
        <SearchDropdown
          value={contactSearch}
          onChange={v => { setContactSearch(v); if (contactId) setContactId(''); }}
          placeholder="Cerca cliente per nome, azienda, città..."
          showWhenEmpty
          totalCount={Object.keys(contacts).length}
          inputWrapperClassName={() => 'flex items-center gap-2 px-3 py-2.5 bg-transparent border-2 border-line dark:border-line rounded-md font-bold outline-none focus-within:border-accent transition-all text-sm dark:text-foreground'}
          results={sortByRelevance(contactSearch, (contactSearch.trim()
            ? Object.values(contacts).filter((c: any) => matchSearch(contactSearch, [c.company, c.contactName, c.city, c.email, c.phone]))
            : Object.values(contacts)
          ), (c: any) => [c.company, c.contactName]).slice(0, 8).map((c: any) => ({
            key: c.id,
            item: c,
            label: c.company || c.contactName,
            sublabel: [c.company && c.contactName, c.city].filter(Boolean).join(' · ') || undefined,
          }))}
          onSelect={(c: any) => { setContactId(c.id); setContactSearch(c.company || c.contactName); }}
        />
        <div className="flex gap-2">
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-md text-xs font-semibold uppercase transition-all ${type === t ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Note, esito, prossimi passi..."
          rows={2}
          className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-transparent dark:text-foreground text-sm font-bold outline-none focus:border-accent resize-none"
        />
        <button
          onClick={() => { if (contactId) { onSave(contactId, type, notes); } }}
          disabled={!contactId}
          className={`w-full py-3 rounded-md font-semibold uppercase text-xs tracking-normal transition-colors ${contactId ? 'bg-action text-action-foreground hover:bg-action-hover' : 'bg-raised text-muted cursor-not-allowed'}`}
        >
          Registra ora
        </button>
      </div>
    </div>
  );
};

// ─── Edit activity modal ──────────────────────────────────────────────────────

interface EditActivityModalProps {
  activity: ActivityRecord;
  companyName: string;
  onClose: () => void;
  onSave: (updates: Partial<ActivityRecord>) => void;
}

const EDIT_TYPES: ActivityType[] = ['visita', 'chiamata', 'email', 'nota', 'demo', 'call-remota', 'sopralluogo', 'formazione', 'smart-working', 'ufficio', 'giornata-banco', 'mini-fiera', 'manutenzione-auto'];
const EDIT_TYPE_LABELS: Record<ActivityType, string> = {
  visita: 'Visita', 'visita-freddo': 'Visita a freddo', chiamata: 'Chiamata', email: 'Email', nota: 'Nota',
  demo: 'Demo', 'call-remota': 'Call Rem.', sopralluogo: 'Sopralluogo', formazione: 'Formazione',
  'smart-working': 'Smart Working', ufficio: 'Ufficio', fiera: 'Fiera',
    'giornata-banco': 'Giornata al banco', 'mini-fiera': 'Mini fiera dal cliente', 'manutenzione-auto': 'Manutenzione auto',
};

const toLocalDateTimeInput = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EditActivityModal: React.FC<EditActivityModalProps> = ({ activity, companyName, onClose, onSave }) => {
  const [type, setType] = useState<ActivityType>(activity.type);
  const [dateTime, setDateTime] = useState(toLocalDateTimeInput(activity.date));
  const [notes, setNotes] = useState(activity.notes || '');
  const [results, setResults] = useState(activity.results || '');
  const isClosed = activity.outcome === 'fatto';

  const handleSave = () => {
    onSave({
      type,
      date: new Date(dateTime).getTime(),
      notes,
      ...(isClosed ? { results } : {}),
    });
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface dark:bg-surface w-full max-w-lg rounded-panel p-6 shadow-panel space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold  dark:text-foreground">Modifica attività</h2>
            <p className="text-xs text-muted font-bold uppercase tracking-normal">{companyName}</p>
          </div>
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="p-2 rounded-md hover:bg-raised dark:hover:bg-raised">
            <X size={20} className="text-muted" />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Tipo</label>
          <div className="flex flex-wrap gap-2">
            {EDIT_TYPES.map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${type === t ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}>
                {EDIT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Data e ora</label>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={e => setDateTime(e.target.value)}
            className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-2.5 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-colors text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Note</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-2.5 bg-canvas dark:bg-canvas dark:text-foreground text-sm font-bold outline-none focus:border-accent resize-none transition-colors"
          />
        </div>

        {isClosed && (
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Esito / Resoconto</label>
            <textarea
              value={results}
              onChange={e => setResults(e.target.value)}
              rows={3}
              className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-2.5 bg-canvas dark:bg-canvas dark:text-foreground text-sm font-bold outline-none focus:border-accent resize-none transition-colors"
            />
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-panel bg-action text-action-foreground font-semibold uppercase text-xs tracking-normal hover:bg-action-hover transition-colors"
        >
          Salva modifiche
        </button>
      </div>
    </DialogFrame>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ActivityLogView: React.FC = () => {
  const { activities, deals, offers, contacts, addActivity, updateActivity } = useStore();
  const { showToast } = useToast();

  const [filterType, setFilterType] = useState<EventKind | 'all'>('all');
  const [filterContact, setFilterContact] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set([toDayKey(Date.now())]));

  // Calendar state
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDayKey(today.getTime());

  const [selectedDay, setSelectedDay] = useState<string>(todayKey);

  // ── Costruisce la lista di eventi da tutte le sorgenti ──

  const allEvents: LogEvent[] = [];

  Object.values(activities).forEach(a => {
    allEvents.push({
      id: `act_${a.id}`,
      kind: 'activity',
      contactId: a.contactId,
      ts: a.date,
      dayKey: toDayKey(a.date),
      activityType: a.type,
      notes: a.notes,
    });
  });

  Object.values(deals).forEach(d => {
    allEvents.push({
      id: `deal_${d.id}`,
      kind: 'deal',
      contactId: d.contactId,
      ts: d.createdAt,
      dayKey: toDayKey(d.createdAt),
      dealStage: d.stage,
      dealValue: d.value,
      notes: d.nextAction,
    });
  });

  Object.values(offers).forEach(o => {
    allEvents.push({
      id: `offer_${o.id}`,
      kind: 'offer',
      contactId: o.contactId,
      ts: o.date,
      dayKey: toDayKey(o.date),
      offerNumber: o.offerNumber,
      offerStatus: o.status,
      offerTotal: o.totalAmount,
      offerPdfUrl: o.pdfUrl,
      offerPdfName: o.pdfName,
    });
  });

  // ── Filtri ──

  const filtered = allEvents.filter(e => {
    if (filterType !== 'all' && e.kind !== filterType) return false;
    if (filterContact && e.contactId !== filterContact) return false;
    // Filter by selected day
    if (e.dayKey !== selectedDay) return false;
    return true;
  });

  // ── Raggruppa per giorno (decrescente) → per cliente ──

  const byDay = new Map<string, Map<string, LogEvent[]>>();
  filtered.forEach(e => {
    if (!byDay.has(e.dayKey)) byDay.set(e.dayKey, new Map());
    const byContact = byDay.get(e.dayKey)!;
    if (!byContact.has(e.contactId)) byContact.set(e.contactId, []);
    byContact.get(e.contactId)!.push(e);
  });

  const sortedDays = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));

  // ── KPI settimana corrente ──

  const weekStart = startOfWeekTs();
  const weekEvents = allEvents.filter(e => e.ts >= weekStart);
  const kpiVisits  = weekEvents.filter(e => e.kind === 'activity' && e.activityType === 'visita').length;
  const kpiCalls   = weekEvents.filter(e => e.kind === 'activity' && e.activityType === 'chiamata').length;
  const kpiOffers  = weekEvents.filter(e => e.kind === 'offer').length;
  const kpiDeals   = weekEvents.filter(e => e.kind === 'deal').length;

  // ── Giorno summary ──

  const daySummary = (contactMap: Map<string, LogEvent[]>) => {
    const flat = Array.from(contactMap.values()).flat();
    const parts = [];
    const v = flat.filter(e => e.kind === 'activity' && e.activityType === 'visita').length;
    const c = flat.filter(e => e.kind === 'activity' && e.activityType === 'chiamata').length;
    const o = flat.filter(e => e.kind === 'offer').length;
    const d = flat.filter(e => e.kind === 'deal').length;
    if (v) parts.push(`${v} visit${v > 1 ? 'e' : 'a'}`);
    if (c) parts.push(`${c} chiam${c > 1 ? 'ate' : 'ata'}`);
    if (o) parts.push(`${o} offert${o > 1 ? 'e' : 'a'}`);
    if (d) parts.push(`${d} deal`);
    return parts.join(' · ');
  };

  const toggleDay = (dayKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(dayKey) ? next.delete(dayKey) : next.add(dayKey);
      return next;
    });
  };

  // ── Quick add handler ──

  const handleQuickAdd = (contactId: string, type: ActivityType, notes: string) => {
    addActivity({
      id: `act_${Date.now()}`,
      contactId,
      type,
      date: Date.now(),
      outcome: 'completata',
      notes,
      createdAt: Date.now(),
    });
    showToast('Attività registrata!', 'success');
    setShowQuickAdd(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const contactOptions = Object.values(contacts).sort((a, b) => a.company.localeCompare(b.company));

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl  dark:text-foreground  ">Attività</h1>
          <p className="text-muted text-sm font-bold uppercase tracking-normal">Diario commerciale</p>
        </div>
        <button
          onClick={() => setShowQuickAdd(v => !v)}
          className="bg-action text-action-foreground px-5 py-2.5 rounded-panel font-bold flex items-center gap-2 shadow-panel hover:bg-action-hover transition-colors text-sm"
        >
          <Plus size={16} /> Registra
        </button>
      </div>

      {/* Quick add */}
      {showQuickAdd && (
        <QuickAdd contacts={contacts} onSave={handleQuickAdd} onClose={() => setShowQuickAdd(false)} />
      )}

      {/* Mini date picker */}
      {selectedDay !== todayKey && (
        <div className="flex items-center gap-2 bg-accent-soft dark:bg-accent-soft/20 rounded-panel px-4 py-2.5 border border-accent dark:border-accent">
          <span className="text-xs font-semibold text-accent dark:text-accent uppercase">
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
          </span>
          <button
            onClick={() => {
              setSelectedDay(todayKey);
              setExpandedDays(prev => new Set(prev).add(todayKey));
            }}
            className="text-xs font-semibold text-accent dark:text-accent hover:text-accent dark:hover:text-accent"
          >
            ← Torna a oggi
          </button>
        </div>
      )}

      {/* KPI settimana */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Visite', value: kpiVisits, color: 'text-accent', bg: 'bg-accent-soft dark:bg-accent-soft/20' },
          { label: 'Chiamate', value: kpiCalls, color: 'text-success', bg: 'bg-success-soft dark:bg-success-soft' },
          { label: 'Offerte', value: kpiOffers, color: 'text-accent', bg: 'bg-accent-soft dark:bg-accent-soft/20' },
          { label: 'Deal', value: kpiDeals, color: 'text-warning', bg: 'bg-warning-soft dark:bg-warning-soft' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-panel p-3 text-center`}>
            <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted mt-0.5">{k.label}</p>
            <p className="text-xs text-muted">questa sett.</p>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-surface dark:bg-surface rounded-panel p-1 shadow-sm border border-line dark:border-line">
          {([['all', 'Tutto'], ['activity', 'Attività'], ['deal', 'Deal'], ['offer', 'Offerte']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilterType(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all ${filterType === v ? 'bg-action text-action-foreground' : 'text-muted hover:text-secondary'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-surface dark:bg-surface rounded-panel p-1 shadow-sm border border-line dark:border-line">
          <button
            onClick={() => {
              const d = new Date(selectedDay + 'T12:00:00');
              d.setDate(d.getDate() - 1);
              setSelectedDay(toDayKey(d.getTime()));
              setExpandedDays(prev => new Set(prev).add(toDayKey(d.getTime())));
            }}
            className="p-1.5 rounded-lg hover:bg-raised dark:hover:bg-raised text-muted"
          >
            <ChevronLeft size={14} />
          </button>
          <input
            type="date"
            value={selectedDay}
            onChange={e => {
              setSelectedDay(e.target.value);
              setExpandedDays(prev => new Set(prev).add(e.target.value));
            }}
            className="text-xs font-bold px-2 py-1 bg-transparent dark:text-foreground outline-none cursor-pointer"
          />
          <button
            onClick={() => {
              const d = new Date(selectedDay + 'T12:00:00');
              d.setDate(d.getDate() + 1);
              setSelectedDay(toDayKey(d.getTime()));
              setExpandedDays(prev => new Set(prev).add(toDayKey(d.getTime())));
            }}
            className="p-1.5 rounded-lg hover:bg-raised dark:hover:bg-raised text-muted"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <select
          value={filterContact}
          onChange={e => setFilterContact(e.target.value)}
          className="border-2 border-line dark:border-line rounded-panel px-4 py-2 bg-surface dark:bg-surface dark:text-foreground text-xs font-bold outline-none"
        >
          <option value="">Tutti i clienti</option>
          {contactOptions.map((c: any) => <option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {sortedDays.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-line dark:border-line rounded-panel">
          <Activity size={40} className="mx-auto mb-3 text-muted dark:text-secondary" />
          <p className="font-semibold uppercase tracking-normal text-muted dark:text-secondary text-sm">Nessuna attività</p>
          <p className="text-xs text-muted mt-1">Premi "Registra" per aggiungere la prima</p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {sortedDays.map(dayKey => {
          const contactMap = byDay.get(dayKey)!;
          const isExpanded = expandedDays.has(dayKey);
          const clientCount = contactMap.size;

          return (
            <div key={dayKey} className="bg-surface dark:bg-surface rounded-panel shadow-sm border border-line dark:border-line overflow-hidden">

              {/* Day header — cliccabile per expand/collapse */}
              <button
                onClick={() => toggleDay(dayKey)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-canvas dark:hover:bg-raised/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {/* Data badge */}
                  <div className="flex flex-col items-center bg-action text-action-foreground rounded-md px-3 py-1.5 min-w-[42px]">
                    <span className="text-xs font-semibold uppercase leading-none">
                      {new Date(dayKey + 'T12:00:00').toLocaleDateString('it-IT', { month: 'short' })}
                    </span>
                    <span className="text-lg font-semibold leading-tight">
                      {new Date(dayKey + 'T12:00:00').getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm dark:text-foreground">{formatDayLabel(dayKey)}</p>
                    <p className="text-xs text-muted font-bold">
                      {clientCount} client{clientCount > 1 ? 'i' : 'e'} · {daySummary(contactMap)}
                    </p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
              </button>

              {/* Day content */}
              {isExpanded && (
                <div className="border-t border-line dark:border-line divide-y divide-line dark:divide-line">
                  {Array.from(contactMap.entries()).map(([contactId, events]) => {
                    const company = (contacts as any)[contactId]?.company ?? 'Azienda sconosciuta';
                    const sortedEvents = [...events].sort((a, b) => b.ts - a.ts);

                    return (
                      <div key={contactId} className="px-5 py-4">
                        {/* Cliente header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 bg-accent-soft dark:bg-accent-soft/30 rounded-lg flex items-center justify-center text-accent flex-shrink-0">
                            <TrendingUp size={12} />
                          </div>
                          <p className="font-semibold text-sm dark:text-foreground uppercase tracking-tight">{company}</p>
                          <span className="text-xs text-muted font-bold">{sortedEvents.length} event{sortedEvents.length > 1 ? 'i' : 'o'}</span>
                        </div>

                        {/* Events */}
                        <div className="space-y-2 pl-9">
                          {sortedEvents.map(event => (
                            <div
                              key={event.id}
                              onClick={() => { if (event.kind === 'activity') setEditingActivityId(event.id.replace(/^act_/, '')); }}
                              className={`flex items-start gap-2.5 group ${event.kind === 'activity' ? 'cursor-pointer -mx-2 px-2 py-1 rounded-md hover:bg-canvas dark:hover:bg-raised/40 transition-colors' : ''}`}
                            >

                              {/* Icon */}
                              {event.kind === 'activity' && (
                                <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${ACTIVITY_COLOR[event.activityType!]}`}>
                                  {ACTIVITY_ICON[event.activityType!]}
                                </span>
                              )}
                              {event.kind === 'deal' && (
                                <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-warning-soft dark:bg-warning-soft text-warning">
                                  <Target size={12} />
                                </span>
                              )}
                              {event.kind === 'offer' && (
                                <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-accent-soft dark:bg-accent-soft/30 text-accent">
                                  <FileText size={12} />
                                </span>
                              )}

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {event.kind === 'activity' && (
                                    <>
                                      <span className="text-xs font-semibold dark:text-foreground capitalize">{event.activityType}</span>
                                      <span className="text-xs text-muted">{formatTime(event.ts)}</span>
                                    </>
                                  )}
                                  {event.kind === 'deal' && (
                                    <>
                                      <span className="text-xs font-semibold dark:text-foreground">Deal aperto</span>
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLOR[event.dealStage!] ?? ''}`}>
                                        {STAGE_LABEL[event.dealStage!]}
                                      </span>
                                      <span className="text-xs font-semibold text-accent">€{((event.dealValue ?? 0) / 1000).toFixed(0)}k</span>
                                    </>
                                  )}
                                  {event.kind === 'offer' && (
                                    <>
                                      <span className="text-xs font-semibold dark:text-foreground">{event.offerNumber}</span>
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${OFFER_COLOR[event.offerStatus!] ?? ''}`}>
                                        {event.offerStatus}
                                      </span>
                                      <span className="text-xs font-semibold text-accent">€{(event.offerTotal ?? 0).toLocaleString('it-IT')}</span>
                                      {event.offerPdfUrl && (
                                        <PdfButton pdfUrl={event.offerPdfUrl} pdfName={event.offerPdfName}
                                          className="p-1 rounded-md bg-warning-soft dark:bg-warning-soft text-warning hover:bg-warning-soft transition-colors flex-shrink-0">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                        </PdfButton>
                                      )}
                                    </>
                                  )}
                                </div>
                                {event.notes && (
                                  <p className="text-xs text-secondary dark:text-muted mt-0.5 leading-relaxed">{event.notes}</p>
                                )}
                              </div>
                              {event.kind === 'activity' && (
                                <Pencil size={12} className="flex-shrink-0 text-muted dark:text-secondary opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingActivityId && activities[editingActivityId] && (
        <EditActivityModal
          activity={activities[editingActivityId]}
          companyName={contacts[activities[editingActivityId].contactId]?.company ?? 'Azienda sconosciuta'}
          onClose={() => setEditingActivityId(null)}
          onSave={updates => {
            updateActivity(editingActivityId, updates);
            setEditingActivityId(null);
            showToast('Attività aggiornata!', 'success');
          }}
        />
      )}
    </div>
  );
};
