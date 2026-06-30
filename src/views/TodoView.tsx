import React, { useState, useMemo } from 'react';
import {
  CheckSquare, Square, Plus, Trash2, Filter, ChevronDown,
  AlertCircle, Clock, CheckCircle2, Building2, X, Calendar,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { TodoItem, TodoTipo, TodoPriorita, TodoStatus, NavView } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TodoTipo, { label: string; color: string; bg: string }> = {
  offerta:         { label: 'Offerta',        color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  'scheda-tecnica':{ label: 'Scheda tecnica', color: 'text-blue-700 dark:text-blue-300',    bg: 'bg-blue-100 dark:bg-blue-900/40' },
  'email-info':    { label: 'Email / Info',   color: 'text-sky-700 dark:text-sky-300',      bg: 'bg-sky-100 dark:bg-sky-900/40' },
  'chiamata-follow':{ label: 'Chiamata',      color: 'text-green-700 dark:text-green-300',  bg: 'bg-green-100 dark:bg-green-900/40' },
  campionatura:    { label: 'Campionatura',   color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-100 dark:bg-amber-900/40' },
  demo:            { label: 'Demo',           color: 'text-purple-700 dark:text-purple-300',bg: 'bg-purple-100 dark:bg-purple-900/40' },
  visita:          { label: 'Visita',         color: 'text-rose-700 dark:text-rose-300',    bg: 'bg-rose-100 dark:bg-rose-900/40' },
  altro:           { label: 'Altro',          color: 'text-gray-700 dark:text-gray-300',    bg: 'bg-gray-100 dark:bg-gray-700' },
};

const PRIORITA_CONFIG: Record<TodoPriorita, { label: string; dot: string }> = {
  alta:  { label: 'Alta',  dot: 'bg-red-500' },
  media: { label: 'Media', dot: 'bg-amber-400' },
  bassa: { label: 'Bassa', dot: 'bg-gray-300 dark:bg-gray-600' },
};

const SOURCE_LABEL: Record<TodoItem['source'], string> = {
  manuale: 'Manuale',
  visita:  'Da visita',
  ai:      'Da AI',
};

function isOverdue(scadenza?: string): boolean {
  if (!scadenza) return false;
  return new Date(scadenza) < new Date(new Date().toDateString());
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

// ─── Add Todo Modal ───────────────────────────────────────────────────────────

interface AddTodoModalProps {
  onClose: () => void;
  onAdd: (todo: Omit<TodoItem, 'id' | 'createdAt'>) => void;
  contacts: Record<string, { company: string }>;
}

const AddTodoModal: React.FC<AddTodoModalProps> = ({ onClose, onAdd, contacts }) => {
  const [titolo, setTitolo] = useState('');
  const [tipo, setTipo] = useState<TodoTipo>('altro');
  const [priorita, setPriority] = useState<TodoPriorita>('media');
  const [scadenza, setScadenza] = useState('');
  const [contactId, setContactId] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titolo.trim()) return;
    onAdd({
      titolo: titolo.trim(),
      tipo,
      priorita,
      scadenza: scadenza || undefined,
      contactId: contactId || undefined,
      note: note.trim() || undefined,
      status: 'da-fare',
      source: 'manuale',
    });
    onClose();
  };

  const contactList = Object.values(contacts).sort((a, b) => a.company.localeCompare(b.company));

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900 dark:text-white">Nuovo To Do</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Attività *</label>
          <input
            type="text"
            value={titolo}
            onChange={e => setTitolo(e.target.value)}
            placeholder="Es. Inviare offerta a Rossi Srl"
            required
            autoFocus
            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:border-indigo-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Tipo</label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TodoTipo)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400"
            >
              {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Priorità</label>
            <select
              value={priorita}
              onChange={e => setPriority(e.target.value as TodoPriorita)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="bassa">Bassa</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Scadenza</label>
            <input
              type="date"
              value={scadenza}
              onChange={e => setScadenza(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Cliente</label>
            <select
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400"
            >
              <option value="">— Nessuno —</option>
              {contactList.map(c => (
                <option key={(c as any).id} value={(c as any).id}>{c.company}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Dettagli aggiuntivi..."
            rows={2}
            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 text-sm dark:text-white outline-none resize-none focus:border-indigo-400"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors"
          >
            Aggiungi
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-sm hover:bg-gray-200 transition-colors"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Todo Card ────────────────────────────────────────────────────────────────

interface TodoCardProps {
  todo: TodoItem;
  contactName?: string;
  onToggle: (status: TodoStatus) => void;
  onDelete: () => void;
  onNavigate?: (view: NavView, contactId: string) => void;
}

const TodoCard: React.FC<TodoCardProps> = ({ todo, contactName, onToggle, onDelete }) => {
  const isDone = todo.status === 'fatto';
  const overdue = !isDone && isOverdue(todo.scadenza);
  const tipo = TIPO_CONFIG[todo.tipo];
  const priorita = PRIORITA_CONFIG[todo.priorita];

  const nextStatus: TodoStatus = todo.status === 'da-fare' ? 'in-corso' : todo.status === 'in-corso' ? 'fatto' : 'da-fare';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 transition-all ${
      isDone
        ? 'border-gray-100 dark:border-gray-700 opacity-60'
        : overdue
          ? 'border-red-200 dark:border-red-800'
          : 'border-gray-100 dark:border-gray-700'
    }`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(nextStatus)}
          className="mt-0.5 flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-indigo-500 transition-colors"
        >
          {isDone
            ? <CheckCircle2 size={20} className="text-green-500" />
            : todo.status === 'in-corso'
              ? <Clock size={20} className="text-amber-500" />
              : <Square size={20} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-bold leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
              {todo.titolo}
            </p>
            <button
              onClick={onDelete}
              className="p-1 flex-shrink-0 text-gray-200 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-400 transition-colors rounded-lg"
            >
              <Trash2 size={13} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Tipo */}
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${tipo.bg} ${tipo.color}`}>
              {tipo.label}
            </span>

            {/* Priorità */}
            <span className="flex items-center gap-1 text-[9px] font-black text-gray-400">
              <span className={`w-1.5 h-1.5 rounded-full ${priorita.dot}`} />
              {priorita.label}
            </span>

            {/* Scadenza */}
            {todo.scadenza && (
              <span className={`flex items-center gap-1 text-[9px] font-bold ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                <Calendar size={9} />
                {overdue ? 'Scaduto ' : ''}{formatDate(todo.scadenza)}
              </span>
            )}

            {/* Contatto */}
            {contactName && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                <Building2 size={9} />
                {contactName}
              </span>
            )}

            {/* Source badge se da visita/AI */}
            {todo.source !== 'manuale' && (
              <span className="text-[9px] font-bold text-indigo-400 italic">
                {SOURCE_LABEL[todo.source]}
              </span>
            )}
          </div>

          {todo.note && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{todo.note}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────

export const TodoView: React.FC = () => {
  const { todos, contacts, addTodo, updateTodo, deleteTodo } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TodoStatus | 'tutti'>('tutti');
  const [filterTipo, setFilterTipo] = useState<TodoTipo | 'tutti'>('tutti');
  const [showFilters, setShowFilters] = useState(false);

  const allTodos = Object.values(todos);

  const filtered = useMemo(() => {
    return allTodos
      .filter(t => filterStatus === 'tutti' || t.status === filterStatus)
      .filter(t => filterTipo === 'tutti' || t.tipo === filterTipo)
      .sort((a, b) => {
        // Priorità: alta → media → bassa; poi per scadenza
        const p = { alta: 0, media: 1, bassa: 2 };
        const pDiff = p[a.priorita] - p[b.priorita];
        if (pDiff !== 0) return pDiff;
        if (a.scadenza && b.scadenza) return a.scadenza.localeCompare(b.scadenza);
        if (a.scadenza) return -1;
        if (b.scadenza) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [todos, filterStatus, filterTipo]);

  // Contatori
  const daFare = allTodos.filter(t => t.status === 'da-fare').length;
  const inCorso = allTodos.filter(t => t.status === 'in-corso').length;
  const fatto = allTodos.filter(t => t.status === 'fatto').length;
  const scaduti = allTodos.filter(t => t.status !== 'fatto' && isOverdue(t.scadenza)).length;

  const sections: { status: TodoStatus | 'tutti'; label: string; count: number; color: string }[] = [
    { status: 'tutti',    label: 'Tutti',    count: allTodos.length, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
    { status: 'da-fare',  label: 'Da fare',  count: daFare,          color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
    { status: 'in-corso', label: 'In corso', count: inCorso,         color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
    { status: 'fatto',    label: 'Fatto',    count: fatto,           color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  ];

  return (
    <div className="space-y-5 pb-6">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <CheckSquare size={24} className="text-indigo-600" />
            To Do
          </h1>
          {scaduti > 0 && (
            <p className="text-xs text-red-500 font-bold mt-0.5 flex items-center gap-1">
              <AlertCircle size={11} /> {scaduti} {scaduti === 1 ? 'attività scaduta' : 'attività scadute'}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900"
        >
          <Plus size={16} /> Aggiungi
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {sections.map(s => (
          <button
            key={s.status}
            onClick={() => setFilterStatus(s.status)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 ${
              filterStatus === s.status
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'border-transparent ' + s.color
            }`}
          >
            {s.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
              filterStatus === s.status ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'bg-white/60 dark:bg-gray-900/40'
            }`}>
              {s.count}
            </span>
          </button>
        ))}

        {/* Filter tipo */}
        <button
          onClick={() => setShowFilters(s => !s)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 ${
            filterTipo !== 'tutti'
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700'
              : 'border-transparent bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}
        >
          <Filter size={12} />
          {filterTipo !== 'tutti' ? TIPO_CONFIG[filterTipo].label : 'Tipo'}
          <ChevronDown size={10} className={showFilters ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {/* Tipo filter dropdown */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-2xl p-3">
          <button
            onClick={() => { setFilterTipo('tutti'); setShowFilters(false); }}
            className={`text-[10px] font-black px-2.5 py-1 rounded-full transition-colors ${filterTipo === 'tutti' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            Tutti
          </button>
          {Object.entries(TIPO_CONFIG).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { setFilterTipo(k as TodoTipo); setShowFilters(false); }}
              className={`text-[10px] font-black px-2.5 py-1 rounded-full transition-colors ${filterTipo === k ? 'bg-indigo-600 text-white' : `${v.bg} ${v.color}`}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <CheckSquare size={24} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-bold text-gray-400">
            {filterStatus === 'tutti' && filterTipo === 'tutti'
              ? 'Nessuna attività. Aggiungine una o completa una visita!'
              : 'Nessuna attività con questi filtri'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(todo => (
            <TodoCard
              key={todo.id}
              todo={todo}
              contactName={todo.contactId ? contacts[todo.contactId]?.company : undefined}
              onToggle={status => updateTodo(todo.id, {
                status,
                completedAt: status === 'fatto' ? Date.now() : undefined,
              })}
              onDelete={() => deleteTodo(todo.id)}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddTodoModal
          onClose={() => setShowAdd(false)}
          onAdd={addTodo}
          contacts={contacts}
        />
      )}
    </div>
  );
};
