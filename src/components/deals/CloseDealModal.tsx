import { DialogFrame } from '../ui/DialogFrame';
import React, { useState } from 'react';
import { X, Trophy, ThumbsDown, Upload, FileText } from 'lucide-react';

interface CloseDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWin: (data: { orderValue?: number; pdfFile?: File }) => void;
  onLose: (data: { feedback: string; monthsDelay: 1 | 2 | 3 | 6 }) => void;
  companyName?: string;
  currentValue?: number;
}

const MONTHS_OPTIONS: (1 | 2 | 3 | 6)[] = [1, 2, 3, 6];

export const CloseDealModal: React.FC<CloseDealModalProps> = ({
  isOpen, onClose, onWin, onLose, companyName, currentValue,
}) => {
  const [choice, setChoice] = useState<'scelta' | 'vinta' | 'persa'>('scelta');
  const [orderValue, setOrderValue] = useState<string>(currentValue ? String(currentValue) : '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState('');
  const [monthsDelay, setMonthsDelay] = useState<1 | 2 | 3 | 6>(3);

  if (!isOpen) return null;

  const reset = () => {
    setChoice('scelta');
    setOrderValue(currentValue ? String(currentValue) : '');
    setPdfFile(null);
    setFeedback('');
    setMonthsDelay(3);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleWin = () => {
    const parsed = orderValue.trim() ? Number(orderValue.replace(',', '.')) : undefined;
    onWin({ orderValue: parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined, pdfFile: pdfFile || undefined });
    reset();
  };

  const handleLose = () => {
    if (!feedback.trim()) return;
    onLose({ feedback: feedback.trim(), monthsDelay });
    reset();
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-surface dark:bg-surface w-full max-w-xl rounded-panel p-8 shadow-panel">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold  dark:text-foreground">Chiudi trattativa</h2>
            {companyName && (
              <p className="text-sm text-muted mt-1 font-bold uppercase tracking-normal">{companyName}</p>
            )}
          </div>
          <button onClick={handleClose} className="p-2 rounded-md hover:bg-raised dark:hover:bg-raised">
            <X size={24} className="text-muted" />
          </button>
        </div>

        {choice === 'scelta' && (
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setChoice('vinta')}
              className="flex items-start gap-4 p-5 rounded-panel border-2 border-success dark:border-success bg-success-soft dark:bg-success-soft hover:border-success dark:hover:border-success transition-all text-left"
            >
              <Trophy size={24} className="text-success flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-success dark:text-success  text-sm">Vinta</h3>
                <p className="text-xs text-success dark:text-success mt-1">
                  Inserisci il valore dell'ordine o carica il PDF. La trattativa risulta chiusa.
                </p>
              </div>
            </button>
            <button
              onClick={() => setChoice('persa')}
              className="flex items-start gap-4 p-5 rounded-panel border-2 border-danger dark:border-danger bg-danger-soft dark:bg-danger-soft hover:border-danger dark:hover:border-danger transition-all text-left"
            >
              <ThumbsDown size={24} className="text-danger flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-danger dark:text-danger  text-sm">Persa</h3>
                <p className="text-xs text-danger dark:text-danger mt-1">
                  Scrivi un feedback e imposta quando riprovare con una nuova visita.
                </p>
              </div>
            </button>
          </div>
        )}

        {choice === 'vinta' && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Valore ordine (€)</label>
              <input
                type="number"
                value={orderValue}
                onChange={e => setOrderValue(e.target.value)}
                placeholder="Es. 4500"
                autoFocus
                className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-success transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">PDF ordine (opzionale)</label>
              <label className="flex items-center gap-2 justify-center border-2 border-dashed border-line dark:border-line rounded-panel px-4 py-4 cursor-pointer hover:border-success transition-colors">
                {pdfFile ? <FileText size={16} className="text-success" /> : <Upload size={16} className="text-muted" />}
                <span className="text-xs font-bold text-secondary dark:text-muted truncate">
                  {pdfFile ? pdfFile.name : 'Carica PDF ordine'}
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleWin}
                className="flex-1 bg-success text-status-foreground px-6 py-3 rounded-panel font-semibold uppercase text-xs tracking-normal shadow-panel hover:bg-success transition-colors"
              >
                Conferma vinta
              </button>
              <button
                onClick={() => setChoice('scelta')}
                className="px-5 py-3 rounded-panel bg-raised dark:bg-raised text-secondary dark:text-muted font-semibold uppercase text-xs tracking-normal hover:bg-raised transition-colors"
              >
                Indietro
              </button>
            </div>
          </div>
        )}

        {choice === 'persa' && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Feedback: cosa è successo?</label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Es. Prezzo troppo alto rispetto al competitor, ha già fornitore..."
                rows={3}
                autoFocus
                className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-danger transition-colors text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-2">Riprova tra...</label>
              <div className="flex gap-2">
                {MONTHS_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMonthsDelay(m)}
                    className={`flex-1 py-2.5 px-3 rounded-md text-xs font-semibold transition-all border-2 ${
                      monthsDelay === m
                        ? 'border-danger bg-danger-soft dark:bg-danger-soft text-danger dark:text-danger'
                        : 'border-transparent bg-raised dark:bg-canvas text-secondary'
                    }`}
                  >
                    {m} {m === 1 ? 'mese' : 'mesi'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">
                Verrà creato un promemoria To Do e un appuntamento in Agenda alla nuova data.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleLose}
                disabled={!feedback.trim()}
                className={`flex-1 px-6 py-3 rounded-panel font-semibold uppercase text-xs tracking-normal transition-colors ${
                  feedback.trim()
                    ? 'bg-danger text-status-foreground shadow-panel hover:bg-danger'
                    : 'bg-raised text-muted cursor-not-allowed'
                }`}
              >
                Conferma persa
              </button>
              <button
                onClick={() => setChoice('scelta')}
                className="px-5 py-3 rounded-panel bg-raised dark:bg-raised text-secondary dark:text-muted font-semibold uppercase text-xs tracking-normal hover:bg-raised transition-colors"
              >
                Indietro
              </button>
            </div>
          </div>
        )}
      </div>
    </DialogFrame>
  );
};
