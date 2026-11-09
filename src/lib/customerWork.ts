import type { Contact, Deal, TodoItem } from '../types';

export const UNASSIGNED_CUSTOMER = '__senza_cliente__';

export interface CustomerWorkGroup {
  id: string;
  name: string;
  deals: Deal[];
  todos: TodoItem[];
}

/** Calendar dates in To Do are local dates, not UTC instants. */
export function todoDeadline(value?: string): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Infinity;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return Infinity;
  return date.getTime();
}

export function groupCustomerWork(contacts: Record<string, Contact>, deals: Deal[], todos: TodoItem[]): CustomerWorkGroup[] {
  const groups = new Map<string, CustomerWorkGroup>();
  const groupFor = (contactId?: string) => {
    const id = contactId && contacts[contactId] ? contactId : UNASSIGNED_CUSTOMER;
    if (!groups.has(id)) groups.set(id, { id, name: id === UNASSIGNED_CUSTOMER ? 'Da collegare a un cliente' : contacts[id].company, deals: [], todos: [] });
    return groups.get(id)!;
  };
  for (const deal of deals) {
    if (!['chiuso-vinto', 'chiuso-perso'].includes(deal.stage) && deal.nextAction?.trim()) groupFor(deal.contactId).deals.push(deal);
  }
  for (const todo of todos) if (todo.status === 'da-fare') groupFor(todo.contactId).todos.push(todo);
  const next = (group: CustomerWorkGroup) => Math.min(
    ...group.deals.map(deal => deal.nextActionDeadline > 0 ? deal.nextActionDeadline : Infinity),
    ...group.todos.map(todo => todoDeadline(todo.scadenza)),
  );
  return [...groups.values()].sort((a, b) => next(a) - next(b) || a.name.localeCompare(b.name, 'it'));
}
