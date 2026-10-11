import { DialogFrame } from '../ui/DialogFrame';
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
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-surface dark:bg-surface w-full max-w-xl rounded-panel p-8 shadow-panel">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold  dark:text-foreground">Cosa fai ora?</h2>
            {companyName && (
              <p className="text-sm text-muted mt-1 font-bold uppercase tracking-normal">
                {companyName}
              </p>
            )}
          </div>
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="p-2 rounded-md hover:bg-raised dark:hover:bg-raised">
            <X size={24} className="text-muted" />
          </button>
        </div>

        {/* Choice Description */}
        <p className="text-sm text-secondary dark:text-muted mb-8">
          L'attività è stata registrata. Scegli se concludere qui o programmare i prossimi passi.
        </p>

        {/* Options */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          {/* Option 1: Close Activity */}
          <button
            onClick={onCloseActivity}
            className="flex items-start gap-4 p-5 rounded-panel border-2 border-line dark:border-line bg-canvas dark:bg-canvas hover:border-line dark:hover:border-line transition-all text-left"
          >
            <div className="flex-shrink-0 mt-1">
              <CheckCircle size={24} className="text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground dark:text-foreground  text-sm">Chiudi attività</h3>
              <p className="text-xs text-secondary dark:text-muted mt-1">
                Salva l'esito e ritorna al dashboard. Deciderai dopo se impostare un follow-up.
              </p>
            </div>
          </button>

          {/* Option 2: Schedule Next Action */}
          <button
            onClick={onSetNextAction}
            className="flex items-start gap-4 p-5 rounded-panel border-2 border-accent dark:border-accent/50 bg-accent-soft dark:bg-accent-soft/20 hover:border-accent dark:hover:border-accent transition-all text-left"
          >
            <div className="flex-shrink-0 mt-1">
              <ArrowRight size={24} className="text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-accent dark:text-accent  text-sm">Programma i prossimi passi</h3>
              <p className="text-xs text-accent dark:text-accent mt-1">
                Imposta subito la prossima azione e il deadline. Crea una nuova attività.
              </p>
            </div>
          </button>
        </div>

        {/* Note */}
        <p className="text-xs text-muted text-center">
          Potrai sempre cambiare la prossima azione in seguito dalla scheda deal.
        </p>
      </div>
    </DialogFrame>
  );
};
