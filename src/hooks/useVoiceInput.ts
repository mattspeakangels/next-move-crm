import { useState, useRef, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;

interface VoiceInputOptions {
  onFinal?: (text: string) => void;
  continuous?: boolean;
}

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<AnyRec>(null);
  const finalRef = useRef('');

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback((opts?: VoiceInputOptions) => {
    const w = window as AnyRec;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { setError('SpeechRecognition non supportato'); return; }

    const rec = new SR();
    rec.lang = 'it-IT';
    rec.continuous = opts?.continuous ?? false;
    rec.interimResults = true;
    finalRef.current = '';

    rec.onresult = (event: AnyRec) => {
      // Su Android Chrome ogni evento onresult può ricontenere TUTTI i
      // risultati della sessione (resultIndex inaffidabile): il testo finale
      // va ricostruito da zero ad ogni evento invece di accumulare i delta,
      // altrimenti le stesse parole vengono ripetute più volte.
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      finalRef.current = final;
      setTranscript((final + interim).trim());
    };

    rec.onerror = (e: AnyRec) => {
      const map: Record<string, string> = {
        'not-allowed': 'Permesso microfono negato. Abilitalo nelle impostazioni del sito e ricarica la pagina.',
        'service-not-allowed': "Microfono non consentito dal browser. Su PWA installata prova ad aprire l'app in Chrome.",
        'audio-capture': 'Nessun microfono disponibile sul dispositivo.',
        'network': 'Errore di rete durante il riconoscimento vocale. Verifica la connessione.',
        'aborted': '',
        'no-speech': '',
      };
      const msg = e.error in map ? map[e.error] : `Errore microfono: ${e.error}`;
      if (msg) setError(msg);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
      const final = finalRef.current.trim();
      if (final && opts?.onFinal) opts.onFinal(final);
    };

    recRef.current = rec;
    setTranscript('');
    setError(null);
    setIsRecording(true);
    rec.start();
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
    finalRef.current = '';
  }, []);

  return { isRecording, transcript, error, isSupported, start, stop, reset };
}
