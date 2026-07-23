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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black uppercase dark:text-white">Chiudi trattativa</h2>
            {companyName && (
              <p className="text-sm text-gray-400 mt-1 font-bold uppercase tracking-widest">{companyName}</p>
            )}
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {choice === 'scelta' && (
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setChoice('vinta')}
              className="flex items-start gap-4 p-5 rounded-2xl border-2 border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 hover:border-green-300 dark:hover:border-green-800 transition-all text-left"
            >
              <Trophy size={24} className="text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-black text-green-900 dark:text-green-100 uppercase text-sm">Vinta</h3>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Inserisci il valore dell'ordine o carica il PDF. La trattativa risulta chiusa.
                </p>
              </div>
            </button>
            <button
              onClick={() => setChoice('persa')}
              className="flex items-start gap-4 p-5 rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 hover:border-red-300 dark:hover:border-red-800 transition-all text-left"
            >
              <ThumbsDown size={24} className="text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-black text-red-900 dark:text-red-100 uppercase text-sm">Persa</h3>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  Scrivi un feedback e imposta quando riprovare con una nuova visita.
                </p>
              </div>
            </button>
          </div>
        )}

        {choice === 'vinta' && (
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Valore ordine (€)</label>
              <input
                type="number"
                value={orderValue}
                onChange={e => setOrderValue(e.target.value)}
                placeholder="Es. 4500"
                autoFocus
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-green-400 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">PDF ordine (opzionale)</label>
              <label className="flex items-center gap-2 justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 cursor-pointer hover:border-green-300 transition-colors">
                {pdfFile ? <FileText size={16} className="text-green-600" /> : <Upload size={16} className="text-gray-400" />}
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">
                  {pdfFile ? pdfFile.name : 'Carica PDF ordine'}
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleWin}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-green-700 transition-colors"
              >
                Conferma vinta
              </button>
              <button
                onClick={() => setChoice('scelta')}
                className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-colors"
              >
                Indietro
              </button>
            </div>
          </div>
        )}

        {choice === 'persa' && (
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Feedback: cosa è successo?</label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Es. Prezzo troppo alto rispetto al competitor, ha già fornitore..."
                rows={3}
                autoFocus
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-red-400 transition-colors text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Riprova tra...</label>
              <div className="flex gap-2">
                {MONTHS_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMonthsDelay(m)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all border-2 ${
                      monthsDelay === m
                        ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'border-transparent bg-gray-100 dark:bg-gray-900 text-gray-500'
                    }`}
                  >
                    {m} {m === 1 ? 'mese' : 'mesi'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Verrà creato un promemoria To Do e un appuntamento in Agenda alla nuova data.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleLose}
                disabled={!feedback.trim()}
                className={`flex-1 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors ${
                  feedback.trim()
                    ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Conferma persa
              </button>
              <button
                onClick={() => setChoice('scelta')}
                className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-colors"
              >
                Indietro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
