// Vercel Node.js serverless function
// Registra attività — parsing AI di un resoconto in linguaggio naturale.
// Hardening: pattern api/claude.ts (CORS whitelist, rate limit, auth, zod).
// Output: JSON strutturato server-side, pattern api/parse-activity.ts.

import { z } from 'zod';
import { checkRateLimit, checkRateLimitByIP } from './upstash-ratelimit.js';
import { applyCors, handleCorsPreFlight } from './cors.js';

function logError(message: string, context: Record<string, unknown>) {
  console.error(`[API Error] ${message}`, JSON.stringify(context, null, 2));
}

// ─── Validation Schemas ────────────────────────────────────────────────────

const ContactHintSchema = z.object({
  id: z.string().min(1).max(100),
  company: z.string().min(1).max(200),
  city: z.string().max(100).optional(),
});

const OpenActivityHintSchema = z.object({
  contactId: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  date: z.string().min(1).max(40),
});

const RequestSchema = z.object({
  transcript: z.string().min(1).max(2000),
  contacts: z.array(ContactHintSchema).max(100).default([]),
  now: z.string().min(1).max(40).optional(),
  openActivitiesHint: z.array(OpenActivityHintSchema).max(50).optional(),
});

const ACTIVITY_TYPES = [
  'chiamata', 'email', 'visita', 'visita-freddo', 'nota', 'demo',
  'call-remota', 'sopralluogo', 'formazione', 'smart-working', 'ufficio', 'fiera',
];

const OUTCOME_TYPES = [
  'riuscita', 'parziale', 'nessun-contatto', 'promessa-callback', 'rifiuto', 'nota',
  'nessuno-trovato', 'parlato-influente', 'parlato-decisore', 'appuntamento-fissato',
  'richiesta-offerta',
];

const TODO_TIPI = ['offerta', 'scheda-tecnica', 'email-info', 'chiamata-follow', 'campionatura', 'demo', 'visita', 'altro'];
const TODO_PRIORITA = ['alta', 'media', 'bassa'];

function buildPrompt(transcript: string, contacts: z.infer<typeof ContactHintSchema>[], now?: string, openActivitiesHint?: z.infer<typeof OpenActivityHintSchema>[]): string {
  const nowDate = now ? new Date(now) : new Date();
  const today = nowDate.toISOString().split('T')[0];
  const contactList = contacts.slice(0, 80).map(c => `- "${c.company}"${c.city ? ` (${c.city})` : ''} [id:${c.id}]`).join('\n');
  const openHintList = (openActivitiesHint || []).slice(0, 50)
    .map(h => `- contatto ${h.contactId}: attività "${h.type}" aperta il ${h.date}`).join('\n');

  return `Sei un parser per un CRM commerciale B2B italiano (settore DPI/forniture industriali). Un venditore ha appena registrato a voce o per iscritto il resoconto di un'attività commerciale appena svolta (o da svolgere). Analizza il messaggio ed estrai i dati in un JSON strutturato.

DATA/ORA ATTUALE: ${today}

CONTATTI ESISTENTI NEL CRM (scegli tra questi, il match può essere parziale o fonetico):
${contactList || '(nessuno)'}

ATTIVITÀ APERTE/PIANIFICATE ESISTENTI (contesto utile, mai vincolante — solo per capire se il resoconto si riferisce a un appuntamento già pianificato):
${openHintList || '(nessuna)'}

MESSAGGIO DEL VENDITORE:
"${transcript}"

TIPI DI ATTIVITÀ VALIDI: ${ACTIVITY_TYPES.join(', ')}
ESITI VALIDI: ${OUTCOME_TYPES.join(', ')}
TIPI TO-DO VALIDI: ${TODO_TIPI.join(', ')}
PRIORITÀ TO-DO VALIDE: ${TODO_PRIORITA.join(', ')}

Regole:
- Se il messaggio non specifica chiaramente il cliente, lascia "contactCandidates" vuoto o con più voci (non indovinare).
- Se il tipo di attività non è chiaro, usa "nota".
- Estrai SOLO i to-do esplicitamente menzionati o chiaramente implicati (es. "richiamarlo giovedì", "serve un preventivo", "mandare scheda tecnica"). Nessun to-do inventato.
- Date relative: "oggi"=${today}, "domani"=giorno dopo, "dopodomani"=+2gg, "lunedì/martedì/..."=prossima occorrenza, "giovedì prossimo" ecc. Formato YYYY-MM-DD. Se assente → null.
- "notes" è il riassunto del resoconto in italiano, discorsivo, max 300 caratteri.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, nessun testo prima o dopo:
{
  "companyNameRaw": "nome azienda come menzionato o null",
  "contactCandidates": [{"id": "id_contatto", "score": 0.0}],
  "activityType": "uno tra i tipi validi",
  "outcomeType": "uno tra gli esiti validi o null",
  "date": "YYYY-MM-DD o null",
  "time": "HH:MM o null",
  "notes": "riassunto del resoconto",
  "todos": [{"titolo": "...", "tipo": "uno tra i tipi to-do validi", "priorita": "alta|media|bassa", "dataEsecuzione": "YYYY-MM-DD o null", "scadenza": "YYYY-MM-DD o null", "note": "..."}]
}`;
}

