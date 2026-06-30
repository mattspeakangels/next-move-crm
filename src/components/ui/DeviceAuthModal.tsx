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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 relative">

        {/* Close */}
        <button onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={28} className="text-red-500" />
        </div>

        {/* Title */}
        <h2 className="text-base font-black text-gray-900 dark:text-white text-center mb-1">
          Azione Irreversibile
        </h2>
        <p className="text-xs font-bold text-red-500 uppercase tracking-widest text-center mb-4">
          {title}
        </p>

        {/* Description */}
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-2xl p-3 mb-5">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Error */}
        {state === 'error' && (
          <p className="text-[11px] font-bold text-red-500 text-center mb-3">{errorMsg}</p>
        )}

        {/* Auth button */}
        <button
          onClick={handleVerify}
          disabled={state === 'verifying'}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all mb-3
            ${state === 'verifying'
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait'
              : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 dark:shadow-red-900'}`}>
          <Fingerprint size={18} className={state === 'verifying' ? 'animate-pulse' : ''} />
          {state === 'verifying' ? 'Verifica in corso…' : 'Sblocca con biometria / PIN'}
        </button>

        <button onClick={onCancel}
          className="w-full py-2.5 rounded-2xl text-xs font-black text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase tracking-wide">
          Annulla
        </button>

      </div>
    </div>
  );
};
