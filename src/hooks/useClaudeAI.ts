import { useState } from 'react';

type AIType = 'prepara-visita' | 'analizza-pipeline' | 'email-offerta';

interface UseClaudeAIReturn {
  result: string | null;
  loading: boolean;
  error: string | null;
  run: (type: AIType, data: unknown) => Promise<void>;
  reset: () => void;
}

export function useClaudeAI(): UseClaudeAIReturn {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (type: AIType, data: unknown) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = import.meta.env.VITE_ADMIN_API_TOKEN;
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ type, data }),
      });

      if (!res.ok) {
        // Handle rate limiting specifically
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const seconds = retryAfter ? parseInt(retryAfter, 10) : 3600;
          const minutes = Math.ceil(seconds / 60);
          await res.json().catch(() => ({}));
          const message = `Limite raggiunto. Riprova tra ${minutes} minuto${minutes === 1 ? '' : 'i'}.`;
          throw new Error(message);
        }

        const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const json = await res.json() as { result: string };
      setResult(json.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setLoading(false);
  };

  return { result, loading, error, run, reset };
}
