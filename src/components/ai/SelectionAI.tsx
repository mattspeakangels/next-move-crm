import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, List, FileText, Wand2, CheckSquare, Copy, Check, X, Loader2 } from 'lucide-react';

type Action = 'riepiloga' | 'elenco' | 'riscrivi' | 'todo';

const ACTIONS: { id: Action; label: string; icon: typeof List }[] = [
  { id: 'riepiloga', label: 'Riepiloga', icon: FileText },
  { id: 'elenco', label: 'Elenco', icon: List },
  { id: 'riscrivi', label: 'Riscrivi', icon: Wand2 },
  { id: 'todo', label: 'To-do', icon: CheckSquare },
];

const MIN_CHARS = 12;

/**
 * Toolbar contestuale stile "Gemini": quando l'utente seleziona del testo
 * nell'app compare una barra con azioni AI (riepiloga, elenco, riscrivi, to-do)
 * che elaborano la selezione tramite Claude (/api/claude type "testo-ai").
 */
export function SelectionAI() {
  const [selText, setSelText] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [loading, setLoading] = useState<Action | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sheetOpen = result !== null || error !== null || loading !== null;
  const sheetOpenRef = useRef(sheetOpen);
  sheetOpenRef.current = sheetOpen;

  const clear = useCallback(() => {
    setSelText('');
    setPos(null);
  }, []);

  useEffect(() => {
    const update = () => {
      // Mentre il pannello risultato è aperto non ricalcoliamo la barra.
      if (sheetOpenRef.current) return;
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (!sel || sel.isCollapsed || text.length < MIN_CHARS) {
        clear();
        return;
      }
      try {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) { clear(); return; }
        // Posizioniamo la barra sopra la selezione (sotto se troppo in alto).
        const top = rect.top > 64 ? rect.top - 8 : rect.bottom + 44;
        const left = Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120);
        setSelText(text);
        setPos({ top, left });
      } catch {
        clear();
      }
    };

    // selectionchange copre desktop + mobile; debounce leggero per il touch.
    let t: number | undefined;
    const onChange = () => {
      window.clearTimeout(t);
      t = window.setTimeout(update, 120);
    };
    document.addEventListener('selectionchange', onChange);
    return () => {
      document.removeEventListener('selectionchange', onChange);
      window.clearTimeout(t);
    };
  }, [clear]);

  const run = async (action: Action) => {
    const text = selText;
    if (!text) return;
    setLoading(action);
    setError(null);
    setResult(null);
    setCopied(false);
    setPos(null);
    try {
      const token = import.meta.env.VITE_ADMIN_API_TOKEN;
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'testo-ai', data: { action, text } }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const min = retryAfter ? Math.ceil(parseInt(retryAfter, 10) / 60) : 60;
          throw new Error(`Limite raggiunto. Riprova tra ${min} minuto${min === 1 ? '' : 'i'}.`);
        }
        const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { result: string };
      setResult(json.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore di connessione');
    } finally {
      setLoading(null);
    }
  };

  const closeSheet = () => {
    setResult(null);
    setError(null);
    setLoading(null);
    clear();
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  return (
    <>
      {/* Barra contestuale sulla selezione */}
      {pos && selText && !sheetOpen && (
        <div
          className="fixed z-[9998] -translate-x-1/2 -translate-y-full flex items-center gap-1 rounded-2xl bg-gray-900 text-white shadow-2xl ring-1 ring-black/10 px-1.5 py-1.5 dark:bg-gray-800"
          style={{ top: pos.top, left: pos.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Sparkles size={14} className="text-indigo-300 ml-1 mr-0.5 flex-shrink-0" />
          {ACTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => run(id)}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold hover:bg-white/15 transition-colors whitespace-nowrap"
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Pannello risultato */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeSheet}>
          <div
            className="bg-white dark:bg-gray-800 w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl max-h-[80vh] flex flex-col"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-black dark:text-white">
                <Sparkles size={18} className="text-indigo-500" /> Assistente AI
              </div>
              <button onClick={closeSheet} aria-label="Chiudi"><X size={22} className="text-gray-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center gap-3 text-gray-500 py-8 justify-center">
                  <Loader2 size={20} className="animate-spin" /> Elaborazione in corso…
                </div>
              )}
              {error && <p className="text-sm text-red-500 py-4">{error}</p>}
              {result && (
                <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">{result}</p>
              )}
            </div>

            {result && (
              <button
                onClick={copy}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl transition-colors"
              >
                {copied ? <><Check size={16} /> Copiato</> : <><Copy size={16} /> Copia</>}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default SelectionAI;
