import React, { useState, useRef, useCallback } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import {
  Mic, Square, Sparkles, X, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, MessageSquare, Loader2, ClipboardList,
} from 'lucide-react';
import type { Contact, ProfilingData, Obiezione } from '../../types';

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
  prezzo: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'fornitore-attuale': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  qualita: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  timing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  brand: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  logistica: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  altro: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
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

  const [phase, setPhase] = useState<'idle' | 'recording' | 'manual' | 'analyzing' | 'done'>('idle');
  const [srStatus, setSrStatus] = useState<'connecting' | 'listening' | 'sound' | 'speech'>('connecting');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showObiezioni, setShowObiezioni] = useState(true);
  const [showProfiling, setShowProfiling] = useState(true);
  const [appliedFields, setAppliedFields] = useState<string[]>([]);

  const srRef = useRef<any>(null);
  const shouldRecordRef = useRef(false);
  const fullTranscriptRef = useRef('');
  const noResultsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

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
        if (shouldRecordRef.current && fullTranscriptRef.current === '') {
          setError('Nessun testo rilevato. Verifica che il microfono sia attivo e parla vicino al telefono. Puoi anche scrivere il testo manualmente.');
        }
      }, 18000);
    };

    sr.onaudiostart = () => setSrStatus('sound');
    sr.onspeechstart = () => setSrStatus('speech');
    sr.onspeechend = () => setSrStatus('listening');

    sr.onresult = (e: any) => {
      clearNoResultsTimer();
      let final = '';
      let int = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else int += e.results[i][0].transcript;
      }
      if (final) {
        fullTranscriptRef.current += final;
        setTranscript(fullTranscriptRef.current);
        setError(null);
      }
      setInterim(int);
    };

    sr.onend = () => {
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

  const startRecording = () => {
    shouldRecordRef.current = true;
    fullTranscriptRef.current = '';
    setTranscript('');
    setInterim('');
    setError(null);
    clearNoResultsTimer();

    if (!isSupported) {
      setPhase('manual');
      return;
    }
    setPhase('recording');
    startSR();
  };

  const stopRecording = () => {
    shouldRecordRef.current = false;
    srRef.current?.stop();
    setInterim('');
    clearNoResultsTimer();
    setPhase('idle');
  };

  const switchToManual = () => {
    shouldRecordRef.current = false;
    srRef.current?.stop();
    setInterim('');
    clearNoResultsTimer();
    setError(null);
    setPhase('manual');
  };

  // ── Claude Analysis ────────────────────────────────────────────────────────

  const analyze = async () => {
    const text = phase === 'manual' ? transcript : (transcript + (interim ? ' ' + interim : ''));
    if (!text.trim()) {
      setError('Nessun testo da analizzare. Registra o scrivi la conversazione prima.');
      return;
    }

    const apiKey = localStorage.getItem('claude_api_key');
    if (!apiKey) {
      setError('Inserisci la Claude API Key nelle Impostazioni per usare questa funzione.');
      return;
    }

    shouldRecordRef.current = false;
    srRef.current?.stop();
    setInterim('');
    setPhase('analyzing');
    setError(null);

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const prompt = buildPrompt(text, isDealer, contact.company);

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = (msg.content[0] as { text: string }).text.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Risposta non valida da Claude');

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
    onSave(transcript || interim, result);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <MessageSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white">Registra Conversazione</h2>
              <p className="text-[11px] text-gray-400 font-bold">{contact.company}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* ── IDLE ── */}
          {phase === 'idle' && (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Registra la conversazione con il cliente in tempo reale.<br />
                Claude AI estrarrà automaticamente <strong>dati di profilazione</strong> e <strong>obiezioni</strong>.
              </p>
              {isSupported ? (
                <button
                  onClick={startRecording}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900"
                >
                  <Mic size={20} />
                  Inizia Registrazione
                </button>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  Il riconoscimento vocale non è supportato da questo browser.<br />
                  Usa Chrome o Safari su mobile.
                </p>
              )}
              <button
                onClick={() => setPhase('manual')}
                className="block w-full text-center text-xs text-gray-400 hover:text-indigo-500 transition-colors mt-2 font-bold"
              >
                Preferisci scrivere manualmente →
              </button>
              {transcript && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Trascritto precedente</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{transcript}</p>
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
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-black text-red-600 dark:text-red-400">
                    {srStatus === 'connecting' && 'Connessione microfono...'}
                    {srStatus === 'listening' && 'In ascolto...'}
                    {srStatus === 'sound' && '🔊 Audio rilevato'}
                    {srStatus === 'speech' && '🗣️ Voce rilevata'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={switchToManual}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-black text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    ✏️ Scrivi
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-black hover:bg-gray-200 transition-colors"
                  >
                    <Square size={12} /> Stop
                  </button>
                </div>
              </div>

              {/* Transcript box */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 min-h-[160px] max-h-[300px] overflow-y-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {transcript || <span className="text-gray-300 dark:text-gray-600 italic">Parla vicino al microfono... il testo apparirà qui</span>}
                {interim && <span className="text-indigo-400 italic"> {interim}</span>}
              </div>

              <button
                onClick={analyze}
                disabled={!transcript && !interim}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} /> Stop e Analizza con Claude AI
              </button>
            </div>
          )}

          {/* ── MANUAL ── */}
          {phase === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Trascrivi o riassumi la conversazione
                </label>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder="Scrivi qui tutto ciò che è emerso dalla conversazione col cliente: problemi, obiezioni, interessi, accordi..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm dark:text-white outline-none resize-none min-h-[220px] focus:border-indigo-400"
                />
              </div>
              <button
                onClick={analyze}
                disabled={!transcript.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} /> Analizza con Claude AI
              </button>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {phase === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <Loader2 size={24} className="text-indigo-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-black text-gray-900 dark:text-white text-sm">Analisi in corso...</p>
                <p className="text-xs text-gray-400 mt-1">Claude sta estraendo profilazione e obiezioni</p>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {phase === 'done' && result && (
            <div className="space-y-4">

              {/* Riassunto */}
              {result.riassunto && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Riassunto Visita</p>
                  <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">{result.riassunto}</p>
                </div>
              )}

              {/* Dati Profilazione */}
              <div className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowProfiling(s => !s)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800"
                >
                  <span className="flex items-center gap-2 text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                    <ClipboardList size={13} />
                    Dati Profilazione Estratti
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[9px]">
                      {appliedFields.length} campi
                    </span>
                  </span>
                  {showProfiling ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>
                {showProfiling && (
                  <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
                    {appliedFields.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nessun campo estratto dalla conversazione.</p>
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
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-32 flex-shrink-0 mt-0.5">{field}</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex-1">{display}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Obiezioni */}
              {result.obiezioni.length > 0 && (
                <div className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setShowObiezioni(s => !s)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800"
                  >
                    <span className="flex items-center gap-2 text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                      <AlertCircle size={13} />
                      Obiezioni Rilevate
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-[9px]">
                        {result.obiezioni.length}
                      </span>
                    </span>
                    {showObiezioni ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </button>
                  {showObiezioni && (
                    <div className="p-4 space-y-3 bg-white dark:bg-gray-900">
                      {result.obiezioni.map((ob, i) => (
                        <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${CAT_BADGE[ob.categoria]}`}>
                              {CAT_LABEL[ob.categoria]}
                            </span>
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">&ldquo;{ob.testo}&rdquo;</p>
                          </div>
                          <div className="flex gap-2 items-start pl-1">
                            <span className="text-green-500 mt-0.5 flex-shrink-0 text-xs">→</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{ob.risposta}</p>
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
                  <summary className="text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600 transition-colors list-none flex items-center gap-1">
                    <ChevronDown size={10} className="group-open:rotate-180 transition-transform" />
                    Vedi trascrizione completa
                  </summary>
                  <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 max-h-[200px] overflow-y-auto">
                    <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{transcript}</p>
                  </div>
                </details>
              )}

              {/* CTA buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900"
                >
                  <CheckCircle size={16} /> Applica al Contatto
                </button>
                <button
                  onClick={() => { setPhase('idle'); setResult(null); }}
                  className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-sm hover:bg-gray-200 transition-colors"
                >
                  Scarta
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400">
                I dati estratti verranno <strong>uniti</strong> alla profilazione esistente senza sovrascrivere i campi già compilati.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-4">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 dark:text-red-300 font-bold">{error}</p>
                <div className="flex items-center gap-3 mt-2">
                  {phase !== 'manual' && (
                    <button
                      onClick={switchToManual}
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      ✏️ Scrivi manualmente
                    </button>
                  )}
                  <button onClick={() => setError(null)} className="text-xs text-red-400 hover:text-red-600">Chiudi</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
