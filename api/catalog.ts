// Endpoint autocontenuto — nessun import da file locali per isolare il problema di bundle
import { callGemini, GeminiError } from './gemini.js';

interface ContactItem {
  id: string;
  company: string;
  city?: string;
  province?: string;
  notes?: string;
}

function buildPrompt(contacts: ContactItem[]): string {
  const lines = contacts
    .map((c, i) => {
      const parts = [c.company];
      if (c.city) parts.push(c.city);
      if (c.province) parts.push(`(${c.province})`);
      if (c.notes) parts.push(`| ${c.notes.substring(0, 80)}`);
      return `${i + 1}. id="${c.id}" | ${parts.join(' ')}`;
    })
    .join('\n');

  return `Sei un analista commerciale esperto in workwear professionale Blåkläder per il mercato Lombardia e Canton Ticino.

CRITERI DI CLASSIFICAZIONE:
- segment "dealer": ferramenta, antinfortunistica, DPI, abbigliamento da lavoro, rivenditori, distributori
- segment "edilizia": imprese edili, costruttori, cantieri, ristrutturazioni, pavimentazioni, serramenti
- segment "industria": manifattura, logistica, trasporti, meccanica, chimica, alimentare, energia, pulizie

PRIORITÀ COMMERCIALE per Blåkläder:
- "alta": settore core, alta probabilità acquisto
- "media": buon potenziale
- "bassa": settore marginale

CONTATTI:
${lines}

Rispondi ESCLUSIVAMENTE con un array JSON valido, nessun testo prima o dopo:
[{"id":"...","segment":"dealer","priority":"alta","note":"descrizione max 60 caratteri"}]`;
}

export default async function handler(
  req: { method: string; body: unknown; headers: Record<string, string> },
  res: {
    status: (code: number) => { json: (data: unknown) => void };
    setHeader: (name: string, value: string) => void;
    json: (data: unknown) => void;
  },
) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Auth
  const token = req.headers['authorization']?.split(' ')[1];
  const serverToken = process.env.ADMIN_API_TOKEN;
  console.log('[catalog] auth check — received:', token ? token.substring(0, 6) + '...' : 'MISSING', '| env set:', !!serverToken, '| match:', token === serverToken);
  if (!token || token !== serverToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Validazione
  const body = req.body as Record<string, unknown>;
  if (!Array.isArray(body?.contacts) || body.contacts.length === 0) {
    res.status(400).json({ error: 'contacts array richiesto' });
    return;
  }
  const contacts = (body.contacts as ContactItem[]).slice(0, 50);

  const prompt = buildPrompt(contacts);

  let text: string;
  try {
    text = await callGemini(prompt, { maxOutputTokens: 2048 });
  } catch (err) {
    const message = err instanceof GeminiError ? err.message : String(err);
    console.error('[catalog]', message);
    res.status(502).json({ error: `Nessun modello disponibile (${message})` });
    return;
  }

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    console.error('[catalog] No JSON in response:', text.substring(0, 300));
    res.status(502).json({ error: 'Risposta AI non valida' });
    return;
  }

  res.json({ results: JSON.parse(match[0]) });
}
