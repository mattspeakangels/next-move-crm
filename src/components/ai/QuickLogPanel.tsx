import { useMemo, useState } from 'react';
import { Mic, Square, Loader2, X, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useToast } from '../ui/ToastContext';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { SearchDropdown, type SearchDropdownItem } from '../ui/SearchDropdown';
import type { Activity, ActivityType, ActivityOutcome, TodoTipo, TodoPriorita } from '../../types';

const ACTIVITY_TYPES: { id: ActivityType; label: string }[] = [
  { id: 'visita', label: 'Visita' },
  { id: 'sopralluogo', label: 'Sopralluogo' },
  { id: 'chiamata', label: 'Chiamata' },
  { id: 'call-remota', label: 'Call remota' },
  { id: 'email', label: 'Email' },
  { id: 'demo', label: 'Demo' },
  { id: 'formazione', label: 'Formazione' },
  { id: 'fiera', label: 'Fiera' },
  { id: 'nota', label: 'Nota' },
];

const OUTCOME_TYPES: { id: ActivityOutcome; label: string }[] = [
  { id: 'riuscita', label: 'Riuscita' },
  { id: 'parziale', label: 'Parziale' },
  { id: 'promessa-callback', label: 'Richiamare' },
  { id: 'richiesta-offerta', label: 'Richiesta offerta' },
  { id: 'nessun-contatto', label: 'Nessun contatto' },
  { id: 'rifiuto', label: 'Rifiuto' },
  { id: 'nota', label: 'Nota' },
];

const TODO_TIPI: TodoTipo[] = ['offerta', 'scheda-tecnica', 'email-info', 'chiamata-follow', 'campionatura', 'demo', 'visita', 'altro'];
const TODO_PRIORITA: TodoPriorita[] = ['alta', 'media', 'bassa'];

interface ParsedTodo {
  titolo: string;
  tipo: TodoTipo;
  priorita: TodoPriorita;
  dataEsecuzione: string | null;
  scadenza: string | null;
  note: string;
  selected: boolean;
}

interface ParsedResponse {
  companyNameRaw: string | null;
  contactCandidates: { id: string; score: number }[];
  activityType: string;
  outcomeType: string | null;
  date: string | null;
  time: string | null;
  notes: string;
  todos: { titolo: string; tipo: string; priorita: string; dataEsecuzione: string | null; scadenza: string | null; note: string }[];
}

type Phase = 'capture' | 'analyzing' | 'review' | 'saving' | 'error';

interface Props {
  onClose: () => void;
}

