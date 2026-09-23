// Chiamata client-side a Google Gemini con la chiave "bring your own key"
// salvata dall'utente in Impostazioni (store.claudeApiKey, nome storico del
// campo — ora contiene una Gemini API key, non più Anthropic). Sostituisce
// l'uso diretto di @anthropic-ai/sdk (dangerouslyAllowBrowser) in
// AgendaView.tsx e ConversationRecorder.tsx.

// gemini-2.0-flash deprecato da Google (404 "no longer available");
// cascata sul modello corrente + alias "latest" come rete di sicurezza
// contro future deprecazioni (stesso pattern di api/_gemini.ts).
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest'];

export async function callGeminiClient(apiKey: string, prompt: string, maxOutputTokens = 1024): Promise<string> {
  const errors: string[] = [];
  for (const model of GEMINI_MODELS) {
    try {
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
        errors.push(`${model}: ${res.status} ${body.slice(0, 200)}`);
        continue;
      }

      const json = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
      if (!text) { errors.push(`${model}: risposta vuota`); continue; }
      return text;
    } catch (err) {
      errors.push(`${model}: ${err instanceof Error ? err.message : 'error'}`);
      continue;
    }
  }
  throw new Error(`Nessun modello Gemini disponibile [${errors.join(' | ')}]`);
}
