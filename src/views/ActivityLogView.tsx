import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Phone, MapPin, Mail, FileText, Target, Plus, X,
  ChevronDown, ChevronUp, TrendingUp, Activity, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { ActivityType } from '../types';
import { useToast } from '../components/ui/ToastContext';

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
  visita:   <MapPin size={14} />,
  chiamata: <Phone size={14} />,
  email:    <Mail size={14} />,
  nota:     <FileText size={14} />,
};

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  visita:   'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600',
  chiamata: 'bg-green-100 dark:bg-green-900/40 text-green-600',
  email:    'bg-blue-100 dark:bg-blue-900/40 text-blue-600',
  nota:     'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600',
};

const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', qualificato: 'Qualificato', proposta: 'Proposta', negoziazione: 'Trattativa',
  'chiuso-vinto': 'Vinto 🎉', 'chiuso-perso': 'Perso',
};
const STAGE_COLOR: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-600', qualificato: 'bg-purple-100 text-purple-600',
  proposta: 'bg-orange-100 text-orange-600', negoziazione: 'bg-indigo-100 text-indigo-600',
  'chiuso-vinto': 'bg-green-100 text-green-600', 'chiuso-perso': 'bg-red-100 text-red-500',
};
const OFFER_COLOR: Record<string, string> = {
  bozza: 'bg-gray-100 text-gray-500', inviata: 'bg-blue-100 text-blue-600',
  accettata: 'bg-green-100 text-green-600', rifiutata: 'bg-red-100 text-red-500',
};

// ─── Quick-add form ───────────────────────────────────────────────────────────

interface QuickAddProps {
  contacts: Record<string, { company: string }>;
  onSave: (contactId: string, type: ActivityType, notes: string) => void;
  onClose: () => void;
}

