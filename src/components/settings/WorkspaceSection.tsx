import React, { useEffect, useState } from 'react';
import { Building2, Copy, Mail, Send, UserPlus, X } from 'lucide-react';
import { useWorkspace } from '../../lib/workspaceContext';
import {
  ASSIGNABLE_ROLES, ROLE_LABELS, canManage, cancelInvite, createInvite, renameWorkspace,
  setWorkspaceOutlookClientId, updateMember, watchInvites, type Invite, type Member, type WorkspaceRole,
} from '../../lib/workspace';
import { useToast } from '../ui/ToastContext';
import { confirmAction } from '../ui/Feedback';
import { Button, Field } from '../ui/Syrio';

const selectClass =
  'bg-raised border border-line rounded-lg px-2 py-1.5 text-sm text-foreground disabled:opacity-60';

// Cosa trova ogni mansione appena entra (stessa logica di src/lib/navSections.ts)
const ROLE_HINT: Partial<Record<WorkspaceRole, string>> = {
  admin: 'tutto, compreso questo pannello',
  sales: 'clienti, opportunità, agenda, mappa e analisi',
  customer_service: 'clienti, agenda e offerte',
  marketing: 'clienti, mappa e analisi',
  accounting: 'offerte e ordini, analisi e clienti',
  graphics: 'clienti (richieste e post-vendita) e offerte',
};

const appUrl = () => window.location.origin;

/** Testo dell'invito, da mandare con la propria posta o da copiare. */
function inviteMessage(inv: Invite): { subject: string; body: string } {
  const who = inv.name ? `Ciao ${inv.name},` : 'Ciao,';
  return {
    subject: `Invito a ${inv.workspaceName} su SYRIO`,
    body: `${who}\n\nti ho aggiunto allo spazio aziendale «${inv.workspaceName}» su SYRIO come ${ROLE_LABELS[inv.role]}.\n\n`
      + `1. Apri ${appUrl()}\n2. Accedi con questo indirizzo email: ${inv.email} (con Google o creando la password)\n`
      + `3. Troverai già pronte le sezioni del tuo lavoro.\n\n`
      + `Se usi Outlook, puoi collegarlo da Impostazioni → Il mio Outlook.\n`,
  };
}

