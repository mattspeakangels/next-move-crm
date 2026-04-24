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
} from 'lucide-react';
import { Deal, NextActionType } from '../types';
import { NextActionModal } from '../components/deals/NextActionModal';

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

export const Dashboard = () => {
  const { contacts, deals, offers, updateDeal, profile } = useStore();

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

  const handleDone = (deal: Deal) => {
    // Mark as done: open modal to set next action
    setModalDeal(deal);
    setModalOpen(true);
  };

  const handleSnooze = (deal: Deal, days: number) => {
    const newDeadline = now + days * 24 * 60 * 60 * 1000;
    updateDeal(deal.id, { nextActionDeadline: newDeadline });
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

      {/* NextActionModal (after marking done) */}
      <NextActionModal
        isOpen={modalOpen}
        onClose={() => { setModalDeal(null); setModalOpen(false); }}
        onSave={handleModalSave}
        companyName={modalDeal ? contacts[modalDeal.contactId]?.company : undefined}
      />
    </div>
  );
};
