import React, { useMemo, useState } from 'react';
import {
  Target, Plus, X, Trash2, Pencil, ChevronLeft, Building2,
  TrendingUp, CheckCircle2, Radar, Search,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/ToastContext';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch } from '../utils/search';
import type { Group, GroupTipo, GroupPriorita, GroupStato, Contact, ProspectingStato } from '../types';

// ─── Costanti ────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<GroupTipo, string> = {
  'dealer-chain': 'Catena / gruppo d\'acquisto',
  'end-user-account': 'Grande cliente finale',
  misto: 'Misto (dealer + end user)',
};

const PRIORITA_CONFIG: Record<GroupPriorita, { label: string; cls: string }> = {
  alta: { label: 'Alta', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  media: { label: 'Media', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  bassa: { label: 'Bassa', cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
};

const STATO_CONFIG: Record<GroupStato, { label: string; cls: string }> = {
  'da-avvicinare': { label: 'Da avvicinare', cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
  'in-corso': { label: 'In corso', cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  attivo: { label: 'Attivo', cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  abbandonato: { label: 'Abbandonato', cls: 'bg-red-50 dark:bg-red-900/20 text-red-400' },
};

const PROSPECTING_STATO_LABEL: Record<ProspectingStato, string> = {
  in_sequenza: 'In sequenza',
  risposto: 'Risposto',
  convertito: 'Convertito',
  in_pausa: 'In pausa',
  scartato: 'Scartato',
};

const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400';
const labelCls = 'text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5';

// ─── Modale: crea / modifica gruppo ─────────────────────────────────────────

interface GroupFormModalProps {
  group: Group | null;
  onClose: () => void;
  onSave: (data: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}

const GroupFormModal: React.FC<GroupFormModalProps> = ({ group, onClose, onSave, onDelete }) => {
  const [nome, setNome] = useState(group?.nome || '');
  const [tipo, setTipo] = useState<GroupTipo>(group?.tipo || 'dealer-chain');
  const [priorita, setPriorita] = useState<GroupPriorita>(group?.priorita || 'media');
  const [stato, setStato] = useState<GroupStato>(group?.stato || 'da-avvicinare');
  const [obiettivo, setObiettivo] = useState(group?.obiettivo || '');
  const [note, setNote] = useState(group?.note || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900 dark:text-white">{group ? 'Modifica gruppo' : 'Nuovo gruppo strategico'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
        </div>

        <div>
          <label className={labelCls}>Nome *</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. Gruppo Ferramenta Nord Italia" required autoFocus className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value as GroupTipo)} className={inputCls}>
            {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Priorità</label>
            <select value={priorita} onChange={e => setPriorita(e.target.value as GroupPriorita)} className={inputCls}>
              {Object.entries(PRIORITA_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Stato</label>
            <select value={stato} onChange={e => setStato(e.target.value as GroupStato)} className={inputCls}>
              {Object.entries(STATO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Obiettivo strategico</label>
          <textarea value={obiettivo} onChange={e => setObiettivo(e.target.value)} rows={2} placeholder="Es. Entrare come fornitore su tutti i punti vendita entro fine anno" className={inputCls + ' resize-none'} />
        </div>

        <div>
          <label className={labelCls}>Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className={inputCls + ' resize-none'} />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit" className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors">Salva</button>
          <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-sm hover:bg-gray-200 transition-colors">Annulla</button>
        </div>

        {group && onDelete && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            {confirmDelete ? (
              <div className="flex items-center gap-2 pt-2">
                <p className="flex-1 text-xs font-bold text-red-500">Eliminare il gruppo? I contatti collegati restano nel CRM, solo scollegati.</p>
                <button type="button" onClick={onDelete} className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700">Conferma</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs font-black">Annulla</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="mt-2 flex items-center gap-1.5 text-xs font-black text-red-500 hover:text-red-600">
                <Trash2 size={13} />Elimina gruppo
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

// ─── Riga contatto collegato al gruppo ──────────────────────────────────────

interface LinkedContactRowProps {
  contact: Contact;
  hasOpenDeal: boolean;
  onUnlink: () => void;
}

const LinkedContactRow: React.FC<LinkedContactRowProps> = ({ contact, hasOpenDeal, onUnlink }) => {
  const profilato = !!contact.profiling;
  return (
    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
        <Building2 size={15} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{contact.company}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500">
            {contact.customerType === 'dealer' ? 'Dealer' : 'End user'}
          </span>
          {contact.prospectingStato && (
            <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600">
              <Radar size={9} />{PROSPECTING_STATO_LABEL[contact.prospectingStato]}
            </span>
          )}
          {profilato && (
            <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600">
              <CheckCircle2 size={9} />Profilato
            </span>
          )}
          {hasOpenDeal && (
            <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600">
              <TrendingUp size={9} />Trattativa aperta
            </span>
          )}
        </div>
      </div>
      <button onClick={onUnlink} title="Scollega dal gruppo" className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
        <X size={15} />
      </button>
    </div>
  );
};

// ─── Dettaglio gruppo ────────────────────────────────────────────────────────

interface GroupDetailProps {
  group: Group;
  onBack: () => void;
}

const GroupDetail: React.FC<GroupDetailProps> = ({ group, onBack }) => {
  const { contacts, deals, updateContact, updateGroup, deleteGroup } = useStore();
  const { showToast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

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
    () => Object.values(contacts)
      .filter(c => !linkedIds.has(c.id))
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city]))
      .sort((a, b) => a.company.localeCompare(b.company, 'it')),
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
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-black text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <ChevronLeft size={16} /> Strategia
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-gray-900 dark:text-white">{group.nome}</h1>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${PRIORITA_CONFIG[group.priorita].cls}`}>{PRIORITA_CONFIG[group.priorita].label}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATO_CONFIG[group.stato].cls}`}>{STATO_CONFIG[group.stato].label}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{TIPO_LABEL[group.tipo]}</p>
          </div>
          <button onClick={() => setShowEdit(true)} className="p-2 text-gray-300 hover:text-indigo-500 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex-shrink-0">
            <Pencil size={17} />
          </button>
        </div>

        {group.obiettivo && (
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Obiettivo</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{group.obiettivo}</p>
          </div>
        )}
        {group.note && (
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Note</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{group.note}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{linkedContacts.length} contatti</span>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600">{stats.profilati} profilati</span>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">{stats.inProspecting} in prospecting</span>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600">{stats.trattativeAperte} trattative aperte</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm space-y-3">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Search size={13} />Aggiungi contatto al gruppo</p>
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
            sublabel: c.contactName || undefined,
          }))}
          totalCount={Object.keys(contacts).length}
          showWhenEmpty
          placeholder="Cerca un contatto già in rubrica..."
          emptyTitle="🔍 Nessun risultato"
          emptySubtitle="Prova con un termine diverso"
          inputWrapperClassName={open => `flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl px-2.5 py-2.5 transition-colors ${open ? 'border-indigo-400' : 'border-gray-100 dark:border-gray-700'}`}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Contatti collegati ({linkedContacts.length})</p>
        {linkedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2 bg-white dark:bg-gray-800 rounded-3xl">
            <Building2 size={22} className="text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-bold text-gray-400">Nessun contatto ancora collegato</p>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedContacts.map(c => (
              <LinkedContactRow
                key={c.id}
                contact={c}
                hasOpenDeal={openDealContactIds.has(c.id)}
                onUnlink={() => updateContact(c.id, { groupId: undefined })}
              />
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <GroupFormModal
          group={group}
          onClose={() => setShowEdit(false)}
          onSave={updates => updateGroup(group.id, updates)}
          onDelete={() => { deleteGroup(group.id); showToast('Gruppo eliminato', 'success'); setShowEdit(false); onBack(); }}
        />
      )}
    </div>
  );
};

// ─── Card gruppo (vista elenco) ─────────────────────────────────────────────

interface GroupCardProps {
  group: Group;
  contactCount: number;
  onOpen: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, contactCount, onOpen }) => (
  <button onClick={onOpen} className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-black text-gray-900 dark:text-white truncate">{group.nome}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{TIPO_LABEL[group.tipo]}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${PRIORITA_CONFIG[group.priorita].cls}`}>{PRIORITA_CONFIG[group.priorita].label}</span>
      </div>
    </div>
    {group.obiettivo && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{group.obiettivo}</p>}
    <div className="flex items-center gap-2 mt-3">
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${STATO_CONFIG[group.stato].cls}`}>{STATO_CONFIG[group.stato].label}</span>
      <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><Building2 size={10} />{contactCount} contatti</span>
    </div>
  </button>
);

// ─── Vista principale ────────────────────────────────────────────────────────

const PRIORITA_ORDER: Record<GroupPriorita, number> = { alta: 0, media: 1, bassa: 2 };

export const StrategyView: React.FC = () => {
  const { groups, contacts, addGroup } = useStore();
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const allGroups = useMemo(
    () => Object.values(groups).sort((a, b) => PRIORITA_ORDER[a.priorita] - PRIORITA_ORDER[b.priorita] || a.nome.localeCompare(b.nome, 'it')),
    [groups]
  );

  const contactCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of Object.values(contacts)) {
      if (c.groupId) counts[c.groupId] = (counts[c.groupId] || 0) + 1;
    }
    return counts;
  }, [contacts]);

  const selectedGroup = selectedGroupId ? groups[selectedGroupId] : null;

  if (selectedGroup) {
    return <GroupDetail group={selectedGroup} onBack={() => setSelectedGroupId(null)} />;
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <Target size={24} className="text-indigo-600" />
            Strategia
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Gruppi e account strategici da presidiare</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900"
        >
          <Plus size={15} />
        </button>
      </div>

      {allGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Target size={24} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-bold text-gray-400">Nessun gruppo strategico ancora. Creane uno per iniziare a mappare i target chiave.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allGroups.map(g => (
            <GroupCard key={g.id} group={g} contactCount={contactCountByGroup[g.id] || 0} onOpen={() => setSelectedGroupId(g.id)} />
          ))}
        </div>
      )}

      {showAdd && (
        <GroupFormModal
          group={null}
          onClose={() => setShowAdd(false)}
          onSave={data => {
            const id = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const now = Date.now();
            addGroup({ id, ...data, createdAt: now, updatedAt: now });
            showToast('Gruppo creato', 'success');
            setSelectedGroupId(id);
          }}
        />
      )}
    </div>
  );
};
