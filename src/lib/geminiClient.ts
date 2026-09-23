// Chiamata client-side a Google Gemini con la chiave "bring your own key"
// salvata dall'utente in Impostazioni (store.claudeApiKey, nome storico del
// campo — ora contiene una Gemini API key, non più Anthropic). Sostituisce
// l'uso diretto di @anthropic-ai/sdk (dangerouslyAllowBrowser) in
// AgendaView.tsx e ConversationRecorder.tsx.

const GEMINI_MODEL = 'gemini-2.0-flash';

export async function callGeminiClient(apiKey: string, prompt: string, maxOutputTokens = 1024): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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
    throw new Error(`${res.status} ${body.slice(0, 200)}`);
  }

  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('Risposta vuota da Gemini');
  return text;
}
