// Client condiviso per Google Gemini (generativelanguage.googleapis.com).
// Sostituisce le chiamate dirette all'API Anthropic: stessa forma di cascata
// modelli (dal più economico/veloce al più capace), stesso contratto di
// ritorno (testo grezzo), così i chiamanti (api/claude.ts, api/log-activity.ts,
// api/parse-activity.ts, api/catalog.ts) restano quasi identici.

// gemini-2.5-flash/2.0-flash/1.5-flash deprecati da Google per questo account
// (404 "no longer available to new users"). I flash "di punta" più recenti
// (3.6/3.7/3.8-flash) esistono ma vanno spesso in 503 "high demand" appena
// rilasciati; le varianti "lite" hanno tipicamente quota/capacità separata
// e meno contesa, quindi vengono provate per prime. Elenco confermato via
// ListModels reale sulla chiave (vedi diagnostica sotto), non per nome a caso.
const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-pro-latest'];

// 503 "UNAVAILABLE / high demand" è un sovraccarico temporaneo lato Google,
// non un errore del modello: un solo retry con breve attesa lo assorbe nella
// maggior parte dei casi senza rischiare il maxDuration della function (30s).
const RETRY_ON_503_DELAY_MS = 1200;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class GeminiError extends Error {}

async function callOnce(
  model: string,
  apiKey: string,
  prompt: string,
  maxOutputTokens: number,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens },
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    return { ok: false, status: response.status, body: errBody.slice(0, 200) };
  }

  const json = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
  return text ? { ok: true, text } : { ok: false, status: 0, body: 'risposta vuota' };
}

export async function callGemini(prompt: string, opts?: { maxOutputTokens?: number }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError('GEMINI_API_KEY non configurata su Vercel');
  const maxOutputTokens = opts?.maxOutputTokens ?? 1024;

  // Accumula l'errore di OGNI modello tentato (non solo l'ultimo): un
  // fallimento sistemico (es. chiave con permessi/versione API sbagliata)
  // fa fallire tutti i modelli allo stesso modo, e senza vedere l'elenco
  // completo è impossibile distinguere quel caso da un modello deprecato.
  const errors: string[] = [];
  for (const model of GEMINI_MODELS) {
    try {
      let result = await callOnce(model, apiKey, prompt, maxOutputTokens);
      if (!result.ok && result.status === 503) {
        await sleep(RETRY_ON_503_DELAY_MS);
        result = await callOnce(model, apiKey, prompt, maxOutputTokens);
      }
      if (result.ok) return result.text;
      errors.push(`${model}: ${result.status} ${result.body}`);
    } catch (err) {
      errors.push(`${model}: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  // Diagnostica: se il cascade fallisce del tutto, interroga ListModels per
  // sapere quali modelli generateContent sono REALMENTE disponibili per
  // questa chiave/progetto, invece di continuare a indovinare nomi.
  let available = '';
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const listJson = await listRes.json() as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
      available = (listJson.models ?? [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name?.replace('models/', ''))
        .filter(Boolean)
        .join(', ');
    } else {
      available = `ListModels fallito: ${listRes.status}`;
    }
  } catch (err) {
    available = `ListModels errore: ${err instanceof Error ? err.message : 'error'}`;
  }

  throw new GeminiError(`Nessun modello Gemini disponibile [${errors.join(' | ')}] — disponibili per questa chiave: ${available}`);
}
