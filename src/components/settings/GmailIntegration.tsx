import React, { useState } from 'react';
import { Mail, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { connectGmail, fetchRecentMessages, matchContactsAndBuildActivities } from '../../lib/gmailSync';

export const GmailIntegration: React.FC = () => {
  const contacts = useStore(s => Object.values(s.contacts));
  const activities = useStore(s => Object.values(s.activities));
  const addActivitiesBatch = useStore(s => s.addActivitiesBatch);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'syncing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ found: number; created: number } | null>(null);

  const handleConnect = async () => {
    setStatus('connecting');
    setError('');
    try {
      const token = await connectGmail();
      setAccessToken(token);
      setStatus('idle');
    } catch (e: any) {
      setError(e.message || 'Errore nel collegamento a Gmail.');
      setStatus('error');
    }
  };

  const handleSync = async () => {
    if (!accessToken) return;
    setStatus('syncing');
    setError('');
    setResult(null);
    try {
      const messages = await fetchRecentMessages(accessToken, days);
      const newActivities = matchContactsAndBuildActivities(messages, contacts, activities);
      if (newActivities.length > 0) addActivitiesBatch(newActivities);
      setResult({ found: messages.length, created: newActivities.length });
      setStatus('done');
    } catch (e: any) {
      setError(e.message || 'Errore durante la sincronizzazione.');
      setStatus('error');
    }
  };

  return (
    <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line space-y-4">
      <h2 className="text-xs font-semibold text-secondary dark:text-muted   flex items-center gap-2">
        <Mail size={14} /> Gmail
      </h2>
      <p className="text-xs text-muted">
        Collega Gmail e sincronizza le email recenti scambiate con i tuoi contatti: verranno create come Attività.
      </p>

      {!accessToken ? (
        <button
          onClick={handleConnect}
          disabled={status === 'connecting'}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-all disabled:opacity-60"
        >
          <Mail size={15} />
          {status === 'connecting' ? 'Collegamento...' : 'Collega Gmail'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-secondary dark:text-muted">Ultimi</label>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="text-xs font-bold rounded-md border border-line dark:border-line dark:bg-raised px-2 py-1"
            >
              <option value={7}>7 giorni</option>
              <option value={30}>30 giorni</option>
            </select>
          </div>
          <button
            onClick={handleSync}
            disabled={status === 'syncing'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-all disabled:opacity-60"
          >
            <RefreshCw size={15} className={status === 'syncing' ? 'animate-spin' : ''} />
            {status === 'syncing' ? 'Sincronizzazione...' : 'Sincronizza ora'}
          </button>
        </div>
      )}

      {status === 'done' && result && (
        <p className="text-xs font-bold text-success dark:text-success flex items-center gap-1.5">
          <CheckCircle2 size={13} />
          {result.found} email trovate, {result.created} nuove attività create.
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs font-bold text-danger flex items-center gap-1.5">
          <AlertTriangle size={13} /> {error}
        </p>
      )}
    </div>
  );
};
