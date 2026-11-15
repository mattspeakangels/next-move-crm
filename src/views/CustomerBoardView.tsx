import React, { useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, CheckCircle2, ChevronDown, Clock, FileText, Mail, Package, Palette, Phone, ShoppingCart, TrendingUp, User, XCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useCustomerBoard } from '../lib/customerBoard';
import { DEPARTMENTS, DEPARTMENT_LABEL, groupByMonth, type Department, type TimelineItem } from '../lib/customerBoardCore';
import { relativeTime, type LabEmail } from '../lib/labMailCore';

// "Attività con il cliente": una lavagna con tutto quello che è successo con un cliente —
// ultime email, interazioni dei reparti, offerte e ordini, lavori fatti insieme, storico.
// Solo laboratorio (si apre dalla casella Email).

const DEP_COLOR: Record<Department, string> = {
  commerciale: '#2bb3a3', customer_service: '#f59e0b', personalizzazione: '#a78bfa', generale: '#94a3b8',
};
const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', qualificato: 'Qualificato', proposta: 'Proposta', negoziazione: 'Negoziazione', 'chiuso-vinto': 'Vinta', 'chiuso-perso': 'Persa',
};
const KIND_ICON: Record<TimelineItem['kind'], typeof Mail> = {
  email: Mail, 'deal-new': Briefcase, 'deal-won': CheckCircle2, 'deal-lost': XCircle, offer: FileText, activity: Clock, order: ShoppingCart, work: Palette,
};
const euro = (n: number) => `€ ${n.toLocaleString('it-IT')}`;
const date = (ms: number) => new Date(ms).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

const Card: React.FC<{ title: string; icon: typeof Mail; children: React.ReactNode; className?: string; aside?: React.ReactNode }> = ({ title, icon: Icon, children, className = '', aside }) => (
  <section className={`bg-surface border border-line rounded-panel p-4 min-w-0 ${className}`}>
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon size={16} className="text-accent" />{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

const DepDot: React.FC<{ dep: Department | null }> = ({ dep }) => (
  <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dep ? DEP_COLOR[dep] : 'rgb(var(--syrio-line))' }} />
);

