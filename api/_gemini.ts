// Client condiviso per Google Gemini (generativelanguage.googleapis.com).
// Sostituisce le chiamate dirette all'API Anthropic: stessa forma di cascata
// modelli (dal più economico/veloce al più capace), stesso contratto di
// ritorno (testo grezzo), così i chiamanti (api/claude.ts, api/log-activity.ts,
// api/parse-activity.ts, api/catalog.ts) restano quasi identici.

// gemini-2.5-flash/2.0-flash/1.5-flash deprecati da Google (404 "no longer
// available"); modello attuale segnalato dall'errore stesso di Google.
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest'];

export class GeminiError extends Error {}

export async function callGemini(prompt: string, opts?: { maxOutputTokens?: number }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError('GEMINI_API_KEY non configurata su Vercel');

  // Accumula l'errore di OGNI modello tentato (non solo l'ultimo): un
  // fallimento sistemico (es. chiave con permessi/versione API sbagliata)
  // fa fallire tutti i modelli allo stesso modo, e senza vedere l'elenco
  // completo è impossibile distinguere quel caso da un modello deprecato.
  const errors: string[] = [];
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: opts?.maxOutputTokens ?? 1024 },
          }),
        },
      );

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        errors.push(`${model}: ${response.status} ${errBody.slice(0, 200)}`);
        continue;
      }

      const json = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
      if (!text) { errors.push(`${model}: risposta vuota`); continue; }
      return text;
    } catch (err) {
      errors.push(`${model}: ${err instanceof Error ? err.message : 'error'}`);
      continue;
    }
  }

  throw new GeminiError(`Nessun modello Gemini disponibile [${errors.join(' | ')}]`);
}
