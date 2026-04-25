import React from 'react';
import { X, CheckCircle, ArrowRight } from 'lucide-react';

interface ActionChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseActivity: () => void;
  onSetNextAction: () => void;
  companyName?: string;
}

export const ActionChoiceModal: React.FC<ActionChoiceModalProps> = ({
  isOpen,
  onClose,
  onCloseActivity,
  onSetNextAction,
  companyName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black uppercase dark:text-white">Cosa fai ora?</h2>
            {companyName && (
              <p className="text-sm text-gray-400 mt-1 font-bold uppercase tracking-widest">
                {companyName}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Choice Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          L'attività è stata registrata. Scegli se concludere qui o programmare i prossimi passi.
        </p>

        {/* Options */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          {/* Option 1: Close Activity */}
          <button
            onClick={onCloseActivity}
            className="flex items-start gap-4 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-left"
          >
            <div className="flex-shrink-0 mt-1">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-gray-900 dark:text-white uppercase text-sm">Chiudi attività</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Salva l'esito e ritorna al dashboard. Deciderai dopo se impostare un follow-up.
              </p>
            </div>
          </button>

          {/* Option 2: Schedule Next Action */}
          <button
            onClick={onSetNextAction}
            className="flex items-start gap-4 p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all text-left"
          >
            <div className="flex-shrink-0 mt-1">
              <ArrowRight size={24} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-indigo-900 dark:text-indigo-100 uppercase text-sm">Programma i prossimi passi</h3>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                Imposta subito la prossima azione e il deadline. Crea una nuova attività.
              </p>
            </div>
          </button>
        </div>

        {/* Note */}
        <p className="text-xs text-gray-400 text-center">
          Potrai sempre cambiare la prossima azione in seguito dalla scheda deal.
        </p>
      </div>
    </div>
  );
};
