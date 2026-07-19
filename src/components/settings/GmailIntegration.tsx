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
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 space-y-4">
      <h2 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
        <Mail size={14} /> Gmail
      </h2>
      <p className="text-xs text-gray-400">
        Collega Gmail e sincronizza le email recenti scambiate con i tuoi contatti: verranno create come Attività.
      </p>

      {!accessToken ? (
        <button
          onClick={handleConnect}
          disabled={status === 'connecting'}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-60"
        >
          <Mail size={15} />
          {status === 'connecting' ? 'Collegamento...' : 'Collega Gmail'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Ultimi</label>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 px-2 py-1"
            >
              <option value={7}>7 giorni</option>
              <option value={30}>30 giorni</option>
            </select>
          </div>
          <button
            onClick={handleSync}
            disabled={status === 'syncing'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-60"
          >
            <RefreshCw size={15} className={status === 'syncing' ? 'animate-spin' : ''} />
            {status === 'syncing' ? 'Sincronizzazione...' : 'Sincronizza ora'}
          </button>
        </div>
      )}

      {status === 'done' && result && (
        <p className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
          <CheckCircle2 size={13} />
          {result.found} email trovate, {result.created} nuove attività create.
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
          <AlertTriangle size={13} /> {error}
        </p>
      )}
    </div>
  );
};