/** Pannello Team: spazio aziendale, collaboratori, inviti e Outlook dell'azienda (Impostazioni). */
export const WorkspaceSection: React.FC = () => {
  const { workspace, role, members, uid } = useWorkspace();
  const { showToast } = useToast();
  const manage = canManage(role);
  const [name, setName] = useState(workspace?.name ?? '');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [personName, setPersonName] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('sales');
  const [clientId, setClientId] = useState(workspace?.outlookClientId ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(workspace?.name ?? ''), [workspace?.name]);
  useEffect(() => setClientId(workspace?.outlookClientId ?? ''), [workspace?.outlookClientId]);
  useEffect(() => {
    if (!workspace || !manage) return;
    return watchInvites(workspace.id, setInvites);
  }, [workspace, manage]);

  if (!workspace) return null;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      showToast(ok, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Operazione non riuscita', 'error');
    } finally {
      setBusy(false);
    }
  };

  // Chi non gestisce il team vede solo il proprio spazio e la propria mansione
  if (!manage) {
    return (
      <div className="bg-surface rounded-panel p-6 border border-line space-y-1">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-accent" />
          <h2 className="text-xs font-semibold text-secondary">Spazio aziendale</h2>
        </div>
        <p className="text-sm font-semibold text-foreground">{workspace.name}</p>
        {role && <p className="text-xs text-muted">La tua mansione: {ROLE_LABELS[role]}{ROLE_HINT[role] ? ` · vedi ${ROLE_HINT[role]}` : ''}</p>}
      </div>
    );
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const me = members.find(m => m.uid === uid);
    void run(async () => {
      if (members.some(m => m.email === email.trim().toLowerCase())) throw new Error('Questa persona fa già parte dello spazio.');
      await createInvite(workspace, email, inviteRole, me?.email || uid, personName);
      setEmail(''); setPersonName('');
    }, 'Invito pronto: mandalo con «Invia email» o copia il messaggio');
  };

  const handleStatus = async (m: Member) => {
    const disabling = m.status === 'active';
    if (disabling && !await confirmAction(`Disattivare l'accesso di ${m.displayName}? Non vedrà più i dati dello spazio.`)) return;
    void run(() => updateMember(workspace.id, m.uid, { status: disabling ? 'disabled' : 'active' }),
      disabling ? 'Accesso disattivato' : 'Accesso riattivato');
  };

  const mailto = (inv: Invite) => {
    const { subject, body } = inviteMessage(inv);
    return `mailto:${inv.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const copyInvite = async (inv: Invite) => {
    const { subject, body } = inviteMessage(inv);
    try { await navigator.clipboard.writeText(`${subject}\n\n${body}`); showToast('Messaggio di invito copiato', 'success'); }
    catch { showToast('Copia non riuscita: usa «Invia email»', 'error'); }
  };

  const activeCount = members.filter(m => m.status === 'active').length;

  return (
    <div className="bg-surface rounded-panel p-4 sm:p-6 border border-line space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Building2 size={16} className="text-accent" />
        <h2 className="text-xs font-semibold text-secondary">Team e spazio aziendale</h2>
        <span className="ml-auto text-xs text-muted">{activeCount} attivi · {invites.length} inviti in attesa</span>
      </div>

      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void run(() => renameWorkspace(workspace.id, name), 'Nome aggiornato'); }}>
        <Field aria-label="Nome dello spazio aziendale" value={name} onChange={e => setName(e.target.value)} disabled={busy} className="flex-1 min-w-0" />
        <Button type="submit" disabled={busy || !name.trim() || name.trim() === workspace.name}>Salva</Button>
      </form>

      {/* Invito */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-secondary">Invita un collaboratore</h3>
        <form className="grid gap-2 sm:grid-cols-[1fr_1.3fr_auto_auto]" onSubmit={handleInvite}>
          <Field required aria-label="Nome e cognome" placeholder="Nome e cognome" value={personName} onChange={e => setPersonName(e.target.value)} className="w-full" />
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Field type="email" required aria-label="Email del collaboratore" placeholder="nome@azienda.it" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-9" />
          </div>
          <select aria-label="Mansione" className={selectClass} value={inviteRole} onChange={e => setInviteRole(e.target.value as WorkspaceRole)}>
            {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <Button type="submit" disabled={busy || !email.trim() || !personName.trim()}>
            <UserPlus size={15} className="inline mr-1" />Invita
          </Button>
        </form>
        {ROLE_HINT[inviteRole] && <p className="text-xs text-muted">{ROLE_LABELS[inviteRole]}: entra e trova {ROLE_HINT[inviteRole]}.</p>}

        {invites.length > 0 && (
          <ul className="divide-y divide-line border border-line rounded-lg">
            {invites.map(inv => (
              <li key={inv.email} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{inv.name || inv.email}</p>
                  <p className="text-xs text-muted truncate">{inv.email} · {ROLE_LABELS[inv.role]} · in attesa del primo accesso</p>
                </div>
                <a href={mailto(inv)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent px-2 py-1 rounded hover:bg-raised">
                  <Send size={13} /> Invia email
                </a>
                <button type="button" onClick={() => void copyInvite(inv)} className="inline-flex items-center gap-1 text-xs font-semibold text-muted px-2 py-1 rounded hover:bg-raised">
                  <Copy size={13} /> Copia
                </button>
                <button type="button" aria-label={`Annulla invito per ${inv.email}`} className="p-1 rounded hover:bg-raised text-muted" disabled={busy}
                  onClick={() => void run(() => cancelInvite(inv.email), 'Invito annullato')}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Collaboratori */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-secondary">Collaboratori ({members.length})</h3>
        <ul className="divide-y divide-line border border-line rounded-lg">
          {members.map(m => {
            const isMe = m.uid === uid;
            const locked = isMe || m.role === 'owner';
            return (
              <li key={m.uid} className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {m.displayName}{isMe && <span className="text-muted font-normal"> (tu)</span>}
                  </p>
                  <p className="text-xs text-muted truncate">{m.email}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.outlookConnectedAt ? 'bg-success-soft text-success' : 'bg-raised text-muted'}`}>
                  Outlook {m.outlookConnectedAt ? 'collegato' : 'non collegato'}
                </span>
                {m.status === 'disabled' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-danger-soft text-danger">Disattivato</span>}
                <select aria-label={`Mansione di ${m.displayName}`} className={selectClass} value={m.role} disabled={locked || busy}
                  onChange={e => void run(() => updateMember(workspace.id, m.uid, { role: e.target.value as WorkspaceRole }), 'Mansione aggiornata')}>
                  {(locked ? [m.role] : [...ASSIGNABLE_ROLES, ...(ASSIGNABLE_ROLES.includes(m.role) ? [] : [m.role])]).map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                {!locked && (
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleStatus(m)}>
                    {m.status === 'active' ? 'Disattiva' : 'Riattiva'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Outlook dell'azienda */}
      <form className="space-y-2" onSubmit={e => { e.preventDefault(); void run(() => setWorkspaceOutlookClientId(workspace.id, clientId), 'Outlook aziendale configurato'); }}>
        <h3 className="text-xs font-semibold text-secondary">Outlook aziendale</h3>
        <p className="text-xs text-muted">
          Inserisci una volta l'ID applicazione (client) registrato dall'IT in Microsoft Entra: ogni collaboratore potrà poi collegare
          il proprio Outlook da Impostazioni → Il mio Outlook, senza inserire nulla. Non è una password.
        </p>
        <div className="flex gap-2">
          <Field aria-label="ID applicazione Microsoft" placeholder="00000000-0000-0000-0000-000000000000" value={clientId} onChange={e => setClientId(e.target.value)} className="flex-1 min-w-0" autoComplete="off" />
          <Button type="submit" disabled={busy || clientId.trim() === (workspace.outlookClientId ?? '') || (!!clientId.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId.trim()))}>Salva</Button>
        </div>
      </form>
    </div>
  );
};
