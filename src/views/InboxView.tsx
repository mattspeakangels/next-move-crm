import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Mail, MailOpen, Paperclip, Plug, RefreshCw, UserPlus, Users } from 'lucide-react';
import { useWorkspace } from '../lib/workspaceContext';
import { canManage } from '../lib/workspace';
import { markRead, simulateIncomingEmail, useContactRefs, useLabEmails, useMailboxes } from '../lib/labMail';
import { addressesFor, inboxFor, isUnread, matchContact, relativeTime, type LabEmail, type Mailbox } from '../lib/labMailCore';
import { useToast } from '../components/ui/ToastContext';

// Casella email del laboratorio: le email di competenza della persona, arrivate dal suo
// Outlook (simulato). I titolari possono guardare la casella di ogni collega.

type Filter = 'tutte' | 'da-leggere' | 'clienti' | 'prospect';
const PAGE = 40;

export const InboxView: React.FC<{ onNavigateToContact?: (id: string) => void }> = ({ onNavigateToContact }) => {
  const { uid, role, members } = useWorkspace();
  const { emails, loading, error } = useLabEmails();
  const mailboxes = useMailboxes();
  const contacts = useContactRefs();
  const { showToast } = useToast();
  const manager = canManage(role);
  const myBox = mailboxes.find(m => m.uid === uid);

  // 'me' = le mie email; 'team' = tutte; altrimenti id di una casella.
  const [scope, setScope] = useState<string>('me');
  useEffect(() => { if (!myBox && manager && scope === 'me' && mailboxes.length) setScope('team'); }, [myBox, manager, scope, mailboxes.length]);
  const [filter, setFilter] = useState<Filter>('tutte');
  const [openId, setOpenId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  const now = Date.now();

  const selectedBox = mailboxes.find(m => m.id === scope);
  const addresses = useMemo(() => {
    if (scope === 'me') return addressesFor(uid, role, mailboxes);
    if (scope === 'team') return mailboxes.map(m => m.address);
    return selectedBox ? [selectedBox.address] : [];
  }, [scope, uid, role, mailboxes, selectedBox]);

  const contactOf = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof matchContact>>();
    return (m: LabEmail) => { if (!cache.has(m.id)) cache.set(m.id, matchContact(m, contacts)); return cache.get(m.id) ?? null; };
  }, [contacts]);

  const list = useMemo(() => inboxFor(emails, addresses).filter(m => m.direction !== 'out').filter(m => {
    if (filter === 'da-leggere') return isUnread(m, uid);
    if (filter === 'clienti') return contactOf(m)?.status === 'cliente';
    if (filter === 'prospect') return contactOf(m)?.status === 'potenziale';
    return true;
  }), [emails, addresses, filter, uid, contactOf]);
  const unread = useMemo(() => inboxFor(emails, addresses).filter(m => m.direction !== 'out' && isUnread(m, uid)).length, [emails, addresses, uid]);

  const open = list.find(m => m.id === openId) ?? emails.find(m => m.id === openId) ?? null;
  const openMail = (m: LabEmail) => {
    setOpenId(m.id);
    if (isUnread(m, uid)) markRead(m.id, uid).catch(err => console.warn('Lettura non salvata:', err));
  };

  const simulate = async (kind: 'cliente' | 'potenziale') => {
    setBusy(true);
    try {
      const m = await simulateIncomingEmail(kind, mailboxes);
      showToast(`Nuova email da ${m.from.name} → ${m.to[0].email}`, 'success');
    } catch (e) { showToast(e instanceof Error ? e.message : 'Simulazione non riuscita', 'error'); }
    finally { setBusy(false); }
  };

  const memberName = (box: Mailbox) => members.find(m => m.uid === box.uid)?.displayName || box.displayName;
  const statusBox = scope === 'me' ? myBox : selectedBox;

  return (
    <div className="space-y-4 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Email</h1>
          <p className="text-xs text-muted mt-1">
            {scope === 'me' ? 'Le email di tua competenza' : scope === 'team' ? 'Tutte le caselle del team' : `Casella di ${selectedBox ? memberName(selectedBox) : '—'}`}
            {' · '}{unread} da leggere
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => simulate('cliente')} className="text-xs font-semibold border border-line rounded-md px-3 py-2 text-foreground disabled:opacity-50"><RefreshCw size={12} className="inline mr-1" />Simula email da cliente</button>
          <button disabled={busy} onClick={() => simulate('potenziale')} className="text-xs font-semibold border border-line rounded-md px-3 py-2 text-foreground disabled:opacity-50"><UserPlus size={12} className="inline mr-1" />Simula email da prospect</button>
        </div>
      </header>

      <div className="bg-surface border border-line rounded-panel p-3 flex flex-wrap items-center gap-3">
        <Plug size={16} className={statusBox ? 'text-success' : 'text-muted'} />
        <div className="text-xs flex-1 min-w-[180px]">
          {statusBox
            ? <><strong className="text-foreground">Outlook collegato</strong> · {statusBox.address} · sincronizzato {relativeTime(statusBox.lastSyncAt, now)} <span className="text-muted">(simulato)</span></>
            : scope === 'team' ? <><strong className="text-foreground">{mailboxes.filter(m => m.kind === 'personal').length} caselle Outlook collegate</strong> nel team più la casella generale <span className="text-muted">(simulate)</span></>
            : <span className="text-muted">Non hai una casella Outlook collegata in questo spazio: vedi la casella generale. Scegli un collega per vedere le sue email.</span>}
        </div>
        {(manager || !myBox) && (
          <label className="text-xs flex items-center gap-2"><Users size={14} className="text-muted" />
            <select value={scope} onChange={e => { setScope(e.target.value); setOpenId(null); setShown(PAGE); }} className="bg-canvas border border-line rounded px-2 py-1 text-foreground">
              <option value="me">Le mie email</option>
              {manager && <option value="team">Tutto il team</option>}
              {manager && mailboxes.filter(m => m.kind === 'personal').map(b => <option key={b.id} value={b.id}>{memberName(b)}</option>)}
              {manager && mailboxes.filter(m => m.kind === 'shared').map(b => <option key={b.id} value={b.id}>Casella generale ({b.address})</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="flex gap-2 flex-wrap" role="tablist">
        {(['tutte', 'da-leggere', 'clienti', 'prospect'] as Filter[]).map(f => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => { setFilter(f); setShown(PAGE); }}
            className={`text-xs px-3 py-1.5 rounded-full border ${filter === f ? 'bg-action text-action-foreground border-transparent' : 'border-line text-secondary'}`}>
            {{ tutte: 'Tutte', 'da-leggere': 'Da leggere', clienti: 'Clienti', prospect: 'Prospect' }[f]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger">Email non caricate: {error}</p>}

      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        <ul className={`bg-surface border border-line rounded-panel divide-y divide-line overflow-hidden ${open ? 'hidden lg:block' : ''}`}>
          {loading && <li className="p-4 text-sm text-muted">Caricamento…</li>}
          {!loading && list.length === 0 && <li className="p-6 text-sm text-muted text-center">Nessuna email qui.</li>}
          {list.slice(0, shown).map(m => {
            const c = contactOf(m);
            const unreadMail = isUnread(m, uid);
            return (
              <li key={m.id}>
                <button onClick={() => openMail(m)} className={`w-full text-left p-3 flex gap-3 hover:bg-raised ${openId === m.id ? 'bg-raised' : ''}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${unreadMail ? 'bg-accent' : 'bg-transparent'}`} aria-label={unreadMail ? 'Da leggere' : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`text-sm truncate ${unreadMail ? 'font-semibold text-foreground' : 'text-secondary'}`}>{m.from.name}</span>
                      <span className="text-[11px] text-muted shrink-0">{relativeTime(m.dateMs, now)}</span>
                    </span>
                    <span className="block text-sm text-foreground truncate">{m.subject}</span>
                    <span className="flex items-center gap-2 mt-1">
                      {c ? <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.status === 'cliente' ? 'bg-success-soft text-success' : 'bg-raised text-accent'}`}>{c.status === 'cliente' ? 'Cliente' : 'Prospect'} · {c.company}</span>
                        : <span className="text-[10px] text-muted">Mittente non in anagrafica</span>}
                      {m.attachments.length > 0 && <Paperclip size={11} className="text-muted" />}
                      {m.simulatedLive && <span className="text-[10px] text-accent">nuova</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {list.length > shown && <li><button onClick={() => setShown(s => s + PAGE)} className="w-full p-3 text-xs font-semibold text-accent">Mostra altre ({list.length - shown})</button></li>}
        </ul>

        {open ? (
          <article className="bg-surface border border-line rounded-panel p-4 space-y-3 min-w-0">
            <button onClick={() => setOpenId(null)} className="lg:hidden text-xs text-accent flex items-center gap-1"><ArrowLeft size={14} />Torna alla lista</button>
            <h2 className="text-base font-semibold text-foreground break-words">{open.subject}</h2>
            <div className="text-xs text-secondary space-y-0.5">
              <p><strong>Da:</strong> {open.from.name} &lt;{open.from.email}&gt;</p>
              <p><strong>A:</strong> {open.to.map(a => a.email).join(', ')}</p>
              {open.cc.length > 0 && <p><strong>Cc:</strong> {open.cc.map(a => a.email).join(', ')}</p>}
              <p>{new Date(open.dateMs).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}</p>
            </div>
            {(() => {
              const c = contactOf(open);
              return c ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-line p-2">
                  <span className="text-xs text-foreground">{c.status === 'cliente' ? 'Cliente' : 'Prospect'}: <strong>{c.company}</strong></span>
                  <button onClick={() => onNavigateToContact?.(c.id)} className="text-xs font-semibold text-accent">Apri scheda →</button>
                </div>
              ) : <p className="text-xs text-muted">Il mittente non è in anagrafica.</p>;
            })()}
            {open.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">{open.attachments.map(a => <span key={a} className="text-xs border border-line rounded px-2 py-1 text-secondary"><Paperclip size={11} className="inline mr-1" />{a}</span>)}</div>
            )}
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground leading-relaxed">{open.body}</pre>
          </article>
        ) : (
          <div className="hidden lg:flex bg-surface border border-dashed border-line rounded-panel p-8 items-center justify-center text-sm text-muted">
            <MailOpen size={18} className="mr-2" />Seleziona una email
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted flex items-center gap-1"><Mail size={11} />Laboratorio: caselle e messaggi sono simulati, nessuna email reale viene letta o inviata.</p>
    </div>
  );
};
