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
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      setTranscript((finalRef.current + interim).trim());
    };

    rec.onerror = (e: AnyRec) => {
      if (e.error !== 'no-speech') setError(`Errore microfono: ${e.error}`);
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
