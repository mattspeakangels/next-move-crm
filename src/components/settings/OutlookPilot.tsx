import React, { useState } from 'react';
import type { AccountInfo } from '@azure/msal-browser';
import { connectOutlook, disconnectOutlook, fetchOutlookMessages, outlookConfigured, type OutlookMessage } from '../../lib/outlookPilot';

export const OutlookPilot: React.FC = () => {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [messages, setMessages] = useState<OutlookMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Operazione non riuscita.'); }
    finally { setBusy(false); }
  };

  return <section className="bg-surface rounded-panel p-6 border border-line space-y-4">
    <h2 className="text-xs font-semibold text-secondary">Outlook aziendale · prova di collegamento</h2>
    <p className="text-xs text-muted">Legge oggetto, mittente e data delle ultime 20 email ricevute. Non legge il corpo, non crea trattative e non invia email a servizi AI. Il consenso Microsoft può richiedere l'approvazione IT.</p>
    {!outlookConfigured && <p className="text-xs text-danger">Configurazione necessaria: l'IT deve registrare l'app Microsoft e fornire il client ID.</p>}
    {!account ? <button disabled={!outlookConfigured || busy} className="w-full py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm disabled:opacity-60" onClick={() => void run(async () => setAccount(await connectOutlook()))}>Collega Outlook</button>
      : <div className="space-y-3">
        <p className="text-xs text-secondary">Collegato: {account.username}</p>
        <button disabled={busy} className="w-full py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm disabled:opacity-60" onClick={() => void run(async () => { setMessages(await fetchOutlookMessages(account)); setLoaded(true); })}>Leggi email recenti</button>
        <button disabled={busy} className="text-xs underline" onClick={() => void run(async () => { await disconnectOutlook(account); setAccount(null); setMessages([]); setLoaded(false); })}>Rimuovi dati della sessione</button>
        {loaded && <ul className="space-y-2 text-xs">{messages.length === 0 ? <li>Nessuna email trovata.</li> : messages.map(message => <li key={message.id} className="border-t border-line pt-2"><strong>{message.subject || '(senza oggetto)'}</strong><br />{message.from?.emailAddress?.name || message.from?.emailAddress?.address || 'Mittente non disponibile'} · {message.receivedDateTime ? new Date(message.receivedDateTime).toLocaleString('it-IT') : 'data non disponibile'}</li>)}</ul>}
      </div>}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </section>;
};
