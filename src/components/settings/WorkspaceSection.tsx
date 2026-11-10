import React, { useEffect, useState } from 'react';
import { Building2, Mail, UserPlus, X } from 'lucide-react';
import { useWorkspace } from '../../lib/workspaceContext';
import {
  ASSIGNABLE_ROLES, ROLE_LABELS, canManage, cancelInvite, createInvite, renameWorkspace,
  updateMember, watchInvites, type Invite, type Member, type WorkspaceRole,
} from '../../lib/workspace';
import { useToast } from '../ui/ToastContext';
import { confirmAction } from '../ui/Feedback';
import { Button, Field } from '../ui/Syrio';

const selectClass =
  'bg-raised border border-line rounded-lg px-2 py-1.5 text-sm text-foreground disabled:opacity-60';

export const WorkspaceSection: React.FC = () => {
  const { workspace, role, members, uid } = useWorkspace();
  const { showToast } = useToast();
  const manage = canManage(role);
  const [name, setName] = useState(workspace?.name ?? '');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('sales');
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(workspace?.name ?? ''), [workspace?.name]);
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

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const me = members.find(m => m.uid === uid);
    void run(async () => {
      if (members.some(m => m.email === email.trim().toLowerCase())) throw new Error('Questa persona fa già parte dello spazio.');
      await createInvite(workspace, email, inviteRole, me?.email || uid);
      setEmail('');
    }, 'Invito creato: la persona entra accedendo con questa email');
  };

  const handleStatus = async (m: Member) => {
    const disabling = m.status === 'active';
    if (disabling && !await confirmAction(`Disattivare l'accesso di ${m.displayName}? Non vedrà più i dati dello spazio.`)) return;
    void run(() => updateMember(workspace.id, m.uid, { status: disabling ? 'disabled' : 'active' }),
      disabling ? 'Accesso disattivato' : 'Accesso riattivato');
  };

  return (
    <div className="bg-surface rounded-panel p-6 border border-line space-y-5">
      <div className="flex items-center gap-2">
        <Building2 size={16} className="text-accent" />
        <h2 className="text-xs font-semibold text-secondary">Spazio aziendale</h2>
        {role && <span className="ml-auto text-xs text-muted">Il tuo ruolo: {ROLE_LABELS[role]}</span>}
      </div>

      <form
        className="flex gap-2"
        onSubmit={e => { e.preventDefault(); void run(() => renameWorkspace(workspace.id, name), 'Nome aggiornato'); }}
      >
        <Field
          aria-label="Nome dello spazio aziendale"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={!manage || busy}
          className="flex-1"
        />
        {manage && (
          <Button type="submit" disabled={busy || !name.trim() || name.trim() === workspace.name}>Salva</Button>
        )}
      </form>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-secondary">Membri ({members.length})</h3>
        <ul className="divide-y divide-line border border-line rounded-lg">
          {members.map(m => {
            const isMe = m.uid === uid;
            const locked = !manage || isMe || m.role === 'owner';
            return (
              <li key={m.uid} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {m.displayName}{isMe && <span className="text-muted font-normal"> (tu)</span>}
                  </p>
                  <p className="text-xs text-muted truncate">{m.email}</p>
                </div>
                {m.status === 'disabled' && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-danger-soft text-danger">Disattivato</span>
                )}
                <select
                  aria-label={`Ruolo di ${m.displayName}`}
                  className={selectClass}
                  value={m.role}
                  disabled={locked || busy}
                  onChange={e => void run(() => updateMember(workspace.id, m.uid, { role: e.target.value as WorkspaceRole }), 'Ruolo aggiornato')}
                >
                  {(m.role === 'owner' ? ['owner' as WorkspaceRole] : ASSIGNABLE_ROLES).map(r => (
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

      {manage && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-secondary">Invita un collega</h3>
          <form className="flex flex-wrap gap-2" onSubmit={handleInvite}>
            <div className="relative flex-1 min-w-[200px]">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Field
                type="email"
                required
                aria-label="Email del collega"
                placeholder="nome@azienda.it"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9"
              />
            </div>
            <select
              aria-label="Ruolo del collega"
              className={selectClass}
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as WorkspaceRole)}
            >
              {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <Button type="submit" disabled={busy || !email.trim()}>
              <UserPlus size={15} className="inline mr-1" />Invita
            </Button>
          </form>
          <p className="text-xs text-muted">
            Non viene inviata nessuna email: comunica tu al collega di accedere a Syrio con questo indirizzo.
          </p>
          {invites.length > 0 && (
            <ul className="space-y-1.5">
              {invites.map(inv => (
                <li key={inv.email} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="truncate">{inv.email}</span>
                  <span className="text-xs text-muted">· {ROLE_LABELS[inv.role]} · in attesa</span>
                  <button
                    type="button"
                    aria-label={`Annulla invito per ${inv.email}`}
                    className="ml-auto p-1 rounded hover:bg-raised text-muted"
                    disabled={busy}
                    onClick={() => void run(() => cancelInvite(inv.email), 'Invito annullato')}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
