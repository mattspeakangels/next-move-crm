/**
 * /api/transcribe — Trascrizione audio via Google Cloud Speech-to-Text
 *
 * Riceve chunk audio WEBM_OPUS (base64) registrati con MediaRecorder e
 * restituisce il testo trascritto. Sostituisce la Web Speech API del browser,
 * che su alcuni device Android (Samsung: parole duplicate; rugged phone senza
 * servizi vocali Google: not-allowed) non è affidabile.
 *
 * Env richieste: GOOGLE_SPEECH_API_KEY (API key ristretta a speech.googleapis.com),
 * ADMIN_API_TOKEN (stesso token bearer delle altre funzioni AI).
 */

import { applyCors, handleCorsPreFlight } from './cors.js';

const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Una conversazione lunga genera un chunk ogni ~45s → 80 chunk/ora.
const RATE_LIMIT = 150;
const RATE_WINDOW = 3600;

// 4 MB di base64 ≈ 3 MB di audio ≈ 12 minuti di opus a 32 kbps: ben oltre
// la durata di un singolo chunk, e sotto il limite body di Vercel (4.5 MB).
const MAX_AUDIO_B64_CHARS = 4 * 1024 * 1024;

async function checkTranscribeRateLimit(id: string): Promise<boolean> {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return true;
  try {
    const key = `ratelimit:transcribe:${id}`;
    const resp = await fetch(`${UPSTASH_REST_URL}/incr/${key}`, {
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
    });
    if (!resp.ok) return true;
    const { result } = await resp.json() as { result: number };
    if (result === 1) {
      await fetch(`${UPSTASH_REST_URL}/expire/${key}/${RATE_WINDOW}`, {
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
      });
    }
    return result <= RATE_LIMIT;
  } catch {
    return true;
  }
}

interface SpeechRecognizeResponse {
  results?: Array<{
    alternatives?: Array<{ transcript?: string }>;
  }>;
  error?: { message?: string };
}

export default async function handler(
  req: {
    method: string;
    headers: Record<string, string>;
    body: unknown;
  },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    setHeader: (name: string, value: string) => void;
    json: (data: unknown) => void;
  }
) {
  if (handleCorsPreFlight(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  const validToken = process.env.ADMIN_API_TOKEN;
  if (!token || !validToken || token !== validToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.GOOGLE_SPEECH_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_SPEECH_API_KEY non configurata' });
  }

  const allowed = await checkTranscribeRateLimit(token.slice(0, 16));
  if (!allowed) {
    return res.status(429).json({ error: 'Limite trascrizioni raggiunto, riprova più tardi' });
  }

  const { audio, languageCode } = (req.body ?? {}) as { audio?: string; languageCode?: string };
  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'Campo "audio" (base64) mancante' });
  }
  if (audio.length > MAX_AUDIO_B64_CHARS) {
    return res.status(413).json({ error: 'Audio troppo grande' });
  }

  try {
    const sttRes = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            audioChannelCount: 1,
            languageCode: languageCode === 'it-CH' ? 'it-CH' : 'it-IT',
            enableAutomaticPunctuation: true,
            model: 'latest_long',
          },
          audio: { content: audio },
        }),
      }
    );

    const data = await sttRes.json() as SpeechRecognizeResponse;

    if (!sttRes.ok) {
      console.error('[transcribe] Google STT error:', data.error?.message);
      return res.status(502).json({
        error: `Errore trascrizione: ${data.error?.message ?? `HTTP ${sttRes.status}`}`,
      });
    }

    const text = (data.results ?? [])
      .map(r => r.alternatives?.[0]?.transcript ?? '')
      .filter(Boolean)
      .join(' ')
      .trim();

    return res.status(200).json({ text });
  } catch (err) {
    console.error('[transcribe] error:', err);
    return res.status(500).json({ error: 'Errore interno trascrizione' });
  }
}
