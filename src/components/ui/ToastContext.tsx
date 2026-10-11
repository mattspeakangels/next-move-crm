import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; message: string; type: ToastType; }
interface ToastContextType { showToast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
        {toasts.map(toast => (
          <div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 px-4 py-3 rounded-md shadow-panel border text-sm font-medium pointer-events-auto bg-surface ${toast.type === 'error' ? 'border-danger text-danger' : toast.type === 'success' ? 'border-success text-success' : 'border-accent text-foreground'}`}>
            {toast.type === 'error' ? <AlertCircle size={18} className="shrink-0" /> : toast.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <Info size={18} className="shrink-0 text-accent" />}{toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve essere usato dentro ToastProvider');
  return context;
};
