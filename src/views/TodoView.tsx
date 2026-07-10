import React, { useState, useMemo } from 'react';
import {
  CheckSquare, Square, Plus, Trash2, Filter, ChevronDown, ChevronRight,
  AlertCircle, Clock, CheckCircle2, Building2, X, Calendar, List, Users, Pencil,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { TodoItem, TodoTipo, TodoPriorita, TodoStatus, NavView, Contact } from '../types';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch } from '../utils/search';

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
  contacts: Record<string, Contact>;
}

const AddTodoModal: React.FC<AddTodoModalProps> = ({ onClose, onAdd, contacts }) => {
  const [titolo, setTitolo] = useState('');
  const [tipo, setTipo] = useState<TodoTipo>('altro');
  const [priorita, setPriority] = useState<TodoPriorita>('media');
  const [scadenza, setScadenza] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [note, setNote] = useState('');

  const filteredContacts = useMemo(() => {
    const selectedIds = new Set(selectedContacts.map(c => c.id));
    return Object.values(contacts)
      .filter(c => !selectedIds.has(c.id))
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city, c.phone, c.email]))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [contacts, contactSearch, selectedContacts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titolo.trim()) return;
    const base = {
      titolo: titolo.trim(),
      tipo,
      priorita,
      scadenza: scadenza || undefined,
      note: note.trim() || undefined,
      status: 'da-fare' as const,
      source: 'manuale' as const,
    };
    // Un cliente selezionato = un To Do; con piu' clienti si crea la stessa
    // attivita' per ciascuno, cosi' compare in tutti i rispettivi gruppi
    // nella vista "Clienti" senza dover cambiare il modello dati.
    if (selectedContacts.length === 0) {
      onAdd({ ...base, contactId: undefined });
    } else {
      for (const c of selectedContacts) onAdd({ ...base, contactId: c.id });
    }
    onClose();
  };

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
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
              Cliente{selectedContacts.length > 0 ? ` · ${selectedContacts.length} selezionati` : ''}
            </label>
            <SearchDropdown
              value={contactSearch}
              onChange={setContactSearch}
              onSelect={c => {
                setSelectedContacts(prev => prev.some(x => x.id === c.id) ? prev : [...prev, c]);
                setContactSearch('');
              }}
              results={filteredContacts.map(c => ({
                key: c.id,
                item: c,
                label: c.company || '(senza nome)',
                sublabel: c.contactName || undefined,
              }))}
              totalCount={Object.keys(contacts).length}
              showWhenEmpty
              placeholder={`Scrivi il nome... (${Object.keys(contacts).length} contatti)`}
              emptyTitle={Object.keys(contacts).length === 0 ? '📋 Rubrica vuota' : '🔍 Nessun risultato'}
              emptySubtitle={Object.keys(contacts).length === 0 ? 'Aggiungi contatti dalla sezione Clienti' : 'Prova con un termine diverso'}
              inputWrapperClassName={open =>
                `flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl px-2.5 py-2.5 transition-colors ${
                  open ? 'border-indigo-400' : 'border-gray-100 dark:border-gray-700'
                }`
              }
            />
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedContacts.map(c => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1 text-[11px] font-bold pl-2.5 pr-1.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                  >
                    {c.company || '(senza nome)'}
                    <button
                      type="button"
                      onClick={() => setSelectedContacts(prev => prev.filter(x => x.id !== c.id))}
                      className="p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
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

interface EditTodoModalProps {
  todo: TodoItem;
  onClose: () => void;
  onSave: (updates: Partial<TodoItem>) => void;
  contacts: Record<string, Contact>;
}

const EditTodoModal: React.FC<EditTodoModalProps> = ({ todo, onClose, onSave, contacts }) => {
  const [titolo, setTitolo] = useState(todo.titolo);
  const [tipo, setTipo] = useState<TodoTipo>(todo.tipo);
  const [priorita, setPriority] = useState<TodoPriorita>(todo.priorita);
  const [scadenza, setScadenza] = useState(todo.scadenza || '');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    todo.contactId ? contacts[todo.contactId] || null : null
  );
  const [contactSearch, setContactSearch] = useState('');
  const [note, setNote] = useState(todo.note || '');

  const filteredContacts = useMemo(() => {
    return Object.values(contacts)
      .filter(c => c.id !== selectedContact?.id)
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city, c.phone, c.email]))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [contacts, contactSearch, selectedContact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titolo.trim()) return;
    onSave({
      titolo: titolo.trim(),
      tipo,
      priorita,
      scadenza: scadenza || undefined,
      note: note.trim() || undefined,
      contactId: selectedContact?.id,
    });
    onClose();
  };

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
          <h2 className="text-base font-black text-gray-900 dark:text-white">Modifica To Do</h2>
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
            {selectedContact ? (
              <span className="flex items-center justify-between gap-1 text-[11px] font-bold pl-2.5 pr-1.5 py-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                <span className="truncate">{selectedContact.company || '(senza nome)'}</span>
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </span>
            ) : (
              <SearchDropdown
                value={contactSearch}
                onChange={setContactSearch}
                onSelect={c => { setSelectedContact(c); setContactSearch(''); }}
                results={filteredContacts.map(c => ({
                  key: c.id,
                  item: c,
                  label: c.company || '(senza nome)',
                  sublabel: c.contactName || undefined,
                }))}
                totalCount={Object.keys(contacts).length}
                showWhenEmpty
                placeholder={`Scrivi il nome... (${Object.keys(contacts).length} contatti)`}
                emptyTitle={Object.keys(contacts).length === 0 ? '📋 Rubrica vuota' : '🔍 Nessun risultato'}
                emptySubtitle={Object.keys(contacts).length === 0 ? 'Aggiungi contatti dalla sezione Clienti' : 'Prova con un termine diverso'}
                inputWrapperClassName={open =>
                  `flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl px-2.5 py-2.5 transition-colors ${
                    open ? 'border-indigo-400' : 'border-gray-100 dark:border-gray-700'
                  }`
                }
              />
            )}
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
            Salva modifiche
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

