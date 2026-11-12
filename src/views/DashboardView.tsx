import { groupCustomerWork, todoDeadline, UNASSIGNED_CUSTOMER } from '../lib/customerWork';
import { useAuth } from '../lib/authContext';
import { useState } from 'react';
import { Panel } from '../components/ui/Syrio';
import { CustomerWorkMenu } from '../components/dashboard/CustomerWorkMenu';
import { useStore } from '../store/useStore';
import {
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  Zap,
  Phone,
  Mail,
  FileText,
  Calendar,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  Activity,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { Deal, NextActionType, ActivityOutcome } from '../types';
import { NextActionModal } from '../components/deals/NextActionModal';
import { OutcomeModal } from '../components/deals/OutcomeModal';
import { ActionChoiceModal } from '../components/deals/ActionChoiceModal';
import { selectVitality, selectProgression, selectWinRate, selectSilentContacts } from '../store/selectors';

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
    lead: 'bg-accent',
    qualificato: 'bg-accent',
    proposta: 'bg-warning',
    negoziazione: 'bg-accent',
  };

  return (
    <div className="bg-surface dark:bg-surface rounded-panel shadow-sm border border-line dark:border-line overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between px-4 pt-4 pb-3 border-b border-line">
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <Calendar size={14} className="text-accent" />
          <span className="text-xs font-semibold text-muted uppercase tracking-normal">Scadenze Deal</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <button
            onClick={() => viewMode === 'week' ? setWeekOffset(w => w - 1) : setMonthOffset(m => m - 1)}
            className="p-1 rounded-lg hover:bg-raised dark:hover:bg-raised text-muted transition-colors"
          ><ChevronLeft size={16} /></button>
          <span className="text-xs font-semibold dark:text-foreground min-w-[120px] text-center">
            {viewMode === 'week'
              ? `${weekDays[0].getDate()} ${MONTHS_IT[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTHS_IT[weekDays[6].getMonth()]}`
              : `${MONTHS_IT[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`
            }
          </span>
          <button
            onClick={() => viewMode === 'week' ? setWeekOffset(w => w + 1) : setMonthOffset(m => m + 1)}
            className="p-1 rounded-lg hover:bg-raised dark:hover:bg-raised text-muted transition-colors"
          ><ChevronRight size={16} /></button>
          <button
            onClick={() => { setWeekOffset(0); setMonthOffset(0); setSelectedDay(null); }}
            className="text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/30 px-2 py-1 rounded-full uppercase"
          >Oggi</button>
          {/* View toggle */}
          <div className="flex gap-0.5 bg-raised dark:bg-raised p-0.5 rounded-lg ml-1">
            {(['week', 'month'] as const).map(m => (
              <button key={m} onClick={() => { setViewMode(m); setSelectedDay(null); }}
                className={`px-2 py-1 rounded-md text-xs font-semibold uppercase transition-all ${viewMode === m ? 'bg-surface dark:bg-surface text-accent shadow-sm' : 'text-muted'}`}>
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
                className={`flex flex-col items-center py-2.5 rounded-xl transition-all ${isSel ? 'bg-action' : isToday ? 'bg-accent-soft dark:bg-accent-soft/30' : 'hover:bg-canvas dark:hover:bg-raised'}`}>
                <span className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isSel ? 'text-action-foreground' : 'text-muted'}`}>{DAYS_IT[i]}</span>
                <span className={`text-base font-semibold ${isSel ? 'text-action-foreground' : isToday ? 'text-accent' : 'text-foreground dark:text-muted'}`}>{day.getDate()}</span>
                <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center max-w-[36px]">
                  {dayDeals.slice(0, 3).map((d, j) => (
                    <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-surface/70' : stageDot[d.stage] ?? 'bg-raised'}`} />
                  ))}
                  {dayDeals.length > 3 && <span className={`text-xs font-semibold ${isSel ? 'text-action-foreground/70' : 'text-muted'}`}>+{dayDeals.length - 3}</span>}
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
            {DAYS_IT.map(d => <div key={d} className="text-center text-xs font-semibold text-muted uppercase py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {monthDays.map((day, i) => {
              const dayDeals = dealsForDay(day);
              const inMonth = day.getMonth() === monthAnchor.getMonth();
              const isToday = isSameDay(day, today);
              const isSel = selectedDay && isSameDay(day, selectedDay);
              return (
                <button key={i} onClick={() => setSelectedDay(isSel ? null : day)}
                  className={`flex flex-col items-center py-1.5 rounded-lg transition-all min-h-[40px] ${isSel ? 'bg-action' : isToday ? 'bg-accent-soft dark:bg-accent-soft/30' : inMonth ? 'hover:bg-canvas dark:hover:bg-raised' : ''}`}>
                  <span className={`text-xs font-semibold ${isSel ? 'text-action-foreground' : isToday ? 'text-accent' : inMonth ? 'text-foreground dark:text-muted' : 'text-muted dark:text-secondary'}`}>{day.getDate()}</span>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[30px]">
                    {dayDeals.slice(0, 2).map((d, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-surface/70' : stageDot[d.stage] ?? 'bg-raised'}`} />
                    ))}
                    {dayDeals.length > 2 && <span className={`text-xs font-semibold ${isSel ? 'text-action-foreground/70' : 'text-muted'}`}>+{dayDeals.length - 2}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day deals */}
      {selectedDay && (
        <div className="border-t border-line dark:border-line px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-normal">
            {selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {selectedDeals.length === 0 && (
            <p className="text-xs text-muted font-bold">Nessun deal in scadenza</p>
          )}
          {selectedDeals.map(deal => {
            const diff = Math.floor((deal.nextActionDeadline - Date.now()) / 86400000);
            return (
              <div key={deal.id} className="flex items-center gap-3 bg-canvas dark:bg-canvas rounded-md px-3 py-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stageDot[deal.stage] ?? 'bg-raised'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold dark:text-foreground truncate">{contacts[deal.contactId]?.company ?? '—'}</p>
                  <p className="text-xs text-muted truncate">{deal.nextAction || 'Nessuna azione'}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-semibold text-accent">€{(deal.value / 1000).toFixed(0)}k</p>
                  <p className={`text-xs font-semibold ${diff < 0 ? 'text-danger' : diff <= 3 ? 'text-warning' : 'text-muted'}`}>
                    {diff < 0 ? `${Math.abs(diff)}gg fa` : diff === 0 ? 'oggi' : `+${diff}gg`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 px-5 pb-3 pt-1 flex-wrap border-t border-line dark:border-line">
        {Object.entries({ lead: 'Lead', qualificato: 'Qualificato', proposta: 'Proposta', negoziazione: 'Trattativa' }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${stageDot[k]}`} />
            <span className="text-xs font-bold text-muted">{v}</span>
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
    return `Hai ${urgentDeals.length} azion${urgentDeals.length > 1 ? 'i' : 'e'} scadut${urgentDeals.length > 1 ? 'e' : 'a'}. Priorità assoluta: ${top.nextAction || 'contatta'} ${company}${overdue > 0 ? ` (scaduta da ${overdue}gg)` : ''}.`;
  }
  const top = soonDeals[0];
  const company = contacts[top.contactId]?.company ?? 'un cliente';
  return `${soonDeals.length} azion${soonDeals.length > 1 ? 'i' : 'e'} in scadenza a breve. Inizia con ${company}: ${top.nextAction || 'prossima azione'}.`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DashboardProps {
  onNavigate?: (view: import('../types').NavView) => void;
  onNavigateToContact?: (contactId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onNavigateToContact }) => {
  const storeState = useStore();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const workspace = user ? { id: `personal:${uid}` } : null;
  const { contacts, deals, offers, assets, updateDeal, profile, addActivity } = storeState;
  const vitality = selectVitality(storeState);
  const progression = selectProgression(storeState);
  const winRate = selectWinRate(storeState);
  const silentContacts = selectSilentContacts(storeState);

  const now = Date.now();
  const allDeals = Object.values(deals);
  const activeDeals = allDeals.filter(d => !['chiuso-vinto', 'chiuso-perso'].includes(d.stage));

  // KPI calculations
  const totalPipeline = activeDeals.reduce((s, d) => s + d.value, 0);
  const activeContacts = Object.values(contacts).length;
  const pendingOffers = Object.values(offers).filter(o => o.status === 'inviata').length;
  const wonDeals = allDeals.filter(d => d.stage === 'chiuso-vinto').length;
  const assetsDaSostituire = Object.values(assets || {}).filter(a => a.status === 'da-sostituire').length;
  const assetsInScadenza = Object.values(assets || {}).filter(a =>
    a.status === 'attivo' && a.expiryDate && a.expiryDate - now < 30 * 24 * 60 * 60 * 1000 && a.expiryDate > now
  ).length;

  // "Da fare oggi" buckets
  const urgentDeals = activeDeals
    .filter(d => d.nextActionDeadline && daysDiff(d.nextActionDeadline) < 0)
    .sort((a, b) => a.nextActionDeadline - b.nextActionDeadline);

  const soonDeals = activeDeals
    .filter(d => d.nextActionDeadline && daysDiff(d.nextActionDeadline) >= 0 && daysDiff(d.nextActionDeadline) <= 2)
    .sort((a, b) => a.nextActionDeadline - b.nextActionDeadline);

  const customerGroups = groupCustomerWork(contacts, activeDeals, Object.values(storeState.todos), Object.values(storeState.customerRequests).filter(request => request.workspaceId === workspace?.id && request.ownerId === uid));

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
    <div className="syrio-dashboard pb-8">

      <section className="syrio-hero flex flex-col justify-center">
        <p className="text-sm text-white/90 mb-3">{profile?.name ? `Buongiorno ${profile.name.split(' ')[0]}` : 'La tua giornata commerciale'}</p>
        <h1>I clienti da seguire, <span className="cockpit-hero-accent">a colpo d’occhio.</span></h1>
        <p className="text-sm text-white/80 mt-4">{customerGroups.filter(g=>g.id!==UNASSIGNED_CUSTOMER).length} clienti con un prossimo passo · {urgentDeals.length} azioni della pipeline scadute</p>
      </section>
      <section className="syrio-dashboard-kpis grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Panoramica commerciale">
        {[
          { label: 'Clienti in portafoglio', value: activeContacts.toLocaleString('it-IT'), icon: Users },
          { label: 'Opportunità attive', value: activeDeals.length.toLocaleString('it-IT'), icon: Target },
          { label: 'Valore pipeline', value: `€ ${totalPipeline.toLocaleString('it-IT')}`, icon: TrendingUp },
          { label: 'Offerte inviate', value: pendingOffers.toLocaleString('it-IT'), icon: FileText },
        ].map(({ label, value, icon: Icon }) => <Panel key={label} className="cockpit-kpi"><div className="cockpit-kpi-heading"><span>{label}</span><span className="cockpit-kpi-icon"><Icon size={18} /></span></div><p className="cockpit-kpi-value tabular-nums">{value}</p></Panel>)}
      </section>
      <section className="syrio-dashboard-actions">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3"><div><h2 className="text-lg font-semibold text-foreground">Clienti da seguire</h2><p className="text-xs text-muted mt-1">Apri un cliente per vedere insieme richieste e prossime azioni.</p></div><button onClick={()=>onNavigate?.('todo')} className="text-xs font-semibold text-accent">Vedi tutte le attività →</button></div>
      {customerGroups.length===0 ? <Panel className="p-5"><p className="text-sm text-muted">Nessun cliente ha attività aperte o prossime azioni. Aggiungi un’attività per iniziare.</p><button onClick={()=>onNavigate?.('todo')} className="text-accent text-sm mt-3">Apri To Do →</button></Panel> : <div className="space-y-3">{customerGroups.map((group,index)=><details key={group.id} className="customer-work-card bg-surface border border-line rounded-panel overflow-hidden" open={index===0}>
        <summary className="customer-work-heading cursor-pointer p-4 flex items-center gap-3"><span className="customer-work-avatar">{group.id===UNASSIGNED_CUSTOMER?'?':group.name.trim().charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block text-sm text-foreground">{group.name}</strong><span className="text-xs text-muted">{group.deals.length+group.todos.length+group.requests.length} {group.deals.length+group.todos.length+group.requests.length===1?'cosa da seguire':'cose da seguire'}</span></span><span className="text-xs font-semibold text-accent">Dettagli ▾</span><CustomerWorkMenu group={group} /></summary>
        <div className="px-4 pb-4 space-y-2"><div className="flex justify-end">{group.id!==UNASSIGNED_CUSTOMER&&<button className="text-xs font-semibold text-accent" onClick={()=>onNavigateToContact?.(group.id)}>Apri scheda cliente →</button>}</div>
        {group.todos.map(todo=><div key={todo.id} className="rounded-md border border-line p-3 flex items-start gap-3"><button type="button" aria-label={'Completa '+todo.titolo} onClick={()=>storeState.updateTodo(todo.id,{status:'fatto',completedAt:Date.now()})} className="mt-0.5 text-accent"><CheckCircle2 size={18}/></button><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{todo.titolo}</p><p className="text-xs text-muted mt-1">{Number.isFinite(todoDeadline(todo.scadenza))?'Scadenza '+new Date(todoDeadline(todo.scadenza)).toLocaleDateString('it-IT'):'Senza scadenza'} · {todo.priorita==='alta'?'Priorità alta':todo.priorita==='bassa'?'Priorità bassa':'Priorità normale'}</p></div><button onClick={()=>onNavigate?.('todo')} className="text-xs text-accent">To Do →</button></div>)}
        {group.requests.map(request=><div key={request.id} className="rounded-md border border-line p-3"><p className="text-sm font-semibold text-foreground">{request.nextAction || request.kind}</p><p className="text-xs text-muted mt-1">{request.category === 'after_sales' ? 'Post-vendita' : 'Marketing'} · {request.dueDate ? 'Scadenza ' + request.dueDate : 'Senza scadenza'}</p><button type="button" onClick={()=>onNavigateToContact?.(request.contactId)} className="text-xs text-accent mt-2">Apri richiesta nella scheda cliente →</button></div>)}
        {group.deals.map(deal=><div key={deal.id} className="rounded-md border border-line p-3"><div className="flex items-start gap-2"><span className="text-accent mt-0.5">{deal.nextActionType&&ACTION_ICON[deal.nextActionType]}</span><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground">{deal.nextAction}</p><p className="text-xs text-muted mt-1">Opportunità · {deal.nextActionDeadline?formatDate(deal.nextActionDeadline):'Senza scadenza'} · {deal.stage}</p></div></div><div className="flex flex-wrap gap-2 mt-3"><button onClick={()=>handleDone(deal)} className="text-xs font-semibold text-accent">Registra esito</button>{SNOOZE_DAYS.map(days=><button key={days} onClick={()=>handleSnooze(deal,days)} className="text-xs text-muted border border-line rounded px-2 py-1">+{days} gg</button>)}</div></div>)}
        </div></details>)}</div>}
      </section>
      <div className="cockpit-dashboard-calendar"><DealCalendar deals={activeDeals} contacts={contacts} /></div>
      <div className="syrio-dashboard-secondary space-y-5">
        <div className="grid lg:grid-cols-2 gap-5"><div className="space-y-5 min-w-0">      {/* ── Calendario Deal ── */}


      {/* ── Coach AI Card ── */}
      <div className="syrio-panel p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-warning" />
          <span className="text-xs font-semibold uppercase tracking-normal text-accent">Coach del Giorno</span>
        </div>
        <p className="font-bold text-sm leading-relaxed">{coachMessage}</p>
      </div>

</div><div className="space-y-5 min-w-0">      {/* ── Alert: Asset in scadenza / da sostituire ── */}
      {(assetsDaSostituire > 0 || assetsInScadenza > 0) && (
        <div className="space-y-2">
          {assetsDaSostituire > 0 && (
            <div className="bg-danger-soft dark:bg-danger-soft border-2 border-danger dark:border-danger rounded-panel px-4 py-3 flex items-center gap-3">
              <Package size={16} className="text-danger flex-shrink-0" />
              <p className="text-sm font-bold text-danger dark:text-danger flex-1">
                {assetsDaSostituire} asset da sostituire presso i clienti
              </p>
              <ChevronRight size={14} className="text-danger" />
            </div>
          )}
          {assetsInScadenza > 0 && (
            <div className="bg-warning-soft dark:bg-warning-soft border-2 border-warning dark:border-warning rounded-panel px-4 py-3 flex items-center gap-3">
              <AlertTriangle size={16} className="text-warning flex-shrink-0" />
              <p className="text-sm font-bold text-warning dark:text-warning flex-1">
                {assetsInScadenza} contratti in scadenza nei prossimi 30 giorni
              </p>
              <ChevronRight size={14} className="text-warning" />
            </div>
          )}
        </div>
      )}

      {/* ── Alert: Clienti silenti ── */}
      {silentContacts.length > 0 && (
        <div className="bg-warning-soft dark:bg-warning-soft border-2 border-warning dark:border-warning rounded-panel px-4 py-3 flex items-start gap-3">
          <Users size={16} className="text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning dark:text-warning">
              {silentContacts.length} clienti silenti (nessuna attività da 90+ giorni)
            </p>
            <p className="text-xs text-warning font-bold mt-0.5">
              {silentContacts.slice(0, 3).map(c => c.company).join(' · ')}{silentContacts.length > 3 ? ` +${silentContacts.length - 3}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* ── Metriche processo (Vitality / Progression / Win Rate) ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-accent" />
          <h2 className="text-xs font-semibold   text-muted">Salute Pipeline</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Vitality', value: vitality, target: 10, color: 'text-accent', bg: 'bg-accent-soft dark:bg-accent-soft/20', desc: '% nuovi 30gg' },
            { label: 'Progression', value: progression, target: 20, color: 'text-success', bg: 'bg-success-soft dark:bg-success-soft', desc: '% avanzati 30gg' },
            { label: 'Win Rate', value: winRate, target: 30, color: 'text-warning', bg: 'bg-warning-soft dark:bg-warning-soft', desc: '% vinti totali' },
          ].map(m => (
            <div key={m.label} className={`${m.bg} rounded-panel p-3 text-center`}>
              <p className={`text-xl font-semibold ${m.color}`}>{m.value}%</p>
              <p className="text-xs font-semibold uppercase tracking-normal text-muted mt-0.5">{m.label}</p>
              <p className="text-xs text-muted">{m.desc}</p>
              {m.value < m.target && (
                <p className={`text-xs font-semibold ${m.color} mt-0.5`}>T.{m.target}%</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI chips ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-panel p-4 text-center ${urgentDeals.length > 0 ? 'bg-danger-soft text-danger border border-danger/30' : 'bg-surface dark:bg-surface text-foreground dark:text-foreground'}`}>
          <p className="text-2xl font-semibold">{urgentDeals.length}</p>
          <p className={`text-xs font-semibold uppercase tracking-normal mt-0.5 ${urgentDeals.length > 0 ? 'text-danger' : 'text-muted'}`}>Urgenti</p>
        </div>
        <div className={`rounded-panel p-4 text-center ${soonDeals.length > 0 ? 'bg-warning-soft text-warning border border-warning/30' : 'bg-surface dark:bg-surface text-foreground dark:text-foreground'}`}>
          <p className="text-2xl font-semibold">{soonDeals.length}</p>
          <p className={`text-xs font-semibold uppercase tracking-normal mt-0.5 ${soonDeals.length > 0 ? 'text-warning' : 'text-muted'}`}>48 Ore</p>
        </div>
        <div className="bg-surface dark:bg-surface rounded-panel p-4 text-center">
          <p className="text-2xl font-semibold text-foreground dark:text-foreground">€{(totalPipeline / 1000).toFixed(0)}k</p>
          <p className="text-xs font-semibold uppercase tracking-normal mt-0.5 text-muted">Pipeline</p>
        </div>
      </div>

<Panel className="p-4"><p className="text-sm text-muted">Trattative vinte</p><p className="text-xl tabular-nums mt-1">{wonDeals}</p></Panel></div></div>
              {/* ── Quick link to Pipeline ── */}
      {activeDeals.length > 0 && (
        <button onClick={() => onNavigate?.('deals')} className="w-full bg-surface rounded-panel p-4 flex items-center justify-between border border-line text-left">
          <div>
            <p className="font-semibold text-sm dark:text-foreground">{activeDeals.length} deal attivi</p>
            <p className="text-xs text-muted font-bold">Vai alla pipeline per gestirli</p>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </button>
      )}


      </div>
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
