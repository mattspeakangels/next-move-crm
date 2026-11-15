import React, { useMemo } from 'react';
import { Mail } from 'lucide-react';
import { useWorkspace } from '../../lib/workspaceContext';
import { useContactRefs, useLabEmails, useMailboxes } from '../../lib/labMail';
import { addressesFor, inboxFor, isUnread, matchContact, relativeTime } from '../../lib/labMailCore';

// "Email in arrivo" nella Panoramica di Oggi (solo laboratorio): le ultime email di
// competenza della persona, arrivate dal suo Outlook simulato.
export const LabInboxPreview: React.FC<{ onOpenInbox: () => void }> = ({ onOpenInbox }) => {
  const { uid, role } = useWorkspace();
  const { emails, loading } = useLabEmails();
  const mailboxes = useMailboxes();
  const contacts = useContactRefs();
  const mine = useMemo(() => inboxFor(emails, addressesFor(uid, role, mailboxes)).filter(m => m.direction !== 'out'), [emails, uid, role, mailboxes]);
  const unread = mine.filter(m => isUnread(m, uid));
  const now = Date.now();
  const latest = (unread.length ? unread : mine).slice(0, 5);

  return (
    <section className="bg-surface border border-line rounded-panel p-4" aria-label="Email in arrivo" data-testid="lab-inbox-preview">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Mail size={16} className="text-accent" />Email in arrivo
          {unread.length > 0 && <span className="text-[11px] font-semibold bg-accent text-white rounded-full px-2 py-0.5">{unread.length} da leggere</span>}
        </h2>
        <button onClick={onOpenInbox} className="text-xs font-semibold text-accent">Apri Email →</button>
      </div>
      {loading ? <p className="text-xs text-muted">Caricamento…</p>
        : latest.length === 0 ? <p className="text-xs text-muted">Nessuna email di tua competenza.</p>
        : <ul className="space-y-2">{latest.map(m => {
            const c = matchContact(m, contacts);
            return (
              <li key={m.id}>
                <button onClick={onOpenInbox} className="w-full text-left rounded-md border border-line p-2.5 hover:bg-raised">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${isUnread(m, uid) ? 'font-semibold text-foreground' : 'text-secondary'}`}>{m.subject}</span>
                    <span className="text-[11px] text-muted shrink-0">{relativeTime(m.dateMs, now)}</span>
                  </span>
                  <span className="block text-xs text-muted truncate">{m.from.name}{c ? ` · ${c.status === 'cliente' ? 'Cliente' : 'Prospect'} ${c.company}` : ''}</span>
                </button>
              </li>
            );
          })}</ul>}
    </section>
  );
};
