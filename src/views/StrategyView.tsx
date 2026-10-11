import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useMemo, useState } from 'react';
import {
  Target, Plus, X, Trash2, Pencil, ChevronLeft, Building2,
  TrendingUp, CheckCircle2, Radar, Search, Calendar, Clock, User,
  Mail, Phone, StickyNote, MapPin, MessageSquarePlus, ArrowRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/ToastContext';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { QuickLogModal } from '../components/activities/QuickLogModal';
import { matchSearch, sortByRelevance } from '../utils/search';
import type { Group, GroupTipo, GroupPriorita, GroupStato, Contact, ProspectingStato, StrategicFocus, ActivityType } from '../types';

// ─── Mini-timeline dialogo (email/chiamate/note) su un contatto ──────────────

const DIALOGO_ICON: Record<ActivityType, React.ReactNode> = {
  email: <Mail size={13} />, chiamata: <Phone size={13} />, visita: <MapPin size={13} />,
  'visita-freddo': <MapPin size={13} />, nota: <StickyNote size={13} />, demo: <MapPin size={13} />,
  'call-remota': <Phone size={13} />, sopralluogo: <MapPin size={13} />, formazione: <MapPin size={13} />,
  'smart-working': <MapPin size={13} />, ufficio: <MapPin size={13} />, fiera: <MapPin size={13} />,
  'giornata-banco': <MapPin size={13} />, 'mini-fiera': <MapPin size={13} />, 'manutenzione-auto': <MapPin size={13} />,
};

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

const DialogoCard: React.FC<{ contact: Contact; onNavigateToContact: (contactId: string) => void }> = ({ contact, onNavigateToContact }) => {
  const { activities, addActivity } = useStore();
  const { showToast } = useToast();
  const [showLog, setShowLog] = useState(false);

  const recent = useMemo(
    () => Object.values(activities)
      .filter(a => a.contactId === contact.id && ['email', 'chiamata', 'nota', 'visita'].includes(a.type))
      .sort((a, b) => b.date - a.date)
      .slice(0, 5),
    [activities, contact.id]
  );

  const handleSave = (type: ActivityType, notes: string) => {
    addActivity({
      id: `act_${Date.now()}`,
      contactId: contact.id,
      type,
      date: Date.now(),
      outcome: 'fatto',
      notes,
      createdAt: Date.now(),
    });
    showToast('Contatto registrato', 'success');
  };

  return (
    <div className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-normal flex items-center gap-1.5"><MessageSquarePlus size={13} />Dialogo con l'azienda</p>
        <button onClick={() => setShowLog(true)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent hover:bg-accent-soft">
          + Registra contatto
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="text-xs text-muted">Nessuno scambio registrato ancora. Ogni email o chiamata importante va annotata qui a mano.</p>
      ) : (
        <div className="space-y-2">
          {recent.map(a => (
            <div key={a.id} className="flex items-start gap-2.5 bg-canvas dark:bg-canvas/50 rounded-md p-2.5">
              <div className="w-6 h-6 rounded-lg bg-surface dark:bg-surface flex items-center justify-center flex-shrink-0 text-muted mt-0.5">
                {DIALOGO_ICON[a.type]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted">{fmtDateTime(a.date)}</p>
                {a.notes && <p className="text-xs text-secondary dark:text-muted whitespace-pre-wrap line-clamp-3">{a.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => onNavigateToContact(contact.id)} className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent">
        Vedi storico completo<ArrowRight size={11} />
      </button>

      {showLog && (
        <QuickLogModal companyName={contact.company} onClose={() => setShowLog(false)} onSave={handleSave} />
      )}
    </div>
  );
};

// ─── Costanti ────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<GroupTipo, string> = {
  'dealer-chain': 'Catena / gruppo d\'acquisto',
  'end-user-account': 'Grande cliente finale',
  misto: 'Misto (dealer + end user)',
};

const PRIORITA_CONFIG: Record<GroupPriorita, { label: string; cls: string }> = {
  alta: { label: 'Alta', cls: 'bg-danger-soft dark:bg-danger-soft text-danger dark:text-danger' },
  media: { label: 'Media', cls: 'bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning' },
  bassa: { label: 'Bassa', cls: 'bg-raised dark:bg-raised text-secondary dark:text-muted' },
};

const STATO_CONFIG: Record<GroupStato, { label: string; cls: string }> = {
  'da-avvicinare': { label: 'Da avvicinare', cls: 'bg-raised dark:bg-raised text-secondary dark:text-muted' },
  'in-corso': { label: 'In corso', cls: 'bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent' },
  attivo: { label: 'Attivo', cls: 'bg-success-soft dark:bg-success-soft text-success dark:text-success' },
  'completato-vinto': { label: 'Completato/Vinto', cls: 'bg-success-soft dark:bg-success-soft text-success dark:text-success' },
  abbandonato: { label: 'Abbandonato', cls: 'bg-raised dark:bg-raised text-muted dark:text-secondary' },
};

const PROSPECTING_STATO_LABEL: Record<ProspectingStato, string> = {
  in_sequenza: 'In sequenza',
  risposto: 'Ha risposto',
  convertito: 'Convertito',
  in_pausa: 'In pausa',
  scartato: 'Scartato',
};

const PRIORITA_ORDER: Record<GroupPriorita, number> = { alta: 0, media: 1, bassa: 2 };

// Difende da priorita/stato non riconosciuti (dati residui di versioni precedenti
// dello schema, o corrotti) che altrimenti mandano in crash il render (index su
// undefined) e bloccano l'app, dato che il fallback dell'ErrorBoundary e' una
// pagina bianca persistente (nm_last_view riporta qui ad ogni reload).
const priorityConfig = (p: GroupPriorita) => PRIORITA_CONFIG[p] ?? PRIORITA_CONFIG.media;
const statoConfig = (s: GroupStato) => STATO_CONFIG[s] ?? STATO_CONFIG['da-avvicinare'];

const contactSublabel = (c: Contact) => {
  const parts = [c.contactName, c.city].filter(Boolean);
  if (c.locations && c.locations.length > 0) {
    parts.push(`+${c.locations.length} sed${c.locations.length === 1 ? 'e' : 'i'}`);
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
};

const inputCls = 'w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent';
const labelCls = 'text-xs font-semibold text-muted uppercase tracking-normal block mb-1';

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

/** Chiave di ordinamento urgenza: prima la scadenza prossima azione, poi la fine periodo, poi nulla (in fondo). */
function deadlineSortKey(entry: { prossimaAzioneScadenza?: string; dataFinePrevista?: string }): number {
  const raw = entry.prossimaAzioneScadenza || entry.dataFinePrevista;
  if (!raw) return Infinity;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? Infinity : t;
}

// ─── Campi condivisi: periodo di focus + prossima azione ─────────────────────

interface FocusFieldsProps {
  dataInizio: string;
  setDataInizio: (v: string) => void;
  dataFinePrevista: string;
  setDataFinePrevista: (v: string) => void;
  prossimaAzione: string;
  setProssimaAzione: (v: string) => void;
  prossimaAzioneScadenza: string;
  setProssimaAzioneScadenza: (v: string) => void;
}

const FocusFields: React.FC<FocusFieldsProps> = ({
  dataInizio, setDataInizio, dataFinePrevista, setDataFinePrevista,
  prossimaAzione, setProssimaAzione, prossimaAzioneScadenza, setProssimaAzioneScadenza,
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Periodo di focus - inizio</label>
        <input type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Fine prevista</label>
        <input type="date" value={dataFinePrevista} onChange={e => setDataFinePrevista(e.target.value)} className={inputCls} />
      </div>
    </div>
    <div>
      <label className={labelCls}>Prossima azione</label>
      <input value={prossimaAzione} onChange={e => setProssimaAzione(e.target.value)} placeholder="Es. Chiamare il titolare per fissare visita" className={inputCls} />
    </div>
    <div>
      <label className={labelCls}>Scadenza prossima azione</label>
      <input type="date" value={prossimaAzioneScadenza} onChange={e => setProssimaAzioneScadenza(e.target.value)} className={inputCls} />
    </div>
  </div>
);

// ─── Badge riepilogo focus (usato in card e header dettaglio) ────────────────

const FocusSummaryBadges: React.FC<{ entry: { dataFinePrevista?: string; prossimaAzione?: string; prossimaAzioneScadenza?: string } }> = ({ entry }) => {
  if (!entry.prossimaAzione && !entry.prossimaAzioneScadenza && !entry.dataFinePrevista) return null;
  const overdue = isOverdue(entry.prossimaAzioneScadenza);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entry.prossimaAzioneScadenza && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${overdue ? 'bg-danger-soft dark:bg-danger-soft text-danger dark:text-danger' : 'bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent'}`}>
          <Clock size={10} />{overdue ? 'Scaduta' : 'Entro'} {fmtDate(entry.prossimaAzioneScadenza)}
        </span>
      )}
      {entry.dataFinePrevista && (
        <span className="text-xs font-bold text-muted flex items-center gap-1"><Calendar size={10} />fino al {fmtDate(entry.dataFinePrevista)}</span>
      )}
    </div>
  );
};

// ─── Form gruppo ───────────────────────────────────────────────────────────

interface GroupFormModalProps {
  group?: Group;
  onSave: (data: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>, contactIds: string[]) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const GroupFormModal: React.FC<GroupFormModalProps> = ({ group, onSave, onDelete, onClose }) => {
  const { contacts } = useStore();
  const [nome, setNome] = useState(group?.nome || '');
  const [tipo, setTipo] = useState<GroupTipo>(group?.tipo || 'dealer-chain');
  const [priorita, setPriorita] = useState<GroupPriorita>(group?.priorita || 'media');
  const [stato, setStato] = useState<GroupStato>(group?.stato || 'da-avvicinare');
  const [obiettivo, setObiettivo] = useState(group?.obiettivo || '');
  const [note, setNote] = useState(group?.note || '');
  const [dataInizio, setDataInizio] = useState(group?.dataInizio || '');
  const [dataFinePrevista, setDataFinePrevista] = useState(group?.dataFinePrevista || '');
  const [prossimaAzione, setProssimaAzione] = useState(group?.prossimaAzione || '');
  const [prossimaAzioneScadenza, setProssimaAzioneScadenza] = useState(group?.prossimaAzioneScadenza || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  const selectedIds = useMemo(() => new Set(selectedContacts.map(c => c.id)), [selectedContacts]);
  const contactResults = useMemo(
    () => sortByRelevance(contactSearch, Object.values(contacts)
      .filter(c => !c.groupId && !selectedIds.has(c.id))
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city]))
      .sort((a, b) => a.company.localeCompare(b.company, 'it')), c => [c.company, c.contactName]),
    [contacts, selectedIds, contactSearch]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    onSave({
      nome: nome.trim(),
      tipo,
      priorita,
      stato,
      obiettivo: obiettivo.trim() || undefined,
      note: note.trim() || undefined,
      dataInizio: dataInizio || undefined,
      dataFinePrevista: dataFinePrevista || undefined,
      prossimaAzione: prossimaAzione.trim() || undefined,
      prossimaAzioneScadenza: prossimaAzioneScadenza || undefined,
    }, selectedContacts.map(c => c.id));
    onClose();
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground">{group ? 'Modifica gruppo' : 'Nuovo gruppo strategico'}</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
        </div>

        <div>
          <label className={labelCls}>Nome *</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. Gruppo Ferramenta Nord Italia" required autoFocus className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value as GroupTipo)} className={inputCls}>
            {(Object.keys(TIPO_LABEL) as GroupTipo[]).map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Priorità</label>
            <select value={priorita} onChange={e => setPriorita(e.target.value as GroupPriorita)} className={inputCls}>
              {(Object.keys(PRIORITA_CONFIG) as GroupPriorita[]).map(p => <option key={p} value={p}>{PRIORITA_CONFIG[p].label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Stato</label>
            <select value={stato} onChange={e => setStato(e.target.value as GroupStato)} className={inputCls}>
              {(Object.keys(STATO_CONFIG) as GroupStato[]).map(s => <option key={s} value={s}>{STATO_CONFIG[s].label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Obiettivo</label>
          <input value={obiettivo} onChange={e => setObiettivo(e.target.value)} placeholder="Cosa vuoi ottenere da questo gruppo" className={inputCls} />
        </div>

        <FocusFields
          dataInizio={dataInizio} setDataInizio={setDataInizio}
          dataFinePrevista={dataFinePrevista} setDataFinePrevista={setDataFinePrevista}
          prossimaAzione={prossimaAzione} setProssimaAzione={setProssimaAzione}
          prossimaAzioneScadenza={prossimaAzioneScadenza} setProssimaAzioneScadenza={setProssimaAzioneScadenza}
        />

        {!group && (
          <div>
            <label className={labelCls}>Clienti / prospect nel gruppo</label>
            <SearchDropdown
              value={contactSearch}
              onChange={setContactSearch}
              onSelect={c => { setSelectedContacts(prev => [...prev, c]); setContactSearch(''); }}
              results={contactResults.map(c => ({
                key: c.id,
                item: c,
                label: c.company || '(senza nome)',
                sublabel: contactSublabel(c),
              }))}
              showWhenEmpty
              placeholder="Cerca un contatto da aggiungere..."
              emptyTitle="🔍 Nessun risultato"
              emptySubtitle="Prova con un termine diverso"
              inputWrapperClassName={open => `flex items-center gap-2 bg-canvas dark:bg-surface border-2 rounded-md px-2.5 py-2.5 transition-colors ${open ? 'border-accent' : 'border-line dark:border-line'}`}
            />
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedContacts.map(c => (
                  <span key={c.id} className="flex items-center gap-1 text-xs font-bold bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent pl-2.5 pr-1.5 py-1 rounded-full">
                    {c.company || c.contactName}
                    <button type="button" onClick={() => setSelectedContacts(prev => prev.filter(x => x.id !== c.id))} className="text-accent hover:text-accent">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className={labelCls}>Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={inputCls} />
        </div>

        <button type="submit" className="w-full py-3 rounded-md bg-action text-action-foreground font-semibold hover:bg-action-hover">
          {group ? 'Salva modifiche' : 'Crea gruppo'}
        </button>

        {group && onDelete && (
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2 pt-2">
                <p className="flex-1 text-xs font-bold text-danger">Eliminare il gruppo? I contatti collegati restano nel CRM, solo scollegati.</p>
                <button type="button" onClick={onDelete} className="px-3 py-2 rounded-md bg-danger text-status-foreground text-xs font-semibold hover:bg-danger">Conferma</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-md bg-raised dark:bg-surface text-secondary text-xs font-semibold">Annulla</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger hover:text-danger">
                <Trash2 size={13} />Elimina gruppo
              </button>
            )}
          </div>
        )}
      </form>
    </DialogFrame>
  );
};

// ─── Form focus su singolo contatto ──────────────────────────────────────────

interface FocusFormModalProps {
  contact: Contact;
  focus?: StrategicFocus;
  onSave: (data: Omit<StrategicFocus, 'id' | 'contactId' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const FocusFormModal: React.FC<FocusFormModalProps> = ({ contact, focus, onSave, onDelete, onClose }) => {
  const [priorita, setPriorita] = useState<GroupPriorita>(focus?.priorita || 'media');
  const [stato, setStato] = useState<GroupStato>(focus?.stato || 'da-avvicinare');
  const [obiettivo, setObiettivo] = useState(focus?.obiettivo || '');
  const [note, setNote] = useState(focus?.note || '');
  const [dataInizio, setDataInizio] = useState(focus?.dataInizio || '');
  const [dataFinePrevista, setDataFinePrevista] = useState(focus?.dataFinePrevista || '');
  const [prossimaAzione, setProssimaAzione] = useState(focus?.prossimaAzione || '');
  const [prossimaAzioneScadenza, setProssimaAzioneScadenza] = useState(focus?.prossimaAzioneScadenza || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      priorita,
      stato,
      obiettivo: obiettivo.trim() || undefined,
      note: note.trim() || undefined,
      dataInizio: dataInizio || undefined,
      dataFinePrevista: dataFinePrevista || undefined,
      prossimaAzione: prossimaAzione.trim() || undefined,
      prossimaAzioneScadenza: prossimaAzioneScadenza || undefined,
    });
    onClose();
  };

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground dark:text-foreground">{focus ? 'Modifica focus strategico' : 'Nuovo focus strategico'}</h2>
            <p className="text-xs font-bold text-muted">{contact.company}</p>
          </div>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Priorità</label>
            <select value={priorita} onChange={e => setPriorita(e.target.value as GroupPriorita)} className={inputCls}>
              {(Object.keys(PRIORITA_CONFIG) as GroupPriorita[]).map(p => <option key={p} value={p}>{PRIORITA_CONFIG[p].label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Stato</label>
            <select value={stato} onChange={e => setStato(e.target.value as GroupStato)} className={inputCls}>
              {(Object.keys(STATO_CONFIG) as GroupStato[]).map(s => <option key={s} value={s}>{STATO_CONFIG[s].label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Obiettivo</label>
          <input value={obiettivo} onChange={e => setObiettivo(e.target.value)} placeholder="Cosa vuoi sviluppare con questo cliente" className={inputCls} />
        </div>

        <FocusFields
          dataInizio={dataInizio} setDataInizio={setDataInizio}
          dataFinePrevista={dataFinePrevista} setDataFinePrevista={setDataFinePrevista}
          prossimaAzione={prossimaAzione} setProssimaAzione={setProssimaAzione}
          prossimaAzioneScadenza={prossimaAzioneScadenza} setProssimaAzioneScadenza={setProssimaAzioneScadenza}
        />

        <div>
          <label className={labelCls}>Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={inputCls} />
        </div>

        <button type="submit" className="w-full py-3 rounded-md bg-action text-action-foreground font-semibold hover:bg-action-hover">
          {focus ? 'Salva modifiche' : 'Metti sotto focus strategico'}
        </button>

        {focus && onDelete && (
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2 pt-2">
                <p className="flex-1 text-xs font-bold text-danger">Rimuovere il focus strategico? Il contatto resta nel CRM.</p>
                <button type="button" onClick={onDelete} className="px-3 py-2 rounded-md bg-danger text-status-foreground text-xs font-semibold hover:bg-danger">Conferma</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-md bg-raised dark:bg-surface text-secondary text-xs font-semibold">Annulla</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger hover:text-danger">
                <Trash2 size={13} />Rimuovi focus strategico
              </button>
            )}
          </div>
        )}
      </form>
    </DialogFrame>
  );
};

// ─── Scelta rapida: nuovo gruppo o nuovo focus su contatto singolo ───────────

interface AddChooserModalProps {
  onPickGroup: () => void;
  onPickContact: (contact: Contact) => void;
  onClose: () => void;
}

const AddChooserModal: React.FC<AddChooserModalProps> = ({ onPickGroup, onPickContact, onClose }) => {
  const { contacts, strategicFocuses } = useStore();
  const [search, setSearch] = useState('');
  const focusedContactIds = useMemo(() => new Set(Object.values(strategicFocuses).map(f => f.contactId)), [strategicFocuses]);

  const results = useMemo(
    () => sortByRelevance(search, Object.values(contacts)
      .filter(c => !c.groupId && !focusedContactIds.has(c.id))
      .filter(c => matchSearch(search, [c.company, c.contactName, c.city]))
      .sort((a, b) => a.company.localeCompare(b.company, 'it')), c => [c.company, c.contactName]),
    [contacts, focusedContactIds, search]
  );

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface dark:bg-canvas w-full sm:max-w-md sm:rounded-panel rounded-t-3xl p-6 space-y-4 shadow-panel">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground">Nuovo focus strategico</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close type="button" onClick={onClose} className="p-1.5 rounded-md text-muted hover:bg-raised dark:hover:bg-surface"><X size={18} /></button>
        </div>

        <button onClick={onPickGroup} className="w-full flex items-center gap-3 p-4 rounded-panel bg-canvas dark:bg-surface hover:bg-accent-soft dark:hover:bg-accent-soft/20 text-left transition-colors">
          <div className="w-10 h-10 rounded-md bg-surface dark:bg-raised flex items-center justify-center flex-shrink-0"><Radar size={18} className="text-accent" /></div>
          <div>
            <p className="text-sm font-semibold text-foreground dark:text-foreground">Nuovo gruppo</p>
            <p className="text-xs text-muted">Catena o gruppo d'acquisto con più contatti collegati</p>
          </div>
        </button>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-normal flex items-center gap-1.5"><User size={13} />Oppure metti sotto focus un cliente/prospect già in rubrica</p>
          <SearchDropdown
            value={search}
            onChange={setSearch}
            onSelect={c => onPickContact(c)}
            results={results.map(c => ({
              key: c.id,
              item: c,
              label: c.company || '(senza nome)',
              sublabel: contactSublabel(c),
            }))}
            totalCount={Object.keys(contacts).length}
            showWhenEmpty
            placeholder="Cerca un contatto..."
            emptyTitle="🔍 Nessun risultato"
            emptySubtitle="Contatto già gestito o non trovato"
          />
        </div>
      </div>
    </DialogFrame>
  );
};

// ─── Riga contatto collegato al gruppo ────────────────────────────────────────

interface LinkedContactRowProps {
  contact: Contact;
  hasOpenDeal: boolean;
  onUnlink: () => void;
  onOpenContact: () => void;
  onLog: () => void;
}

const LinkedContactRow: React.FC<LinkedContactRowProps> = ({ contact, hasOpenDeal, onUnlink, onOpenContact, onLog }) => {
  const profilato = !!contact.profiling;
  return (
    <div className="flex items-center gap-3 bg-canvas dark:bg-canvas/50 rounded-md p-3">
      <button onClick={onOpenContact} className="w-9 h-9 rounded-md bg-surface dark:bg-surface border border-line dark:border-line flex items-center justify-center flex-shrink-0">
        <Building2 size={15} className="text-muted" />
      </button>
      <button onClick={onOpenContact} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-bold text-foreground dark:text-foreground truncate hover:text-accent dark:hover:text-accent">{contact.company}</p>
        {(contact.city || (contact.locations && contact.locations.length > 0)) && (
          <p className="text-xs text-muted truncate mt-0.5">
            {contact.city || 'Sede principale'}
            {contact.locations && contact.locations.length > 0 && (
              <span className="text-accent dark:text-accent font-bold">
                {' '}+ {contact.locations.length} sed{contact.locations.length === 1 ? 'e' : 'i'}{': '}
                {contact.locations.map(l => l.label || l.city).filter(Boolean).join(', ')}
              </span>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1 mt-1">
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-raised dark:bg-raised text-secondary dark:text-muted">
            {contact.customerType === 'end-user' ? 'End user' : 'Dealer'}
          </span>
          {contact.prospectingStato && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent">
              {PROSPECTING_STATO_LABEL[contact.prospectingStato]}
            </span>
          )}
          {profilato && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-success-soft dark:bg-success-soft text-success dark:text-success flex items-center gap-0.5">
              <CheckCircle2 size={9} />Profilato
            </span>
          )}
          {hasOpenDeal && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning flex items-center gap-0.5">
              <TrendingUp size={9} />Trattativa aperta
            </span>
          )}
        </div>
      </button>
      <button onClick={onLog} className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/20 flex-shrink-0" title="Registra contatto (email/chiamata)">
        <MessageSquarePlus size={14} />
      </button>
      <button onClick={onUnlink} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft flex-shrink-0" title="Scollega dal gruppo">
        <X size={14} />
      </button>
    </div>
  );
};

// ─── Dettaglio gruppo ─────────────────────────────────────────────────────────

interface GroupDetailProps {
  group: Group;
  onBack: () => void;
  onNavigateToContact: (contactId: string) => void;
}

const GroupDetail: React.FC<GroupDetailProps> = ({ group, onBack, onNavigateToContact }) => {
  const { contacts, deals, addActivity, updateContact, updateGroup, deleteGroup } = useStore();
  const { showToast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [logContact, setLogContact] = useState<Contact | null>(null);

  const linkedContacts = useMemo(
    () => Object.values(contacts).filter(c => c.groupId === group.id).sort((a, b) => a.company.localeCompare(b.company, 'it')),
    [contacts, group.id]
  );

  const openDealContactIds = useMemo(() => {
    const stagesAperte = new Set(['lead', 'qualificato', 'proposta', 'negoziazione']);
    return new Set(Object.values(deals).filter(d => stagesAperte.has(d.stage)).map(d => d.contactId));
  }, [deals]);

  const linkedIds = useMemo(() => new Set(linkedContacts.map(c => c.id)), [linkedContacts]);
  const searchResults = useMemo(
    () => sortByRelevance(contactSearch, Object.values(contacts)
      .filter(c => !linkedIds.has(c.id))
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city]))
      .sort((a, b) => a.company.localeCompare(b.company, 'it')), c => [c.company, c.contactName]),
    [contacts, linkedIds, contactSearch]
  );

  const stats = useMemo(() => ({
    profilati: linkedContacts.filter(c => !!c.profiling).length,
    inProspecting: linkedContacts.filter(c => c.prospectingStato === 'in_sequenza').length,
    trattativeAperte: linkedContacts.filter(c => openDealContactIds.has(c.id)).length,
  }), [linkedContacts, openDealContactIds]);

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-secondary dark:hover:text-muted">
          <ChevronLeft size={16} />Strategia
        </button>
      </div>

      <div className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg  text-foreground dark:text-foreground">{group.nome}</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityConfig(group.priorita).cls}`}>{priorityConfig(group.priorita).label}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statoConfig(group.stato).cls}`}>{statoConfig(group.stato).label}</span>
            </div>
            <p className="text-xs font-bold text-muted mt-1">{TIPO_LABEL[group.tipo]}</p>
          </div>
          <button onClick={() => setShowEdit(true)} className="p-2 rounded-md bg-canvas dark:bg-raised text-secondary hover:text-accent flex-shrink-0"><Pencil size={15} /></button>
        </div>

        {group.obiettivo && <p className="text-sm text-secondary dark:text-muted"><span className="font-semibold text-foreground dark:text-foreground">Obiettivo:</span> {group.obiettivo}</p>}
        {group.prossimaAzione && (
          <div className="bg-accent-soft dark:bg-accent-soft/20 rounded-md p-3">
            <p className="text-xs font-semibold text-accent uppercase tracking-normal mb-0.5">Prossima azione</p>
            <p className="text-sm font-bold text-foreground dark:text-foreground">{group.prossimaAzione}</p>
          </div>
        )}
        <FocusSummaryBadges entry={group} />
        {group.note && <p className="text-xs text-muted whitespace-pre-wrap">{group.note}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs font-bold text-muted flex items-center gap-1"><Building2 size={11} />{linkedContacts.length} contatti</span>
          <span className="text-xs font-bold text-muted flex items-center gap-1"><CheckCircle2 size={11} />{stats.profilati} profilati</span>
          <span className="text-xs font-bold text-muted flex items-center gap-1"><Radar size={11} />{stats.inProspecting} in prospecting</span>
          <span className="text-xs font-bold text-muted flex items-center gap-1"><TrendingUp size={11} />{stats.trattativeAperte} trattative aperte</span>
        </div>
      </div>

      <div className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-normal flex items-center gap-1.5"><Search size={13} />Aggiungi contatto al gruppo</p>
        <SearchDropdown
          value={contactSearch}
          onChange={setContactSearch}
          onSelect={c => {
            updateContact(c.id, { groupId: group.id });
            showToast(`${c.company} collegato al gruppo`, 'success');
            setContactSearch('');
          }}
          results={searchResults.map(c => ({
            key: c.id,
            item: c,
            label: c.company || '(senza nome)',
            sublabel: contactSublabel(c),
          }))}
          totalCount={Object.keys(contacts).length}
          showWhenEmpty
          placeholder="Cerca un contatto già in rubrica..."
          emptyTitle="🔍 Nessun risultato"
          emptySubtitle="Prova con un termine diverso"
          inputWrapperClassName={open => `flex items-center gap-2 bg-canvas dark:bg-surface border-2 rounded-md px-2.5 py-2.5 transition-colors ${open ? 'border-accent' : 'border-line dark:border-line'}`}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-normal px-1">Contatti collegati ({linkedContacts.length})</p>
        {linkedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2 bg-surface dark:bg-surface rounded-panel">
            <Building2 size={22} className="text-muted dark:text-secondary" />
            <p className="text-sm font-bold text-muted">Nessun contatto ancora collegato</p>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedContacts.map(c => (
              <LinkedContactRow
                key={c.id}
                contact={c}
                hasOpenDeal={openDealContactIds.has(c.id)}
                onUnlink={() => updateContact(c.id, { groupId: undefined })}
                onOpenContact={() => onNavigateToContact(c.id)}
                onLog={() => setLogContact(c)}
              />
            ))}
          </div>
        )}
      </div>

      {logContact && (
        <QuickLogModal
          companyName={logContact.company}
          onClose={() => setLogContact(null)}
          onSave={(type, notes) => {
            addActivity({
              id: `act_${Date.now()}`,
              contactId: logContact.id,
              type,
              date: Date.now(),
              outcome: 'fatto',
              notes,
              createdAt: Date.now(),
            });
            showToast('Contatto registrato', 'success');
          }}
        />
      )}

      {showEdit && (
        <GroupFormModal
          group={group}
          onClose={() => setShowEdit(false)}
          onSave={data => { updateGroup(group.id, data); showToast('Gruppo aggiornato', 'success'); }}
          onDelete={() => { deleteGroup(group.id); showToast('Gruppo eliminato', 'success'); setShowEdit(false); onBack(); }}
        />
      )}
    </div>
  );
};

// ─── Dettaglio focus su singolo contatto ─────────────────────────────────────

interface FocusDetailProps {
  focus: StrategicFocus;
  onBack: () => void;
  onNavigateToContact: (contactId: string) => void;
}

const FocusDetail: React.FC<FocusDetailProps> = ({ focus, onBack, onNavigateToContact }) => {
  const { contacts, deals, updateStrategicFocus, deleteStrategicFocus } = useStore();
  const { showToast } = useToast();
  const [showEdit, setShowEdit] = useState(false);

  const contact = contacts[focus.contactId];

  const hasOpenDeal = useMemo(() => {
    const stagesAperte = new Set(['lead', 'qualificato', 'proposta', 'negoziazione']);
    return Object.values(deals).some(d => d.contactId === focus.contactId && stagesAperte.has(d.stage));
  }, [deals, focus.contactId]);

  if (!contact) {
    return (
      <div className="space-y-5 pb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-secondary dark:hover:text-muted">
          <ChevronLeft size={16} />Strategia
        </button>
        <div className="bg-surface dark:bg-surface rounded-panel p-5 text-center text-sm font-bold text-muted">Contatto non trovato.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-secondary dark:hover:text-muted">
        <ChevronLeft size={16} />Strategia
      </button>

      <div className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => onNavigateToContact(contact.id)} className="text-lg font-semibold text-foreground dark:text-foreground hover:text-accent dark:hover:text-accent hover:underline text-left">{contact.company}</button>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityConfig(focus.priorita).cls}`}>{priorityConfig(focus.priorita).label}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statoConfig(focus.stato).cls}`}>{statoConfig(focus.stato).label}</span>
            </div>
            <p className="text-xs font-bold text-muted mt-1">{contact.contactName}{contact.city ? ` · ${contact.city}` : ''}</p>
          </div>
          <button onClick={() => setShowEdit(true)} className="p-2 rounded-md bg-canvas dark:bg-raised text-secondary hover:text-accent flex-shrink-0"><Pencil size={15} /></button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-raised dark:bg-raised text-secondary dark:text-muted">
            {contact.customerType === 'end-user' ? 'End user' : 'Dealer'}
          </span>
          {contact.prospectingStato && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent">
              {PROSPECTING_STATO_LABEL[contact.prospectingStato]}
            </span>
          )}
          {contact.profiling && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-success-soft dark:bg-success-soft text-success dark:text-success flex items-center gap-0.5">
              <CheckCircle2 size={9} />Profilato
            </span>
          )}
          {hasOpenDeal && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-warning-soft dark:bg-warning-soft text-warning dark:text-warning flex items-center gap-0.5">
              <TrendingUp size={9} />Trattativa aperta
            </span>
          )}
        </div>

        {focus.obiettivo && <p className="text-sm text-secondary dark:text-muted"><span className="font-semibold text-foreground dark:text-foreground">Obiettivo:</span> {focus.obiettivo}</p>}
        {focus.prossimaAzione && (
          <div className="bg-accent-soft dark:bg-accent-soft/20 rounded-md p-3">
            <p className="text-xs font-semibold text-accent uppercase tracking-normal mb-0.5">Prossima azione</p>
            <p className="text-sm font-bold text-foreground dark:text-foreground">{focus.prossimaAzione}</p>
          </div>
        )}
        <FocusSummaryBadges entry={focus} />
        {focus.note && <p className="text-xs text-muted whitespace-pre-wrap">{focus.note}</p>}
      </div>

      <DialogoCard contact={contact} onNavigateToContact={onNavigateToContact} />

      {showEdit && (
        <FocusFormModal
          contact={contact}
          focus={focus}
          onClose={() => setShowEdit(false)}
          onSave={data => { updateStrategicFocus(focus.id, data); showToast('Focus aggiornato', 'success'); }}
          onDelete={() => { deleteStrategicFocus(focus.id); showToast('Focus rimosso', 'success'); setShowEdit(false); onBack(); }}
        />
      )}
    </div>
  );
};

// ─── Card lista principale ─────────────────────────────────────────────────

interface StrategyCardProps {
  icon: React.ReactNode;
  titolo: string;
  sottotitolo: string;
  priorita: GroupPriorita;
  stato: GroupStato;
  entry: { dataFinePrevista?: string; prossimaAzione?: string; prossimaAzioneScadenza?: string };
  onClick: () => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({ icon, titolo, sottotitolo, priorita, stato, entry, onClick }) => (
  <button onClick={onClick} className="w-full text-left bg-surface dark:bg-surface rounded-panel p-4 shadow-sm hover:shadow-panel transition-shadow space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-md bg-canvas dark:bg-raised flex items-center justify-center flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground dark:text-foreground truncate">{titolo}</p>
          <p className="text-xs font-bold text-muted truncate">{sottotitolo}</p>
        </div>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${priorityConfig(priorita).cls}`}>{priorityConfig(priorita).label}</span>
    </div>
    <div className="flex items-center justify-between gap-2">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statoConfig(stato).cls}`}>{statoConfig(stato).label}</span>
      <FocusSummaryBadges entry={entry} />
    </div>
  </button>
);

// ─── Vista principale ────────────────────────────────────────────────────────

type ListEntry =
  | { kind: 'group'; id: string; data: Group }
  | { kind: 'focus'; id: string; data: StrategicFocus };

interface StrategyViewProps {
  onNavigateToContact: (contactId: string) => void;
}

type StatoFiltro = GroupStato | 'tutti';

const STATO_FILTRI: StatoFiltro[] = ['tutti', 'da-avvicinare', 'in-corso', 'attivo', 'completato-vinto', 'abbandonato'];

export const StrategyView: React.FC<StrategyViewProps> = ({ onNavigateToContact }) => {
  const { groups, strategicFocuses, contacts, addGroup, addStrategicFocus, updateContact } = useStore();
  const { showToast } = useToast();
  const [showChooser, setShowChooser] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [pickedContact, setPickedContact] = useState<Contact | null>(null);
  const [selected, setSelected] = useState<{ kind: 'group' | 'focus'; id: string } | null>(null);
  const [statoFiltro, setStatoFiltro] = useState<StatoFiltro>('tutti');
  const [searchQuery, setSearchQuery] = useState('');

  const allEntries = useMemo<ListEntry[]>(() => {
    const groupEntries: ListEntry[] = Object.values(groups).map(g => ({ kind: 'group', id: g.id, data: g }));
    const focusEntries: ListEntry[] = Object.values(strategicFocuses)
      .filter(f => !!contacts[f.contactId])
      .map(f => ({ kind: 'focus', id: f.id, data: f }));
    return [...groupEntries, ...focusEntries].sort((a, b) => {
      const pa = PRIORITA_ORDER[a.data.priorita], pb = PRIORITA_ORDER[b.data.priorita];
      if (pa !== pb) return pa - pb;
      const da = deadlineSortKey(a.data), db = deadlineSortKey(b.data);
      if (da !== db) return da - db;
      const nomeA = a.kind === 'group' ? a.data.nome : contacts[a.data.contactId]?.company || '';
      const nomeB = b.kind === 'group' ? b.data.nome : contacts[b.data.contactId]?.company || '';
      return nomeA.localeCompare(nomeB, 'it');
    });
  }, [groups, strategicFocuses, contacts]);

  const countByStato = useMemo(() => {
    const counts: Record<StatoFiltro, number> = { tutti: allEntries.length, 'da-avvicinare': 0, 'in-corso': 0, attivo: 0, 'completato-vinto': 0, abbandonato: 0 };
    for (const e of allEntries) counts[e.data.stato] += 1;
    return counts;
  }, [allEntries]);

  const entries = useMemo(() => {
    let list = statoFiltro === 'tutti' ? allEntries : allEntries.filter(e => e.data.stato === statoFiltro);
    if (searchQuery.trim()) {
      list = list.filter(e => {
        if (e.kind === 'group') {
          return matchSearch(searchQuery, [e.data.nome, e.data.obiettivo, e.data.note]);
        }
        const c = contacts[e.data.contactId];
        return matchSearch(searchQuery, [c?.company, c?.contactName, e.data.obiettivo, e.data.note]);
      });
    }
    return list;
  }, [allEntries, statoFiltro, searchQuery, contacts]);

  const contactCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of Object.values(contacts)) {
      if (c.groupId) counts[c.groupId] = (counts[c.groupId] || 0) + 1;
    }
    return counts;
  }, [contacts]);

  if (selected) {
    if (selected.kind === 'group') {
      const g = groups[selected.id];
      if (g) return <GroupDetail group={g} onBack={() => setSelected(null)} onNavigateToContact={onNavigateToContact} />;
    } else {
      const f = strategicFocuses[selected.id];
      if (f) return <FocusDetail focus={f} onBack={() => setSelected(null)} onNavigateToContact={onNavigateToContact} />;
    }
    setSelected(null);
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl  text-foreground dark:text-foreground flex items-center gap-2.5">
            <Target className="text-accent" size={26} />Strategia
          </h1>
          <p className="text-xs font-bold text-muted mt-0.5">Gruppi e clienti su cui concentrare le energie</p>
        </div>
        <button onClick={() => setShowChooser(true)} className="w-11 h-11 rounded-panel bg-action text-action-foreground flex items-center justify-center shadow-panel hover:bg-action-hover flex-shrink-0">
          <Plus size={22} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface dark:bg-surface border-2 border-line dark:border-line rounded-panel focus-within:border-accent transition-colors">
        <Search size={15} className="text-muted flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca per gruppo, cliente, obiettivo o nota…"
          className="flex-1 bg-transparent outline-none text-sm dark:text-foreground placeholder-gray-400 font-bold min-w-0"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="flex-shrink-0 text-muted hover:text-secondary transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {STATO_FILTRI.map(s => {
          const active = statoFiltro === s;
          const label = s === 'tutti' ? 'Tutti' : STATO_CONFIG[s].label;
          return (
            <button
              key={s}
              onClick={() => setStatoFiltro(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                active
                  ? 'bg-action text-action-foreground'
                  : 'bg-raised dark:bg-surface text-secondary dark:text-muted hover:bg-raised dark:hover:bg-raised'
              }`}
            >
              {label} <span className={active ? 'text-accent' : 'text-muted dark:text-secondary'}>{countByStato[s]}</span>
            </button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-surface dark:bg-surface rounded-panel">
          <Target size={32} className="text-muted dark:text-secondary" />
          <div>
            <p className="text-sm font-semibold text-secondary dark:text-muted">
              {statoFiltro === 'tutti' ? 'Nessun focus strategico ancora' : `Nessun elemento in "${STATO_CONFIG[statoFiltro].label}"`}
            </p>
            <p className="text-xs text-muted mt-1">
              {statoFiltro === 'tutti' ? 'Crea un gruppo o metti un cliente sotto focus con "+"' : 'Cambia filtro per vedere gli altri elementi'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => entry.kind === 'group' ? (
            <StrategyCard
              key={`g-${entry.id}`}
              icon={<Radar size={15} className="text-accent" />}
              titolo={entry.data.nome}
              sottotitolo={`${TIPO_LABEL[entry.data.tipo]} · ${contactCountByGroup[entry.id] || 0} contatti`}
              priorita={entry.data.priorita}
              stato={entry.data.stato}
              entry={entry.data}
              onClick={() => setSelected({ kind: 'group', id: entry.id })}
            />
          ) : (
            <StrategyCard
              key={`f-${entry.id}`}
              icon={<User size={15} className="text-accent" />}
              titolo={contacts[entry.data.contactId]?.company || '—'}
              sottotitolo={entry.data.obiettivo || 'Focus su cliente singolo'}
              priorita={entry.data.priorita}
              stato={entry.data.stato}
              entry={entry.data}
              onClick={() => setSelected({ kind: 'focus', id: entry.id })}
            />
          ))}
        </div>
      )}

      {showChooser && (
        <AddChooserModal
          onClose={() => setShowChooser(false)}
          onPickGroup={() => { setShowChooser(false); setShowGroupForm(true); }}
          onPickContact={c => { setShowChooser(false); setPickedContact(c); }}
        />
      )}

      {showGroupForm && (
        <GroupFormModal
          onClose={() => setShowGroupForm(false)}
          onSave={(data, contactIds) => {
            const id = crypto.randomUUID();
            const now = Date.now();
            addGroup({ id, ...data, createdAt: now, updatedAt: now });
            contactIds.forEach(cid => updateContact(cid, { groupId: id }));
            showToast(contactIds.length > 0 ? `Gruppo creato con ${contactIds.length} contatt${contactIds.length === 1 ? 'o' : 'i'}` : 'Gruppo creato', 'success');
            setSelected({ kind: 'group', id });
          }}
        />
      )}

      {pickedContact && (
        <FocusFormModal
          contact={pickedContact}
          onClose={() => setPickedContact(null)}
          onSave={data => {
            const id = crypto.randomUUID();
            const now = Date.now();
            addStrategicFocus({ id, contactId: pickedContact.id, ...data, createdAt: now, updatedAt: now });
            showToast('Contatto messo sotto focus strategico', 'success');
            setSelected({ kind: 'focus', id });
          }}
        />
      )}
    </div>
  );
};
