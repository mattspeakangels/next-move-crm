import { DialogFrame } from '../ui/DialogFrame';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { callGeminiClient } from '../../lib/geminiClient';
import {
  Mic, Square, Sparkles, X, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, MessageSquare, Loader2, ClipboardList,
} from 'lucide-react';
import type { Contact, ProfilingData, Obiezione } from '../../types';
import { useStore } from '../../store/useStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEALER_PAIN_POINTS = [
  'Resi / difetti cucitura fornitore attuale',
  'Mancanza DPI Cat. III',
  'No supporto formativo ai venditori',
  'Margini insufficienti',
  'Gestione riordino macchinosa',
  'Nessun portale B2B',
  'No Brand premium riconoscibile',
  'Clienti finali chiedono qualità superiore',
  'Concorrenti zona trattano stesso brand',
];

const ENDUSER_PAIN_POINTS = [
  'Capi si rompono/logorano troppo presto',
  'Reclami RSPP su DPI non conformi',
  'Gestione taglie caotica',
  'Nessun controllo TCO/spesa reale',
  'Fornitore inaffidabile su consegne',
  'No logo / immagine coordinata',
  'Ispezione INAIL/ASL recente',
  'Cambio DVR imminente',
  'Nuovo cantiere / commessa PNRR',
];

const DEALER_PRODUCTS = [
  'Pantaloni 1990 X1900 (bestseller)',
  'Multinorma / Antifiamma (Cat. III)',
  'Alta Visibilità Cl.2-3',
  'Scarpe Elite / Striker (1970)',
  'Softshell 4491',
  'Linea Donna / Premaman',
  'Guanti tecnici',
  'B2B Webshop demo',
  'Gamma freddo (3 strati)',
  'Linea Service',
];

const ENDUSER_PRODUCTS = [
  'Pantaloni 1990 X1900',
  'Multinorma / Antifiamma (Cat. III)',
  'Alta Visibilità Cl.2-3',
  'Scarpe Elite / Striker',
  'Giacca Softshell 4491',
  'Linea Freddo (3 strati)',
  'Guanti tecnici Cat. III',
  'B2B Webshop demo',
  'Schede EN per DVR RSPP',
  'Linea Donna / Premaman',
  'Personalizzazione logo',
];

const BRANDS = ['Diadora', 'U-Power', 'Snickers', 'E.Strauss', 'Cofra', 'Kapriol', 'Sparco', 'Mascot', 'Fristads', 'Portwest', 'Clique', 'Helly Hansen', 'Altro'];

const CAT_BADGE: Record<Obiezione['categoria'], string> = {
  prezzo: 'bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger',
  'fornitore-attuale': 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning',
  qualita: 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning',
  timing: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent',
  brand: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent',
  logistica: 'bg-accent-soft text-accent',
  altro: 'bg-raised text-foreground dark:bg-raised dark:text-muted',
};

