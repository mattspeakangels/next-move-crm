import React, { useMemo, useState } from 'react';
import {
  Radar, Plus, X, Mail, Phone, Linkedin, Clock, AlertCircle, CheckCircle2,
  Copy, Building2, ChevronRight, PauseCircle, XCircle, TrendingUp, BarChart3,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/ToastContext';
import { EmptyState } from '../components/ui/EmptyState';
import type {
  Lead, ProspectingSettore, VisitaFreddoEsito, LeadMotivoScarto, LeadSequence, Sequence,
} from '../types';
import {
  startSequenceForLead, advanceTouch, getTouch, convertLeadToDeal, wakeUpIfDue,
} from '../lib/prospecting';

const DAY_MS = 24 * 60 * 60 * 1000;

const SETTORE_LABEL: Record<ProspectingSettore, string> = {
  industria: 'Industria',
  edilizia: 'Edilizia',
  rivendita: 'Rivendita',
  ferramenta: 'Ferramenta',
};

const ESITO_LABEL: Record<VisitaFreddoEsito, string> = {
  nessuno_trovato: 'Nessuno trovato',
  parlato_influente_richiesta_email: 'Parlato con influente — richiesta email',
  parlato_decisore: 'Parlato col decisore',
  appuntamento_fissato: 'Appuntamento fissato',
};

const MOTIVO_SCARTO_LABEL: Record<LeadMotivoScarto, string> = {
  prodotto: 'Prodotto non adatto',
  momento: 'Momento sbagliato',
  prezzo: 'Prezzo',
  'fornitore-vincolato': 'Vincolato a fornitore',
  altro: 'Altro',
};

const STATO_BADGE: Record<Lead['statoProspecting'], { label: string; cls: string }> = {
  nuovo: { label: 'Nuovo', cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
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

// ─── Modale: nuovo lead + registrazione visita a freddo ────────────────────

interface NewLeadModalProps {
  onClose: () => void;
}

const NewLeadModal: React.FC<NewLeadModalProps> = ({ onClose }) => {
  const { sequences, addLead, addProspectActivity, addLeadSequence, addLeadEmailDraftsBatch, updateLead, addContact, addDeal } = useStore();
  const { showToast } = useToast();

  const [company, setCompany] = useState('');
  const [settore, setSettore] = useState<ProspectingSettore>('industria');
  const [esito, setEsito] = useState<VisitaFreddoEsito>('parlato_influente_richiesta_email');
  const [nome, setNome] = useState('');
  const [ruolo, setRuolo] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [dettaglioVisita, setDettaglioVisita] = useState('');

  const richiedeReferente = esito !== 'nessuno_trovato';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;

    const now = Date.now();
    const lead: Lead = {
      id: `lead_${now}_${Math.random().toString(36).slice(2, 9)}`,
      company: company.trim(),
      settore,
      statoProspecting: 'nuovo',
      referente: richiedeReferente ? { nome: nome.trim() || undefined, ruolo: ruolo.trim() || undefined, email: email.trim() || undefined, telefono: telefono.trim() || undefined } : undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    addLead(lead);
    addProspectActivity({
      id: `pa_${now}_${Math.random().toString(36).slice(2, 9)}`,
      leadId: lead.id,
      tipo: 'visita_freddo',
      data: now,
      esito,
      dettaglioVisita: dettaglioVisita.trim() || undefined,
      createdAt: now,
    });

    if (esito === 'appuntamento_fissato') {
      const { contact, deal } = convertLeadToDeal(lead, now);
      addContact(contact);
      addDeal(deal);
      updateLead(lead.id, { statoProspecting: 'convertito', convertedToContactId: contact.id, convertedToDealId: deal.id });
      showToast('Appuntamento fissato: lead convertito in trattativa', 'success');
    } else if (esito === 'nessuno_trovato') {
      updateLead(lead.id, { statoProspecting: 'in_pausa', dataRisveglio: now + 30 * DAY_MS });
      showToast('Lead salvato, rientrerà in coda tra 30 giorni', 'info');
    } else {
      const sequence = Object.values(sequences).find(s => s.settore === settore && s.attiva);
      if (!sequence) {
        showToast('Nessuna sequenza attiva per questo settore', 'error');
      } else {
        const { leadSequence, emailDrafts } = startSequenceForLead(lead, sequence, dettaglioVisita.trim() || undefined, now);
        addLeadSequence(leadSequence);
        addLeadEmailDraftsBatch(emailDrafts);
        updateLead(lead.id, { statoProspecting: 'in_sequenza' });
        showToast('Sequenza avviata', 'success');
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900 dark:text-white">Nuova visita a freddo</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
        </div>

        <div>
          <label className={labelCls}>Azienda *</label>
          <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Nome azienda" required autoFocus className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Settore</label>
            <select value={settore} onChange={e => setSettore(e.target.value as ProspectingSettore)} className={inputCls}>
              {Object.entries(SETTORE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Esito visita</label>
            <select value={esito} onChange={e => setEsito(e.target.value as VisitaFreddoEsito)} className={inputCls}>
              {Object.entries(ESITO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {richiedeReferente && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Referente</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Ruolo</label>
              <input type="text" value={ruolo} onChange={e => setRuolo(e.target.value)} placeholder="RSPP, titolare..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@azienda.it" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefono</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Indirizzo</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Città</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Dettaglio visita (osservazioni)</label>
          <textarea value={dettaglioVisita} onChange={e => setDettaglioVisita(e.target.value)} rows={2} placeholder="Es. saldatura, carrelli, cantiere esterno..." className={inputCls + ' resize-none'} />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit" className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors">Salva</button>
          <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-sm hover:bg-gray-200 transition-colors">Annulla</button>
        </div>
      </form>
    </div>
  );
};

// ─── Modale: scarto lead ────────────────────────────────────────────────────

interface DiscardModalProps {
  lead: Lead;
  onClose: () => void;
}

const DiscardModal: React.FC<DiscardModalProps> = ({ lead, onClose }) => {
  const { updateLead, leadSequences, updateLeadSequence } = useStore();
  const [motivo, setMotivo] = useState<LeadMotivoScarto>('momento');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateLead(lead.id, { statoProspecting: 'scartato', motivoScarto: motivo, motivoScartoNote: note.trim() || undefined });
    const active = Object.values(leadSequences).find(ls => ls.leadId === lead.id && ls.stato === 'attiva');
    if (active) updateLeadSequence(active.id, { stato: 'stoppata' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900 dark:text-white">Scarta {lead.company}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
        </div>
        <div>
          <label className={labelCls}>Motivo *</label>
          <select value={motivo} onChange={e => setMotivo(e.target.value as LeadMotivoScarto)} className={inputCls}>
            {Object.entries(MOTIVO_SCARTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-black text-sm hover:bg-red-700 transition-colors">Scarta lead</button>
          <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-sm hover:bg-gray-200 transition-colors">Annulla</button>
        </div>
      </form>
    </div>
  );
};

// ─── Riga coda "Oggi" ────────────────────────────────────────────────────────

interface QueueRowProps {
  lead: Lead;
  leadSequence: LeadSequence;
  sequence: Sequence;
  onDiscard: () => void;
}

const QueueRow: React.FC<QueueRowProps> = ({ lead, leadSequence, sequence, onDiscard }) => {
  const { updateLead, updateLeadSequence, leadEmailDrafts, updateLeadEmailDraft, addProspectActivity } = useStore();
  const { showToast } = useToast();
  const [showEsitoTelefonata, setShowEsitoTelefonata] = useState(false);

  const touch = getTouch(sequence, leadSequence.toccoCorrente);
  const draft = touch?.tipo === 'email' ? Object.values(leadEmailDrafts).find(d => d.leadSequenceId === leadSequence.id && d.tocco === leadSequence.toccoCorrente) : undefined;

  const now = Date.now();
  const overdue = leadSequence.dataProssimoTocco < now;
  const ritardoGiorni = Math.floor((now - leadSequence.dataProssimoTocco) / DAY_MS);

  const registraNota = (tipo: 'email' | 'telefonata' | 'linkedin', esito: 'risposta' | 'nessuna-risposta', note?: string) => {
    addProspectActivity({
      id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      leadId: lead.id,
      tipo,
      data: Date.now(),
      esito,
      note,
      createdAt: Date.now(),
    });
  };

  const avanza = () => {
    const result = advanceTouch(sequence, leadSequence);
    updateLeadSequence(leadSequence.id, result.leadSequence);
    if (result.completata) updateLead(lead.id, { statoProspecting: 'in_pausa', dataRisveglio: Date.now() + 30 * DAY_MS });
  };

  const segnaInviata = () => {
    if (draft) updateLeadEmailDraft(draft.id, { inviataIl: Date.now() });
    registraNota('email', 'nessuna-risposta');
    avanza();
    showToast('Email segnata come inviata, sequenza avanzata', 'success');
  };

  const registraRisposta = () => {
    registraNota(touch?.tipo === 'email' ? 'email' : 'telefonata', 'risposta');
    updateLead(lead.id, { statoProspecting: 'risposto' });
    updateLeadSequence(leadSequence.id, { stato: 'stoppata' });
    showToast('Risposta registrata, sequenza fermata', 'success');
  };

  const posticipa = () => {
    updateLeadSequence(leadSequence.id, { dataProssimoTocco: Date.now() + 3 * DAY_MS });
    showToast('Tocco posticipato di 3 giorni', 'info');
  };

  const esitoTelefonata = (esito: 'risposta' | 'nessuna-risposta') => {
    registraNota('telefonata', esito);
    setShowEsitoTelefonata(false);
    if (esito === 'risposta') {
      updateLead(lead.id, { statoProspecting: 'risposto' });
      updateLeadSequence(leadSequence.id, { stato: 'stoppata' });
      showToast('Risposta registrata, sequenza fermata', 'success');
    } else {
      avanza();
      showToast('Nessuna risposta, sequenza avanzata', 'info');
    }
  };

  const copia = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => showToast(`${label} copiato`, 'success'));
  };

  if (!touch) return null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 ${overdue ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-gray-900 dark:text-white">{lead.company}</p>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">{SETTORE_LABEL[lead.settore]}</span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600">Tocco {leadSequence.toccoCorrente}/{sequence.touches.length}</span>
          </div>
          {lead.referente?.nome && <p className="text-xs text-gray-400 mt-0.5">{lead.referente.nome}{lead.referente.ruolo ? ` · ${lead.referente.ruolo}` : ''}</p>}
          <p className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            <Clock size={10} />
            {overdue ? `In ritardo di ${ritardoGiorni}g` : `Previsto ${formatDate(leadSequence.dataProssimoTocco)}`}
          </p>
        </div>
        <button onClick={onDiscard} title="Scarta lead" className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
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
            {lead.referente?.email && (
              <a href={`mailto:${lead.referente.email}?subject=${encodeURIComponent(draft.oggetto)}&body=${encodeURIComponent(draft.corpo)}`} className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"><Mail size={10} />Apri mail</a>
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
          {lead.referente?.telefono && <a href={`tel:${lead.referente.telefono}`} className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"><Phone size={10} />{lead.referente.telefono}</a>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {touch.tipo === 'email' ? (
          <>
            <button onClick={segnaInviata} className="flex items-center gap-1 text-xs font-black px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><CheckCircle2 size={13} />Segna inviata</button>
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

const OggiTab: React.FC = () => {
  const { leads, leadSequences, sequences, updateLead } = useStore();
  const [discardLead, setDiscardLead] = useState<Lead | null>(null);

  const now = Date.now();

  const queue = useMemo(() => {
    return Object.values(leadSequences)
      .filter(ls => ls.stato === 'attiva')
      .map(ls => ({ leadSequence: ls, lead: leads[ls.leadId], sequence: sequences[ls.sequenceId] }))
      .filter((x): x is { leadSequence: LeadSequence; lead: Lead; sequence: Sequence } => !!x.lead && !!x.sequence)
      .sort((a, b) => a.leadSequence.dataProssimoTocco - b.leadSequence.dataProssimoTocco);
  }, [leadSequences, leads, sequences]);

  const risvegliati = useMemo(() => wakeUpIfDue(Object.values(leads), now), [leads, now]);

  const inRitardo = queue.filter(q => q.leadSequence.dataProssimoTocco < now).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
        <span>{queue.length} in coda</span>
        {inRitardo > 0 && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12} />{inRitardo} in ritardo</span>}
      </div>

      {risvegliati.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5"><PauseCircle size={14} />Lead risvegliati ({risvegliati.length})</p>
          {risvegliati.map(l => (
            <div key={l.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{l.company}</span>
              <button onClick={() => updateLead(l.id, { statoProspecting: 'nuovo', dataRisveglio: undefined })} className="text-[10px] font-black text-indigo-600">Riattiva</button>
            </div>
          ))}
        </div>
      )}

      {queue.length === 0 ? (
        <EmptyState icon={Radar} title="Coda vuota" description="Nessun tocco in programma oggi. Registra una nuova visita a freddo per avviare una sequenza." />
      ) : (
        <div className="space-y-3">
          {queue.map(({ leadSequence, lead, sequence }) => (
            <QueueRow key={leadSequence.id} lead={lead} leadSequence={leadSequence} sequence={sequence} onDiscard={() => setDiscardLead(lead)} />
          ))}
        </div>
      )}

      {discardLead && <DiscardModal lead={discardLead} onClose={() => setDiscardLead(null)} />}
    </div>
  );
};

// ─── Tab: Lead ───────────────────────────────────────────────────────────────

const LeadTab: React.FC = () => {
  const { leads } = useStore();
  const [filter, setFilter] = useState<Lead['statoProspecting'] | 'tutti'>('tutti');
  const [discardLead, setDiscardLead] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    return Object.values(leads)
      .filter(l => filter === 'tutti' || l.statoProspecting === filter)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [leads, filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setFilter('tutti')} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${filter === 'tutti' ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700' : 'border-transparent bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>Tutti</button>
        {(Object.keys(STATO_BADGE) as Lead['statoProspecting'][]).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${filter === s ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700' : `border-transparent ${STATO_BADGE[s].cls}`}`}>{STATO_BADGE[s].label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Nessun lead" description="Registra una nuova visita a freddo per iniziare." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map(lead => (
            <div key={lead.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">{lead.company}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${STATO_BADGE[lead.statoProspecting].cls}`}>{STATO_BADGE[lead.statoProspecting].label}</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">{SETTORE_LABEL[lead.settore]}</span>
                </div>
                {lead.referente?.nome && <p className="text-xs text-gray-400 mt-0.5">{lead.referente.nome}{lead.referente.ruolo ? ` · ${lead.referente.ruolo}` : ''}</p>}
                {lead.motivoScarto && <p className="text-[10px] text-red-400 mt-0.5">{MOTIVO_SCARTO_LABEL[lead.motivoScarto]}{lead.motivoScartoNote ? ` — ${lead.motivoScartoNote}` : ''}</p>}
              </div>
              {lead.statoProspecting !== 'scartato' && lead.statoProspecting !== 'convertito' && (
                <button onClick={() => setDiscardLead(lead)} className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><XCircle size={16} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {discardLead && <DiscardModal lead={discardLead} onClose={() => setDiscardLead(null)} />}
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
  const { leads, leadSequences, prospectActivities, sequences } = useStore();

  const stats = useMemo(() => {
    const allLeads = Object.values(leads);
    const allSequences = Object.values(leadSequences);
    const allActivities = Object.values(prospectActivities);

    const sequenzeAvviate = allSequences.length;
    const risposteRicevute = allActivities.filter(a => a.esito === 'risposta').length;
    const tassoRisposta = sequenzeAvviate > 0 ? (risposteRicevute / sequenzeAvviate) * 100 : 0;

    const completate = allSequences.filter(s => s.stato === 'completata' || s.stato === 'stoppata').length;
    const appuntamenti = allLeads.filter(l => l.statoProspecting === 'convertito').length;
    const appuntamentiSuSequenze = completate > 0 ? (appuntamenti / completate) * 100 : 0;

    // risposte arrivate proprio sull'ultimo tocco (break-up, tocco 6)
    const risposteBreakup = allSequences.filter(ls => {
      if (ls.stato !== 'stoppata') return false;
      const seq = sequences[ls.sequenceId];
      return seq && ls.toccoCorrente === seq.touches.length;
    }).length;
    const quotaBreakup = risposteRicevute > 0 ? (risposteBreakup / risposteRicevute) * 100 : 0;

    const convertiti = allLeads.filter(l => l.statoProspecting === 'convertito').length;
    const conversioneLeadDeal = allLeads.length > 0 ? (convertiti / allLeads.length) * 100 : 0;

    const scartati = allLeads.filter(l => l.statoProspecting === 'scartato');
    const motiviScarto = scartati.reduce((acc, l) => {
      if (l.motivoScarto) acc[l.motivoScarto] = (acc[l.motivoScarto] || 0) + 1;
      return acc;
    }, {} as Record<LeadMotivoScarto, number>);

    const perSettore = (Object.keys(SETTORE_LABEL) as ProspectingSettore[]).map(settore => {
      const leadsSettore = allLeads.filter(l => l.settore === settore);
      return { settore, totale: leadsSettore.length, convertiti: leadsSettore.filter(l => l.statoProspecting === 'convertito').length };
    });

    return { sequenzeAvviate, tassoRisposta, appuntamentiSuSequenze, quotaBreakup, conversioneLeadDeal, motiviScarto, perSettore };
  }, [leads, leadSequences, prospectActivities, sequences]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-black text-gray-400 uppercase">Sequenze avviate</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.sequenzeAvviate}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-black text-gray-400 uppercase">Lead → Deal</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.conversioneLeadDeal.toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BenchmarkBar label="Tasso di risposta" value={stats.tassoRisposta} unit="%" low={15} high={25} />
        <BenchmarkBar label="Appuntamenti / sequenze completate" value={stats.appuntamentiSuSequenze} unit="%" low={8} high={15} />
        <BenchmarkBar label="Risposte da break-up" value={stats.quotaBreakup} unit="%" low={20} high={30} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><BarChart3 size={13} />Per settore</p>
        <div className="space-y-2">
          {stats.perSettore.map(s => (
            <div key={s.settore} className="flex items-center justify-between text-sm">
              <span className="font-bold text-gray-600 dark:text-gray-300">{SETTORE_LABEL[s.settore]}</span>
              <span className="text-gray-400 text-xs">{s.totale} lead · {s.convertiti} convertiti</span>
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
                <span className="font-bold text-gray-600 dark:text-gray-300">{MOTIVO_SCARTO_LABEL[motivo as LeadMotivoScarto]}</span>
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

export const ProspectingView: React.FC = () => {
  const [tab, setTab] = useState<'oggi' | 'lead' | 'report'>('oggi');
  const [showNewLead, setShowNewLead] = useState(false);

  const tabs: { id: typeof tab; label: string; icon: typeof Radar }[] = [
    { id: 'oggi', label: 'Oggi', icon: Clock },
    { id: 'lead', label: 'Lead', icon: Building2 },
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
          <button onClick={() => setShowNewLead(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900">
            <Plus size={15} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${tab === id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Icon size={13} />{label}
              {tab === id && <ChevronRight size={12} className="hidden" />}
            </button>
          ))}
        </div>
      </div>

      {tab === 'oggi' && <OggiTab />}
      {tab === 'lead' && <LeadTab />}
      {tab === 'report' && <ReportTab />}

      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} />}
    </div>
  );
};
