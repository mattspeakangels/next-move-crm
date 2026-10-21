import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

// Selettore orario a quadrante: prima l'ora (anello esterno 00-11, interno 12-23), poi i minuti a passi di 5

type Props = {
  /** Orario "HH:MM" */
  value: string;
  onChange: (value: string) => void;
  /** Limiti "HH:MM" entro cui l'orario può stare (ore e minuti fuori range sono disabilitati) */
  min?: string;
  max?: string;
};

const FACE = 240;
const RADIUS_OUTER = 92;
const RADIUS_INNER = 58;
const BUTTON = 36;
const CENTER = FACE / 2;

const pad = (n: number) => String(n).padStart(2, '0');
const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Coordinate di un punto sull'anello: index 0 in alto, poi in senso orario ogni 30°
const polar = (index: number, radius: number) => {
  const angle = (index * 30 * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(angle),
    y: CENTER - radius * Math.cos(angle),
  };
};

export const ClockTimeInput: React.FC<Props> = ({ value, onChange, min, max }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [hour, minute] = (value || '00:00').split(':').map(Number);
  const minLimit = min ? toMinutes(min) : 0;
  const maxLimit = max ? toMinutes(max) : 23 * 60 + 59;

  const isTimeAllowed = (h: number, m: number) => {
    const t = h * 60 + m;
    return t >= minLimit && t <= maxLimit;
  };
  // Un'ora è selezionabile se almeno un minuto al suo interno rientra nei limiti
  const isHourAllowed = (h: number) => h * 60 + 59 >= minLimit && h * 60 <= maxLimit;

  const selectHour = (h: number) => {
    const t = Math.min(Math.max(h * 60 + minute, minLimit), maxLimit);
    onChange(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
    setMode('minute');
  };

  const selectMinute = (m: number) => {
    onChange(`${pad(hour)}:${pad(m)}`);
    setOpen(false);
  };

  // Lancetta: punta all'ora (o al minuto) selezionato
  const handIndex = mode === 'hour' ? hour % 12 : minute / 5;
  const handRadius = mode === 'hour' && hour >= 12 ? RADIUS_INNER : RADIUS_OUTER;
  const handEnd = polar(handIndex, handRadius);

  const faceButtonClass = (active: boolean, disabled: boolean) =>
    `absolute flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
      disabled
        ? 'text-muted dark:text-secondary cursor-not-allowed'
        : active
          ? 'bg-action text-action-foreground'
          : 'text-foreground dark:text-muted hover:bg-accent-soft dark:hover:bg-accent-soft/40'
    }`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setMode('hour'); setOpen(true); }}
        className="w-full flex items-center justify-between border-2 border-line dark:border-line rounded-panel p-4 bg-transparent dark:text-foreground outline-none focus:border-accent font-bold"
      >
        <span className="text-base tabular-nums">{value}</span>
        <Clock size={16} className="text-muted" />
      </button>

      {open && createPortal(
        // Portale su body, centrato nello schermo: dentro il modale (overflow + colonna
        // a metà larghezza) il quadrante veniva tagliato o usciva dallo schermo
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-surface dark:bg-surface rounded-panel shadow-panel p-4 w-[272px] max-w-full max-h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-1 mb-3 text-3xl font-semibold tabular-nums dark:text-foreground">
              <button
                type="button"
                onClick={() => setMode('hour')}
                className={`px-2 rounded-xl ${mode === 'hour' ? 'bg-accent-soft dark:bg-accent-soft/40 text-accent' : ''}`}
              >
                {pad(hour)}
              </button>
              <span>:</span>
              <button
                type="button"
                onClick={() => setMode('minute')}
                className={`px-2 rounded-xl ${mode === 'minute' ? 'bg-accent-soft dark:bg-accent-soft/40 text-accent' : ''}`}
              >
                {pad(minute)}
              </button>
            </div>

            <div className="relative mx-auto rounded-full bg-canvas dark:bg-canvas/60" style={{ width: FACE, height: FACE }}>
              <svg className="absolute inset-0 pointer-events-none" width={FACE} height={FACE}>
                <line x1={CENTER} y1={CENTER} x2={handEnd.x} y2={handEnd.y} className="stroke-accent" strokeWidth={2} />
                <circle cx={CENTER} cy={CENTER} r={4} className="fill-accent" />
              </svg>

              {mode === 'hour' && Array.from({ length: 24 }, (_, h) => {
                const isInner = h >= 12;
                const pos = polar(h % 12, isInner ? RADIUS_INNER : RADIUS_OUTER);
                const disabled = !isHourAllowed(h);
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectHour(h)}
                    className={faceButtonClass(h === hour, disabled)}
                    style={{ width: BUTTON, height: BUTTON, left: pos.x - BUTTON / 2, top: pos.y - BUTTON / 2 }}
                  >
                    {pad(h)}
                  </button>
                );
              })}

              {mode === 'minute' && Array.from({ length: 12 }, (_, k) => {
                const m = k * 5;
                const pos = polar(k, RADIUS_OUTER);
                const disabled = !isTimeAllowed(hour, m);
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectMinute(m)}
                    className={faceButtonClass(m === minute, disabled)}
                    style={{ width: BUTTON, height: BUTTON, left: pos.x - BUTTON / 2, top: pos.y - BUTTON / 2 }}
                  >
                    {pad(m)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