interface TodoCardProps {
  todo: TodoItem;
  contactName?: string;
  onToggle: (status: TodoStatus) => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<TodoItem>) => void;
  onEdit: () => void;
  onNavigate?: (view: NavView, contactId: string) => void;
}

const TodoCard: React.FC<TodoCardProps> = ({ todo, contactName, onToggle, onDelete, onUpdate, onEdit }) => {
  const isDone = todo.status === 'fatto';
  const overdue = !isDone && isOverdue(todo.scadenza);
  const tipo = TIPO_CONFIG[todo.tipo];
  const priorita = PRIORITA_CONFIG[todo.priorita];

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(todo.titolo);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== todo.titolo) onUpdate({ titolo: trimmed });
    else setTitleDraft(todo.titolo);
    setEditingTitle(false);
  };

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
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') { setTitleDraft(todo.titolo); setEditingTitle(false); }
                }}
                className="flex-1 text-sm font-bold leading-snug bg-transparent border-b-2 border-indigo-400 outline-none text-gray-900 dark:text-white"
              />
            ) : (
              <p
                onClick={() => setEditingTitle(true)}
                className={`text-sm font-bold leading-snug cursor-text rounded px-0.5 -mx-0.5 ${isDone ? 'line-through text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
              >
                {todo.titolo}
              </p>
            )}
            <div className="flex items-center flex-shrink-0">
              <button
                onClick={onEdit}
                title="Modifica attività"
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Tipo */}
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${tipo.bg} ${tipo.color}`}>
              {tipo.label}
            </span>

            {/* Priorità */}
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${priorita.dot}`} />
              <select
                value={todo.priorita}
                onChange={(e) => onUpdate({ priorita: e.target.value as TodoItem['priorita'] })}
                className="text-[9px] font-black text-gray-400 bg-transparent border-none outline-none cursor-pointer appearance-none"
              >
                {Object.entries(PRIORITA_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
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
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<TodoStatus | 'tutti'>('tutti');
  const [filterTipo, setFilterTipo] = useState<TodoTipo | 'tutti'>('tutti');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'lista' | 'cliente'>('cliente');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set(['__none__']));

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

  // Vista Lista con "Tutti": i task sono raggruppati per stato, così cambiando
  // stato dal checkbox la card si sposta di sezione (Da fare → In corso → Fatto)
  const byStatus = useMemo(() => ({
    'da-fare':  filtered.filter(t => t.status === 'da-fare'),
    'in-corso': filtered.filter(t => t.status === 'in-corso'),
    'fatto':    filtered.filter(t => t.status === 'fatto'),
  }), [filtered]);

  // Raggruppamento per cliente
  const byClient = useMemo(() => {
    const base = allTodos
      .filter(t => filterStatus === 'tutti' || t.status === filterStatus)
      .filter(t => filterTipo === 'tutti' || t.tipo === filterTipo);

    const map = new Map<string, { name: string; todos: typeof base }>();
    const sortTodos = (arr: typeof base) =>
      [...arr].sort((a, b) => {
        // Prima per stato (da fare → in corso → fatto), così il task "scende"
        // nel gruppo man mano che avanza; poi priorità e scadenza
        const st = { 'da-fare': 0, 'in-corso': 1, fatto: 2 };
        const sDiff = st[a.status] - st[b.status];
        if (sDiff !== 0) return sDiff;
        const p = { alta: 0, media: 1, bassa: 2 };
        const d = p[a.priorita] - p[b.priorita];
        if (d !== 0) return d;
        if (a.scadenza && b.scadenza) return a.scadenza.localeCompare(b.scadenza);
        return a.scadenza ? -1 : b.scadenza ? 1 : 0;
      });

    for (const t of base) {
      const key = t.contactId || '__none__';
      if (!map.has(key)) {
        const name = t.contactId ? (contacts[t.contactId]?.company || 'Cliente sconosciuto') : 'Senza cliente';
        map.set(key, { name, todos: [] });
      }
      map.get(key)!.todos.push(t);
    }

    return [...map.entries()]
      .map(([key, val]) => ({ key, name: val.name, todos: sortTodos(val.todos) }))
      .sort((a, b) => {
        if (a.key === '__none__') return 1;
        if (b.key === '__none__') return -1;
        return a.name.localeCompare(b.name, 'it');
      });
  }, [todos, contacts, filterStatus, filterTipo]);

  const toggleClient = (key: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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

      {/* Header (fisso in cima durante lo scroll, resta la lista sottostante a muoversi) */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 pt-1 pb-2 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            {/* Toggle vista */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('cliente')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'cliente' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-400'}`}
              >
                <Users size={12} /> Clienti
              </button>
              <button
                onClick={() => setViewMode('lista')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'lista' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-400'}`}
              >
                <List size={12} /> Lista
              </button>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
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

      {/* Vista per Cliente */}
      {viewMode === 'cliente' && (
        byClient.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <CheckSquare size={24} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-bold text-gray-400">Nessuna attività. Aggiungine una o completa una visita!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {byClient.map(({ key, name, todos: clientTodos }) => {
              const open = expandedClients.has(key);
              const scadutiClient = clientTodos.filter(t => t.status !== 'fatto' && isOverdue(t.scadenza)).length;
              const daFareClient = clientTodos.filter(t => t.status === 'da-fare').length;
              return (
                <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  {/* Client header */}
                  <button
                    onClick={() => toggleClient(key)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                      <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-black text-gray-800 dark:text-white truncate">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-400">{clientTodos.length} {clientTodos.length === 1 ? 'attività' : 'attività'}</span>
                        {daFareClient > 0 && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{daFareClient} da fare</span>}
                        {scadutiClient > 0 && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-0.5"><AlertCircle size={8} />{scadutiClient} scad.</span>}
                      </div>
                    </div>
                    {open ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
                  </button>
                  {/* Todos */}
                  {open && (
                    <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50 px-3 pb-3 pt-1 space-y-1.5">
                      {clientTodos.map(todo => (
                        <div key={todo.id} className="pt-1.5">
                          <TodoCard
                            todo={todo}
                            onToggle={status => updateTodo(todo.id, { status, completedAt: status === 'fatto' ? Date.now() : undefined })}
                            onDelete={() => deleteTodo(todo.id)}
                            onUpdate={updates => updateTodo(todo.id, updates)}
                            onEdit={() => setEditingTodo(todo)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Vista Lista */}
      {viewMode === 'lista' && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <CheckSquare size={24} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-bold text-gray-400">
              {filterStatus === 'tutti' && filterTipo === 'tutti' ? 'Nessuna attività.' : 'Nessuna attività con questi filtri'}
            </p>
          </div>
        ) : filterStatus !== 'tutti' ? (
          <div className="space-y-2.5">
            {filtered.map(todo => (
              <TodoCard
                key={todo.id}
                todo={todo}
                contactName={todo.contactId ? contacts[todo.contactId]?.company : undefined}
                onToggle={status => updateTodo(todo.id, { status, completedAt: status === 'fatto' ? Date.now() : undefined })}
                onDelete={() => deleteTodo(todo.id)}
                onUpdate={updates => updateTodo(todo.id, updates)}
                onEdit={() => setEditingTodo(todo)}
              />
            ))}
          </div>
        ) : (
          /* Filtro "Tutti": colonne di stato in sequenza — il task si sposta di
             sezione quando cambia stato (Da fare → In corso → Fatto) */
          <div className="space-y-6">
            {([
              { status: 'da-fare' as const,  label: 'Da fare',  dot: 'bg-red-500',   badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
              { status: 'in-corso' as const, label: 'In corso', dot: 'bg-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
              { status: 'fatto' as const,    label: 'Fatto',    dot: 'bg-green-500', badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
            ]).map(({ status, label, dot, badge }) => (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${badge}`}>{byStatus[status].length}</span>
                </div>
                {byStatus[status].length === 0 ? (
                  <p className="text-xs text-gray-300 dark:text-gray-600 italic px-1 py-2">Nessuna attività</p>
                ) : (
                  <div className="space-y-2.5">
                    {byStatus[status].map(todo => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        contactName={todo.contactId ? contacts[todo.contactId]?.company : undefined}
                        onToggle={s => updateTodo(todo.id, { status: s, completedAt: s === 'fatto' ? Date.now() : undefined })}
                        onDelete={() => deleteTodo(todo.id)}
                        onUpdate={updates => updateTodo(todo.id, updates)}
                        onEdit={() => setEditingTodo(todo)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Add modal */}
      {showAdd && (
        <AddTodoModal
          onClose={() => setShowAdd(false)}
          onAdd={addTodo}
          contacts={contacts}
        />
      )}

      {/* Edit modal */}
      {editingTodo && (
        <EditTodoModal
          todo={editingTodo}
          onClose={() => setEditingTodo(null)}
          onSave={updates => updateTodo(editingTodo.id, updates)}
          contacts={contacts}
        />
      )}
    </div>
  );
};
