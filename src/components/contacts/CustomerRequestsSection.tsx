import { useState } from 'react';
import { useWorkspace } from '../../lib/workspaceContext';
import { useStore } from '../../store/useStore';
import type { CustomerRequest } from '../../types/customerRequest';

const input = 'w-full border-2 border-line rounded-md p-2 bg-canvas text-foreground';
type Category = CustomerRequest['category'];

export function CustomerRequestsSection({ contactId }: { contactId: string }) {
  const { workspace, uid } = useWorkspace();
  const { customerRequests, saveCustomerRequest, deals, addTodo } = useStore();
  const [category, setCategory] = useState<Category>('after_sales');
  const [draft, setDraft] = useState<CustomerRequest | null>(null);
  const [taskSource, setTaskSource] = useState<CustomerRequest | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPriority, setTaskPriority] = useState<'alta' | 'media' | 'bassa'>('media');
  const records = Object.values(customerRequests).filter(r => r.workspaceId === workspace?.id && r.ownerId === uid && r.contactId === contactId && r.category === category).sort ( (a, b) => b.updatedAt - a.updatedAt);
  const contactDeals = Object.values(deals).filter(d => d.contactId === contactId);
  const start = () => {
    if (!workspace || !uid) return;
    const now = Date.now();
    setDraft({ id: crypto.randomUUID(), workspaceId: workspace.id, ownerId: uid, contactId, dealId: '', category, kind: '', description: '', status: 'open', department: '', nextAction: '', dueDate: '', references: '', createdAt: now, updatedAt: now });
  };
  const save = () => {
    if (!draft || !draft.description.trim() || !draft.kind.trim() || draft.workspaceId !== workspace?.id || draft.ownerId !== uid || draft.contactId !== contactId) return;
    saveCustomerRequest({ ...draft, description: draft.description.trim(), kind: draft.kind.trim(), updatedAt: Date.now() });
    setDraft(null);
  };
  return <section className="bg-surface p-6 rounded-panel shadow-sm space-y-4">
    <div><h3 className="font-semibold text-lg">Richieste del cliente</h3><p className="text-sm text-muted">Gestione personale: le richieste non sono condivise con gli altri utenti.</p></div>
    <div className="flex flex-wrap gap-2">{([['after_sales', 'Post-vendita'], ['marketing', 'Marketing']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => { setCategory(value); setDraft(null); }} aria-pressed={category === value} className={`px-3 py-2 rounded-md border border-line ${category === value ? 'bg-accent text-white' : ''}`}>{label}</button>)}</div>
    {!draft && <button type="button" onClick={start} disabled={!workspace || !uid} className="px-3 py-2 rounded-md bg-accent text-white">Nuova richiesta</button>}
    {draft && <div className="grid gap-3 border border-line rounded-md p-4">
      <label>Tipo di richiesta *<input className={input} value={draft.kind} placeholder={category === 'marketing' ? 'Es. webshop o promozione' : 'Es. reso o assistenza'} onChange={e => setDraft({ ...draft, kind: e.target.value })} /></label>
      <label>Descrizione *<textarea className={input} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
      <label>Opportunità collegata<select className={input} value={draft.dealId} onChange={e => setDraft({ ...draft, dealId: e.target.value })}><option value="">Nessuna</option>{contactDeals.map(d => <option key={d.id} value={d.id}>{d.nomeStorico || d.nextAction || `Opportunità ${d.id.slice(0, 8)}`}</option>)}</select></label>
      <label>Stato<select className={input} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as CustomerRequest['status'] })}><option value="open">Aperta</option><option value="in_progress">In corso</option><option value="closed">Chiusa</option></select></label>
      <label>Funzione coinvolta<input className={input} value={draft.department} onChange={e => setDraft({ ...draft, department: e.target.value })} /></label>
      <label>Prossimo passo<input className={input} value={draft.nextAction} onChange={e => setDraft({ ...draft, nextAction: e.target.value })} /></label>
      <label>Scadenza<input type="date" className={input} value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} /></label>
      <label>Riferimenti a comunicazioni o documenti<textarea className={input} value={draft.references} onChange={e => setDraft({ ...draft, references: e.target.value })} /></label>
      <div className="flex gap-2"><button type="button" onClick={save} disabled={!draft.kind.trim() || !draft.description.trim()} className="px-3 py-2 rounded-md bg-accent text-white disabled:opacity-50">Salva richiesta</button><button type="button" onClick={() => setDraft(null)} className="px-3 py-2 border border-line rounded-md">Annulla</button></div>
    </div>}
    {taskSource && <div className="grid gap-2 border border-line rounded-md p-3"><strong>Nuova attività dalla richiesta</strong><label>Attività<input className={input} value={taskTitle} onChange={e => setTaskTitle(e.target.value)} /></label><label>Scadenza<input type="date" className={input} value={taskDue} onChange={e => setTaskDue(e.target.value)} /></label><label>Priorità<select className={input} value={taskPriority} onChange={e => setTaskPriority(e.target.value as typeof taskPriority)}><option value="alta">Alta</option><option value="media">Media</option><option value="bassa">Bassa</option></select></label><div className="flex gap-3"><button type="button" className="text-accent disabled:opacity-50" disabled={!taskTitle.trim()} onClick={() => { if (!taskTitle.trim() || taskSource.ownerId !== uid || taskSource.workspaceId !== workspace?.id || taskSource.contactId !== contactId) return; addTodo({ contactId, ...(taskSource.dealId ? { dealId: taskSource.dealId } : {}), titolo: taskTitle.trim(), note: `Richiesta ${taskSource.category === 'after_sales' ? 'post-vendita' : 'marketing'}: ${taskSource.kind}`, tipo: 'altro', ...(taskDue ? { scadenza: taskDue } : {}), priorita: taskPriority, status: 'da-fare', source: 'manuale' }); setTaskSource(null); }}>Crea attività</button><button type="button" onClick={() => setTaskSource(null)}>Annulla</button></div></div>}
    {records.length === 0 ? <p className="text-sm text-muted">Nessuna richiesta registrata.</p> : <div className="space-y-2">{records.map(r => <article key={r.id} className="border border-line rounded-md p-3"><div className="flex justify-between gap-2"><strong>{r.kind}</strong><div className="flex gap-2"><button type="button" className="text-accent" onClick={() => { setTaskSource(r); setTaskTitle(r.nextAction || ''); setTaskDue(r.dueDate); setTaskPriority('media'); }}>Crea attività</button><button type="button" className="text-accent" onClick={() => setDraft(r)}>Modifica</button></div></div><p>{r.description}</p><p className="text-sm text-muted">{r.status === 'open' ? 'Aperta' : r.status === 'in_progress' ? 'In corso' : 'Chiusa'}{r.dueDate ? ` · Scadenza ${r.dueDate}` : ''}{r.nextAction ? ` · ${r.nextAction}` : ''}</p></article>)}</div>}
  </section>;
}
