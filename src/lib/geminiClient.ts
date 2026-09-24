// Chiamata client-side a Google Gemini con la chiave "bring your own key"
// salvata dall'utente in Impostazioni (store.claudeApiKey, nome storico del
// campo — ora contiene una Gemini API key, non più Anthropic). Sostituisce
// l'uso diretto di @anthropic-ai/sdk (dangerouslyAllowBrowser) in
// AgendaView.tsx e ConversationRecorder.tsx.

// gemini-2.0-flash deprecato da Google (404 "no longer available"); i flash
// "di punta" più recenti (3.6/3.7/3.8-flash) vanno spesso in 503 "high
// demand" appena rilasciati. Le varianti "lite" hanno quota/capacità
// separata e meno contesa, quindi vengono provate per prime (stesso ordine
// e stessa logica di api/_gemini.ts).
const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-pro-latest'];

// 503 "UNAVAILABLE / high demand" è un sovraccarico temporaneo lato Google:
// un solo retry con breve attesa lo assorbe nella maggior parte dei casi.
const RETRY_ON_503_DELAY_MS = 1200;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOnce(
  model: string,
  apiKey: string,
  prompt: string,
  maxOutputTokens: number,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const res = await fetch(
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

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, status: res.status, body: body.slice(0, 200) };
  }

  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
  return text ? { ok: true, text } : { ok: false, status: 0, body: 'risposta vuota' };
}

export async function callGeminiClient(apiKey: string, prompt: string, maxOutputTokens = 1024): Promise<string> {
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
  throw new Error(`Nessun modello Gemini disponibile [${errors.join(' | ')}]`);
}
