import { useCallback, useRef, useState } from 'react';

// Percorso primario di dettatura per l'app: registra audio con MediaRecorder
// e lo trascrive server-side via /api/transcribe (Google STT), invece di
// affidarsi alla Web Speech API nativa del browser. Quest'ultima, su molte
// PWA installate su Android (WebAPK) e su device senza servizi vocali Google
// completi, fallisce con 'not-allowed'/'service-not-allowed' anche col
// permesso microfono correttamente concesso — bug noto, già risolto con lo
// stesso approccio in ConversationRecorder.tsx.

const RECORDER_MIME = 'audio/webm;codecs=opus';

interface Options {
  onFinal?: (text: string) => void;
}

export function useMediaRecorderVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onFinalRef = useRef<Options['onFinal']>(undefined);

  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined' &&
    MediaRecorder.isTypeSupported(RECORDER_MIME);

  const transcribe = async (blob: Blob): Promise<string> => {
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
    if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
    return ((data as { text?: string }).text ?? '').trim();
  };

  const start = useCallback(async (opts?: Options) => {
    onFinalRef.current = opts?.onFinal;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: RECORDER_MIME });
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: RECORDER_MIME });
        if (blob.size === 0) return;
        setIsTranscribing(true);
        try {
          const text = await transcribe(blob);
          if (text) onFinalRef.current?.(text);
          else setError('Nessun testo rilevato. Riprova parlando più vicino al microfono.');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Errore di trascrizione');
        } finally {
          setIsTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Permesso microfono negato. Abilitalo nelle impostazioni del sito/app e ricarica.');
      } else if (name === 'NotFoundError') {
        setError('Nessun microfono disponibile sul dispositivo.');
      } else {
        setError(err instanceof Error ? err.message : 'Errore di accesso al microfono.');
      }
    }
  }, []);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { isRecording, isTranscribing, error, isSupported, start, stop, reset };
}
