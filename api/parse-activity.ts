// Endpoint autocontenuto — nessun import locale

interface ContactHint {
  id: string;
  company: string;
}

function buildPrompt(transcript: string, contacts: ContactHint[]): string {
  const today = new Date().toISOString().split('T')[0];
  const contactList = contacts.slice(0, 80).map(c => `- "${c.company}"`).join('\n');

  return `Sei un parser per un CRM commerciale. Analizza il messaggio vocale in italiano e restituisci un JSON strutturato.

DATA ODIERNA: ${today}

TIPI DI ATTIVITÀ DISPONIBILI:
- visita, chiamata, email, nota, demo, call-remota, sopralluogo, formazione

CONTATTI DISPONIBILI (scegli il più simile, può essere parziale):
${contactList || '(nessuno)'}

MESSAGGIO VOCALE:
"${transcript}"

Regole di parsing date:
- "domani" = giorno successivo a ${today}
- "dopodomani" = due giorni da oggi
- "lunedì/martedì/..." = prossimo giorno della settimana
- "15 giugno" = 2024-06-15 (anno corrente se futuro, altrimenti prossimo anno)
- Se nessuna data è menzionata → date: null

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, nessun testo prima o dopo:
{
  "type": "visita",
  "companyName": "nome azienda come menzionato nel messaggio o null",
  "date": "YYYY-MM-DD o null",
  "time": "HH:MM o null",
  "notes": "argomento/obiettivo in italiano, max 120 caratteri, o stringa vuota"
}`;
}

export default async function handler(
  req: { method: string; body: unknown; headers: Record<string, string> },
  res: {
    status: (code: number) => { json: (data: unknown) => void };
    setHeader: (name: string, value: string) => void;
    json: (data: unknown) => void;
  },
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const token = req.headers['authorization']?.split(' ')[1];
  const serverToken = process.env.ADMIN_API_TOKEN;
  if (!token || token !== serverToken) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY mancante' }); return; }

  const body = req.body as Record<string, unknown>;
  const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : '';
  const contacts = Array.isArray(body?.contacts) ? (body.contacts as ContactHint[]) : [];

  if (!transcript) { res.status(400).json({ error: 'transcript richiesto' }); return; }

  const models = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'];
  let lastErr = '';

  for (const model of models) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 256,
          messages: [{ role: 'user', content: buildPrompt(transcript, contacts) }],
        }),
      });

      if (!response.ok) {
        lastErr = `${model}: ${response.status}`;
        continue;
      }

      const json = await response.json() as { content: Array<{ type: string; text?: string }> };
      const text = json.content.find(b => b.type === 'text')?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { res.status(502).json({ error: 'Risposta AI non valida' }); return; }

      res.json(JSON.parse(match[0]));
      return;
    } catch (err) {
      lastErr = String(err);
      continue;
    }
  }

  res.status(502).json({ error: `Modello non disponibile (${lastErr})` });
}