interface ParsedResult {
  companyNameRaw: string | null;
  contactCandidates: { id: string; score: number }[];
  activityType: string;
  outcomeType: string | null;
  date: string | null;
  time: string | null;
  notes: string;
  todos: { titolo: string; tipo: string; priorita: string; dataEsecuzione: string | null; scadenza: string | null; note: string }[];
}

function sanitizeResult(raw: unknown): ParsedResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const activityType = typeof r.activityType === 'string' && ACTIVITY_TYPES.includes(r.activityType) ? r.activityType : 'nota';
  const outcomeType = typeof r.outcomeType === 'string' && OUTCOME_TYPES.includes(r.outcomeType) ? r.outcomeType : null;
  const contactCandidates = Array.isArray(r.contactCandidates)
    ? (r.contactCandidates as unknown[])
        .filter((c): c is { id: unknown; score: unknown } => !!c && typeof c === 'object')
        .map(c => ({ id: String((c as Record<string, unknown>).id ?? ''), score: Number((c as Record<string, unknown>).score ?? 0) }))
        .filter(c => c.id)
        .slice(0, 10)
    : [];
  const todos = Array.isArray(r.todos)
    ? (r.todos as unknown[])
        .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
        .map(t => ({
          titolo: String(t.titolo ?? '').slice(0, 200),
          tipo: typeof t.tipo === 'string' && TODO_TIPI.includes(t.tipo) ? t.tipo : 'altro',
          priorita: typeof t.priorita === 'string' && TODO_PRIORITA.includes(t.priorita) ? t.priorita : 'media',
          dataEsecuzione: typeof t.dataEsecuzione === 'string' ? t.dataEsecuzione : null,
          scadenza: typeof t.scadenza === 'string' ? t.scadenza : null,
          note: typeof t.note === 'string' ? t.note.slice(0, 500) : '',
        }))
        .filter(t => t.titolo)
        .slice(0, 20)
    : [];

  return {
    companyNameRaw: typeof r.companyNameRaw === 'string' ? r.companyNameRaw.slice(0, 200) : null,
    contactCandidates,
    activityType,
    outcomeType,
    date: typeof r.date === 'string' ? r.date : null,
    time: typeof r.time === 'string' ? r.time : null,
    notes: typeof r.notes === 'string' ? r.notes.slice(0, 1000) : '',
    todos,
  };
}

export default async function handler(
  req: { method: string; body: unknown; headers: Record<string, string> },
  res: {
    status: (code: number) => { json: (data: unknown) => void };
    setHeader: (name: string, value: string) => void;
    json: (data: unknown) => void;
  },
) {
  if (handleCorsPreFlight(req, res)) return;

  const corsAllowed = applyCors(req, res);
  if (!corsAllowed) { res.status(403).json({ error: 'CORS not allowed for this origin' }); return; }

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  const validToken = process.env.ADMIN_API_TOKEN;
  if (!token || token !== validToken) {
    logError('Unauthorized API access', { endpoint: '/api/log-activity', status: 401, hasToken: !!token });
    res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    return;
  }

  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
                    (req.headers['x-real-ip'] as string) || 'unknown';

  const ipRateLimitResult = await checkRateLimitByIP(ipAddress);
  if (!ipRateLimitResult.allowed) {
    const retryAfter = Math.ceil((ipRateLimitResult.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    res.status(429).json({ error: 'Rate limited by IP: Max 20 requests per hour', remaining: ipRateLimitResult.remaining });
    return;
  }

  const rateLimitResult = await checkRateLimit(token);
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    res.status(429).json({ error: 'Rate limited: Max 5 requests per hour', remaining: rateLimitResult.remaining });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY mancante' }); return; }

  let parsedInput: z.infer<typeof RequestSchema>;
  try {
    parsedInput = RequestSchema.parse(req.body);
  } catch (err) {
    logError('Invalid request body', { endpoint: '/api/log-activity', error: String(err) });
    res.status(400).json({ error: 'Payload non valido', details: err instanceof z.ZodError ? err.errors : undefined });
    return;
  }

  const { transcript, contacts, now, openActivitiesHint } = parsedInput;
  const prompt = buildPrompt(transcript, contacts, now, openActivitiesHint);

  const models = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-8'];
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
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) { lastErr = `${model}: ${response.status}`; continue; }

      const json = await response.json() as { content: Array<{ type: string; text?: string }> };
      const text = json.content.find(b => b.type === 'text')?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { res.status(502).json({ error: 'Risposta AI non valida' }); return; }

      let raw: unknown;
      try {
        raw = JSON.parse(match[0]);
      } catch {
        res.status(502).json({ error: 'Risposta AI non valida (JSON malformato)' });
        return;
      }

      res.json(sanitizeResult(raw));
      return;
    } catch (err) {
      lastErr = String(err);
      continue;
    }
  }

  logError('All models failed', { endpoint: '/api/log-activity', lastErr });
  res.status(502).json({ error: `Modello non disponibile (${lastErr})` });
}
