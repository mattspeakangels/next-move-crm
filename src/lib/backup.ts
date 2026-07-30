import { useStore } from '../store/useStore';
import { useStoricoStore } from '../store/storicoStore';

const BACKUP_VERSION = 1;

// Stessa lista di campi del `partialize` in useStore.ts: tutto cio' che e'
// persistito (dati business + impostazioni), niente funzioni/azioni.
const APP_STORE_KEYS = [
  'contacts', 'deals', 'offers', 'products', 'activities', 'salesTransactions',
  'assets', 'checkIns', 'targets', 'theme', 'profile', 'discountApprovalThreshold',
  'todos', 'footerTabs', 'sidebarOrder', 'claudeApiKey', 'sequences',
  'prospectingTracks', 'prospectEmailDrafts', 'prospectHistory', 'groups', 'strategicFocuses',
] as const;

const STORICO_STORE_KEYS = ['clienti', 'clientiDettagliati', 'fileName', 'anni', 'budget'] as const;

export function createBackupPayload() {
  const appState = useStore.getState();
  const storicoState = useStoricoStore.getState();

  const app: Record<string, unknown> = {};
  for (const k of APP_STORE_KEYS) app[k] = (appState as any)[k];

  const storico: Record<string, unknown> = {};
  for (const k of STORICO_STORE_KEYS) storico[k] = (storicoState as any)[k];

  return { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), app, storico };
}

export function downloadBackup() {
  const payload = createBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `next-move-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function restoreBackupFromFile(file: File): Promise<void> {
  const text = await file.text();
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Il file non è un JSON valido.');
  }
  if (!payload || typeof payload !== 'object' || !payload.app || typeof payload.app !== 'object') {
    throw new Error('Il file non sembra un backup di Next Move.');
  }

  const appUpdates: Record<string, unknown> = {};
  for (const k of APP_STORE_KEYS) {
    if (k in payload.app) appUpdates[k] = payload.app[k];
  }
  useStore.setState(appUpdates as any);

  if (payload.storico && typeof payload.storico === 'object') {
    const storicoUpdates: Record<string, unknown> = {};
    for (const k of STORICO_STORE_KEYS) {
      if (k in payload.storico) storicoUpdates[k] = payload.storico[k];
    }
    useStoricoStore.setState(storicoUpdates as any);
  }
}
