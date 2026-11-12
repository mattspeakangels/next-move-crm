import type { Activity, ActivityType, Contact, Deal, NextActionType, TodoItem } from '../types';
import type { CustomerRequest } from '../types/customerRequest';

export const UNASSIGNED_CUSTOMER = '__senza_cliente__';

export interface CustomerWorkGroup {
  id: string;
  name: string;
  deals: Deal[];
  todos: TodoItem[];
  requests: CustomerRequest[];
}

/** Calendar dates in To Do are local dates, not UTC instants. */
export function todoDeadline(value?: string): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Infinity;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return Infinity;
  return date.getTime();
}

export function groupCustomerWork(contacts: Record<string, Contact>, deals: Deal[], todos: TodoItem[], requests: CustomerRequest[] = []): CustomerWorkGroup[] {
  const groups = new Map<string, CustomerWorkGroup>();
  const groupFor = (contactId?: string) => {
    const id = contactId && contacts[contactId] ? contactId : UNASSIGNED_CUSTOMER;
    if (!groups.has(id)) groups.set(id, { id, name: id === UNASSIGNED_CUSTOMER ? 'Da collegare a un cliente' : contacts[id].company, deals: [], todos: [], requests: [] });
    return groups.get(id)!;
  };
  for (const deal of deals) {
    if (!['chiuso-vinto', 'chiuso-perso'].includes(deal.stage) && deal.nextAction?.trim()) groupFor(deal.contactId).deals.push(deal);
  }
  for (const todo of todos) if (todo.status === 'da-fare') groupFor(todo.contactId).todos.push(todo);
  for (const request of requests) if (request.status !== 'closed') groupFor(request.contactId).requests.push(request);
  const next = (group: CustomerWorkGroup) => Math.min(
    ...group.deals.map(deal => deal.nextActionDeadline > 0 ? deal.nextActionDeadline : Infinity),
    ...group.todos.map(todo => todoDeadline(todo.scadenza)),
    ...group.requests.map(request => todoDeadline(request.dueDate)),
  );
  return [...groups.values()].sort((a, b) => next(a) - next(b) || a.name.localeCompare(b.name, 'it'));
}

// ─── Azioni di gruppo dalla Dashboard (menu ⋯ accanto a "Dettagli") ──────────
// Funzioni pure: calcolano le modifiche, la vista le applica allo store.

const DAY_MS = 24 * 60 * 60 * 1000;

function localIsoDate(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Sposta in avanti una data: parte dalla scadenza se è futura, altrimenti da oggi. */
function shiftDate(deadline: number, days: number, now: number): number {
  const base = Number.isFinite(deadline) && deadline > now ? deadline : now;
  return base + days * DAY_MS;
}

export interface CustomerWorkChanges {
  deals: { id: string; updates: Partial<Deal> }[];
  todos: { id: string; updates: Partial<TodoItem> }[];
  deleteTodoIds: string[];
  requests: CustomerRequest[];
  activities: Activity[];
}

const emptyChanges = (): CustomerWorkChanges => ({ deals: [], todos: [], deleteTodoIds: [], requests: [], activities: [] });

/** Posticipa di `days` giorni tutte le scadenze aperte del cliente. */
export function postponeCustomerWork(group: CustomerWorkGroup, days: number, now: number): CustomerWorkChanges {
  const changes = emptyChanges();
  for (const deal of group.deals) {
    changes.deals.push({ id: deal.id, updates: { nextActionDeadline: shiftDate(deal.nextActionDeadline > 0 ? deal.nextActionDeadline : 0, days, now) } });
  }
  for (const todo of group.todos) {
    changes.todos.push({ id: todo.id, updates: { scadenza: localIsoDate(shiftDate(todoDeadline(todo.scadenza), days, now)) } });
  }
  for (const request of group.requests) {
    changes.requests.push({ ...request, dueDate: localIsoDate(shiftDate(todoDeadline(request.dueDate), days, now)), updatedAt: now });
  }
  return changes;
}

const ACTIVITY_FOR_ACTION: Record<NextActionType, ActivityType> = {
  chiama: 'chiamata', email: 'email', 'fissa-visita': 'visita', 'invia-offerta': 'nota', altro: 'nota',
};

/**
 * Toglie dalla lista le attività aperte del cliente lasciandone traccia:
 * la prossima azione delle opportunità finisce nell'archivio Attività (l'opportunità resta in
 * Pipeline), i To Do vengono segnati come fatti (o eliminati se `deleteTodos`), le richieste chiuse.
 */
export function archiveCustomerWork(group: CustomerWorkGroup, now: number, options: { deleteTodos?: boolean } = {}): CustomerWorkChanges {
  const changes = emptyChanges();
  group.deals.forEach((deal, index) => {
    const text = `Azione archiviata dalla Dashboard: ${deal.nextAction}`;
    changes.activities.push({
      id: `act_${now}_${index}_${deal.id}`,
      contactId: deal.contactId,
      dealId: deal.id,
      type: ACTIVITY_FOR_ACTION[deal.nextActionType ?? 'altro'] ?? 'nota',
      date: now,
      outcome: 'archiviata',
      outcomeType: 'nota',
      notes: text,
      results: text,
      createdAt: now,
    });
    changes.deals.push({ id: deal.id, updates: { nextAction: '', nextActionDeadline: 0 } });
  });
  for (const todo of group.todos) {
    if (options.deleteTodos) changes.deleteTodoIds.push(todo.id);
    else changes.todos.push({ id: todo.id, updates: { status: 'fatto', completedAt: now, statusHistory: [...(todo.statusHistory ?? []), { status: 'fatto', at: now }] } });
  }
  for (const request of group.requests) changes.requests.push({ ...request, status: 'closed', updatedAt: now });
  return changes;
}

export function countCustomerWork(group: CustomerWorkGroup): number {
  return group.deals.length + group.todos.length + group.requests.length;
}