export const CustomerBoardView: React.FC<{ contactId: string | null; onBack: () => void; onOpenContact: (id: string) => void }> = ({ contactId, onBack, onOpenContact }) => {
  const contact = useStore(s => (contactId ? s.contacts[contactId] : undefined));
  const { board, loading } = useCustomerBoard(contactId);
  const [openMail, setOpenMail] = useState<string | null>(null);
  const [depFilter, setDepFilter] = useState<Department | 'tutti'>('tutti');
  const [showAll, setShowAll] = useState(false);
  const now = Date.now();

  const timeline = useMemo(() => {
    if (!board) return [];
    const items = board.timeline.filter(t => depFilter === 'tutti' || t.department === depFilter);
    return groupByMonth(showAll ? items : items.slice(0, 40));
  }, [board, depFilter, showAll]);
  const maxMonth = Math.max(1, ...(board?.months ?? []).map(m => DEPARTMENTS.reduce((s, d) => s + m.counts[d], 0)));
  const maxDep = Math.max(1, ...(board?.departments ?? []).map(d => d.interactions));
  const mailById = useMemo(() => new Map<string, LabEmail>((board?.latestEmails ?? []).map(m => [m.id, m])), [board]);

  if (!contactId || !contact) {
    return <div className="p-6 text-sm text-muted">Cliente non trovato. <button className="text-accent" onClick={onBack}>Torna indietro</button></div>;
  }
  const k = board?.kpi;
  const kpis = k ? [
    { label: 'Email scambiate', value: k.emails.toLocaleString('it-IT'), sub: `${k.conversations} conversazioni`, icon: Mail },
    { label: 'Ultimo contatto', value: k.lastContact ? relativeTime(k.lastContact, now) : '—', sub: k.lastContact ? date(k.lastContact) : 'mai', icon: Clock },
    { label: 'Opportunità aperte', value: String(k.openDeals), sub: euro(k.openValue), icon: TrendingUp },
    { label: 'Valore vinto', value: euro(k.wonValue), sub: 'opportunità chiuse vinte', icon: CheckCircle2 },
    { label: 'Ordini', value: String(k.orders), sub: 'ricevuti', icon: ShoppingCart },
    { label: 'Reclami', value: String(k.complaints), sub: k.complaints ? 'da tenere d’occhio' : 'nessuno', icon: AlertTriangle },
  ] : [];

  return (
    <div className="space-y-4 pb-10" data-testid="customer-board">
      <button onClick={onBack} className="text-xs text-accent flex items-center gap-1"><ArrowLeft size={14} />Indietro</button>

      <header className="bg-surface border border-line rounded-panel p-4 flex flex-wrap items-start gap-4">
        <span className="w-12 h-12 rounded-full bg-raised flex items-center justify-center text-lg font-semibold text-accent shrink-0">{contact.company.charAt(0)}</span>
        <div className="flex-1 min-w-[200px]">
          <p className="text-[11px] uppercase tracking-wide text-muted">Attività con il cliente</p>
          <h1 className="text-xl font-semibold text-foreground">{contact.company}</h1>
          <p className="text-xs text-secondary mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span className={`font-semibold ${contact.status === 'cliente' ? 'text-success' : 'text-accent'}`}>{contact.status === 'cliente' ? 'Cliente' : 'Prospect'}</span>
            {contact.contactName && <span><User size={11} className="inline mr-1" />{contact.contactName}{contact.role ? ` · ${contact.role}` : ''}</span>}
            {contact.email && <span><Mail size={11} className="inline mr-1" />{contact.email}</span>}
            {contact.phone && <span><Phone size={11} className="inline mr-1" />{contact.phone}</span>}
          </p>
        </div>
        <button onClick={() => onOpenContact(contact.id)} className="text-xs font-semibold border border-line rounded-md px-3 py-2 text-foreground">Scheda anagrafica →</button>
      </header>

      {loading && !board && <p className="text-sm text-muted">Caricamento dello storico…</p>}

      {board && <>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="bg-surface border border-line rounded-panel p-3">
              <p className="text-[11px] text-muted flex items-center justify-between">{label}<Icon size={14} className="text-accent" /></p>
              <p className="text-lg font-semibold text-foreground mt-1 tabular-nums truncate">{value}</p>
              <p className="text-[11px] text-muted truncate">{sub}</p>
            </div>
          ))}
        </div>

        <div className="grid xl:grid-cols-3 gap-4">
          <Card title="Ultime email" icon={Mail} className="xl:col-span-2">
            {board.latestEmails.length === 0 ? <p className="text-xs text-muted">Nessuna email con questo cliente.</p> : (
              <ul className="divide-y divide-line">
                {board.latestEmails.map(m => {
                  const open = openMail === m.id;
                  return (
                    <li key={m.id} className="py-2">
                      <button onClick={() => setOpenMail(open ? null : m.id)} className="w-full text-left flex items-start gap-3">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${m.direction === 'out' ? 'bg-raised text-secondary' : 'bg-success-soft text-success'}`}>{m.direction === 'out' ? 'Inviata' : 'Ricevuta'}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-foreground truncate">{m.subject}</span>
                          <span className="block text-xs text-muted truncate">{m.direction === 'out' ? `da ${m.from.name}` : `da ${m.from.name} a ${m.to[0]?.name ?? ''}`}{m.attachments.length ? ` · 📎 ${m.attachments.join(', ')}` : ''}</span>
                        </span>
                        <span className="text-[11px] text-muted shrink-0">{relativeTime(m.dateMs, now)}</span>
                        <ChevronDown size={14} className={`text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && <pre className="mt-2 ml-1 p-3 rounded-md bg-canvas whitespace-pre-wrap break-words font-sans text-xs text-foreground">{mailById.get(m.id)?.body}</pre>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Chi lo segue: i reparti" icon={User}>
            <ul className="space-y-3">
              {board.departments.filter(d => d.interactions > 0 || d.department !== 'generale').map(d => (
                <li key={d.department}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-foreground font-semibold"><DepDot dep={d.department} />{DEPARTMENT_LABEL[d.department]}</span>
                    <span className="text-muted tabular-nums">{d.interactions} {d.interactions === 1 ? 'email' : 'email'}</span>
                  </div>
                  <div className="h-2 rounded-full bg-raised mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(d.interactions / maxDep) * 100}%`, background: DEP_COLOR[d.department] }} />
                  </div>
                  <p className="text-[11px] text-muted mt-1 truncate">{d.people.length ? d.people.join(', ') : 'nessuna interazione'}{d.last ? ` · ultima ${relativeTime(d.last, now)}` : ''}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid xl:grid-cols-3 gap-4">
          <Card title="Andamento degli ultimi 6 mesi" icon={TrendingUp}>
            <div className="flex items-end gap-2 h-36" role="img" aria-label="Email per mese e per reparto">
              {board.months.map(m => {
                const total = DEPARTMENTS.reduce((s, d) => s + m.counts[d], 0);
                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] text-muted tabular-nums">{total || ''}</span>
                    <div className="w-full max-w-[34px] flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${(total / maxMonth) * 100}%`, minHeight: total ? 4 : 0 }}>
                      {DEPARTMENTS.map(d => m.counts[d] ? <div key={d} style={{ flex: m.counts[d], background: DEP_COLOR[d] }} title={`${DEPARTMENT_LABEL[d]}: ${m.counts[d]}`} /> : null)}
                    </div>
                    <span className="text-[10px] text-muted">{m.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">{DEPARTMENTS.map(d => <span key={d} className="text-[10px] text-muted flex items-center gap-1"><DepDot dep={d} />{DEPARTMENT_LABEL[d]}</span>)}</div>
          </Card>

          <Card title="Opportunità e offerte" icon={Briefcase} className="xl:col-span-2">
            {board.deals.length === 0 ? <p className="text-xs text-muted">Nessuna opportunità.</p> : (
              <ul className="grid sm:grid-cols-2 gap-2">
                {board.deals.slice(0, 8).map(d => (
                  <li key={d.id} className="rounded-md border border-line p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${d.stage === 'chiuso-vinto' ? 'bg-success-soft text-success' : d.stage === 'chiuso-perso' ? 'bg-danger-soft text-danger' : 'bg-raised text-accent'}`}>{STAGE_LABEL[d.stage] ?? d.stage}</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">{euro(d.value)}</span>
                    </div>
                    <p className="text-xs text-foreground mt-1.5 line-clamp-2">{(d.notes ?? '').split('\n')[0] || (d.products ?? []).join(', ')}</p>
                    <p className="text-[11px] text-muted mt-1">{d.offerRef ? `Offerta ${d.offerRef} · ` : ''}aperta il {date(d.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Ordini ricevuti" icon={Package}>
            {board.orders.length === 0 ? <p className="text-xs text-muted">Nessun ordine.</p> : (
              <ul className="space-y-2">{board.orders.slice(0, 8).map(o => (
                <li key={o.id} className="flex items-start gap-2 text-xs">
                  <ShoppingCart size={14} className="text-success mt-0.5 shrink-0" />
                  <span className="flex-1 min-w-0"><span className="block text-foreground truncate">{o.title}</span><span className="text-muted">{date(o.at)}{o.person ? ` · ${o.person}` : ''}</span></span>
                </li>))}</ul>
            )}
          </Card>
          <Card title="Lavori fatti insieme" icon={Palette}>
            {board.works.length === 0 ? <p className="text-xs text-muted">Nessuna personalizzazione.</p> : (
              <ul className="space-y-2">{board.works.slice(0, 8).map(w => (
                <li key={w.threadId} className="flex items-start gap-2 text-xs">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${w.approved ? 'bg-success-soft text-success' : 'bg-raised text-accent'}`}>{w.approved ? 'Approvato' : 'In corso'}</span>
                  <span className="flex-1 min-w-0"><span className="block text-foreground truncate">{w.subject}</span>
                    <span className="text-muted">{w.versions ? `${w.versions} ${w.versions === 1 ? 'versione' : 'versioni'} del rendering · ` : ''}{date(w.start)}{w.person ? ` · ${w.person}` : ''}</span></span>
                </li>))}</ul>
            )}
          </Card>
        </div>

        <Card title="Storico delle attività" icon={Clock} aside={
          <div className="flex flex-wrap gap-1">
            {(['tutti', ...DEPARTMENTS] as const).map(d => (
              <button key={d} onClick={() => setDepFilter(d)} className={`text-[11px] px-2 py-1 rounded-full border ${depFilter === d ? 'bg-action text-action-foreground border-transparent' : 'border-line text-secondary'}`}>
                {d === 'tutti' ? 'Tutti' : DEPARTMENT_LABEL[d]}
              </button>
            ))}
          </div>
        }>
          {timeline.length === 0 ? <p className="text-xs text-muted">Nessuna attività.</p> : timeline.map(g => (
            <div key={g.label} className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-2">{g.label}</p>
              <ol className="relative border-l border-line ml-2 space-y-3">
                {g.items.map(it => {
                  const Icon = KIND_ICON[it.kind];
                  return (
                    <li key={it.id} className="ml-4">
                      <span className="absolute -left-[9px] mt-0.5 w-[18px] h-[18px] rounded-full bg-surface border flex items-center justify-center" style={{ borderColor: it.department ? DEP_COLOR[it.department] : 'rgb(var(--syrio-line))' }}>
                        <Icon size={10} style={{ color: it.department ? DEP_COLOR[it.department] : undefined }} />
                      </span>
                      <p className="text-sm text-foreground">{it.title}</p>
                      <p className="text-[11px] text-muted">{date(it.at)}{it.department ? ` · ${DEPARTMENT_LABEL[it.department]}` : ''}{it.detail ? ` · ${it.detail}` : ''}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          {!showAll && board.timeline.filter(t => depFilter === 'tutti' || t.department === depFilter).length > 40 && (
            <button onClick={() => setShowAll(true)} className="text-xs font-semibold text-accent">Mostra tutto lo storico</button>
          )}
        </Card>
      </>}
    </div>
  );
};
