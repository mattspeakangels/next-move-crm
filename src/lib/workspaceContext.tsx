import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { setActiveDataContext } from './paths';
import {
  resolveWorkspace, migrateLegacyData, hasLegacyData, watchMembers,
  type Member, type Workspace, type WorkspaceRole,
} from './workspace';
import { useStore, type StoreState } from '../store/useStore';

type Status = 'loading' | 'migrating' | 'ready' | 'error';

interface WorkspaceContextValue {
  status: Status;
  error?: string;
  progress?: string;
  uid: string;
  workspace: Workspace | null;
  role: WorkspaceRole | null;
  members: Member[];
  retry: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** Chiave locale: l'ultimo workspace caricato in questo browser. */
const LAST_WID_KEY = 'nm_active_wid';

/** Collezioni condivise tenute nello store locale: vanno svuotate se si cambia workspace. */
const SHARED_STORE_KEYS = [
  'contacts', 'deals', 'offers', 'products', 'activities', 'assets', 'salesTransactions',
  'checkIns', 'groups', 'strategicFocuses', 'sequences',
] as const;

export function WorkspaceProvider({ user, children }: { user: User; children: ReactNode }) {
  const [state, setState] = useState<Omit<WorkspaceContextValue, 'retry' | 'uid'>>({
    status: 'loading', workspace: null, role: null, members: [],
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, status: 'loading', error: undefined }));

    (async () => {
      const resolved = await resolveWorkspace(user);
      if (cancelled) return;

      // Lo store locale contiene i dati dell'ultimo workspace aperto in questo browser:
      // se è un altro, li svuotiamo prima di sincronizzare per non mescolare aziende.
      let lastWid: string | null = null;
      try { lastWid = localStorage.getItem(LAST_WID_KEY); } catch { /* storage non disponibile */ }
      if (lastWid && lastWid !== resolved.wid) {
        const empty: Partial<StoreState> = {};
        for (const k of SHARED_STORE_KEYS) empty[k] = {};
        useStore.setState(empty);
      }

      // Primo workspace di un utente che aveva già dati: li copiamo prima di
      // sincronizzare, altrimenti il primo snapshot (vuoto) li toglierebbe dallo store.
      if (resolved.role === 'owner' && !resolved.workspace.legacyMigratedAt) {
        if (resolved.createdNow || await hasLegacyData(user.uid)) {
          setState(s => ({ ...s, status: 'migrating', progress: 'Preparazione dello spazio aziendale…' }));
          await migrateLegacyData(user.uid, resolved.wid, msg => {
            if (!cancelled) setState(s => ({ ...s, progress: msg }));
          });
        }
      }
      if (cancelled) return;

      try { localStorage.setItem(LAST_WID_KEY, resolved.wid); } catch { /* storage non disponibile */ }
      setActiveDataContext({ uid: user.uid, wid: resolved.wid });
      setState(s => ({
        ...s, status: 'ready', progress: undefined, workspace: resolved.workspace, role: resolved.role,
      }));
    })().catch(err => {
      console.error('Workspace non disponibile:', err);
      if (!cancelled) setState(s => ({ ...s, status: 'error', error: err?.message || String(err) }));
    });

    return () => {
      cancelled = true;
      setActiveDataContext(null);
    };
  }, [user, attempt]);

  // Membri e ruolo in tempo reale (es. un admin cambia il mio ruolo o mi disattiva).
  useEffect(() => {
    const wid = state.workspace?.id;
    if (state.status !== 'ready' || !wid) return;
    return watchMembers(wid, members => {
      const me = members.find(m => m.uid === user.uid);
      setState(s => {
        if (me && me.status !== 'active') {
          return { ...s, members, status: 'error', error: 'Il tuo accesso a questo spazio aziendale è stato disattivato.' };
        }
        return { ...s, members, role: me?.role ?? s.role };
      });
    });
  }, [state.status, state.workspace?.id, user.uid]);

  const value: WorkspaceContextValue = { ...state, uid: user.uid, retry: () => setAttempt(a => a + 1) };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace deve essere usato dentro WorkspaceProvider');
  return ctx;
}