const CAT_LABEL: Record<Obiezione['categoria'], string> = {
  prezzo: 'Prezzo',
  'fornitore-attuale': 'Fornitore attuale',
  qualita: 'Qualità',
  timing: 'Timing',
  brand: 'Brand',
  logistica: 'Logistica',
  altro: 'Altro',
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(transcript: string, isDealer: boolean, contactName: string): string {
  const painList = isDealer ? DEALER_PAIN_POINTS : ENDUSER_PAIN_POINTS;
  const productList = isDealer ? DEALER_PRODUCTS : ENDUSER_PRODUCTS;

  const baseInstruction = `Sei un assistente commerciale per Blaklader Italia (workwear premium). Hai registrato una conversazione di vendita con "${contactName}", ${isDealer ? 'un RIVENDITORE/DEALER' : 'un CLIENTE FINALE (end-user azienda)'}.

Dal trascritto seguente, estrai tutte le informazioni rilevanti per la scheda di profilazione e identifica le obiezioni sollevate.

TRASCRITTO:
---
${transcript}
---

Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo:`;

  const qualShape = `{
      "esigenzaReale": numero 1-5,
      "decisionMaker": numero 1-5,
      "aperturaFornitore": numero 1-5,
      "timeline": numero 1-5,
      "budget": numero 1-5
    }`;

  const obiezioniShape = `[
    {
      "testo": "l'obiezione esatta o parafrasata del cliente",
      "categoria": "prezzo|fornitore-attuale|qualita|timing|brand|logistica|altro",
      "risposta": "risposta commerciale suggerita specifica per Blaklader, max 2 righe"
    }
  ]`;

  if (isDealer) {
    return `${baseInstruction}

{
  "profiling": {
    "segmento": ""|"A1"|"A2"|"A3"|"A4",
    "numDipendenti": "es. 12",
    "fatturatoEst": "es. €2M",
    "percWorkwear": ""|"<5%"|"5-15%"|"15-30%"|">30%"|"Non dichiarato",
    "brandAttuali": ["solo brand da questa lista: ${BRANDS.join(', ')}"],
    "brandDominante": "brand principale citato",
    "dpiCatIII": ""|"no"|"soloScarpe"|"siParziale"|"siCompleto",
    "reclamiResi": ""|"no"|"si",
    "reclamiMotivo": "...",
    "painPoints": ["solo da questa lista esatta: ${painList.map(p => `"${p}"`).join(', ')}"],
    "painPrioritario": "il problema principale emerso",
    "fraseEsatta": "le parole più significative del cliente, virgolette",
    "prodottiInteresse": ["solo da questa lista: ${productList.map(p => `"${p}"`).join(', ')}"],
    "competitor": [{"brand": "...", "tone": "positivo|neutro|negativo"}],
    "qualificazione": ${qualShape},
    "noteQualificazione": "...",
    "nextStepData": "azione/data concordata"
  },
  "obiezioni": ${obiezioniShape},
  "riassunto": "2-3 righe che sintetizzano l'esito"
}

Regole: includi SOLO i campi dove hai trovato informazioni concrete. I painPoints devono corrispondere ESATTAMENTE alle stringhe della lista. Per la qualificazione: 1=molto sfavorevole, 5=molto favorevole. Non inventare nulla.`;
  } else {
    return `${baseInstruction}

{
  "profiling": {
    "rsppNome": "...",
    "respAcquisti": "...",
    "numDipendentiTotali": "es. 85",
    "numDipendentiDPI": "es. 60",
    "fatturatoStimato": ""|"<1M€"|"1-5M€"|"5-20M€"|"20-100M€"|">100M€",
    "livelloDPI": ""|"catI"|"catII"|"catIII"|"nonSanno",
    "rischiSpecifici": ["Antifiamma","Arco elettrico","Schizzi metallo fuso","Rischio chimico","Alta visibilità","Lavoro in quota","Freddo / intemperie","Abrasione meccanica"],
    "dvrAggiornato": ""|"si"|"no"|"nonSa",
    "ispezioniRecenti": ""|"no"|"si",
    "ispezioniEsito": "...",
    "fornitoreAttuale": "es. U-Power tramite dealer locale",
    "frequenzaRinnovo": ""|"Quando si rompe"|"Ogni 6 mesi"|"Annuale"|"Contratto quadro"|"Non definita",
    "durataMediaCapo": "es. 8 mesi",
    "spesaDipAnno": "es. €120",
    "lamenteleLavoratori": "...",
    "painPoints": ["solo da questa lista esatta: ${painList.map(p => `"${p}"`).join(', ')}"],
    "painPrioritario": "il problema principale emerso",
    "fraseEsatta": "le parole più significative del cliente",
    "prodottiInteresse": ["solo da questa lista: ${productList.map(p => `"${p}"`).join(', ')}"],
    "qualificazione": ${qualShape},
    "noteQualificazione": "...",
    "nextStepData": "azione/data concordata"
  },
  "obiezioni": ${obiezioniShape},
  "riassunto": "2-3 righe che sintetizzano l'esito"
}

Regole: includi SOLO i campi dove hai trovato informazioni concrete. I painPoints devono corrispondere ESATTAMENTE alle stringhe della lista. Non inventare nulla.`;
  }
}

// ─── Merge helper ─────────────────────────────────────────────────────────────

export function mergeProfilingPatch(
  existing: ProfilingData,
  patch: Record<string, unknown>,
  newObiezioni: Obiezione[],
): ProfilingData {
  const result: any = { ...existing };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;

    if (key === 'qualificazione' && typeof value === 'object' && !Array.isArray(value)) {
      result.qualificazione = { ...result.qualificazione };
      for (const [qk, qv] of Object.entries(value as Record<string, number>)) {
        if (typeof qv === 'number' && qv > 1) result.qualificazione[qk] = qv;
      }
      continue;
    }

    if (key === 'competitor' && Array.isArray(value)) {
      const existing_arr: any[] = result[key] || [];
      const merged = [...existing_arr];
      for (const item of value as any[]) {
        if (!merged.some(e => e.brand === item.brand)) merged.push(item);
      }
      result[key] = merged;
      continue;
    }

    if (Array.isArray(value)) {
      const existing_arr: string[] = result[key] || [];
      result[key] = [...new Set([...existing_arr, ...(value as string[])])];
      continue;
    }

    result[key] = value;
  }

  // Merge obiezioni (deduplicate by testo)
  const existingOb: Obiezione[] = result.obiezioni || [];
  const merged: Obiezione[] = [...existingOb];
  for (const ob of newObiezioni) {
    if (!merged.some(e => e.testo === ob.testo)) merged.push(ob);
  }
  result.obiezioni = merged;

  return result as ProfilingData;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  profiling: Record<string, unknown>;
  obiezioni: Obiezione[];
  riassunto: string;
}

