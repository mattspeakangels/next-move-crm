import React, { useMemo, useState } from 'react';
import {
  Radar, X, Mail, Phone, Linkedin, Clock, AlertCircle, CheckCircle2,
  Copy, Building2, PauseCircle, XCircle, TrendingUp, BarChart3, Calendar,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/ToastContext';
import { EmptyState } from '../components/ui/EmptyState';
import type {
  Contact, ProspectingSettore, ProspectingStato, ProspectingMotivoScarto, ProspectingTrack, Sequence, Activity, NavView,
} from '../types';
import {
  advanceTouch, getTouch, wakeUpIfDue,
} from '../lib/prospecting';

const DAY_MS = 24 * 60 * 60 * 1000;

const SETTORE_LABEL: Record<ProspectingSettore, string> = {
  industria: 'Industria',
  edilizia: 'Edilizia',
  rivendita: 'Rivendita',
  ferramenta: 'Ferramenta',
};

const MOTIVO_SCARTO_LABEL: Record<ProspectingMotivoScarto, string> = {
  prodotto: 'Prodotto non adatto',
  momento: 'Momento sbagliato',
  prezzo: 'Prezzo',
  'fornitore-vincolato': 'Vincolato a fornitore',
  altro: 'Altro',
};

const STATO_BADGE: Record<ProspectingStato, { label: string; cls: string }> = {
  in_sequenza: { label: 'In sequenza', cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  risposto: { label: 'Risposto', cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  convertito: { label: 'Convertito', cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  in_pausa: { label: 'In pausa', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  scartato: { label: 'Scartato', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
};

function formatDate(ts?: number): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ts));
}

const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400';
const labelCls = 'text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5';

// ─── Modale: scarto prospect ─────────────────────────────────────────────────

interface DiscardModalProps {
  contact: Contact;
  onClose: () => void;
}

const DiscardModal: React.FC<DiscardModalProps> = ({ contact, onClose }) => {
  const { updateContact, prospectingTracks, updateProspectingTrack } = useStore();
  const [motivo, setMotivo] = useState<ProspectingMotivoScarto>('momento');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateContact(contact.id, { prospectingStato: 'scartato', prospectingMotivoScarto: motivo, prospectingMotivoScartoNote: note.trim() || undefined });
    const active = Object.values(prospectingTracks).find(t => t.contactId === contact.id && t.stato === 'attiva');
    if (active) updateProspectingTrack(active.id, { stato: 'stoppata' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900 dark:text-white">Scarta {contact.company}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
        </div>
        <div>
          <label className={labelCls}>Motivo *</label>
          <select value={motivo} onChange={e => setMotivo(e.target.value as ProspectingMotivoScarto)} className={inputCls}>
            {Object.entries(MOTIVO_SCARTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-black text-sm hover:bg-red-700 transition-colors">Scarta prospect</button>
          <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-sm hover:bg-gray-200 transition-colors">Annulla</button>
        </div>
      </form>
    </div>
  );
};

// ─── Riga coda "Oggi" ────────────────────────────────────────────────────────

interface QueueRowProps {
  contact: Contact;
  track: ProspectingTrack;
  sequence: Sequence;
  onDiscard: () => void;
}

const QueueRow: React.FC<QueueRowProps> = ({ contact, track, sequence, onDiscard }) => {
  const { updateContact, updateProspectingTrack, prospectEmailDrafts, updateProspectEmailDraft, addActivity } = useStore();
  const { showToast } = useToast();
  const [showEsitoTelefonata, setShowEsitoTelefonata] = useState(false);

  const touch = getTouch(sequence, track.toccoCorrente);
  const draft = touch?.tipo === 'email' ? Object.values(prospectEmailDrafts).find(d => d.trackId === track.id && d.tocco === track.toccoCorrente) : undefined;

  const now = Date.now();
  const overdue = track.dataProssimoTocco < now;
  const ritardoGiorni = Math.floor((now - track.dataProssimoTocco) / DAY_MS);

  const logAttivita = (tipo: 'email' | 'chiamata', esito: 'risposta' | 'nessuna-risposta', note?: string) => {
    addActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      contactId: contact.id,
      type: tipo,
      date: Date.now(),
      outcome: 'fatto',
      outcomeType: esito === 'risposta' ? 'riuscita' : 'nessun-contatto',
      notes: note || `Sequenza prospecting — tocco ${track.toccoCorrente}/${sequence.touches.length}`,
      createdAt: Date.now(),
    });
  };

  const avanza = () => {
    const result = advanceTouch(sequence, track);
    updateProspectingTrack(track.id, result.track);
    if (result.completata) updateContact(contact.id, { prospectingStato: 'in_pausa', prospectingDataRisveglio: Date.now() + 30 * DAY_MS });
  };

  const segnaInviata = () => {
    if (draft) updateProspectEmailDraft(draft.id, { inviataIl: Date.now() });
    logAttivita('email', 'nessuna-risposta');
    avanza();
    showToast('Email segnata come inviata, sequenza avanzata', 'success');
  };

  const registraRisposta = () => {
    logAttivita(touch?.tipo === 'email' ? 'email' : 'chiamata', 'risposta');
    updateContact(contact.id, { prospectingStato: 'risposto' });
    updateProspectingTrack(track.id, { stato: 'stoppata' });
    showToast('Risposta registrata, sequenza fermata', 'success');
  };

  const posticipa = () => {
    updateProspectingTrack(track.id, { dataProssimoTocco: Date.now() + 3 * DAY_MS });
    showToast('Tocco posticipato di 3 giorni', 'info');
  };

  const esitoTelefonata = (esito: 'risposta' | 'nessuna-risposta') => {
    logAttivita('chiamata', esito);
    setShowEsitoTelefonata(false);
    if (esito === 'risposta') {
      updateContact(contact.id, { prospectingStato: 'risposto' });
      updateProspectingTrack(track.id, { stato: 'stoppata' });
      showToast('Risposta registrata, sequenza fermata', 'success');
    } else {
      avanza();
      showToast('Nessuna risposta, sequenza avanzata', 'info');
    }
  };

  const copia = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => showToast(`${label} copiato`, 'success'));
  };

  // Apre il client mail con oggetto/corpo già pronti e, contestualmente, segna il
  // tocco come inviato e fa avanzare la sequenza: un solo tasto invece di "Apri
  // mail" + "Segna inviata" separati.
  const inviaEmail = () => {
    if (!draft || !contact.email) return;
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(draft.oggetto)}&body=${encodeURIComponent(draft.corpo)}`;
    segnaInviata();
  };

  if (!touch) return null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 ${overdue ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-gray-900 dark:text-white">{contact.company}</p>
            {contact.prospectingSettore && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">{SETTORE_LABEL[contact.prospectingSettore]}</span>}
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600">Tocco {track.toccoCorrente}/{sequence.touches.length}</span>
          </div>
          {contact.contactName && <p className="text-xs text-gray-400 mt-0.5">{contact.contactName}{contact.role ? ` · ${contact.role}` : ''}</p>}
          <p className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            <Clock size={10} />
            {overdue ? `In ritardo di ${ritardoGiorni}g` : `Previsto ${formatDate(track.dataProssimoTocco)}`}
          </p>
        </div>
        <button onClick={onDiscard} title="Scarta prospect" className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
          <XCircle size={16} />
        </button>
      </div>

      {touch.tipo === 'email' && draft && (
        <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{draft.oggetto}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line line-clamp-3">{draft.corpo}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => copia(draft.oggetto, 'Oggetto')} className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"><Copy size={10} />Oggetto</button>
            <button onClick={() => copia(draft.corpo, 'Corpo')} className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"><Copy size={10} />Corpo</button>
            {!contact.email && (
              <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600">Nessuna email sul contatto: aggiungila per inviare direttamente</span>
            )}
          </div>
          {touch.messaggioLinkedin && (
            <div className="pt-1 border-t border-gray-200 dark:border-gray-700 mt-2">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1"><Linkedin size={10} />LinkedIn{touch.linkedinSaltabile ? ' (saltabile)' : ''}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{touch.messaggioLinkedin}</p>
              <button onClick={() => copia(touch.messaggioLinkedin!, 'Messaggio LinkedIn')} className="mt-1 flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"><Copy size={10} />Copia</button>
            </div>
          )}
        </div>
      )}

      {touch.tipo === 'telefonata' && (
        <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-pre-line line-clamp-4">{touch.scriptTelefonata}</p>
          {contact.phone && <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"><Phone size={10} />{contact.phone}</a>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {touch.tipo === 'email' ? (
          <>
            {draft && contact.email ? (
              <button onClick={inviaEmail} className="flex items-center gap-1 text-xs font-black px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><Mail size={13} />Invia email</button>
            ) : (
              <button onClick={segnaInviata} className="flex items-center gap-1 text-xs font-black px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><CheckCircle2 size={13} />Segna inviata</button>
            )}
            <button onClick={registraRisposta} className="flex items-center gap-1 text-xs font-black px-3 py-2 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"><Mail size={13} />Registra risposta</button>
          </>
        ) : (
          <button onClick={() => setShowEsitoTelefonata(true)} className="flex items-center gap-1 text-xs font-black px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><Phone size={13} />Registra esito chiamata</button>
        )}
        <button onClick={posticipa} className="flex items-center gap-1 text-xs font-black px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"><Clock size={13} />Posticipa 3gg</button>
      </div>

      {showEsitoTelefonata && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => esitoTelefonata('risposta')} className="flex-1 text-xs font-black px-3 py-2 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">Ha risposto</button>
          <button onClick={() => esitoTelefonata('nessuna-risposta')} className="flex-1 text-xs font-black px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Nessuna risposta</button>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Oggi ───────────────────────────────────────────────────────────────

interface OggiTabProps {
  onNavigate?: (view: NavView) => void;
}

const OggiTab: React.FC<OggiTabProps> = ({ onNavigate }) => {
  const { contacts, prospectingTracks, sequences, activities, updateContact } = useStore();
  const [discardContact, setDiscardContact] = useState<Contact | null>(null);

  const now = Date.now();

  const queue = useMemo(() => {
    return Object.values(prospectingTracks)
      .filter(t => t.stato === 'attiva')
      .map(t => ({ track: t, contact: contacts[t.contactId], sequence: sequences[t.sequenceId] }))
      .filter((x): x is { track: ProspectingTrack; contact: Contact; sequence: Sequence } => !!x.contact && !!x.sequence)
      .sort((a, b) => a.track.dataProssimoTocco - b.track.dataProssimoTocco);
  }, [prospectingTracks, contacts, sequences]);

  // Visite a freddo già in agenda ma non ancora chiuse: senza questa sezione il
  // prospect non compariva in Prospecting finché l'appuntamento non veniva
  // completato, anche se già collegato a un contatto potenziale.
  const inProgramma = useMemo(() => {
    return Object.values(activities)
      .filter(a => a.type === 'visita-freddo' && a.outcome !== 'fatto')
      .map(a => ({ activity: a, contact: contacts[a.contactId || ''] }))
      .filter((x): x is { activity: Activity; contact: Contact } => !!x.contact)
      .sort((a, b) => a.activity.date - b.activity.date);
  }, [activities, contacts]);

  const risvegliati = useMemo(() => wakeUpIfDue(Object.values(contacts), now), [contacts, now]);

  const inRitardo = queue.filter(q => q.track.dataProssimoTocco < now).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
        <span>{queue.length} in coda</span>
        {inRitardo > 0 && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12} />{inRitardo} in ritardo</span>}
      </div>

      {inProgramma.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5"><Calendar size={14} />Visite a freddo in programma ({inProgramma.length})</p>
          <p className="text-[10px] text-indigo-400">Per avviare la sequenza email/chiamate registra l'esito della visita dall'Agenda: gli step 1-2-3-4 compaiono qui sotto solo dopo la chiusura.</p>
          {inProgramma.map(({ activity, contact }) => (
            <button
              key={activity.id}
              onClick={() => onNavigate?.('agenda')}
              className="w-full flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-left hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{contact.company}</p>
                <p className="text-[10px] text-gray-400">{new Date(activity.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</p>
              </div>
              <span className="text-[10px] font-black text-indigo-500 uppercase flex-shrink-0">Chiudi in Agenda →</span>
            </button>
          ))}
        </div>
      )}

      {risvegliati.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5"><PauseCircle size={14} />Prospect risvegliati ({risvegliati.length})</p>
          {risvegliati.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{c.company}</span>
              <button onClick={() => updateContact(c.id, { prospectingStato: undefined, prospectingDataRisveglio: undefined })} className="text-[10px] font-black text-indigo-600">Rimetti in gioco</button>
            </div>
          ))}
        </div>
      )}

      {queue.length === 0 ? (
        <EmptyState icon={Radar} title="Coda vuota" description="Nessun tocco in programma oggi. Registra una visita a freddo dall'Agenda per avviare una sequenza." />
      ) : (
        <div className="space-y-3">
          {queue.map(({ track, contact, sequence }) => (
            <QueueRow key={track.id} contact={contact} track={track} sequence={sequence} onDiscard={() => setDiscardContact(contact)} />
          ))}
        </div>
      )}

      {discardContact && <DiscardModal contact={discardContact} onClose={() => setDiscardContact(null)} />}
    </div>
  );
};

// ─── Tab: Prospect ───────────────────────────────────────────────────────────

const ProspectTab: React.FC = () => {
  const { contacts } = useStore();
  const [filter, setFilter] = useState<ProspectingStato | 'tutti'>('tutti');
  const [discardContact, setDiscardContact] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    return Object.values(contacts)
      .filter(c => !!c.prospectingStato)
      .filter(c => filter === 'tutti' || c.prospectingStato === filter)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [contacts, filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setFilter('tutti')} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${filter === 'tutti' ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700' : 'border-transparent bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>Tutti</button>
        {(Object.keys(STATO_BADGE) as ProspectingStato[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${filter === s ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700' : `border-transparent ${STATO_BADGE[s].cls}`}`}>{STATO_BADGE[s].label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Nessun prospect in lavorazione" description="Registra una visita a freddo dall'Agenda per iniziare a mappare le azioni verso un appuntamento." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map(contact => (
            <div key={contact.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">{contact.company}</p>
                  {contact.prospectingStato && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${STATO_BADGE[contact.prospectingStato].cls}`}>{STATO_BADGE[contact.prospectingStato].label}</span>}
                  {contact.prospectingSettore && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">{SETTORE_LABEL[contact.prospectingSettore]}</span>}
                </div>
                {contact.contactName && <p className="text-xs text-gray-400 mt-0.5">{contact.contactName}{contact.role ? ` · ${contact.role}` : ''}</p>}
                {contact.prospectingMotivoScarto && <p className="text-[10px] text-red-400 mt-0.5">{MOTIVO_SCARTO_LABEL[contact.prospectingMotivoScarto]}{contact.prospectingMotivoScartoNote ? ` — ${contact.prospectingMotivoScartoNote}` : ''}</p>}
              </div>
              {contact.prospectingStato !== 'scartato' && contact.prospectingStato !== 'convertito' && (
                <button onClick={() => setDiscardContact(contact)} className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><XCircle size={16} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {discardContact && <DiscardModal contact={discardContact} onClose={() => setDiscardContact(null)} />}
    </div>
  );
};

// ─── Tab: Report / KPI ───────────────────────────────────────────────────────

interface Benchmark { label: string; value: number; unit: '%'; low: number; high: number; }

const BenchmarkBar: React.FC<Benchmark> = ({ label, value, low, high }) => {
  const color = value < low ? 'bg-red-500' : value <= high ? 'bg-amber-400' : 'bg-green-500';
  const textColor = value < low ? 'text-red-600' : value <= high ? 'text-amber-600' : 'text-green-600';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{label}</span>
        <span className={`text-sm font-black ${textColor}`}>{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <p className="text-[9px] font-bold text-gray-400 mt-1">Benchmark: {low}-{high}%</p>
    </div>
  );
};

const ReportTab: React.FC = () => {
  const { contacts, prospectingTracks, sequences } = useStore();

  const stats = useMemo(() => {
    const prospects = Object.values(contacts).filter(c => !!c.prospectingStato);
    const allTracks = Object.values(prospectingTracks);

    const sequenzeAvviate = allTracks.length;
    const risposteRicevute = prospects.filter(c => c.prospectingStato === 'risposto' || c.prospectingStato === 'convertito').length;
    const tassoRisposta = sequenzeAvviate > 0 ? (risposteRicevute / sequenzeAvviate) * 100 : 0;

    const completate = allTracks.filter(t => t.stato === 'completata' || t.stato === 'stoppata').length;
    const convertiti = prospects.filter(c => c.prospectingStato === 'convertito').length;
    const conversioneSuSequenze = completate > 0 ? (convertiti / completate) * 100 : 0;

    // risposte arrivate proprio sull'ultimo tocco (break-up)
    const risposteBreakup = allTracks.filter(t => {
      if (t.stato !== 'stoppata') return false;
      const seq = sequences[t.sequenceId];
      return seq && t.toccoCorrente === seq.touches.length;
    }).length;
    const quotaBreakup = risposteRicevute > 0 ? (risposteBreakup / risposteRicevute) * 100 : 0;

    const conversioneLeadDeal = prospects.length > 0 ? (convertiti / prospects.length) * 100 : 0;

    const scartati = prospects.filter(c => c.prospectingStato === 'scartato');
    const motiviScarto = scartati.reduce((acc, c) => {
      if (c.prospectingMotivoScarto) acc[c.prospectingMotivoScarto] = (acc[c.prospectingMotivoScarto] || 0) + 1;
      return acc;
    }, {} as Record<ProspectingMotivoScarto, number>);

    const perSettore = (Object.keys(SETTORE_LABEL) as ProspectingSettore[]).map(settore => {
      const prospectsSettore = prospects.filter(c => c.prospectingSettore === settore);
      return { settore, totale: prospectsSettore.length, convertiti: prospectsSettore.filter(c => c.prospectingStato === 'convertito').length };
    });

    return { sequenzeAvviate, tassoRisposta, conversioneSuSequenze, quotaBreakup, conversioneLeadDeal, motiviScarto, perSettore };
  }, [contacts, prospectingTracks, sequences]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-black text-gray-400 uppercase">Sequenze avviate</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.sequenzeAvviate}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-black text-gray-400 uppercase">Prospect → Lead</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.conversioneLeadDeal.toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BenchmarkBar label="Tasso di risposta" value={stats.tassoRisposta} unit="%" low={15} high={25} />
        <BenchmarkBar label="Conversioni / sequenze completate" value={stats.conversioneSuSequenze} unit="%" low={8} high={15} />
        <BenchmarkBar label="Risposte da break-up" value={stats.quotaBreakup} unit="%" low={20} high={30} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><BarChart3 size={13} />Per settore</p>
        <div className="space-y-2">
          {stats.perSettore.map(s => (
            <div key={s.settore} className="flex items-center justify-between text-sm">
              <span className="font-bold text-gray-600 dark:text-gray-300">{SETTORE_LABEL[s.settore]}</span>
              <span className="text-gray-400 text-xs">{s.totale} prospect · {s.convertiti} convertiti</span>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(stats.motiviScarto).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Motivi di scarto</p>
          <div className="space-y-2">
            {Object.entries(stats.motiviScarto).map(([motivo, count]) => (
              <div key={motivo} className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-600 dark:text-gray-300">{MOTIVO_SCARTO_LABEL[motivo as ProspectingMotivoScarto]}</span>
                <span className="text-gray-400 text-xs">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main View ───────────────────────────────────────────────────────────────

interface ProspectingViewProps {
  onNavigate?: (view: NavView) => void;
}

export const ProspectingView: React.FC<ProspectingViewProps> = ({ onNavigate }) => {
  const [tab, setTab] = useState<'oggi' | 'prospect' | 'report'>('oggi');

  const tabs: { id: typeof tab; label: string; icon: typeof Radar }[] = [
    { id: 'oggi', label: 'Oggi', icon: Clock },
    { id: 'prospect', label: 'Prospect', icon: Building2 },
    { id: 'report', label: 'Report', icon: TrendingUp },
  ];

  return (
    <div className="space-y-5 pb-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 pt-1 pb-2 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <Radar size={24} className="text-indigo-600" />
            Prospecting
          </h1>
        </div>
        <p className="text-xs text-gray-400 font-bold mt-1">
          Registra le visite a freddo dall'Agenda: qui gestisci i tocchi email/telefonata che portano il prospect a richiedere un'offerta.
        </p>
        <div className="flex gap-2 mt-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${tab === id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'oggi' && <OggiTab onNavigate={onNavigate} />}
      {tab === 'prospect' && <ProspectTab />}
      {tab === 'report' && <ReportTab />}
    </div>
  );
};
