import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useStoricoStore } from '../store/storicoStore';
import { useToast } from '../components/ui/ToastContext';
import { QuickLogModal } from '../components/activities/QuickLogModal';
import { Contact, Activity, Offer, SalesTransaction } from '../types';
import { blakladerUrl } from '../lib/blaklader';
import {
  ArrowLeft, Phone, Mail, MapPin, Video, Wrench, GraduationCap,
  MonitorPlay, FileText, TrendingUp, StickyNote,
  ShoppingCart, CheckCircle, XCircle, Send, Package, Plus, Trash2, ChevronDown,
} from 'lucide-react';

// ── Tipi evento unificati ────────────────────────────────────────────────

type EventKind = 'attivita' | 'offerta' | 'ordine' | 'trattativa' | 'email';

interface TimelineEvent {
  id: string;
  kind: EventKind;
  date: number;
  title: string;
  subtitle?: string;
  itemId?: string; // codice articolo Blåkläder → link al sito
  amount?: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  /** Oggetto originale (activity / offer / salesTransaction) usato per il dettaglio espanso al click. */
  raw?: Activity | Offer | SalesTransaction;
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
  return s
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parole da ignorare nel confronto (forme societarie, articoli, ecc.)
const STOPWORDS = new Set(['SRL', 'SNC', 'SPA', 'SS', 'DI', 'DEL', 'DELLA', 'DELLE', 'DEI', 'DEGLI', 'IT', 'SA', 'SAL']);

function matchWords(a: string, b: string): number {
  const words = (s: string) => normalizeName(s).split(' ').filter(w => w.length >= 3 && !STOPWORDS.has(w));
  const wa = words(a);
  const wb = words(b);
  return wa.filter(w => wb.includes(w)).length;
}

export const ContactHistoryView: React.FC<Props> = ({ contact, onBack }) => {
  const { activities, offers, salesTransactions, deals, products, addActivity, deleteActivity } = useStore();
  const { showToast } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { clientiDettagliati } = useStoricoStore();

  // Mappa codice prodotto → nome leggibile dal catalogo
  const productNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    Object.values(products).forEach(p => {
      if (p.code) map.set(p.code.trim(), p.name || p.description || p.code);
    });
    return map;
  }, [products]);
  const [filter, setFilter] = useState<'tutti' | EventKind>('tutti');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Match del cliente nel file storico tramite nome normalizzato
  const clienteStorico = useMemo(() => {
    const target = normalizeName(contact.company);
    // 1. Match esatto
    const exact = clientiDettagliati.find(c => normalizeName(c.nome) === target);
    if (exact) return exact;
    // 2. Match parziale (uno contiene l'altro, min 6 caratteri)
    if (target.length >= 6) {
      const partial = clientiDettagliati.find(c => {
        const n = normalizeName(c.nome);
        return n.length >= 6 && (n.includes(target) || target.includes(n));
      });
      if (partial) return partial;
    }
    // 3. Match per parole significative (≥2 parole chiave in comune, esclude forme societarie)
    const byWords = clientiDettagliati
      .map(c => ({ c, score: matchWords(contact.company, c.nome) }))
      .filter(x => x.score >= 2)
      .sort((a, b) => b.score - a.score);
    return byWords[0]?.c ?? null;
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
          const displayName = prodotto.itemId !== 'ALL'
            ? (productNameByCode.get(prodotto.itemId) ?? `Art. ${prodotto.itemId}`)
            : prodotto.nome;
          events.push({
            id: `storico_${prodotto.itemId}_${ordine.date}_${ordine.amount}`,
            kind: 'ordine',
            date: ts,
            title: displayName,
            itemId: prodotto.itemId !== 'ALL' ? prodotto.itemId : undefined,
            subtitle: ordine.quantity > 0
              ? `${ordine.quantity} pz · ${ordine.year}`
              : String(ordine.year),
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
          kind: a.type === 'email' ? 'email' : 'attivita',
          date: a.date,
          title: cfg.label,
          subtitle: a.notes || undefined,
          color: cfg.color,
          bgColor: cfg.bg,
          icon: cfg.icon,
          badge: a.outcomeType ?? (a.outcome !== 'da-fare' ? a.outcome : undefined),
          raw: a,
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
          raw: o,
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
          raw: t,
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
    const emails = allEvents.filter(e => e.kind === 'email').length;
    const fatturato = allEvents
      .filter(e => e.kind === 'ordine' && e.amount)
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    return { acts, offs, ords, emails, fatturato };
  }, [allEvents]);

  // ── Aggiunta/eliminazione email dallo storico ──

  const handleSaveEmail =(type: 'chiamata' | 'email' | 'visita' | 'visita-freddo' | 'nota' | 'demo' | 'call-remota' | 'sopralluogo' | 'formazione' | 'smart-working' | 'ufficio', notes: string) => {
    if (!notes.trim()) return;
    addActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      contactId: contact.id,
      type,
      date: Date.now(),
      outcome: 'fatto',
      notes,
      createdAt: Date.now(),
    });
    showToast('Email registrata', 'success');
  };

  const handleDeleteEmail = (id: string) => {
    if (!window.confirm('Eliminare questa email dallo storico?')) return;
    deleteActivity(id);
    showToast('Email eliminata', 'success');
  };

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

  // ── Dettaglio evento espanso (contenuto completo al click) ──

  const renderEventDetail = (ev: TimelineEvent) => {
    if (ev.kind === 'attivita' || ev.kind === 'email') {
      const a = ev.raw as Activity | undefined;
      if (!a) return null;
      return (
        <div className="space-y-2">
          {a.notes ? (
            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{a.notes}</p>
          ) : (
            <p className="text-xs text-gray-300 italic">Nessuna nota</p>
          )}
          {a.results && (
            <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-black uppercase text-[9px] text-gray-400">Esito: </span>{a.results}</p>
          )}
          {a.endDate && (
            <p className="text-[10px] text-gray-400">Fine: {fmt(a.endDate)}</p>
          )}
          {a.transcript && (
            <details className="text-xs">
              <summary className="cursor-pointer font-black text-[9px] uppercase text-gray-400">Trascrizione</summary>
              <p className="mt-1 whitespace-pre-wrap text-gray-500 dark:text-gray-400">{a.transcript}</p>
            </details>
          )}
        </div>
      );
    }

    if (ev.kind === 'offerta') {
      const o = ev.raw as Offer | undefined;
      if (!o) return null;
      return (
        <div className="space-y-2">
          {o.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[9px] font-black uppercase text-gray-400 text-left">
                    <th className="pb-1 pr-2">Articolo</th>
                    <th className="pb-1 pr-2">Taglie</th>
                    <th className="pb-1 pr-2 text-right">Qtà</th>
                    <th className="pb-1 pr-2 text-right">Prezzo</th>
                    <th className="pb-1 pr-2 text-right">Sconto</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map(it => (
                    <tr key={it.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="py-1 pr-2 text-gray-700 dark:text-gray-300">{it.description}</td>
                      <td className="py-1 pr-2 text-gray-400">{it.sizes || '—'}</td>
                      <td className="py-1 pr-2 text-right text-gray-500">{it.quantity}</td>
                      <td className="py-1 pr-2 text-right text-gray-500">€{it.price.toFixed(2)}</td>
                      <td className="py-1 pr-2 text-right text-gray-500">{it.discount ? `${it.discount}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-300 italic">Nessun articolo</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400 pt-1">
            {o.deliveryTime && <span>Consegna: {o.deliveryTime}</span>}
            {o.shippingCost !== undefined && o.shippingCost > 0 && <span>Spedizione: €{o.shippingCost.toFixed(2)}</span>}
            {o.followUpDate > 0 && <span>Follow-up: {fmt(o.followUpDate)}</span>}
          </div>
          {o.pdfUrl && (
            <a
              href={o.pdfUrl}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-black text-indigo-500 hover:text-indigo-700 hover:underline"
            >
              <FileText size={12} /> {o.pdfName || 'Apri PDF'}
            </a>
          )}
        </div>
      );
    }

    if (ev.kind === 'ordine' && ev.raw && 'unitPrice' in (ev.raw as any)) {
      const t = ev.raw as SalesTransaction;
      return t.notes ? (
        <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{t.notes}</p>
      ) : (
        <p className="text-xs text-gray-300 italic">Nessuna nota</p>
      );
    }

    // Ordini dallo storico Excel: già tutto visibile nella riga (nessun dettaglio aggiuntivo)
    return null;
  };

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

      {showEmailModal && (
        <QuickLogModal
          companyName={contact.company}
          onClose={() => setShowEmailModal(false)}
          onSave={handleSaveEmail}
        />
      )}

      {/* Filtri */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {([
            { id: 'tutti',     label: `Tutti (${allEvents.length})` },
            { id: 'attivita',  label: `Attività (${stats.acts})`    },
            { id: 'offerta',   label: `Offerte (${stats.offs})`     },
            { id: 'ordine',    label: `Ordini (${stats.ords})`      },
            { id: 'email',     label: `Email (${stats.emails})`     },
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
        <button
          onClick={() => setShowEmailModal(true)}
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          <Plus size={12} /> Aggiungi email
        </button>
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
                {events.map(ev => {
                  const detail = renderEventDetail(ev);
                  const isExpanded = expandedId === ev.id;
                  const isClickable = !!detail;
                  return (
                    <div
                      key={ev.id}
                      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden ${isClickable ? 'cursor-pointer' : ''}`}
                      onClick={() => isClickable && setExpandedId(isExpanded ? null : ev.id)}
                    >
                      <div className="p-4 flex items-start gap-3">
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
                          {(ev.subtitle || ev.itemId) && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              {ev.itemId && (
                                <a
                                  href={blakladerUrl(ev.itemId)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="font-mono font-black text-indigo-500 hover:text-indigo-700 hover:underline"
                                >
                                  {ev.itemId} ↗
                                </a>
                              )}
                              {ev.itemId && ev.subtitle && <span className="text-gray-300">·</span>}
                              {ev.subtitle && <span>{ev.subtitle}</span>}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-300 dark:text-gray-500 font-bold mt-1">{fmt(ev.date)}</p>
                        </div>

                        {/* Amount */}
                        {ev.amount !== undefined && ev.amount > 0 && (
                          <div className="flex-shrink-0 text-right">
                            <p className="font-black text-sm text-green-600">€{ev.amount.toLocaleString('it-IT')}</p>
                          </div>
                        )}

                        {/* Chevron dettaglio */}
                        {isClickable && (
                          <ChevronDown
                            size={14}
                            className={`flex-shrink-0 text-gray-300 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        )}

                        {/* Elimina (solo email) */}
                        {ev.kind === 'email' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteEmail(ev.id); }}
                            className="p-1 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
                            title="Elimina email"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Dettaglio espanso */}
                      {isExpanded && detail && (
                        <div
                          className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700"
                          onClick={e => e.stopPropagation()}
                        >
                          {detail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
