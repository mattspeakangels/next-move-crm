import { useState } from 'react';
import type { Deal } from '../../types';
import type { OperationalFlow, OperationalStage, RenderingVersion } from '../../types/dealDetails';
import { useStore } from '../../store/useStore';

const stages: [OperationalStage, string][] = [['offer','Offerta'], ['outcome','Esito'], ['award','Affidamento'], ['order','Ordine'], ['vas','Lavorazione VAS'], ['shipped','Spedizione'], ['delivered','Consegna']];
const statusLabels: Record<RenderingVersion['status'], string> = { draft:'Bozza', sent:'Inviato', approved:'Approvato', changes_requested:'Modifiche richieste' };
const input = 'w-full border border-line rounded-md p-2 bg-canvas text-foreground text-sm';
const blankFlow = (): OperationalFlow => ({ events: [], renderings: [], tracking: '' });

export function DealOperationalFlow({ deal }: { deal: Deal }) {
  const { updateDeal } = useStore();
  const flow = deal.operationalFlow ?? blankFlow();
  const [stage, setStage] = useState<OperationalStage>('offer');
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [emailReference, setEmailReference] = useState('');
  const [tracking, setTracking] = useState(flow.tracking);
  const save = (next: OperationalFlow) => updateDeal(deal.id, { operationalFlow: next, updatedAt: Date.now() });
  const addEvent = () => { save({ ...flow, events: [...flow.events, { id: crypto.randomUUID(), stage, note: note.trim(), at: Date.now() }] }); setNote(''); };
  const addRendering = () => { if (!name.trim()) return; const now = Date.now(); save({ ...flow, renderings: [...flow.renderings, { id: crypto.randomUUID(), name: name.trim(), reference: reference.trim(), emailReference: emailReference.trim(), status: 'draft', createdAt: now, history: [{ status: 'draft', at: now }] }] }); setName(''); setReference(''); setEmailReference(''); };
  const updateStatus = (id: string, status: RenderingVersion['status']) => save({ ...flow, renderings: flow.renderings.map(item => item.id === id && item.status !== status ? { ...item, status, history: [...item.history, { status, at: Date.now() }] } : item) });
  const shipped = flow.events.some(event => event.stage === 'shipped');
  return <details className="mt-2 rounded-md border border-line p-3"><summary className="cursor-pointer text-sm font-semibold">Avanzamento e rendering · {deal.nomeStorico || deal.nextAction || deal.stage}</summary><div className="mt-3 space-y-4 text-sm">
    <p className="text-muted">Registra manualmente le fasi pertinenti: puoi saltare quelle non necessarie. Nessun ordine viene creato automaticamente.</p>
    <div className="space-y-2"><strong>Storico avanzamento</strong>{flow.events.length ? <ol className="space-y-1">{flow.events.map(event => <li key={event.id}>{new Date(event.at).toLocaleString('it-IT')} · {stages.find(([id]) => id === event.stage)?.[1]}{event.note ? ` · ${event.note}` : ''}</li>)}</ol> : <p className="text-muted">Nessuna fase registrata.</p>}
      <label className="block">Fase<select className={input} value={stage} onChange={e => setStage(e.target.value as OperationalStage)}>{stages.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="block">Nota<input className={input} value={note} onChange={e => setNote(e.target.value)}/></label><button type="button" onClick={addEvent} className="text-accent">Registra fase</button>
      {shipped && <div className="space-y-2"><label className="block">Riferimento o codice tracking<input className={input} value={tracking} onChange={e => setTracking(e.target.value)}/></label><button type="button" className="text-accent" onClick={() => save({ ...flow, tracking: tracking.trim() })}>Salva tracking</button></div>}
    </div>
    <div className="space-y-2"><strong>Versioni rendering</strong><p className="text-muted">Inserisci un riferimento al file esistente e alla comunicazione; l’approvazione è manuale.</p>{flow.renderings.map(item => <div key={item.id} className="border border-line rounded-md p-2 space-y-1"><p className="font-semibold">{item.name}</p><p>File: {item.reference || 'Non indicato'} · Email: {item.emailReference || 'Non indicata'}</p><label>Stato<select className={input} value={item.status} onChange={e => updateStatus(item.id, e.target.value as RenderingVersion['status'])}>{Object.entries(statusLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><p className="text-xs text-muted">{item.history.map(h => `${statusLabels[h.status]} ${new Date(h.at).toLocaleString('it-IT')}`).join(' · ')}</p></div>)}
      <label className="block">Nome versione<input className={input} value={name} onChange={e => setName(e.target.value)}/></label><label className="block">Riferimento file<input className={input} value={reference} onChange={e => setReference(e.target.value)}/></label><label className="block">Riferimento email<input className={input} value={emailReference} onChange={e => setEmailReference(e.target.value)}/></label><button type="button" className="text-accent disabled:opacity-50" disabled={!name.trim()} onClick={addRendering}>Aggiungi versione</button>
    </div>
  </div></details>;
}
