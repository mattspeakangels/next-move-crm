import { useState } from 'react';
import { Mic } from 'lucide-react';
import { QuickLogPanel } from './QuickLogPanel';

/**
 * Bottone flottante globale "Registra attività": punto di ingresso unico per
 * registrare qualsiasi attività commerciale al volo, in linguaggio naturale
 * (voce o testo), da qualsiasi schermata dell'app.
 */
export function QuickLogFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Registra attività"
        title="Registra attività"
        className="fixed right-4 md:right-8 bottom-20 md:bottom-8 z-[80] w-14 h-14 rounded-full bg-[var(--accent-600)] text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Mic size={24} />
      </button>
      {open && <QuickLogPanel onClose={() => setOpen(false)} />}
    </>
  );
}
