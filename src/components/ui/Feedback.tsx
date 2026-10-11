import { ReactNode, useSyncExternalStore } from 'react';
import { AlertCircle, ShieldQuestion } from 'lucide-react';
import { DialogFrame } from './DialogFrame';
import { Button, Panel } from './Syrio';

type Request = { id: number; message: string; confirm: boolean; resolve?: (value: boolean) => void };
let queue: Request[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const publish = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const snapshot = () => queue;

/** Keeps every existing confirmation gate, without invoking native browser UI. */
export function confirmAction(message: string): Promise<boolean> {
  return new Promise(resolve => { queue = [...queue, { id: ++nextId, message, confirm: true, resolve }]; publish(); });
}
export function showNotice(message: string): void {
  queue = [...queue, { id: ++nextId, message, confirm: false }]; publish();
}
function finish(id: number, accepted: boolean) {
  const request = queue.find(r => r.id === id);
  queue = queue.filter(r => r.id !== id); publish(); request?.resolve?.(accepted);
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const request = useSyncExternalStore(subscribe, snapshot)[0];
  return <>{children}{request && <DialogFrame key={request.id} aria-label={request.confirm ? 'Conferma operazione' : 'Avviso'} style={{ zIndex: 1100 }} className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
    <Panel className="w-full max-w-md p-6 max-h-[85dvh] overflow-y-auto">
      {request.confirm ? <ShieldQuestion size={24} className="text-accent mb-4" /> : <AlertCircle size={24} className="text-accent mb-4" />}
      <h2 className="text-lg font-medium mb-3">{request.confirm ? 'Conferma operazione' : 'Avviso'}</h2>
      <p className="text-sm text-secondary whitespace-pre-wrap break-words">{request.message}</p>
      <div className="flex justify-end gap-3 mt-6">
        {request.confirm && <Button variant="secondary" onClick={() => finish(request.id, false)}>Annulla</Button>}
        <Button onClick={() => finish(request.id, true)}>{request.confirm ? 'Conferma' : 'Chiudi'}</Button>
      </div>
    </Panel>
  </DialogFrame>}</>;
}
