import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Compass, X } from 'lucide-react';
import type { NavView } from '../types';
import { sectionOf } from '../lib/navSections';
import { markTourDone, stepsForRole } from '../lib/guidedTour';

interface Props {
  role: string | null;
  onNavigate: (view: NavView) => void;
  onClose: () => void;
}

// Attributo (non classe): React riscrive className quando la voce diventa attiva
const HIGHLIGHT = 'data-tour-highlight';

/**
 * Visita guidata: apre una dopo l'altra le schermate dell'app e mostra una scheda
 * che spiega cosa si fa in ognuna. La schermata resta visibile e utilizzabile sotto.
 */
export function GuidedTour({ role, onNavigate, onClose }: Props) {
  const steps = useMemo(() => stepsForRole(role), [role]);
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const centered = isFirst || (isLast && !step.target);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const finish = () => { markTourDone(); onClose(); };
  const next = () => (isLast ? finish() : setIndex(i => i + 1));
  const prev = () => setIndex(i => Math.max(0, i - 1));

  // Apre la schermata del passo
  useEffect(() => { if (step.view) onNavigate(step.view); }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Evidenzia la voce di menu della schermata (o l'elemento indicato dal passo)
  useEffect(() => {
    const selector = step.target ?? (step.view && !centered ? `[data-tour-section="${sectionOf(step.view)}"]` : null);
    if (!selector) return;
    // la vista è caricata in differita: si riprova finché l'elemento compare
    let nodes: Element[] = [];
    const apply = () => {
      nodes = Array.from(document.querySelectorAll(selector));
      nodes.forEach(n => n.setAttribute(HIGHLIGHT, ''));
      return nodes.length > 0;
    };
    const timer = apply() ? undefined : window.setTimeout(apply, 400);
    return () => { window.clearTimeout(timer); nodes.forEach(n => n.removeAttribute(HIGHLIGHT)); };
  }, [step.id, step.target, step.view, centered]);

  useEffect(() => { titleRef.current?.focus(); }, [step.id]);

  // Tastiera: frecce per muoversi, Esc per uscire (non mentre si scrive in un campo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return; // un altro dialogo è aperto
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const card = (
    <div
      role="dialog"
      aria-modal={centered ? 'true' : 'false'}
      aria-labelledby="guided-tour-title"
      className={`tour-card bg-surface text-foreground border border-line rounded-panel shadow-panel p-5 ${centered ? 'w-full max-w-md' : 'w-full md:w-[26rem]'}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Compass size={14} /> {step.where ?? 'Visita guidata'}
        </span>
        <button type="button" onClick={finish} aria-label="Chiudi la visita guidata" className="p-1.5 -m-1.5 rounded-md text-muted hover:bg-raised hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      <h2 id="guided-tour-title" ref={titleRef} tabIndex={-1} className="text-lg font-semibold leading-snug mb-2 outline-none">{step.title}</h2>
      <p className="text-sm text-secondary leading-relaxed">{step.body}</p>
      {step.tips && step.tips.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {step.tips.map(tip => (
            <li key={tip} className="flex gap-2 text-sm text-secondary"><span aria-hidden="true" className="text-accent">•</span><span>{tip}</span></li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1 mt-5" aria-hidden="true">
        {steps.map((s, i) => (
          <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-accent' : i < index ? 'w-1.5 bg-accent/50' : 'w-1.5 bg-line'}`} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mt-4">
        <span className="text-xs text-muted" aria-live="polite">{index + 1} di {steps.length}</span>
        <div className="flex gap-2">
          {isFirst ? (
            <button type="button" onClick={finish} className="px-3 py-2 text-sm font-semibold rounded-md text-muted hover:bg-raised hover:text-foreground">Salta</button>
          ) : (
            <button type="button" onClick={prev} className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-md text-muted hover:bg-raised hover:text-foreground"><ChevronLeft size={16} /> Indietro</button>
          )}
          <button type="button" onClick={next} className="flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md bg-action text-action-foreground hover:bg-action-hover">
            {isFirst ? 'Iniziamo' : isLast ? 'Fine' : <>Avanti <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );

  if (centered) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={finish} aria-hidden="true" />
        <div className="relative w-full flex justify-center">{card}</div>
      </div>
    );
  }
  // Su telefono sopra il microfono e la barra in basso, su desktop in basso a sinistra del contenuto
  return <div className="fixed z-[90] left-3 right-3 bottom-[9.5rem] md:bottom-8 md:left-[calc(16rem+2rem)] md:right-auto">{card}</div>;
}