export function QuickLogPanel({ onClose }: Props) {
  const contacts = useStore(s => s.contacts);
  const activities = useStore(s => s.activities);
  const addActivity = useStore(s => s.addActivity);
  const updateActivity = useStore(s => s.updateActivity);
  const addTodo = useStore(s => s.addTodo);
  const { showToast } = useToast();
  const voice = useVoiceInput();

  const [phase, setPhase] = useState<Phase>('capture');
  const [text, setText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campi di review, editabili
  const [contactId, setContactId] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [suggestedContactIds, setSuggestedContactIds] = useState<string[]>([]);
  const [activityType, setActivityType] = useState<ActivityType>('nota');
  const [outcomeType, setOutcomeType] = useState<ActivityOutcome>('nota');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [todos, setTodos] = useState<ParsedTodo[]>([]);
  const [closeExistingId, setCloseExistingId] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'close' | 'new'>('new');

  const contactList = useMemo(() => Object.values(contacts), [contacts]);

  const searchResults: SearchDropdownItem<typeof contactList[number]>[] = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    const pool = q
      ? contactList.filter(c => c.company.toLowerCase().includes(q))
      : contactList.slice(0, 20);
    return pool.slice(0, 20).map(c => ({
      key: c.id,
      item: c,
      label: c.company,
      sublabel: c.city || undefined,
    }));
  }, [contactList, contactQuery]);

  const selectedContact = contactId ? contacts[contactId] : null;

  // ── Rilevamento appuntamento aperto (client-side, mai delegato all'AI) ──
  const findOpenActivity = (cId: string, targetDate: string | null): Activity | null => {
    const candidateDate = targetDate ? new Date(targetDate).getTime() : Date.now();
    const WINDOW_MS = 36 * 60 * 60 * 1000;
    let best: Activity | null = null;
    let bestDelta = Infinity;
    for (const a of Object.values(activities)) {
      if (a.contactId !== cId || a.outcome !== 'da-fare') continue;
      const delta = Math.abs(a.date - candidateDate);
      if (delta <= WINDOW_MS && delta < bestDelta) {
        best = a;
        bestDelta = delta;
      }
    }
    return best;
  };

  const applyParsedResult = (data: ParsedResponse) => {
    const validType = ACTIVITY_TYPES.some(t => t.id === data.activityType) ? (data.activityType as ActivityType) : 'nota';
    const validOutcome = OUTCOME_TYPES.some(o => o.id === data.outcomeType) ? (data.outcomeType as ActivityOutcome) : 'nota';
    setActivityType(validType);
    setOutcomeType(validOutcome);
    setDate(data.date || new Date().toISOString().split('T')[0]);
    setNotes(data.notes || '');
    setTodos((data.todos || []).map(t => ({
      titolo: t.titolo,
      tipo: TODO_TIPI.includes(t.tipo as TodoTipo) ? (t.tipo as TodoTipo) : 'altro',
      priorita: TODO_PRIORITA.includes(t.priorita as TodoPriorita) ? (t.priorita as TodoPriorita) : 'media',
      dataEsecuzione: t.dataEsecuzione,
      scadenza: t.scadenza,
      note: t.note,
      selected: true,
    })));

    // Matching contatto: candidati AI con score alto, altrimenti fallback substring bidirezionale
    const sortedCandidates = [...(data.contactCandidates || [])].sort((a, b) => b.score - a.score);
    const topCandidate = sortedCandidates.find(c => contacts[c.id] && c.score >= 0.6);
    let matchedId = topCandidate?.id || '';

    if (!matchedId && data.companyNameRaw) {
      const raw = data.companyNameRaw.toLowerCase();
      const fallback = contactList.find(c =>
        c.company.toLowerCase().includes(raw) || raw.includes(c.company.toLowerCase())
      );
      matchedId = fallback?.id || '';
    }

    setSuggestedContactIds(sortedCandidates.filter(c => contacts[c.id]).slice(0, 3).map(c => c.id));

    if (matchedId) {
      setContactId(matchedId);
      setContactQuery(contacts[matchedId]?.company || '');
      const open = findOpenActivity(matchedId, data.date);
      if (open) {
        setCloseExistingId(open.id);
        setSaveMode('close');
      } else {
        setCloseExistingId(null);
        setSaveMode('new');
      }
    } else {
      setContactId('');
      setContactQuery(data.companyNameRaw || '');
      setCloseExistingId(null);
      setSaveMode('new');
    }
  };

  const analyze = async (transcript: string) => {
    if (!transcript.trim()) return;
    setPhase('analyzing');
    setErrorMsg(null);
    try {
      const token = import.meta.env.VITE_ADMIN_API_TOKEN;
      const contactHints = contactList.slice(0, 100).map(c => ({ id: c.id, company: c.company, city: c.city || undefined }));
      const openHints = Object.values(activities)
        .filter(a => a.outcome === 'da-fare')
        .slice(0, 50)
        .map(a => ({ contactId: a.contactId, type: a.type, date: new Date(a.date).toISOString().split('T')[0] }));

      const res = await fetch('/api/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          transcript: transcript.trim(),
          contacts: contactHints,
          now: new Date().toISOString(),
          openActivitiesHint: openHints,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = await res.json() as ParsedResponse;
      applyParsedResult(data);
      setPhase('review');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore di analisi');
      setPhase('error');
    }
  };

  const handleStartVoice = () => {
    voice.reset();
    voice.start({ onFinal: (finalText) => { if (finalText) analyze(finalText); } });
  };

  const toggleTodo = (idx: number) => {
    setTodos(prev => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t));
  };

  const removeTodo = (idx: number) => {
    setTodos(prev => prev.filter((_, i) => i !== idx));
  };


  const handleSave = async () => {
    if (!contactId) return;
    setPhase('saving');
    try {
      const dateMs = date ? new Date(date).getTime() : Date.now();
      let activityId: string;

      if (saveMode === 'close' && closeExistingId) {
        activityId = closeExistingId;
        updateActivity(closeExistingId, {
          outcome: 'fatto',
          outcomeType,
          results: notes,
          transcript: notes,
        });
      } else {
        activityId = `act_${Date.now()}`;
        addActivity({
          id: activityId,
          contactId,
          type: activityType,
          date: dateMs,
          outcome: 'fatto',
          outcomeType,
          notes,
          results: notes,
          transcript: notes,
          createdAt: Date.now(),
        });
      }

      const selectedTodos = todos.filter(t => t.selected && t.titolo.trim());
      let todoFailures = 0;
      for (const t of selectedTodos) {
        try {
          addTodo({
            contactId,
            titolo: t.titolo,
            note: t.note,
            tipo: t.tipo,
            scadenza: t.scadenza || t.dataEsecuzione || undefined,
            priorita: t.priorita,
            status: 'da-fare',
            source: 'ai',
            sourceActivityId: activityId,
          });
        } catch {
          todoFailures++;
        }
      }

      if (todoFailures > 0) {
        showToast(`Attività salvata, ma ${todoFailures} to-do non sono stati creati`, 'error');
      } else if (selectedTodos.length > 0) {
        showToast(`Attività registrata con ${selectedTodos.length} to-do`, 'success');
      } else {
        showToast('Attività registrata', 'success');
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore di salvataggio');
      setPhase('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full md:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-base font-black dark:text-white">Registra attività</h2>
          <button onClick={onClose} className="p-2 -m-2 text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-6">
          {phase === 'capture' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Racconta cosa è successo: cliente, tipo di attività, esito, cosa resta da fare. Verrà tutto proposto per la revisione prima di salvare.
              </p>

              <div className="flex items-center justify-center py-4">
                <button
                  onClick={voice.isRecording ? voice.stop : handleStartVoice}
                  disabled={!voice.isSupported}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    voice.isRecording ? 'bg-red-500 animate-pulse' : 'bg-[var(--accent-600)]'
                  } text-white disabled:opacity-40`}
                >
                  {voice.isRecording ? <Square size={26} /> : <Mic size={28} />}
                </button>
              </div>
              {voice.isRecording && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 min-h-[1.5em]">{voice.transcript || 'Ascolto…'}</p>
              )}
              {voice.error && <p className="text-center text-xs text-red-500">{voice.error}</p>}
              {!voice.isSupported && (
                <p className="text-center text-xs text-amber-600">Dettatura vocale non supportata su questo browser, usa il testo qui sotto.</p>
              )}

              <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" /> oppure scrivi <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
              </div>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Es: ho fatto un sopralluogo da Rossi Srl, serve un preventivo DPI entro fine mese, richiamarlo giovedì"
                rows={4}
                className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[var(--accent-400)] dark:text-white resize-none"
              />
              <button
                onClick={() => analyze(text)}
                disabled={!text.trim()}
                className="w-full py-3 rounded-2xl bg-[var(--accent-600)] text-white font-black text-sm uppercase tracking-wide disabled:opacity-40"
              >
                Analizza
              </button>
            </div>
          )}

          {phase === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="animate-spin text-[var(--accent-600)]" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Sto analizzando il resoconto…</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <AlertTriangle size={28} className="text-red-500" />
              <p className="text-sm text-red-500 text-center">{errorMsg}</p>
              <button onClick={() => setPhase('capture')} className="text-sm font-bold text-[var(--accent-600)]">Riprova</button>
            </div>
          )}

          {(phase === 'review' || phase === 'saving') && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Cliente</label>
                <SearchDropdown
                  value={contactQuery}
                  onChange={v => { setContactQuery(v); setContactId(''); }}
                  onSelect={c => { setContactId(c.id); setContactQuery(c.company); const open = findOpenActivity(c.id, date); setCloseExistingId(open?.id || null); setSaveMode(open ? 'close' : 'new'); }}
                  results={searchResults}
                  placeholder="Cerca cliente…"
                  showWhenEmpty
                  emptyTitle="Nessun cliente trovato"
                  className="mt-1"
                />
                {!contactId && suggestedContactIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] text-gray-400 self-center">Forse intendevi:</span>
                    {suggestedContactIds.map(id => contacts[id] && (
                      <button
                        key={id}
                        onClick={() => { setContactId(id); setContactQuery(contacts[id].company); const open = findOpenActivity(id, date); setCloseExistingId(open?.id || null); setSaveMode(open ? 'close' : 'new'); }}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--accent-50)] text-[var(--accent-700)] dark:bg-[var(--accent-900)] dark:text-[var(--accent-200)]"
                      >
                        {contacts[id].company}
                      </button>
                    ))}
                  </div>
                )}
                {!contactId && (
                  <p className="text-[11px] text-amber-600 mt-1.5">Seleziona un cliente per poter salvare.</p>
                )}
              </div>

              {closeExistingId && selectedContact && (
                <div className="rounded-2xl bg-orange-50 dark:bg-orange-900/20 px-4 py-3 space-y-2">
                  <p className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
                    Trovato un appuntamento già pianificato per {selectedContact.company}.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSaveMode('close')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase ${saveMode === 'close' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-500'}`}
                    >
                      Chiudi esistente
                    </button>
                    <button
                      onClick={() => setSaveMode('new')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase ${saveMode === 'new' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-500'}`}
                    >
                      Crea nuova
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Tipo</label>
                  <select
                    value={activityType}
                    onChange={e => setActivityType(e.target.value as ActivityType)}
                    className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm dark:text-white outline-none"
                  >
                    {ACTIVITY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Esito</label>
                  <select
                    value={outcomeType}
                    onChange={e => setOutcomeType(e.target.value as ActivityOutcome)}
                    className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm dark:text-white outline-none"
                  >
                    {OUTCOME_TYPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Note</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm dark:text-white outline-none resize-none"
                />
              </div>

              {todos.length > 0 && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide">To-do estratti</label>
                  <div className="space-y-2 mt-1.5">
                    {todos.map((t, idx) => (
                      <div key={idx} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 border-2 ${t.selected ? 'border-[var(--accent-200)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20' : 'border-gray-100 dark:border-gray-700 opacity-50'}`}>
                        <button onClick={() => toggleTodo(idx)} className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${t.selected ? 'bg-[var(--accent-600)] text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>
                          {t.selected && <Check size={12} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold dark:text-white truncate">{t.titolo}</p>
                          <p className="text-[10px] text-gray-400">{t.tipo} · {t.priorita}{t.scadenza ? ` · scad. ${t.scadenza}` : ''}</p>
                        </div>
                        <button onClick={() => removeTodo(idx)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!contactId || phase !== 'review'}
                className="w-full py-3 rounded-2xl bg-[var(--accent-600)] text-white font-black text-sm uppercase tracking-wide disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {phase === 'saving' ? <Loader2 size={16} className="animate-spin" /> : null}
                {saveMode === 'close' ? 'Chiudi appuntamento e salva' : 'Salva attività'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