interface ConversationRecorderProps {
  contact: Contact;
  onClose: () => void;
  onSave: (transcript: string, result: AnalysisResult) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ConversationRecorder: React.FC<ConversationRecorderProps> = ({
  contact,
  onClose,
  onSave,
}) => {
  const isDealer = contact.customerType === 'dealer' || contact.segment === 'dealer';

  const [phase, setPhase] = useState<'idle' | 'recording' | 'stopped' | 'manual' | 'analyzing' | 'done'>('idle');
  const [srStatus, setSrStatus] = useState<'connecting' | 'listening' | 'sound' | 'speech'>('connecting');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showObiezioni, setShowObiezioni] = useState(true);
  const [showProfiling, setShowProfiling] = useState(true);
  const [appliedFields, setAppliedFields] = useState<string[]>([]);
  const [liveStats, setLiveStats] = useState({ transcribed: 0, pending: 0, failed: 0, processing: false });
  const [recoveredDraft, setRecoveredDraft] = useState(false);

  const srRef = useRef<any>(null);
  const shouldRecordRef = useRef(false);
  const fullTranscriptRef = useRef('');      // testo finalizzato dalle sessioni SR già concluse
  const sessionFinalRef = useRef('');        // finale della sessione SR corrente (ricostruito ad ogni evento)
  const noResultsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // MediaRecorder (percorso primario: registrazione audio + trascrizione server)
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);
  const lastChunkDoneRef = useRef<(() => void) | null>(null);
  const recStartRef = useRef(0);
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Coda di trascrizione "live": ogni chunk audio viene trascritto non appena pronto,
  // durante la registrazione stessa, invece di aspettare lo Stop — così se qualcosa va
  // storto (reload, crash, tab chiusa) si perde al massimo l'ultimo blocco non ancora
  // processato, non l'intera conversazione.
  const pendingChunksRef = useRef<Blob[]>([]);
  const failedChunksRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);
  const draftKey = `nm_conv_draft_${contact.id}`;

  // Google STT (v1) accetta WEBM_OPUS: disponibile su Chrome/Android e desktop.
  // Su Safari iOS MediaRecorder produce mp4/aac → fallback alla Web Speech API.
  const RECORDER_MIME = 'audio/webm;codecs=opus';
  // La rotazione dei chunk è guidata dagli slice audio di MediaRecorder, NON da
  // setTimeout: con lo schermo spento i timer vengono rallentati dal browser e
  // un chunk oltre 60s verrebbe rifiutato dal recognize sincrono di Google.
  const SLICE_MS = 1_000;
  const SLICES_PER_CHUNK = 45;

  const mediaSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined' &&
    MediaRecorder.isTypeSupported(RECORDER_MIME);

  const srSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const isSupported = mediaSupported || srSupported;

  // ── SpeechRecognition ──────────────────────────────────────────────────────

  const clearNoResultsTimer = () => {
    if (noResultsTimerRef.current) {
      clearTimeout(noResultsTimerRef.current);
      noResultsTimerRef.current = null;
    }
  };

  const startSR = useCallback(() => {
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    const sr = new SR();
    sr.lang = 'it-IT';
    sr.continuous = true;
    sr.interimResults = true;

    setSrStatus('connecting');

    sr.onstart = () => {
      setSrStatus('listening');
      // Se non arriva nulla entro 18s dall'avvio, mostra avviso
      noResultsTimerRef.current = setTimeout(() => {
        if (shouldRecordRef.current && fullTranscriptRef.current === '' && sessionFinalRef.current === '') {
          setError('Nessun testo rilevato. Verifica che il microfono sia attivo e parla vicino al telefono. Puoi anche scrivere il testo manualmente.');
        }
      }, 18000);
    };

    sr.onaudiostart = () => setSrStatus('sound');
    sr.onspeechstart = () => setSrStatus('speech');
    sr.onspeechend = () => setSrStatus('listening');

    sr.onresult = (e: any) => {
      clearNoResultsTimer();
      // Su Android Chrome (continuous) ogni evento onresult contiene TUTTI i
      // risultati della sessione corrente: ricostruiamo il finale da zero ad
      // ogni evento invece di accumulare i delta, altrimenti le stesse parole
      // vengono aggiunte più volte (bug "parole doppie/quadruple").
      let sessionFinal = '';
      let int = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) sessionFinal += r[0].transcript + ' ';
        else int += r[0].transcript;
      }
      sessionFinalRef.current = sessionFinal;
      setTranscript(fullTranscriptRef.current + sessionFinal);
      if (sessionFinal) setError(null);
      setInterim(int);
    };

    sr.onend = () => {
      // Consolida il finale di questa sessione prima del riavvio, così il
      // prossimo evento (che riparte da zero) non lo riscrive.
      fullTranscriptRef.current += sessionFinalRef.current;
      sessionFinalRef.current = '';
      setInterim('');
      if (shouldRecordRef.current) {
        setTimeout(() => {
          if (shouldRecordRef.current) startSR();
        }, 400);
      }
    };

    sr.onerror = (e: any) => {
      if (e.error === 'aborted') return;
      if (e.error === 'no-speech') {
        // normale — SR si riavvia da onend
        return;
      }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Permesso microfono negato. Abilita il microfono nelle impostazioni del browser, poi riprova.');
        shouldRecordRef.current = false;
        setPhase('idle');
        clearNoResultsTimer();
        return;
      }
      if (e.error === 'network') {
        setError('Errore di rete: il riconoscimento vocale richiede una connessione internet. Verifica la connessione o usa la scrittura manuale.');
        shouldRecordRef.current = false;
        setPhase('manual');
        clearNoResultsTimer();
        return;
      }
      if (e.error === 'audio-capture') {
        setError('Microfono non rilevato. Verifica che il dispositivo abbia un microfono attivo.');
        shouldRecordRef.current = false;
        setPhase('idle');
        clearNoResultsTimer();
        return;
      }
      // Errore sconosciuto — log + offri manuale
      console.warn('[SR] error:', e.error);
      setError(`Errore riconoscimento vocale (${e.error}). Puoi scrivere il testo manualmente.`);
    };

    sr.start();
    srRef.current = sr;
  }, []);

  // ── MediaRecorder + trascrizione server (/api/transcribe) ─────────────────

  const transcribeBlob = async (blob: Blob): Promise<string> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve((fr.result as string).split(',')[1] ?? '');
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_ADMIN_API_TOKEN}`,
      },
      body: JSON.stringify({ audio: base64 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
    }
    return ((data as { text?: string }).text ?? '').trim();
  };

  const persistDraft = useCallback((text: string) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ transcript: text, updatedAt: Date.now() }));
    } catch {
      // storage pieno o non disponibile: non blocchiamo la trascrizione per questo
    }
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(draftKey); } catch { /* ignora */ }
  }, [draftKey]);

  const transcribeBlobWithRetry = async (blob: Blob, maxAttempts = 3): Promise<string> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await transcribeBlob(blob);
      } catch (err) {
        lastErr = err;
        if (attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastErr;
  };

  /** Processa in sequenza i chunk in coda, trascrivendoli e accodando il testo man mano
   * che arriva. Il testo viene salvato subito in localStorage: se la sessione si interrompe
   * a metà, alla riapertura si ritrova quanto già trascritto invece di perderlo. */
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setLiveStats(s => ({ ...s, processing: true }));
    while (pendingChunksRef.current.length > 0) {
      const blob = pendingChunksRef.current.shift()!;
      try {
        const t = await transcribeBlobWithRetry(blob);
        if (t) {
          setTranscript(prev => {
            const next = (prev + (prev ? ' ' : '') + t).trim();
            fullTranscriptRef.current = next;
            persistDraft(next);
            return next;
          });
        }
        setLiveStats(s => ({ ...s, transcribed: s.transcribed + 1, pending: pendingChunksRef.current.length }));
      } catch (err) {
        console.warn('[ConversationRecorder] chunk non trascritto dopo 3 tentativi:', err);
        failedChunksRef.current.push(blob);
        setLiveStats(s => ({ ...s, failed: s.failed + 1, pending: pendingChunksRef.current.length }));
      }
    }
    processingRef.current = false;
    setLiveStats(s => ({ ...s, processing: false }));
  }, [persistDraft]);

  const enqueueChunk = useCallback((blob: Blob) => {
    pendingChunksRef.current.push(blob);
    setLiveStats(s => ({ ...s, pending: pendingChunksRef.current.length }));
    void processQueue();
  }, [processQueue]);

  const retryFailedChunks = useCallback(() => {
    if (failedChunksRef.current.length === 0) return;
    const toRetry = failedChunksRef.current;
    failedChunksRef.current = [];
    pendingChunksRef.current.push(...toRetry);
    setLiveStats(s => ({ ...s, failed: 0, pending: pendingChunksRef.current.length }));
    void processQueue();
  }, [processQueue]);

  const startChunk = useCallback((stream: MediaStream) => {
    const rec = new MediaRecorder(stream, {
      mimeType: RECORDER_MIME,
      audioBitsPerSecond: 32_000,
    });
    const parts: Blob[] = [];
    rec.ondataavailable = e => {
      if (e.data.size > 0) parts.push(e.data);
      // Ruota il chunk in base agli slice ricevuti dal flusso audio: funziona
      // anche a schermo spento, dove i timer JS non sono affidabili.
      if (parts.length >= SLICES_PER_CHUNK && rec.state === 'recording') rec.stop();
    };
    rec.onstop = () => {
      const blob = new Blob(parts, { type: RECORDER_MIME });
      if (blob.size >= 2000) enqueueChunk(blob);
      lastChunkDoneRef.current?.();
      lastChunkDoneRef.current = null;
      if (shouldRecordRef.current && stream.active) {
        startChunk(stream);
      }
    };
    rec.start(SLICE_MS);
    activeRecorderRef.current = rec;
  }, [enqueueChunk]);

  /** Ferma recorder e microfono; risolve quando l'ultimo chunk è stato salvato. */
  const finishMediaRecording = useCallback((): Promise<void> => {
    shouldRecordRef.current = false;
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }

    const rec = activeRecorderRef.current;
    const stopStream = () => {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
      activeRecorderRef.current = null;
    };

    if (!rec || rec.state !== 'recording') {
      stopStream();
      return Promise.resolve();
    }
    return new Promise<void>(resolve => {
      lastChunkDoneRef.current = () => { stopStream(); resolve(); };
      rec.stop();
    });
  }, []);

  const startMediaRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      mediaStreamRef.current = stream;
      shouldRecordRef.current = true;
      setPhase('recording');
      setSrStatus('speech');
      setRecSeconds(0);
      // Durata calcolata da Date.now(): l'interval serve solo a rinfrescare la
      // UI e può essere rallentato in background senza falsare il conteggio.
      recStartRef.current = Date.now();
      recTimerRef.current = setInterval(
        () => setRecSeconds(Math.round((Date.now() - recStartRef.current) / 1000)),
        1000,
      );
      startChunk(stream);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setError('Permesso microfono negato. Abilita il microfono nelle impostazioni del browser/app, poi riprova.');
      } else if (err?.name === 'NotFoundError') {
        setError('Microfono non rilevato. Verifica che il dispositivo abbia un microfono attivo.');
      } else {
        setError(`Impossibile avviare la registrazione (${err?.name ?? 'errore'}). Puoi scrivere il testo manualmente.`);
      }
      setPhase('idle');
    }
  };

  const startRecording = () => {
    shouldRecordRef.current = true;
    fullTranscriptRef.current = '';
    sessionFinalRef.current = '';
    setTranscript('');
    setInterim('');
    setError(null);
    clearNoResultsTimer();
    pendingChunksRef.current = [];
    failedChunksRef.current = [];
    setLiveStats({ transcribed: 0, pending: 0, failed: 0, processing: false });
    setRecoveredDraft(false);
    clearDraft();

    if (mediaSupported) {
      void startMediaRecording();
      return;
    }
    if (!srSupported) {
      setPhase('manual');
      return;
    }
    setPhase('recording');
    startSR();
  };

  const stopRecording = async () => {
    const wasMedia = !!activeRecorderRef.current || !!mediaStreamRef.current;
    shouldRecordRef.current = false;
    srRef.current?.stop();
    setInterim('');
    clearNoResultsTimer();
    if (wasMedia) {
      setRecSeconds(Math.round((Date.now() - recStartRef.current) / 1000));
      await finishMediaRecording();
      setPhase('stopped');
    } else {
      setPhase('idle');
    }
  };

  // La trascrizione dei chunk avviene già "live" durante la registrazione (enqueueChunk).
  // Quando si preme Stop restano al più uno o due chunk in coda: appena la coda si svuota
  // si passa automaticamente alla fase di revisione manuale del testo.
  useEffect(() => {
    if (phase === 'stopped' && liveStats.pending === 0 && !liveStats.processing) {
      setPhase('manual');
    }
  }, [phase, liveStats.pending, liveStats.processing]);

  // Recupera automaticamente una trascrizione rimasta a metà per un'interruzione precedente
  // (reload, crash, chiusura accidentale) — salvata in localStorage man mano che arriva.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.transcript) {
          setTranscript(draft.transcript);
          fullTranscriptRef.current = draft.transcript;
          setRecoveredDraft(true);
        }
      }
    } catch { /* ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchToManual = () => {
    shouldRecordRef.current = false;
    srRef.current?.stop();
    void finishMediaRecording();
    setInterim('');
    clearNoResultsTimer();
    setError(null);
    setPhase('manual');
  };

  // Rilascia microfono e recorder se il modale viene chiuso durante la registrazione
  useEffect(() => () => {
    shouldRecordRef.current = false;
    srRef.current?.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    if (activeRecorderRef.current?.state === 'recording') activeRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // ── Claude Analysis ────────────────────────────────────────────────────────

  const analyze = async () => {
    const apiKey = useStore.getState().claudeApiKey.trim();
    if (!apiKey) {
      setError('API Key assente. Vai in Impostazioni → Gemini AI e inserisci la tua chiave Gemini.');
      return;
    }

    shouldRecordRef.current = false;
    srRef.current?.stop();
    clearNoResultsTimer();
    setPhase('analyzing');
    setError(null);

    await finishMediaRecording();

    const text = phase === 'manual'
      ? transcript
      : (fullTranscriptRef.current + sessionFinalRef.current + (interim ? ' ' + interim : ''));
    if (!text.trim()) {
      setError('Nessun testo da analizzare. Registra o scrivi la conversazione prima.');
      setPhase(phase === 'manual' ? 'manual' : 'idle');
      return;
    }
    setInterim('');

    try {
      const prompt = buildPrompt(text, isDealer, contact.company);

      const raw = (await callGeminiClient(apiKey, prompt, 2048)).trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Risposta non valida da Gemini');

      const parsed = JSON.parse(match[0]);

      const fields: string[] = [];
      if (parsed.profiling) {
        for (const [k, v] of Object.entries(parsed.profiling)) {
          if (v === undefined || v === null) continue;
          if (typeof v === 'string' && v.trim() === '') continue;
          if (Array.isArray(v) && v.length === 0) continue;
          if (k === 'qualificazione' && typeof v === 'object') {
            const allDefault = Object.values(v as Record<string, number>).every(n => n <= 1);
            if (!allDefault) fields.push(k);
            continue;
          }
          fields.push(k);
        }
      }
      setAppliedFields(fields);

      setResult({
        profiling: parsed.profiling ?? {},
        obiezioni: Array.isArray(parsed.obiezioni) ? parsed.obiezioni : [],
        riassunto: parsed.riassunto ?? '',
      });
      setPhase('done');
    } catch (err: any) {
      setError(`Errore analisi: ${err.message ?? 'Riprovare'}`);
      setPhase(transcript ? 'idle' : 'idle');
    }
  };

  // ── Apply ──────────────────────────────────────────────────────────────────

  const handleApply = () => {
    if (!result) return;
    clearDraft();
    onSave(transcript || interim, result);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DialogFrame
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface dark:bg-canvas w-full sm:max-w-2xl sm:rounded-panel rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-panel">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line dark:border-line sticky top-0 bg-surface dark:bg-canvas z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-panel bg-accent-soft dark:bg-accent-soft/40 flex items-center justify-center">
              <MessageSquare size={16} className="text-accent dark:text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground dark:text-foreground">Registra Conversazione</h2>
              <p className="text-xs text-muted font-bold">{contact.company}</p>
            </div>
          </div>
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="p-2 rounded-md hover:bg-raised dark:hover:bg-surface transition-colors">
            <X size={20} className="text-muted" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* ── IDLE ── */}
          {phase === 'idle' && (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-secondary dark:text-muted">
                Registra la conversazione con il cliente in tempo reale.<br />
                Claude AI estrarrà automaticamente <strong>dati di profilazione</strong> e <strong>obiezioni</strong>.
              </p>
              {isSupported ? (
                <button
                  onClick={startRecording}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-panel bg-action text-action-foreground font-semibold text-base hover:bg-action-hover transition-all shadow-panel  "
                >
                  <Mic size={20} />
                  Inizia Registrazione
                </button>
              ) : (
                <p className="text-xs text-warning dark:text-warning font-bold bg-warning-soft dark:bg-warning-soft rounded-md p-3">
                  Il riconoscimento vocale non è supportato da questo browser.<br />
                  Usa Chrome o Safari su mobile.
                </p>
              )}
              <button
                onClick={() => setPhase('manual')}
                className="block w-full text-center text-xs text-muted hover:text-accent transition-colors mt-2 font-bold"
              >
                Preferisci scrivere manualmente →
              </button>
              {transcript && (
                <div className="mt-4 bg-canvas dark:bg-surface rounded-panel p-4 text-left">
                  <p className="text-xs font-semibold text-muted uppercase tracking-normal mb-2">
                    {recoveredDraft ? 'Trascrizione recuperata da un\'interruzione precedente' : 'Trascritto precedente'}
                  </p>
                  <p className="text-sm text-foreground dark:text-muted whitespace-pre-wrap">{transcript}</p>
                  {recoveredDraft && (
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => setPhase('manual')}
                        className="text-xs font-semibold text-accent hover:text-accent transition-colors"
                      >
                        Continua a modificare →
                      </button>
                      <button
                        onClick={() => { clearDraft(); setTranscript(''); fullTranscriptRef.current = ''; setRecoveredDraft(false); }}
                        className="text-xs font-semibold text-muted hover:text-danger transition-colors"
                      >
                        Elimina bozza
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── RECORDING ── */}
          {phase === 'recording' && (
            <div className="space-y-4">
              {/* Status bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
                  <span className="text-sm font-semibold text-danger dark:text-danger">
                    {mediaSupported ? (
                      <>
                        REC {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
                        {(liveStats.transcribed > 0 || liveStats.pending > 0) && (
                          <span className="ml-2 text-xs font-bold text-muted normal-case">
                            {liveStats.transcribed} trascritti{liveStats.pending > 0 ? ` · ${liveStats.pending} in coda` : ''}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {srStatus === 'connecting' && 'Connessione microfono...'}
                        {srStatus === 'listening' && 'In ascolto...'}
                        {srStatus === 'sound' && '🔊 Audio rilevato'}
                        {srStatus === 'speech' && '🗣️ Voce rilevata'}
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={switchToManual}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-muted hover:text-secondary hover:bg-raised dark:hover:bg-surface transition-colors"
                  >
                    ✏️ Scrivi
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-raised dark:bg-surface text-secondary dark:text-muted text-xs font-semibold hover:bg-raised transition-colors"
                  >
                    <Square size={12} /> Stop
                  </button>
                </div>
              </div>

              {/* Transcript box */}
              <div className="bg-canvas dark:bg-surface rounded-panel p-4 min-h-[160px] max-h-[300px] overflow-y-auto text-sm text-foreground dark:text-muted whitespace-pre-wrap leading-relaxed">
                {transcript || (
                  <span className="text-muted dark:text-secondary italic">
                    {mediaSupported
                      ? 'Sto registrando l’audio. Puoi spegnere lo schermo o mettere il telefono in tasca: la registrazione continua. La trascrizione appare qui man mano, blocco per blocco.'
                      : 'Parla vicino al microfono... il testo apparirà qui'}
                  </span>
                )}
                {interim && <span className="text-accent italic"> {interim}</span>}
              </div>

              {mediaSupported ? (
                <button
                  onClick={stopRecording}
                  disabled={recSeconds < 2}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-panel bg-danger text-status-foreground font-semibold text-sm hover:bg-danger transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Square size={16} /> Termina Registrazione
                </button>
              ) : (
                <button
                  onClick={analyze}
                  disabled={!transcript && !interim}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles size={16} /> Stop e Analizza con Claude AI
                </button>
              )}
            </div>
          )}

          {/* ── STOPPED — registrazione terminata: la trascrizione avviene già live durante
              la registrazione, qui si aspetta solo che si svuoti la coda residua ── */}
          {phase === 'stopped' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 mx-auto rounded-panel bg-accent-soft dark:bg-accent-soft/40 flex items-center justify-center">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-foreground dark:text-foreground text-sm">Completamento trascrizione…</p>
                <p className="text-xs text-muted mt-1">
                  Durata {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
                  {liveStats.pending > 0 && ` · ${liveStats.pending} ${liveStats.pending === 1 ? 'blocco rimasto' : 'blocchi rimasti'}`}
                </p>
                {liveStats.failed > 0 && (
                  <p className="text-xs text-warning font-bold mt-1">
                    {liveStats.failed} {liveStats.failed === 1 ? 'blocco non trascritto' : 'blocchi non trascritti'} — riprova disponibile nel testo
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={startRecording}
                  className="text-xs font-semibold text-muted hover:text-accent transition-colors"
                >
                  🎙 Registra di nuovo
                </button>
                <button
                  onClick={() => { pendingChunksRef.current = []; failedChunksRef.current = []; clearDraft(); setPhase('idle'); }}
                  className="text-xs font-semibold text-muted hover:text-danger transition-colors"
                >
                  Scarta
                </button>
              </div>
            </div>
          )}

          {/* ── MANUAL ── */}
          {phase === 'manual' && (
            <div className="space-y-4">
              {liveStats.failed > 0 && (
                <div className="flex items-center justify-between bg-warning-soft dark:bg-warning-soft rounded-panel px-4 py-3">
                  <p className="text-xs font-bold text-warning dark:text-warning">
                    {liveStats.failed} {liveStats.failed === 1 ? 'blocco audio non trascritto' : 'blocchi audio non trascritti'}
                  </p>
                  <button
                    onClick={retryFailedChunks}
                    disabled={liveStats.processing}
                    className="text-xs font-semibold text-warning hover:text-warning transition-colors disabled:opacity-40"
                  >
                    {liveStats.processing ? 'Riprovo...' : 'Riprova →'}
                  </button>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">
                  Trascrivi o riassumi la conversazione
                </label>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder="Scrivi qui tutto ciò che è emerso dalla conversazione col cliente: problemi, obiezioni, interessi, accordi..."
                  className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-panel p-4 text-sm dark:text-foreground outline-none resize-none min-h-[220px] focus:border-accent"
                />
              </div>
              <button
                onClick={analyze}
                disabled={!transcript.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} /> Analizza con Claude AI
              </button>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {phase === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 rounded-panel bg-accent-soft dark:bg-accent-soft/40 flex items-center justify-center">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground dark:text-foreground text-sm">Analisi in corso...</p>
                <p className="text-xs text-muted mt-1">Claude sta estraendo profilazione e obiezioni</p>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {phase === 'done' && result && (
            <div className="space-y-4">

              {/* Riassunto */}
              {result.riassunto && (
                <div className="bg-accent-soft dark:bg-accent-soft/20 rounded-panel p-4 border border-accent dark:border-accent">
                  <p className="text-xs font-semibold text-accent uppercase tracking-normal mb-1.5">Riassunto Visita</p>
                  <p className="text-sm text-accent dark:text-accent font-medium leading-relaxed">{result.riassunto}</p>
                </div>
              )}

              {/* Dati Profilazione */}
              <div className="border-2 border-line dark:border-line rounded-panel overflow-hidden">
                <button
                  onClick={() => setShowProfiling(s => !s)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-canvas dark:bg-surface"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-secondary dark:text-muted uppercase tracking-normal">
                    <ClipboardList size={13} />
                    Dati Profilazione Estratti
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent text-xs">
                      {appliedFields.length} campi
                    </span>
                  </span>
                  {showProfiling ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                </button>
                {showProfiling && (
                  <div className="p-4 space-y-2 bg-surface dark:bg-canvas">
                    {appliedFields.length === 0 ? (
                      <p className="text-xs text-muted italic">Nessun campo estratto dalla conversazione.</p>
                    ) : (
                      appliedFields.map(field => {
                        const val = (result.profiling as any)[field];
                        const display = Array.isArray(val)
                          ? val.map((v: any) => typeof v === 'object' ? `${v.brand} (${v.tone})` : v).join(' · ')
                          : typeof val === 'object'
                            ? Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(' · ')
                            : String(val);
                        return (
                          <div key={field} className="flex gap-3 items-start">
                            <span className="text-xs font-semibold text-muted uppercase tracking-normal w-32 flex-shrink-0 mt-0.5">{field}</span>
                            <span className="text-xs text-foreground dark:text-muted font-medium flex-1">{display}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Obiezioni */}
              {result.obiezioni.length > 0 && (
                <div className="border-2 border-line dark:border-line rounded-panel overflow-hidden">
                  <button
                    onClick={() => setShowObiezioni(s => !s)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-canvas dark:bg-surface"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-secondary dark:text-muted uppercase tracking-normal">
                      <AlertCircle size={13} />
                      Obiezioni Rilevate
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-danger-soft dark:bg-danger-soft text-danger dark:text-danger text-xs">
                        {result.obiezioni.length}
                      </span>
                    </span>
                    {showObiezioni ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                  </button>
                  {showObiezioni && (
                    <div className="p-4 space-y-3 bg-surface dark:bg-canvas">
                      {result.obiezioni.map((ob, i) => (
                        <div key={i} className="border border-line dark:border-line rounded-xl p-3 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${CAT_BADGE[ob.categoria]}`}>
                              {CAT_LABEL[ob.categoria]}
                            </span>
                            <p className="text-xs font-bold text-foreground dark:text-muted">&ldquo;{ob.testo}&rdquo;</p>
                          </div>
                          <div className="flex gap-2 items-start pl-1">
                            <span className="text-success mt-0.5 flex-shrink-0 text-xs">→</span>
                            <p className="text-xs text-secondary dark:text-muted italic">{ob.risposta}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Transcript preview */}
              {transcript && (
                <details className="group">
                  <summary className="text-xs font-semibold text-muted uppercase tracking-normal cursor-pointer hover:text-secondary transition-colors list-none flex items-center gap-1">
                    <ChevronDown size={10} className="group-open:rotate-180 transition-transform" />
                    Vedi trascrizione completa
                  </summary>
                  <div className="mt-2 bg-canvas dark:bg-surface rounded-panel p-4 max-h-[200px] overflow-y-auto">
                    <p className="text-xs text-secondary dark:text-muted whitespace-pre-wrap leading-relaxed">{transcript}</p>
                  </div>
                </details>
              )}

              {/* CTA buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-all shadow-panel  "
                >
                  <CheckCircle size={16} /> Applica al Contatto
                </button>
                <button
                  onClick={() => { setPhase('idle'); setResult(null); }}
                  className="px-4 py-3 rounded-panel bg-raised dark:bg-surface text-secondary dark:text-muted font-semibold text-sm hover:bg-raised transition-colors"
                >
                  Scarta
                </button>
              </div>
              <p className="text-center text-xs text-muted">
                I dati estratti verranno <strong>uniti</strong> alla profilazione esistente senza sovrascrivere i campi già compilati.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-danger-soft dark:bg-danger-soft border border-danger dark:border-danger rounded-panel p-4">
              <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-danger dark:text-danger font-bold">{error}</p>
                <div className="flex items-center gap-3 mt-2">
                  {phase !== 'manual' && (
                    <button
                      onClick={switchToManual}
                      className="text-xs font-semibold text-accent dark:text-accent hover:underline"
                    >
                      ✏️ Scrivi manualmente
                    </button>
                  )}
                  <button onClick={() => setError(null)} className="text-xs text-danger hover:text-danger">Chiudi</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DialogFrame>
  );
};
