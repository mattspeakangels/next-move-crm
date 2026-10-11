import { DialogFrame } from './DialogFrame';
import React, { useState } from 'react';
import { ShieldAlert, Fingerprint, X, AlertTriangle } from 'lucide-react';
import { deviceAuth } from '../../hooks/useDeviceAuth';

interface DeviceAuthModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

type State = 'idle' | 'verifying' | 'error';

export const DeviceAuthModal: React.FC<DeviceAuthModalProps> = ({
  title, description, onConfirm, onCancel,
}) => {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async () => {
    setState('verifying');
    setErrorMsg('');

    const result = await deviceAuth();

    if (result === 'ok' || result === 'unavailable') {
      onConfirm();
    } else {
      setState('error');
      setErrorMsg('Verifica non riuscita. Riprova o annulla.');
    }
  };

  return (
    <DialogFrame className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface dark:bg-surface rounded-panel shadow-panel w-full max-w-sm p-6 relative">

        {/* Close */}
        <button onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-muted hover:text-secondary hover:bg-raised dark:hover:bg-raised rounded-md transition-colors">
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-panel bg-danger-soft dark:bg-danger-soft flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={28} className="text-danger" />
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold text-foreground dark:text-foreground text-center mb-1">
          Azione Irreversibile
        </h2>
        <p className="text-xs font-bold text-danger uppercase tracking-normal text-center mb-4">
          {title}
        </p>

        {/* Description */}
        <div className="bg-danger-soft dark:bg-danger-soft border border-danger dark:border-danger rounded-panel p-3 mb-5">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-danger flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-danger dark:text-danger leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Error */}
        {state === 'error' && (
          <p className="text-xs font-bold text-danger text-center mb-3">{errorMsg}</p>
        )}

        {/* Auth button */}
        <button
          onClick={handleVerify}
          disabled={state === 'verifying'}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-panel font-semibold text-sm transition-all mb-3
            ${state === 'verifying'
              ? 'bg-raised dark:bg-raised text-muted cursor-wait'
              : 'bg-danger text-status-foreground hover:bg-danger shadow-panel shadow-red-200 dark:shadow-red-900'}`}>
          <Fingerprint size={18} className={state === 'verifying' ? 'animate-pulse' : ''} />
          {state === 'verifying' ? 'Verifica in corso…' : 'Sblocca con biometria / PIN'}
        </button>

        <button onClick={onCancel}
          className="w-full py-2.5 rounded-panel text-xs font-semibold text-muted hover:text-secondary dark:hover:text-muted hover:bg-raised dark:hover:bg-raised transition-colors uppercase tracking-wide">
          Annulla
        </button>

      </div>
    </DialogFrame>
  );
};
