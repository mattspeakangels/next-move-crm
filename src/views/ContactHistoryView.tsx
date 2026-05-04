import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useStoricoStore } from '../store/storicoStore';
import { Contact } from '../types';
import {
  ArrowLeft, Phone, Mail, MapPin, Video, Wrench, GraduationCap,
  MonitorPlay, FileText, TrendingUp, StickyNote,
  ShoppingCart, CheckCircle, XCircle, Send, Package
} from 'lucide-react';

// ── Tipi evento unificati ────────────────────────────────────────────────

type EventKind = 'attivita' | 'offerta' | 'ordine' | 'trattativa';

interface TimelineEvent {
  id: string;
  kind: EventKind;
  date: number;
  title: string;
  subtitle?: string;
  amount?: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

// ── Configurazioni ───────────────────────────────────────────────────────

const ACTIVITY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  visita:       { icon: <MapPin size={14} />,       color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/40',  label: 'Visita'        },
  chiamata:     { icon: <Phone size={14} />,         color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/40',    label: 'Chiamata'      },
  email:        { icon: <Mail size={14} />,          color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/40',      label: 'Email'         },
  nota:         { icon: <StickyNote size={14} />,    color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/40',  label: 'Nota'          },
  demo:         { icon: <MonitorPlay size={14} />,   color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/40',  label: 'Demo'          },
  'call-remota':{ icon: <Video size={14} />,         color: 'text-teal-600',   bg: 'bg-teal-100 dark:bg-teal-900/40',      label: 'Call Remota'   },
  sopralluogo:  { icon: <Wrench size={14} />,        color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/40',  label: 'Sopralluogo'   },
  formazione:   { icon: <GraduationCap size={14} />, color: 'text-pink-600',   bg: 'bg-pink-100 dark:bg-pink-900/40',      label: 'Formazione'    },
};

const OFFER_STATUS_CONFIG: Record<string, { icon: React.ReactNode; badge: string; badgeColor: string }> = {
  bozza:     { icon: <FileText size={14} />,    badge: 'Bozza',     badgeColor: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300' },
  inviata:   { icon: <Send size={14} />,         badge: 'Inviata',   badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  accettata: { icon: <CheckCircle size={14} />,  badge: 'Accettata', badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  rifiutata: { icon: <XCircle size={14} />,      badge: 'Rifiutata', badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

// ── Componente principale ────────────────────────────────────────────────

interface Props {
  contact: Contact;
  onBack: () => void;
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const ContactHistoryView: React.FC<Props> = ({ contact, onBack }) => {
  const { activities, offers, salesTransactions, deals } = useStore();
  const { clientiDettagliati } = useStoricoStore();
  const [filter, setFilter] = useState<'tutti' | EventKind>('tutti');

  // Match del cliente nel file storico tramite nome normalizzato
  const clienteStorico = useMemo(() => {
    const target = normalizeName(contact.company);
    return clientiDettagliati.find(c => normalizeName(c.nome) === target) ?? null;
  }, [clientiDettagliati, contact.company]);

  // ── Costruisce la timeline unificata ──

  const allEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Ordini dallo storico Excel (clientiDettagliati)
    if (clienteStorico) {
      clienteStorico.prodotti.forEach(prodotto => {
        prodotto.ordini.forEach(ordine => {
          const parts = ordine.date.split('-');
          let ts = Date.now();
          if (parts.length === 3) {
            const [dd, mm, yyyy] = parts;
            ts = new Date(`${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}T12:00:00`).getTime();
          }
          if (isNaN(ts)) return;
          events.push({
            id: `storico_${prodotto.itemId}_${ordine.date}_${ordine.amount}`,
            kind: 'ordine',
            date: ts,
            title: prodotto.nome,
            subtitle: ordine.quantity > 0
              ? `${ordine.quantity} pz · ${ordine.year}`
              : `${ordine.year}`,
            amount: ordine.amount,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
            icon: <Package size={14} />,
            badge: 'Storico',
            badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
          });
        });
      });
    }

    // Attività
    Object.values(activities)
      .filter(a => a.contactId === contact.id)
      .forEach(a => {
        const cfg = ACTIVITY_CONFIG[a.type] ?? ACTIVITY_CONFIG['nota'];
        events.push({
          id: a.id,
          kind: 'attivita',
          date: a.date,
          title: cfg.label,
          subtitle: a.notes || undefined,
          color: cfg.color,
          bgColor: cfg.bg,
          icon: cfg.icon,
          badge: a.outcomeType ?? (a.outcome !== 'da-fare' ? a.outcome : undefined),
        });
      });

    // Offerte
    Object.values(offers)
      .filter(o => o.contactId === contact.id)
      .forEach(o => {
        const cfg = OFFER_STATUS_CONFIG[o.status] ?? OFFER_STATUS_CONFIG['bozza'];
        events.push({
          id: o.id,
          kind: 'offerta',
          date: o.date,
          title: `Offerta N° ${o.offerNumber}`,
          subtitle: o.items.length > 0 ? `${o.items.length} articol${o.items.length === 1 ? 'o' : 'i'}` : undefined,
          amount: o.totalAmount,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
          icon: cfg.icon,
          badge: cfg.badge,
          badgeColor: cfg.badgeColor,
        });
      });

    // Ordini / Sales transactions
    Object.values(salesTransactions)
      .filter(t => t.contactId === contact.id)
      .forEach(t => {
        events.push({
          id: t.id,
          kind: 'ordine',
          date: t.date,
          title: t.productName,
          subtitle: `${t.quantity} pz × €${t.unitPrice.toFixed(2)}`,
          amount: t.totalAmount,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
          icon: <ShoppingCart size={14} />,
          badge: 'Ordine',
          badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        });
      });

    // Trattative (chiuse o in corso)
    Object.values(deals)
      .filter(d => d.contactId === contact.id)
      .forEach(d => {
        const isWon = d.stage === 'chiuso-vinto';
        const isLost = d.stage === 'chiuso-perso';
        if (!isWon && !isLost) return; // mostra solo chiuse
        events.push({
          id: d.id,
          kind: 'trattativa',
          date: d.closedAt ?? d.updatedAt,
          title: isWon ? 'Trattativa vinta' : 'Trattativa persa',
          subtitle: d.notes || undefined,
          amount: isWon ? d.value : undefined,
          color: isWon ? 'text-green-600' : 'text-red-500',
          bgColor: isWon ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
          icon: <TrendingUp size={14} />,
          badge: isWon ? 'Vinta' : 'Persa',
          badgeColor: isWon
            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        });
      });

    return events.sort((a, b) => b.date - a.date);
  }, [activities, offers, salesTransactions, deals, contact.id, clienteStorico]);

  const filtered = filter === 'tutti' ? allEvents : allEvents.filter(e => e.kind === filter);

  // ── Stats ──

  const stats = useMemo(() => {
    const acts = allEvents.filter(e => e.kind === 'attivita').length;
    const offs = allEvents.filter(e => e.kind === 'offerta').length;
    const ords = allEvents.filter(e => e.kind === 'ordine').length;
    const fatturato = allEvents
      .filter(e => e.kind === 'ordine' && e.amount)
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    return { acts, offs, ords, fatturato };
  }, [allEvents]);

  // ── Raggruppa per mese ──

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    filtered.forEach(ev => {
      const d = new Date(ev.date);
      const key = `${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-20">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black dark:text-white truncate">{contact.company}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400 font-bold">{contact.contactName && `${contact.contactName} · `}Storico completo</p>
            {clienteStorico && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Fatturato collegato
              </span>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full ${contact.status === 'cliente' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
          {contact.status === 'cliente' ? 'Cliente' : 'Prospect'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Attività', value: stats.acts, color: 'text-indigo-600' },
          { label: 'Offerte',  value: stats.offs, color: 'text-blue-600'   },
          { label: 'Ordini',   value: stats.ords, color: 'text-emerald-600'},
          { label: 'Fatturato', value: `€${stats.fatturato.toLocaleString('it-IT')}`, color: 'text-green-600', big: true },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <p className={`font-black ${s.big ? 'text-lg' : 'text-3xl'} ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'tutti',     label: `Tutti (${allEvents.length})` },
          { id: 'attivita',  label: `Attività (${stats.acts})`    },
          { id: 'offerta',   label: `Offerte (${stats.offs})`     },
          { id: 'ordine',    label: `Ordini (${stats.ords})`      },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide transition-all ${filter === f.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl">
          <p className="text-gray-300 dark:text-gray-600 font-black uppercase tracking-widest text-xs">Nessun evento registrato</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Aggiungi attività, offerte o ordini per questo cliente</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([month, events]) => (
            <div key={month}>
              {/* Month header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{month}</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                <span className="text-[9px] font-black text-gray-300">{events.length}</span>
              </div>

              {/* Events */}
              <div className="space-y-2">
                {events.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${ev.bgColor} ${ev.color}`}>
                      {ev.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm dark:text-white">{ev.title}</p>
                        {ev.badge && (
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${ev.badgeColor ?? 'bg-gray-100 text-gray-500'}`}>
                            {ev.badge}
                          </span>
                        )}
                      </div>
                      {ev.subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{ev.subtitle}</p>}
                      <p className="text-[10px] text-gray-300 dark:text-gray-500 font-bold mt-1">{fmt(ev.date)}</p>
                    </div>

                    {/* Amount */}
                    {ev.amount !== undefined && ev.amount > 0 && (
                      <div className="flex-shrink-0 text-right">
                        <p className="font-black text-sm text-green-600">€{ev.amount.toLocaleString('it-IT')}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
