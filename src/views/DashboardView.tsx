import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  TrendingUp,
  Users,
  Target,
  Clock,
  CheckCircle2,
  AlarmClock,
  Zap,
  Phone,
  Mail,
  FileText,
  Calendar,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Deal, NextActionType, ActivityOutcome } from '../types';
import { NextActionModal } from '../components/deals/NextActionModal';
import { OutcomeModal } from '../components/deals/OutcomeModal';
import { ActionChoiceModal } from '../components/deals/ActionChoiceModal';

// ─── DealCalendar ─────────────────────────────────────────────────────────────

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface DealCalendarProps {
  deals: Deal[];
  contacts: Record<string, { company: string }>;
}

const DealCalendar: React.FC<DealCalendarProps> = ({ deals, contacts }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [monthOffset, setMonthOffset] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Week ──
  const weekStart = startOfWeek(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // ── Month ──
  const monthAnchor = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthDays = (() => {
    const days: Date[] = [];
    const start = startOfWeek(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1));
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  })();

  const dealsForDay = (day: Date) =>
    deals.filter(d => d.nextActionDeadline && isSameDay(new Date(d.nextActionDeadline), day));

  const selectedDeals = selectedDay ? dealsForDay(selectedDay) : [];

  const stageDot: Record<string, string> = {
    lead: 'bg-blue-400',
    qualificato: 'bg-purple-400',
    proposta: 'bg-orange-400',
    negoziazione: 'bg-indigo-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-indigo-500" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scadenze Deal</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => viewMode === 'week' ? setWeekOffset(w => w - 1) : setMonthOffset(m => m - 1)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
          ><ChevronLeft size={16} /></button>
          <span className="text-xs font-black dark:text-white min-w-[120px] text-center">
            {viewMode === 'week'
              ? `${weekDays[0].getDate()} ${MONTHS_IT[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTHS_IT[weekDays[6].getMonth()]}`
              : `${MONTHS_IT[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`
            }
          </span>
          <button
            onClick={() => viewMode === 'week' ? setWeekOffset(w => w + 1) : setMonthOffset(m => m + 1)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
          ><ChevronRight size={16} /></button>
          <button
            onClick={() => { setWeekOffset(0); setMonthOffset(0); setSelectedDay(null); }}
            className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full uppercase"
          >Oggi</button>
          {/* View toggle */}
          <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg ml-1">
            {(['week', 'month'] as const).map(m => (
              <button key={m} onClick={() => { setViewMode(m); setSelectedDay(null); }}
                className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${viewMode === m ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm' : 'text-gray-400'}`}>
                {m === 'week' ? 'Sett.' : 'Mese'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Week view */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-7 gap-1 p-3">
          {weekDays.map((day, i) => {
            const dayDeals = dealsForDay(day);
            const isToday = isSameDay(day, today);
            const isSel = selectedDay && isSameDay(day, selectedDay);
            return (
              <button key={i} onClick={() => setSelectedDay(isSel ? null : day)}
                className={`flex flex-col items-center py-2.5 rounded-xl transition-all ${isSel ? 'bg-indigo-600' : isToday ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <span className={`text-[10px] font-black uppercase tracking-wide mb-1 ${isSel ? 'text-indigo-200' : 'text-gray-400'}`}>{DAYS_IT[i]}</span>
                <span className={`text-base font-black ${isSel ? 'text-white' : isToday ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-200'}`}>{day.getDate()}</span>
                <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center max-w-[36px]">
                  {dayDeals.slice(0, 3).map((d, j) => (
                    <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white/70' : stageDot[d.stage] ?? 'bg-gray-400'}`} />
                  ))}
                  {dayDeals.length > 3 && <span className={`text-[8px] font-black ${isSel ? 'text-white/70' : 'text-gray-400'}`}>+{dayDeals.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Month view */}
      {viewMode === 'month' && (
        <div className="p-3">
          <div className="grid grid-cols-7 mb-1">
            {DAYS_IT.map(d => <div key={d} className="text-center text-[9px] font-black text-gray-400 uppercase py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {monthDays.map((day, i) => {
              const dayDeals = dealsForDay(day);
              const inMonth = day.getMonth() === monthAnchor.getMonth();
              const isToday = isSameDay(day, today);
              const isSel = selectedDay && isSameDay(day, selectedDay);
              return (
                <button key={i} onClick={() => setSelectedDay(isSel ? null : day)}
                  className={`flex flex-col items-center py-1.5 rounded-lg transition-all min-h-[40px] ${isSel ? 'bg-indigo-600' : isToday ? 'bg-indigo-50 dark:bg-indigo-900/30' : inMonth ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''}`}>
                  <span className={`text-[11px] font-black ${isSel ? 'text-white' : isToday ? 'text-indigo-600' : inMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}>{day.getDate()}</span>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[30px]">
                    {dayDeals.slice(0, 2).map((d, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white/70' : stageDot[d.stage] ?? 'bg-gray-400'}`} />
                    ))}
                    {dayDeals.length > 2 && <span className={`text-[8px] font-black ${isSel ? 'text-white/70' : 'text-gray-400'}`}>+{dayDeals.length - 2}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day deals */}
      {selectedDay && (
        <div className="border-t border-gray-50 dark:border-gray-700 px-4 py-3 space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {selectedDeals.length === 0 && (
            <p className="text-xs text-gray-400 font-bold">Nessun deal in scadenza</p>
          )}
          {selectedDeals.map(deal => {
            const diff = Math.floor((deal.nextActionDeadline - Date.now()) / 86400000);
            return (
              <div key={deal.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stageDot[deal.stage] ?? 'bg-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black dark:text-white truncate">{contacts[deal.contactId]?.company ?? '—'}</p>
                  <p className="text-[10px] text-gray-400 truncate">{deal.nextAction || 'Nessuna azione'}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-black text-indigo-600">€{(deal.value / 1000).toFixed(0)}k</p>
                  <p className={`text-[9px] font-black ${diff < 0 ? 'text-red-500' : diff <= 3 ? 'text-yellow-500' : 'text-gray-400'}`}>
                    {diff < 0 ? `${Math.abs(diff)}gg fa` : diff === 0 ? 'oggi' : `+${diff}gg`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 px-5 pb-3 pt-1 flex-wrap border-t border-gray-50 dark:border-gray-700">
        {Object.entries({ lead: 'Lead', qualificato: 'Qualificato', proposta: 'Proposta', negoziazione: 'Trattativa' }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${stageDot[k]}`} />
            <span className="text-[9px] font-bold text-gray-400">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── helpers ────────────────────────────────────────────────────────────────

function daysDiff(ts: number): number {
  return Math.floor((ts - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

const ACTION_ICON: Record<NextActionType, React.ReactNode> = {
  chiama: <Phone size={13} />,
  email: <Mail size={13} />,
  'invia-offerta': <FileText size={13} />,
  'fissa-visita': <Calendar size={13} />,
  altro: <MoreHorizontal size={13} />,
};

const SNOOZE_DAYS = [1, 3, 7];

// ─── Coach suggestion ────────────────────────────────────────────────────────

function getCoachSuggestion(
  urgentDeals: Deal[],
  soonDeals: Deal[],
  totalPipeline: number,
  contacts: Record<string, { company: string }>
): string {
  if (urgentDeals.length === 0 && soonDeals.length === 0) {
    return `Pipeline in ordine 💪 Hai €${(totalPipeline / 1000).toFixed(0)}k in trattativa. Considera di aggiungere nuovi lead oggi.`;
  }
  if (urgentDeals.length > 0) {
    const top = urgentDeals[0];
    const company = contacts[top.contactId]?.company ?? 'un cliente';
    const overdue = Math.abs(daysDiff(top.nextActionDeadline));
    return `Hai ${urgentDeals.length} azione${urgentDeals.length > 1 ? 'i' : 'e'} scadut${urgentDeals.length > 1 ? 'e' : 'a'}. Priorità assoluta: ${top.nextAction || 'contatta'} ${company}${overdue > 0 ? ` (scaduta da ${overdue}gg)` : ''}.`;
  }
  const top = soonDeals[0];
  const company = contacts[top.contactId]?.company ?? 'un cliente';
  return `${soonDeals.length} azione${soonDeals.length > 1 ? 'i' : 'e'} in scadenza a breve. Inizia con ${company}: ${top.nextAction || 'prossima azione'}.`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DashboardProps {
  onNavigate?: (view: import('../types').NavView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { contacts, deals, offers, updateDeal, profile, addActivity } = useStore();

  const now = Date.now();
  const allDeals = Object.values(deals);
  const activeDeals = allDeals.filter(d => !['chiuso-vinto', 'chiuso-perso'].includes(d.stage));

  // KPI calculations
  const totalPipeline = activeDeals.reduce((s, d) => s + d.value, 0);
  const activeContacts = Object.values(contacts).length;
  const pendingOffers = Object.values(offers).filter(o => o.status === 'inviata').length;
  const wonDeals = allDeals.filter(d => d.stage === 'chiuso-vinto').length;

  // "Da fare oggi" buckets
  const urgentDeals = activeDeals
    .filter(d => d.nextActionDeadline && daysDiff(d.nextActionDeadline) < 0)
    .sort((a, b) => a.nextActionDeadline - b.nextActionDeadline);

  const soonDeals = activeDeals
    .filter(d => d.nextActionDeadline && daysDiff(d.nextActionDeadline) >= 0 && daysDiff(d.nextActionDeadline) <= 2)
    .sort((a, b) => a.nextActionDeadline - b.nextActionDeadline);

  const todayDeals = [...urgentDeals, ...soonDeals];

  // NextActionModal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDeal, setModalDeal] = useState<Deal | null>(null);
  const [activeDealForModal, setActiveDealForModal] = useState<Deal | null>(null);

  // OutcomeModal state
  const [outcomeDealId, setOutcomeDealId] = useState<string | null>(null);

  // ActionChoiceModal state
  const [actionChoiceOpen, setActionChoiceOpen] = useState(false);

  const handleDone = (deal: Deal) => {
    // Mark as done: open OutcomeModal first
    setActiveDealForModal(deal);
    setOutcomeDealId(deal.id);
  };

  const handleSnooze = (deal: Deal, days: number) => {
    const newDeadline = now + days * 24 * 60 * 60 * 1000;
    updateDeal(deal.id, { nextActionDeadline: newDeadline });
  };

  const handleOutcomeSave = (outcome: { outcomeType: ActivityOutcome; results: string }) => {
    if (!activeDealForModal) return;

    // 1. Create Activity record
    const activityType = activeDealForModal.nextActionType === 'chiama'
      ? 'chiamata'
      : activeDealForModal.nextActionType === 'email'
      ? 'email'
      : activeDealForModal.nextActionType === 'fissa-visita'
      ? 'visita'
      : 'nota';

    addActivity({
      id: `act_${Date.now()}`,
      contactId: activeDealForModal.contactId,
      dealId: activeDealForModal.id,
      type: activityType as any,
      date: now,
      outcome: 'completata',
      outcomeType: outcome.outcomeType,
      results: outcome.results,
      notes: outcome.results,
      createdAt: now,
    });

    // 2. Close outcome modal, open action choice modal
    setOutcomeDealId(null);
    setActionChoiceOpen(true);
  };

  const handleCloseActivity = () => {
    // Close action choice, clear next action deadline from deal, navigate to Attività view
    if (activeDealForModal) {
      updateDeal(activeDealForModal.id, { nextActionDeadline: 0 });
    }
    setActionChoiceOpen(false);
    setActiveDealForModal(null);
    onNavigate?.('attivita');
  };

  const handleSetNextAction = () => {
    // Close action choice, open next action modal
    setActionChoiceOpen(false);
    if (activeDealForModal) {
      setModalDeal(activeDealForModal);
      setModalOpen(true);
    }
  };

  const handleModalSave = (data: {
    nextAction: string;
    nextActionType: import('../types').NextActionType;
    nextActionDeadline: number;
    nextActionPriority: import('../types').NextActionPriority;
  }) => {
    if (modalDeal) {
      updateDeal(modalDeal.id, {
        nextAction: data.nextAction,
        nextActionType: data.nextActionType,
        nextActionDeadline: data.nextActionDeadline,
        nextActionPriority: data.nextActionPriority,
      });
    }
    setModalDeal(null);
    setModalOpen(false);
  };

  const coachMessage = getCoachSuggestion(urgentDeals, soonDeals, totalPipeline, contacts);

  return (
    <div className="space-y-8 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">
          {profile?.name ? `Ciao, ${profile.name.split(' ')[0]} 👋` : 'Dashboard'}
        </h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* ── Coach AI Card ── */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-yellow-300" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Coach del Giorno</span>
        </div>
        <p className="font-bold text-sm leading-relaxed">{coachMessage}</p>
      </div>

      {/* ── KPI chips ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-2xl p-4 text-center ${urgentDeals.length > 0 ? 'bg-red-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white'}`}>
          <p className="text-2xl font-black">{urgentDeals.length}</p>
          <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${urgentDeals.length > 0 ? 'text-red-100' : 'text-gray-400'}`}>Urgenti</p>
        </div>
        <div className={`rounded-2xl p-4 text-center ${soonDeals.length > 0 ? 'bg-yellow-400 text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white'}`}>
          <p className="text-2xl font-black">{soonDeals.length}</p>
          <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${soonDeals.length > 0 ? 'text-yellow-800' : 'text-gray-400'}`}>48 Ore</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-gray-800 dark:text-white">€{(totalPipeline / 1000).toFixed(0)}k</p>
          <p className="text-[9px] font-black uppercase tracking-widest mt-0.5 text-gray-400">Pipeline</p>
        </div>
      </div>

      {/* ── Da Fare Oggi ── */}
      {todayDeals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlarmClock size={14} className="text-red-500" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Da Fare Oggi</h2>
          </div>

          <div className="space-y-3">
            {todayDeals.map(deal => {
              const diff = daysDiff(deal.nextActionDeadline);
              const isOverdue = diff < 0;
              const company = contacts[deal.contactId]?.company ?? '—';

              return (
                <div
                  key={deal.id}
                  className={`rounded-2xl border-2 overflow-hidden ${
                    isOverdue
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10'
                  }`}
                >
                  {/* Card top */}
                  <div className="p-4">
                    {/* Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      {isOverdue ? (
                        <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                          URGENTE — FAI ORA
                        </span>
                      ) : (
                        <span className="bg-yellow-400 text-yellow-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                          ENTRO {diff === 0 ? 'OGGI' : `${diff + 1}GG`}
                        </span>
                      )}
                      <span className="text-[9px] text-gray-400 font-bold ml-auto">
                        {formatDate(deal.nextActionDeadline)}
                      </span>
                    </div>

                    {/* Company + action */}
                    <p className="font-black text-sm text-gray-900 dark:text-white">{company}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {deal.nextActionType && (
                        <span className="text-indigo-500">{ACTION_ICON[deal.nextActionType]}</span>
                      )}
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-bold truncate">
                        {deal.nextAction || 'Nessuna azione definita'}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      €{(deal.value / 1000).toFixed(0)}k · {deal.stage}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex border-t-2 border-current border-opacity-10 divide-x divide-current divide-opacity-10"
                    style={{ borderColor: isOverdue ? '#fca5a5' : '#fde68a' }}>
                    {/* ✓ Done */}
                    <button
                      onClick={() => handleDone(deal)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black transition-colors ${
                        isOverdue
                          ? 'text-red-600 hover:bg-red-100 dark:hover:bg-red-800/30'
                          : 'text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-800/20'
                      }`}
                    >
                      <CheckCircle2 size={14} /> Fatto
                    </button>

                    {/* Snooze chips */}
                    {SNOOZE_DAYS.map(days => (
                      <button
                        key={days}
                        onClick={() => handleSnooze(deal, days)}
                        className={`flex-1 py-3 text-xs font-black transition-colors ${
                          isOverdue
                            ? 'text-red-400 hover:bg-red-100 dark:hover:bg-red-800/30'
                            : 'text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-800/20'
                        }`}
                      >
                        +{days}gg
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Calendario Deal ── */}
      <DealCalendar deals={activeDeals} contacts={contacts} />

      {/* ── KPI cards ── */}
      <div>
        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Panoramica</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
            <Target className="text-indigo-600 mb-2" size={22} />
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Pipeline</h3>
            <p className="text-xl font-black dark:text-white tracking-tighter">€{totalPipeline.toLocaleString('it-IT')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
            <Users className="text-blue-600 mb-2" size={22} />
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Aziende</h3>
            <p className="text-xl font-black dark:text-white tracking-tighter">{activeContacts}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
            <Clock className="text-orange-600 mb-2" size={22} />
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Offerte Attive</h3>
            <p className="text-xl font-black dark:text-white tracking-tighter">{pendingOffers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
            <TrendingUp className="text-green-600 mb-2" size={22} />
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Vinte</h3>
            <p className="text-xl font-black dark:text-white tracking-tighter">{wonDeals}</p>
          </div>
        </div>
      </div>

      {/* ── Quick link to Pipeline ── */}
      {activeDeals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-700">
          <div>
            <p className="font-black text-sm dark:text-white">{activeDeals.length} deal attivi</p>
            <p className="text-[10px] text-gray-400 font-bold">Vai alla pipeline per gestirli</p>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </div>
      )}

      {/* OutcomeModal (when marking done) */}
      {outcomeDealId && activeDealForModal && (
        <OutcomeModal
          isOpen={!!outcomeDealId}
          onClose={() => setOutcomeDealId(null)}
          onSave={handleOutcomeSave}
          onSkip={() => {
            setOutcomeDealId(null);
            setActionChoiceOpen(true);
          }}
          companyName={contacts[activeDealForModal.contactId]?.company}
          previousAction={activeDealForModal.nextAction}
        />
      )}

      {/* ActionChoiceModal (after outcome is saved) */}
      <ActionChoiceModal
        isOpen={actionChoiceOpen}
        onClose={() => {
          setActionChoiceOpen(false);
          setActiveDealForModal(null);
        }}
        onCloseActivity={handleCloseActivity}
        onSetNextAction={handleSetNextAction}
        companyName={activeDealForModal ? contacts[activeDealForModal.contactId]?.company : undefined}
      />

      {/* NextActionModal (if user chooses to set next action) */}
      <NextActionModal
        isOpen={modalOpen}
        onClose={() => { setModalDeal(null); setModalOpen(false); }}
        onSave={handleModalSave}
        companyName={modalDeal ? contacts[modalDeal.contactId]?.company : undefined}
      />
    </div>
  );
};