const QuickAdd: React.FC<QuickAddProps> = ({ contacts, onSave, onClose }) => {
  const [contactId, setContactId] = useState('');
  const [type, setType] = useState<ActivityType>('visita');
  const [notes, setNotes] = useState('');

  const TYPES: ActivityType[] = ['visita', 'chiamata', 'email', 'nota'];
  const TYPE_LABELS: Record<ActivityType, string> = { visita: 'Visita', chiamata: 'Chiamata', email: 'Email', nota: 'Nota' };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 p-5 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-black dark:text-white">Registra attività</p>
        <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
      </div>
      <div className="space-y-3">
        <select
          value={contactId}
          onChange={e => setContactId(e.target.value)}
          className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-transparent dark:text-white text-sm font-bold outline-none focus:border-indigo-400"
        >
          <option value="">Seleziona cliente...</option>
          {Object.values(contacts).sort((a, b) => a.company.localeCompare(b.company)).map((c: any) => (
            <option key={c.id} value={c.id}>{c.company}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${type === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Note, esito, prossimi passi..."
          rows={2}
          className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-transparent dark:text-white text-sm font-bold outline-none focus:border-indigo-400 resize-none"
        />
        <button
          onClick={() => { if (contactId) { onSave(contactId, type, notes); } }}
          disabled={!contactId}
          className={`w-full py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-colors ${contactId ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          Registra ora
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ActivityLogView: React.FC = () => {
  const { activities, deals, offers, contacts, addActivity } = useStore();
  const { showToast } = useToast();

  const [filterType, setFilterType] = useState<EventKind | 'all'>('all');
  const [filterContact, setFilterContact] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set([toDayKey(Date.now())]));

  // Calendar state
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

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
    });
  });

  // ── Calendar helpers ──

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const calendarDaysWithEvents = new Set(
    allEvents
      .filter(e => {
        const d = new Date(e.ts);
        return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
      })
      .map(e => parseInt(toDayKey(e.ts).split('-')[2]))
  );

  const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
  const firstDay = (getFirstDayOfMonth(calendarMonth, calendarYear) + 6) % 7; // Convert Sun=0 to Mon=0

  const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  // ── Filtri ──

  const filtered = allEvents.filter(e => {
    if (filterType !== 'all' && e.kind !== filterType) return false;
    if (filterContact && e.contactId !== filterContact) return false;
    // Filter by calendar month/year
    const d = new Date(e.ts);
    if (d.getFullYear() !== calendarYear || d.getMonth() !== calendarMonth) return false;
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
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Attività</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Diario commerciale</p>
        </div>
        <button
          onClick={() => setShowQuickAdd(v => !v)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus size={16} /> Registra
        </button>
      </div>

      {/* Quick add */}
      {showQuickAdd && (
        <QuickAdd contacts={contacts} onSave={handleQuickAdd} onClose={() => setShowQuickAdd(false)} />
      )}

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (calendarMonth === 0) {
                setCalendarMonth(11);
                setCalendarYear(calendarYear - 1);
              } else {
                setCalendarMonth(calendarMonth - 1);
              }
            }}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={16} className="text-gray-400" />
          </button>
          <h3 className="text-sm font-black dark:text-white capitalize text-center flex-1">{monthName}</h3>
          <button
            onClick={() => {
              if (calendarMonth === 11) {
                setCalendarMonth(0);
                setCalendarYear(calendarYear + 1);
              } else {
                setCalendarMonth(calendarMonth + 1);
              }
            }}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
            <div key={day} className="text-center text-[9px] font-black text-gray-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasEvents = calendarDaysWithEvents.has(day);
            const isToday = day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();

            return (
              <button
                key={day}
                className={`aspect-square rounded-lg text-[10px] font-bold flex items-center justify-center transition-all ${
                  hasEvents
                    ? isToday
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 font-black'
                    : isToday
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI settimana */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Visite', value: kpiVisits, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Chiamate', value: kpiCalls, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Offerte', value: kpiOffers, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Deal', value: kpiDeals, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-3 text-center`}>
            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{k.label}</p>
            <p className="text-[8px] text-gray-400">questa sett.</p>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
          {([['all', 'Tutto'], ['activity', 'Attività'], ['deal', 'Deal'], ['offer', 'Offerte']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilterType(v)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${filterType === v ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
              {l}
            </button>
          ))}
        </div>
        <select
          value={filterContact}
          onChange={e => setFilterContact(e.target.value)}
          className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-2 bg-white dark:bg-gray-800 dark:text-white text-xs font-bold outline-none"
        >
          <option value="">Tutti i clienti</option>
          {contactOptions.map((c: any) => <option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {sortedDays.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl">
          <Activity size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-black uppercase tracking-widest text-gray-300 dark:text-gray-600 text-sm">Nessuna attività</p>
          <p className="text-xs text-gray-400 mt-1">Premi "Registra" per aggiungere la prima</p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {sortedDays.map(dayKey => {
          const contactMap = byDay.get(dayKey)!;
          const isExpanded = expandedDays.has(dayKey);
          const clientCount = contactMap.size;

          return (
            <div key={dayKey} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

              {/* Day header — cliccabile per expand/collapse */}
              <button
                onClick={() => toggleDay(dayKey)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {/* Data badge */}
                  <div className="flex flex-col items-center bg-indigo-600 text-white rounded-xl px-3 py-1.5 min-w-[42px]">
                    <span className="text-[10px] font-black uppercase leading-none">
                      {new Date(dayKey + 'T12:00:00').toLocaleDateString('it-IT', { month: 'short' })}
                    </span>
                    <span className="text-lg font-black leading-tight">
                      {new Date(dayKey + 'T12:00:00').getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="font-black text-sm dark:text-white">{formatDayLabel(dayKey)}</p>
                    <p className="text-[10px] text-gray-400 font-bold">
                      {clientCount} client{clientCount > 1 ? 'i' : 'e'} · {daySummary(contactMap)}
                    </p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {/* Day content */}
              {isExpanded && (
                <div className="border-t border-gray-50 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
                  {Array.from(contactMap.entries()).map(([contactId, events]) => {
                    const company = (contacts as any)[contactId]?.company ?? 'Azienda sconosciuta';
                    const sortedEvents = [...events].sort((a, b) => b.ts - a.ts);

                    return (
                      <div key={contactId} className="px-5 py-4">
                        {/* Cliente header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 flex-shrink-0">
                            <TrendingUp size={12} />
                          </div>
                          <p className="font-black text-sm dark:text-white uppercase tracking-tight">{company}</p>
                          <span className="text-[9px] text-gray-400 font-bold">{sortedEvents.length} event{sortedEvents.length > 1 ? 'i' : 'o'}</span>
                        </div>

                        {/* Events */}
                        <div className="space-y-2 pl-9">
                          {sortedEvents.map(event => (
                            <div key={event.id} className="flex items-start gap-2.5">

                              {/* Icon */}
                              {event.kind === 'activity' && (
                                <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${ACTIVITY_COLOR[event.activityType!]}`}>
                                  {ACTIVITY_ICON[event.activityType!]}
                                </span>
                              )}
                              {event.kind === 'deal' && (
                                <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                                  <Target size={12} />
                                </span>
                              )}
                              {event.kind === 'offer' && (
                                <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                                  <FileText size={12} />
                                </span>
                              )}

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {event.kind === 'activity' && (
                                    <>
                                      <span className="text-xs font-black dark:text-white capitalize">{event.activityType}</span>
                                      <span className="text-[10px] text-gray-400">{formatTime(event.ts)}</span>
                                    </>
                                  )}
                                  {event.kind === 'deal' && (
                                    <>
                                      <span className="text-xs font-black dark:text-white">Deal aperto</span>
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${STAGE_COLOR[event.dealStage!] ?? ''}`}>
                                        {STAGE_LABEL[event.dealStage!]}
                                      </span>
                                      <span className="text-xs font-black text-indigo-600">€{((event.dealValue ?? 0) / 1000).toFixed(0)}k</span>
                                    </>
                                  )}
                                  {event.kind === 'offer' && (
                                    <>
                                      <span className="text-xs font-black dark:text-white">{event.offerNumber}</span>
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${OFFER_COLOR[event.offerStatus!] ?? ''}`}>
                                        {event.offerStatus}
                                      </span>
                                      <span className="text-xs font-black text-indigo-600">€{(event.offerTotal ?? 0).toLocaleString('it-IT')}</span>
                                    </>
                                  )}
                                </div>
                                {event.notes && (
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{event.notes}</p>
                                )}
                              </div>
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
    </div>
  );
};
