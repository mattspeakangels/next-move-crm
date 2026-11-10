import { apiAuthHeaders } from './apiAuth';

// Analisi AI eseguite sul server (/api/claude, vedi api/_aiTasks.ts): il browser
// manda solo i dati, la chiave Gemini resta in una variabile d'ambiente di Vercel.

export type CloseVisitType = 'prima-visita' | 'follow-up' | 'offerta' | 'chiamata';

export interface ResocontoBatchItem {
  id: string;
  contactName: string;
  date: string; // YYYY-MM-DD
  notes: string;
}

export type AiTask =
  | { type: 'analizza-resoconto'; data: { contactName: string; visitType: CloseVisitType; notes: string } }
  | { type: 'analizza-resoconti'; data: { items: ResocontoBatchItem[] } }
  | { type: 'analizza-conversazione'; data: { transcript: string; isDealer: boolean; contactName: string } }
  | { type: 'verifica-ai' };

/** Esegue un'analisi sul server e restituisce il testo grezzo della risposta. */
export async function runAiTask(task: AiTask): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await apiAuthHeaders()) },
    body: JSON.stringify(task),
  });

  if (res.status === 429) {
    const seconds = parseInt(res.headers.get('Retry-After') ?? '', 10) || 3600;
    const minutes = Math.ceil(seconds / 60);
    throw new Error(`Limite di analisi raggiunto. Riprova tra ${minutes} minut${minutes === 1 ? 'o' : 'i'}.`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Errore del servizio AI (HTTP ${res.status})`);
  }

  const json = await res.json() as { result?: string };
  return json.result ?? '';
}
