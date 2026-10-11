import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useState, useMemo } from 'react';
import {
  CheckSquare, Square, Plus, Trash2, Filter, ChevronDown, ChevronRight,
  AlertCircle, Clock, CheckCircle2, Building2, X, Calendar, List, Users, Pencil, Mail, Search,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { TodoItem, TodoTipo, TodoPriorita, TodoStatus, NavView, Contact } from '../types';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../utils/search';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TodoTipo, { label: string; color: string; bg: string }> = {
  offerta:         { label: 'Offerta',        color: 'text-accent dark:text-accent', bg: 'bg-accent-soft dark:bg-accent-soft/40' },
  'scheda-tecnica':{ label: 'Scheda tecnica', color: 'text-accent dark:text-accent',    bg: 'bg-accent-soft dark:bg-accent-soft/40' },
  'email-info':    { label: 'Email / Info',   color: 'text-accent dark:text-accent',      bg: 'bg-accent-soft dark:bg-accent-soft/40' },
  'chiamata-follow':{ label: 'Chiamata',      color: 'text-success dark:text-success',  bg: 'bg-success-soft dark:bg-success-soft' },
  campionatura:    { label: 'Campionatura',   color: 'text-warning dark:text-warning',  bg: 'bg-warning-soft dark:bg-warning-soft' },
  demo:            { label: 'Demo',           color: 'text-accent dark:text-accent',bg: 'bg-accent-soft dark:bg-accent-soft/40' },
  visita:          { label: 'Visita',         color: 'text-danger dark:text-danger',    bg: 'bg-danger-soft dark:bg-danger-soft' },
  altro:           { label: 'Altro',          color: 'text-foreground dark:text-muted',    bg: 'bg-raised dark:bg-raised' },
};

const PRIORITA_CONFIG: Record<TodoPriorita, { label: string; dot: string }> = {
  alta:  { label: 'Alta',  dot: 'bg-danger' },
  media: { label: 'Media', dot: 'bg-warning' },
  bassa: { label: 'Bassa', dot: 'bg-raised dark:bg-raised' },
};

const SOURCE_LABEL: Record<TodoItem['source'], string> = {
  manuale:     'Manuale',
  visita:      'Da visita',
  ai:          'Da AI',
  'follow-up': 'Follow-up offerta',
};

function isOverdue(scadenza?: string): boolean {
  if (!scadenza) return false;
  return new Date(scadenza) < new Date(new Date().toDateString());
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

function formatDateTime(ts?: number): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}

const STATUS_LABEL: Record<TodoStatus, string> = {
  'da-fare': 'Da fare',
  fatto: 'Fatto',
};

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
    return sortByRelevance(contactSearch, Object.values(contacts)
      .filter(c => !selectedIds.has(c.id))
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city, c.phone, c.email]))
      .sort((a, b) => a.company.localeCompare(b.company)), c => [c.company, c.contactName]);
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
    <DialogFrame
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-surface dark:bg-canvas w-full sm:max-w-lg sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground">Nuovo To Do</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Attività *</label>
          <input
            type="text"
            value={titolo}
            onChange={e => setTitolo(e.target.value)}
            placeholder="Es. Inviare offerta a Rossi Srl"
            required
            autoFocus
            className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-3 text-sm font-bold dark:text-foreground outline-none focus:border-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Tipo</label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TodoTipo)}
              className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-2.5 text-sm font-bold dark:text-foreground outline-none focus:border-accent"
            >
              {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Priorità</label>
            <select
              value={priorita}
              onChange={e => setPriority(e.target.value as TodoPriorita)}
              className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-2.5 text-sm font-bold dark:text-foreground outline-none focus:border-accent"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="bassa">Bassa</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Scadenza</label>
            <input
              type="date"
              value={scadenza}
              onChange={e => setScadenza(e.target.value)}
              className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-2.5 text-sm font-bold dark:text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">
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
                `flex items-center gap-2 bg-canvas dark:bg-surface border-2 rounded-md px-2.5 py-2.5 transition-colors ${
                  open ? 'border-accent' : 'border-line dark:border-line'
                }`
              }
            />
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedContacts.map(c => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1 text-xs font-bold pl-2.5 pr-1.5 py-1 rounded-full bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent"
                  >
                    {c.company || '(senza nome)'}
                    <button
                      type="button"
                      onClick={() => setSelectedContacts(prev => prev.filter(x => x.id !== c.id))}
                      className="p-0.5 rounded-full hover:bg-accent-soft dark:hover:bg-accent-soft"
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
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Dettagli aggiuntivi..."
            rows={2}
            className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-3 text-sm dark:text-foreground outline-none resize-none focus:border-accent"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="flex-1 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-colors"
          >
            Aggiungi
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-panel bg-raised dark:bg-surface text-secondary dark:text-muted font-semibold text-sm hover:bg-raised transition-colors"
          >
            Annulla
          </button>
        </div>
      </form>
    </DialogFrame>
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
    return sortByRelevance(contactSearch, Object.values(contacts)
      .filter(c => c.id !== selectedContact?.id)
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city, c.phone, c.email]))
      .sort((a, b) => a.company.localeCompare(b.company)), c => [c.company, c.contactName]);
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
    <DialogFrame
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-surface dark:bg-canvas w-full sm:max-w-lg sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground">Modifica To Do</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Attività *</label>
          <input
            type="text"
            value={titolo}
            onChange={e => setTitolo(e.target.value)}
            placeholder="Es. Inviare offerta a Rossi Srl"
            required
            autoFocus
            className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-3 text-sm font-bold dark:text-foreground outline-none focus:border-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Tipo</label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TodoTipo)}
              className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-2.5 text-sm font-bold dark:text-foreground outline-none focus:border-accent"
            >
              {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Priorità</label>
            <select
              value={priorita}
              onChange={e => setPriority(e.target.value as TodoPriorita)}
              className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-2.5 text-sm font-bold dark:text-foreground outline-none focus:border-accent"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="bassa">Bassa</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Scadenza</label>
            <input
              type="date"
              value={scadenza}
              onChange={e => setScadenza(e.target.value)}
              className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-2.5 text-sm font-bold dark:text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Cliente</label>
            {selectedContact ? (
              <span className="flex items-center justify-between gap-1 text-xs font-bold pl-2.5 pr-1.5 py-2.5 rounded-md bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent">
                <span className="truncate">{selectedContact.company || '(senza nome)'}</span>
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="p-0.5 rounded-full hover:bg-accent-soft dark:hover:bg-accent-soft flex-shrink-0"
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
                  `flex items-center gap-2 bg-canvas dark:bg-surface border-2 rounded-md px-2.5 py-2.5 transition-colors ${
                    open ? 'border-accent' : 'border-line dark:border-line'
                  }`
                }
              />
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Dettagli aggiuntivi..."
            rows={2}
            className="w-full bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-md p-3 text-sm dark:text-foreground outline-none resize-none focus:border-accent"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="flex-1 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-colors"
          >
            Salva modifiche
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-panel bg-raised dark:bg-surface text-secondary dark:text-muted font-semibold text-sm hover:bg-raised transition-colors"
          >
            Annulla
          </button>
        </div>
      </form>
    </DialogFrame>
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
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(todo.emailContent || '');
  const [emailExpanded, setEmailExpanded] = useState(false);

  const commitEmail = () => {
    const trimmed = emailDraft.trim();
    if (trimmed) onUpdate({ emailContent: trimmed, emailSavedAt: Date.now() });
    else setEmailDraft(todo.emailContent || '');
    setEditingEmail(false);
  };

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== todo.titolo) onUpdate({ titolo: trimmed });
    else setTitleDraft(todo.titolo);
    setEditingTitle(false);
  };

  const nextStatus: TodoStatus = isDone ? 'da-fare' : 'fatto';

  return (
    <div className={`bg-surface dark:bg-surface rounded-panel p-4 border-2 transition-all ${
      isDone
        ? 'border-line dark:border-line opacity-60'
        : overdue
          ? 'border-danger dark:border-danger'
          : 'border-line dark:border-line'
    }`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(nextStatus)}
          className="mt-0.5 flex-shrink-0 text-muted dark:text-secondary hover:text-accent transition-colors"
        >
          {isDone
            ? <CheckCircle2 size={20} className="text-success" />
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
                className="flex-1 text-sm font-bold leading-snug bg-transparent border-b-2 border-accent outline-none text-foreground dark:text-foreground"
              />
            ) : (
              <p
                onClick={() => setEditingTitle(true)}
                className={`text-sm font-bold leading-snug cursor-text rounded px-0.5 -mx-0.5 ${isDone ? 'line-through text-muted hover:bg-canvas dark:hover:bg-raised/50' : 'text-foreground dark:text-foreground hover:bg-canvas dark:hover:bg-raised/50'}`}
              >
                {todo.titolo}
              </p>
            )}
            <div className="flex items-center flex-shrink-0">
              <button
                onClick={onEdit}
                title="Modifica attività"
                className="p-1 text-muted dark:text-secondary hover:text-accent dark:hover:text-accent transition-colors rounded-lg hover:bg-accent-soft dark:hover:bg-accent-soft/20"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-muted dark:text-secondary hover:text-danger dark:hover:text-danger transition-colors rounded-lg hover:bg-danger-soft dark:hover:bg-danger-soft"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Tipo */}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipo.bg} ${tipo.color}`}>
              {tipo.label}
            </span>

            {/* Priorità */}
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${priorita.dot}`} />
              <select
                value={todo.priorita}
                onChange={(e) => onUpdate({ priorita: e.target.value as TodoItem['priorita'] })}
                className="text-xs font-semibold text-muted bg-transparent border-none outline-none cursor-pointer appearance-none"
              >
                {Object.entries(PRIORITA_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </span>

            {/* Scadenza */}
            {todo.scadenza && (
              <span className={`flex items-center gap-1 text-xs font-bold ${overdue ? 'text-danger' : 'text-muted'}`}>
                <Calendar size={9} />
                {overdue ? 'Scaduto ' : ''}{formatDate(todo.scadenza)}
              </span>
            )}

            {/* Data apertura */}
            <span className="flex items-center gap-1 text-xs font-bold text-muted" title={`Aperto il ${formatDateTime(todo.createdAt)}`}>
              <Clock size={9} />
              Aperto {formatDateTime(todo.createdAt)}
            </span>

            {/* Contatto */}
            {contactName && (
              <span className="flex items-center gap-1 text-xs font-bold text-muted">
                <Building2 size={9} />
                {contactName}
              </span>
            )}

            {/* Source badge se da visita/AI */}
            {todo.source !== 'manuale' && (
              <span className="text-xs font-bold text-accent italic">
                {SOURCE_LABEL[todo.source]}
              </span>
            )}
          </div>

          {todo.note && (
            <p className="text-xs text-secondary dark:text-muted mt-1.5 leading-relaxed">{todo.note}</p>
          )}

          {/* Traccia email inviata */}
          <div className="mt-1.5">
            {editingEmail ? (
              <div className="flex flex-col gap-1.5">
                <textarea
                  autoFocus
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="Incolla qui il testo dell'email inviata..."
                  rows={5}
                  className="w-full text-xs leading-relaxed bg-canvas dark:bg-canvas/50 border-2 border-accent dark:border-accent rounded-md p-2 outline-none text-foreground dark:text-muted"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={commitEmail}
                    className="text-xs font-semibold text-action-foreground bg-action hover:bg-action-hover px-2.5 py-1 rounded-lg"
                  >
                    Salva
                  </button>
                  <button
                    onClick={() => { setEmailDraft(todo.emailContent || ''); setEditingEmail(false); }}
                    className="text-xs font-semibold text-muted hover:text-secondary dark:hover:text-muted px-2 py-1"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : todo.emailContent ? (
              <div className="bg-canvas dark:bg-canvas/50 border border-line dark:border-line rounded-md p-2">
                <div className="flex items-center gap-1.5 w-full">
                  <button
                    onClick={() => setEmailExpanded(v => !v)}
                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                  >
                    <Mail size={11} className="text-accent flex-shrink-0" />
                    <span className="text-xs font-semibold text-muted flex-1 truncate">
                      Email inviata {todo.emailSavedAt ? formatDateTime(todo.emailSavedAt) : ''}
                    </span>
                    {emailExpanded ? <ChevronDown size={12} className="text-muted flex-shrink-0" /> : <ChevronRight size={12} className="text-muted flex-shrink-0" />}
                  </button>
                  <button
                    onClick={() => { setEmailDraft(todo.emailContent || ''); setEditingEmail(true); }}
                    className="p-0.5 text-muted hover:text-accent flex-shrink-0"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
                {emailExpanded && (
                  <p className="text-xs text-secondary dark:text-muted leading-relaxed mt-1.5 whitespace-pre-wrap">
                    {todo.emailContent}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setEditingEmail(true)}
                className="flex items-center gap-1 text-xs font-bold text-muted hover:text-accent transition-colors"
              >
                <Mail size={11} />
                Traccia email inviata
              </button>
            )}
          </div>

          {/* Storico avanzamento: data di ogni cambio di step */}
          {todo.statusHistory && todo.statusHistory.length > 1 && (
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 mt-1.5 text-xs text-muted">
              {todo.statusHistory.map((h, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight size={9} />}
                  <span title={formatDateTime(h.at)}>{STATUS_LABEL[h.status]} {formatDateTime(h.at)}</span>
                </React.Fragment>
              ))}
            </div>
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
  const [searchQuery, setSearchQuery] = useState('');

  const allTodos = Object.values(todos);

  // "Da fare" (status interno 'tutti') = attività ancora aperte: una volta completata,
  // l'attività esce da questa vista e resta visibile solo nel tab "Fatto", senza restarci duplicata
  const matchesStatus = (t: TodoItem) => filterStatus === 'tutti' ? t.status !== 'fatto' : t.status === filterStatus;
  const matchesSearch = (t: TodoItem) => {
    if (!searchQuery.trim()) return true;
    const c = t.contactId ? contacts[t.contactId] : undefined;
    return matchSearch(searchQuery, [t.titolo, t.note, c?.company, c?.contactName]);
  };

  const filtered = useMemo(() => {
    return allTodos
      .filter(matchesStatus)
      .filter(t => filterTipo === 'tutti' || t.tipo === filterTipo)
      .filter(matchesSearch)
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
  }, [todos, contacts, filterStatus, filterTipo, searchQuery]);

  // Raggruppamento per cliente
  const byClient = useMemo(() => {
    const base = allTodos
      .filter(matchesStatus)
      .filter(t => filterTipo === 'tutti' || t.tipo === filterTipo)
      .filter(matchesSearch);

    const map = new Map<string, { name: string; todos: typeof base }>();
    const sortTodos = (arr: typeof base) =>
      [...arr].sort((a, b) => {
        // Prima per stato (da fare → in corso → fatto), così il task "scende"
        // nel gruppo man mano che avanza; poi priorità e scadenza
        const st = { 'da-fare': 0, fatto: 1 };
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
  }, [todos, contacts, filterStatus, filterTipo, searchQuery]);

  const toggleClient = (key: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Contatori
  const daFare = allTodos.filter(t => t.status === 'da-fare').length;
  const fatto = allTodos.filter(t => t.status === 'fatto').length;
  const scaduti = allTodos.filter(t => t.status !== 'fatto' && isOverdue(t.scadenza)).length;

  const sections: { status: TodoStatus | 'tutti'; label: string; count: number; color: string }[] = [
    { status: 'tutti',    label: 'Da fare', count: daFare, color: 'bg-danger-soft dark:bg-danger-soft text-danger dark:text-danger' },
    { status: 'fatto',    label: 'Fatto',    count: fatto,  color: 'bg-success-soft dark:bg-success-soft text-success dark:text-success' },
  ];

  return (
    <div className="space-y-5 pb-6">

      {/* Header (fisso in cima durante lo scroll, resta la lista sottostante a muoversi) */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 pt-1 pb-2 bg-canvas dark:bg-canvas">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl  text-foreground dark:text-foreground flex items-center gap-2.5">
              <CheckSquare size={24} className="text-accent" />
              To Do
            </h1>
            {scaduti > 0 && (
              <p className="text-xs text-danger font-bold mt-0.5 flex items-center gap-1">
                <AlertCircle size={11} /> {scaduti} {scaduti === 1 ? 'attività scaduta' : 'attività scadute'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle vista */}
            <div className="flex bg-raised dark:bg-surface rounded-md p-0.5">
              <button
                onClick={() => setViewMode('cliente')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'cliente' ? 'bg-surface dark:bg-raised text-accent shadow-sm' : 'text-muted'}`}
              >
                <Users size={12} /> Clienti
              </button>
              <button
                onClick={() => setViewMode('lista')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'lista' ? 'bg-surface dark:bg-raised text-accent shadow-sm' : 'text-muted'}`}
              >
                <List size={12} /> Lista
              </button>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-colors shadow-panel  "
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface dark:bg-surface border-2 border-line dark:border-line rounded-panel focus-within:border-accent transition-colors">
        <Search size={15} className="text-muted flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca per titolo, nota o cliente…"
          className="flex-1 bg-transparent outline-none text-sm dark:text-foreground placeholder-gray-400 font-bold min-w-0"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="flex-shrink-0 text-muted hover:text-secondary transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {sections.map(s => (
          <button
            key={s.status}
            onClick={() => setFilterStatus(s.status)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border-2 ${
              filterStatus === s.status
                ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent'
                : 'border-transparent ' + s.color
            }`}
          >
            {s.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              filterStatus === s.status ? 'bg-accent-soft dark:bg-accent-soft text-accent dark:text-accent' : 'bg-surface/60 dark:bg-canvas/40'
            }`}>
              {s.count}
            </span>
          </button>
        ))}

        {/* Filter tipo */}
        <button
          onClick={() => setShowFilters(s => !s)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border-2 ${
            filterTipo !== 'tutti'
              ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent'
              : 'border-transparent bg-raised dark:bg-raised text-secondary'
          }`}
        >
          <Filter size={12} />
          {filterTipo !== 'tutti' ? TIPO_CONFIG[filterTipo].label : 'Tipo'}
          <ChevronDown size={10} className={showFilters ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {/* Tipo filter dropdown */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5 bg-canvas dark:bg-surface rounded-panel p-3">
          <button
            onClick={() => { setFilterTipo('tutti'); setShowFilters(false); }}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${filterTipo === 'tutti' ? 'bg-action text-action-foreground' : 'bg-surface dark:bg-raised text-secondary dark:text-muted'}`}
          >
            Tutti
          </button>
          {Object.entries(TIPO_CONFIG).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { setFilterTipo(k as TodoTipo); setShowFilters(false); }}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${filterTipo === k ? 'bg-action text-action-foreground' : `${v.bg} ${v.color}`}`}
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
            <div className="w-14 h-14 rounded-panel bg-raised dark:bg-surface flex items-center justify-center">
              <CheckSquare size={24} className="text-muted dark:text-secondary" />
            </div>
            <p className="text-sm font-bold text-muted">Nessuna attività. Aggiungine una o completa una visita!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {byClient.map(({ key, name, todos: clientTodos }) => {
              const open = searchQuery.trim() ? true : expandedClients.has(key);
              const scadutiClient = clientTodos.filter(t => t.status !== 'fatto' && isOverdue(t.scadenza)).length;
              const daFareClient = clientTodos.filter(t => t.status === 'da-fare').length;
              return (
                <div key={key} className="bg-surface dark:bg-surface rounded-panel border border-line dark:border-line overflow-hidden shadow-sm">
                  {/* Client header */}
                  <button
                    onClick={() => toggleClient(key)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-canvas dark:hover:bg-raised/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-md bg-accent-soft dark:bg-accent-soft/40 flex items-center justify-center flex-shrink-0">
                      <Building2 size={14} className="text-accent dark:text-accent" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-foreground dark:text-foreground truncate">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-muted">{clientTodos.length} {clientTodos.length === 1 ? 'attività' : 'attività'}</span>
                        {daFareClient > 0 && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning">{daFareClient} da fare</span>}
                        {scadutiClient > 0 && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-danger-soft text-danger flex items-center gap-0.5"><AlertCircle size={8} />{scadutiClient} scad.</span>}
                      </div>
                    </div>
                    {open ? <ChevronDown size={16} className="text-muted flex-shrink-0" /> : <ChevronRight size={16} className="text-muted flex-shrink-0" />}
                  </button>
                  {/* Todos */}
                  {open && (
                    <div className="border-t border-line dark:border-line divide-y divide-line dark:divide-line/50 px-3 pb-3 pt-1 space-y-1.5">
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
            <div className="w-14 h-14 rounded-panel bg-raised dark:bg-surface flex items-center justify-center">
              <CheckSquare size={24} className="text-muted dark:text-secondary" />
            </div>
            <p className="text-sm font-bold text-muted">
              {filterStatus === 'tutti' && filterTipo === 'tutti' ? 'Nessuna attività.' : 'Nessuna attività con questi filtri'}
            </p>
          </div>
        ) : (
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
