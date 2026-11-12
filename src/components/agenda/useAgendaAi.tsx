import { apiAuthHeaders } from '../../lib/apiAuth';
import { useMemo } from 'react';
import { Activity, ActivityType, ActivityOutcome, TodoTipo } from '../../types';
import { runAiTask } from '../../lib/aiTasks';
import { addMinutesToTime, AiExtractedTodo, BatchGroup } from './agendaShared';
import { AgendaStateModel } from './useAgendaState';

// Agenda: dettatura, resoconto con AI e analisi a gruppi.
export function useAgendaAi(prev: AgendaStateModel) {
  const { activities, addActivity, updateActivity, contacts, addTodo, showToast, setShowModal, setFormData, setContactSearch, voiceSched, setVoiceState, setVoiceError, setShowVoicePanel, closingActivity, setClosingActivity, setCloseOutcome, closeNotes, setCloseNotes, setCloseSettore, derivedVisitType, aiTodos, setAiTodos, setAiAnalyzing, setAiError, voiceClose, MAX_BATCH_SIZE, setShowBatchModal, setBatchAnalyzing, setBatchError, batchGroups, setBatchGroups, batchAnalyzedIds, setBatchAnalyzedIds } = prev;
  // ── Voice schedule: parse transcript → pre-fill form ──
  const parseVoiceActivity = async (transcript: string) => {
    setVoiceState('parsing');
    setVoiceError(null);
    try {
      const contactList = Object.values(contacts).map(c => ({ id: c.id, company: c.company }));
      const res = await fetch('/api/parse-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await apiAuthHeaders()) },
        body: JSON.stringify({ transcript, contacts: contactList }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as {
        type?: string;
        companyName?: string;
        date?: string;
        time?: string;
        notes?: string;
      };

      // Find best contact match
      const matchedContact = data.companyName
        ? Object.values(contacts).find(c =>
            c.company.toLowerCase().includes(data.companyName!.toLowerCase()) ||
            data.companyName!.toLowerCase().includes(c.company.toLowerCase())
          )
        : null;

      const type = (data.type as ActivityType) ?? 'visita';
      const date = data.date ?? new Date().toISOString().split('T')[0];
      const time = data.time ?? '09:00';

      setFormData({
        contactIds: matchedContact ? [matchedContact.id] : [],
        endDateDay: '',
        type,
        date,
        time,
        endTime: addMinutesToTime(time, 60),
        allDay: false,
        notes: data.notes ?? '',
      });
      setContactSearch(matchedContact?.company ?? data.companyName ?? '');
      setShowModal(true);
      setShowVoicePanel(false);
      setVoiceState('idle');
      voiceSched.reset();
    } catch (err) {
      setVoiceError(`Errore parsing: ${String(err)}`);
      setVoiceState('idle');
    }
  };

  const startVoiceSchedule = () => {
    setShowVoicePanel(true);
    setVoiceError(null);
    setVoiceState('recording');
    voiceSched.start({ onFinal: (text) => parseVoiceActivity(text) });
  };

  const cancelVoiceSchedule = () => {
    voiceSched.stop();
    voiceSched.reset();
    setVoiceState('idle');
    setShowVoicePanel(false);
    setVoiceError(null);
  };

  // ── Close activity ──
  const openCloseModal = (activity: Activity) => {
    setClosingActivity(activity);
    setCloseNotes(activity.results || '');
    const defaultOutcome = activity.type === 'visita-freddo' ? 'nessuno-trovato' : 'riuscita';
    setCloseOutcome((activity.outcome === 'fatto' && activity.outcomeType ? activity.outcomeType : defaultOutcome) as ActivityOutcome);
    setCloseSettore(contacts[activity.contactId]?.prospectingSettore || 'industria');
    setAiTodos([]);
    setAiError(null);
    voiceClose.reset();
  };

  // Tipi di to-do che rappresentano un contatto reale col cliente a una data precisa
  // (visita, richiamata, demo) → possono generare anche un appuntamento in Agenda.
  const TODO_TO_ACTIVITY_TYPE: Partial<Record<TodoTipo, ActivityType>> = {
    visita: 'visita',
    'chiamata-follow': 'chiamata',
    demo: 'demo',
  };

  const analyzeResoconto = async () => {
    if (!closeNotes.trim()) return;

    setAiAnalyzing(true);
    setAiError(null);
    setAiTodos([]);

    const contactName = closingActivity?.contactId ? contacts[closingActivity.contactId]?.company ?? '' : '';

    try {
      const raw = (await runAiTask({
        type: 'analizza-resoconto',
        data: { contactName, visitType: derivedVisitType, notes: closeNotes },
      })).trim();
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Risposta non valida');
      const parsed: Omit<AiExtractedTodo, 'selected' | 'creaAppuntamento'>[] = JSON.parse(match[0]);
      setAiTodos(parsed.map(t => ({ ...t, selected: true, creaAppuntamento: !!TODO_TO_ACTIVITY_TYPE[t.tipo] })));
    } catch (err: any) {
      setAiError(err.message ?? 'Errore analisi. Riprova.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Se l'AI estrae un'azione con una data di esecuzione esplicita e l'utente non ha
  // disattivato il toggle "crea anche appuntamento", crea subito l'appuntamento in Agenda
  // oltre al To Do.
  const scheduleActivityIfNeeded = (t: AiExtractedTodo, contactId?: string, dealId?: string): boolean => {
    const activityType = TODO_TO_ACTIVITY_TYPE[t.tipo];
    if (!activityType || !t.creaAppuntamento || !t.dataEsecuzione || !contactId) return false;
    const date = new Date(`${t.dataEsecuzione}T09:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    addActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      contactId,
      dealId,
      type: activityType,
      date: date.getTime(),
      outcome: 'da-fare',
      notes: t.note || t.titolo,
      createdAt: Date.now(),
    });
    return true;
  };

  const confirmAiTodos = () => {
    const selected = aiTodos.filter(t => t.selected);
    let scheduled = 0;
    for (const t of selected) {
      addTodo({
        titolo: t.titolo,
        tipo: t.tipo,
        priorita: t.priorita,
        scadenza: t.scadenza || undefined,
        note: (t.note || undefined),
        contactId: closingActivity?.contactId || undefined,
        status: 'da-fare',
        source: 'visita',
        sourceActivityId: closingActivity?.id,
      });
      if (scheduleActivityIfNeeded(t, closingActivity?.contactId, closingActivity?.dealId)) scheduled++;
    }
    if (selected.length > 0) showToast(`${selected.length} attività aggiunte al To Do${scheduled > 0 ? ` · ${scheduled} appuntamento/i creato/i in Agenda` : ''}`, 'success');
    setAiTodos([]);
  };

  // Visite chiuse con un resoconto, non ancora passate per l'analisi AI batch
  const pendingBatchActivities = useMemo(() => (
    Object.values(activities)
      .filter(a => a.outcome === 'fatto' && a.results?.trim() && !a.aiAnalyzedAt)
      .sort((a, b) => a.date - b.date)
  ), [activities]);

  const openBatchModal = () => {
    setShowBatchModal(true);
    setBatchError(null);
    setBatchGroups([]);
    setBatchAnalyzedIds([]);
  };

  const analyzeAllResoconti = async () => {
    const batch = pendingBatchActivities.slice(0, MAX_BATCH_SIZE);
    if (batch.length === 0) return;

    setBatchAnalyzing(true);
    setBatchError(null);
    setBatchGroups([]);

    const items = batch.map(a => ({
      id: a.id,
      contactName: a.contactId ? contacts[a.contactId]?.company ?? '' : '',
      date: new Date(a.date).toISOString().split('T')[0],
      notes: a.results || '',
    }));

    try {
      const raw = (await runAiTask({ type: 'analizza-resoconti', data: { items } })).trim();
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Risposta non valida');
      const parsed: { id: string; todos: Omit<AiExtractedTodo, 'selected' | 'creaAppuntamento'>[] }[] = JSON.parse(match[0]);

      const groups: BatchGroup[] = parsed.map(p => {
        const activity = batch.find(a => a.id === p.id);
        return {
          activityId: p.id,
          contactName: activity?.contactId ? contacts[activity.contactId]?.company ?? '' : '',
          date: activity?.date ?? 0,
          todos: (p.todos || []).map(t => ({ ...t, selected: true, creaAppuntamento: !!TODO_TO_ACTIVITY_TYPE[t.tipo] })),
        };
      });
      setBatchGroups(groups);
      setBatchAnalyzedIds(batch.map(a => a.id));
    } catch (err: any) {
      setBatchError(err.message ?? 'Errore analisi. Riprova.');
    } finally {
      setBatchAnalyzing(false);
    }
  };

  const confirmBatchTodos = () => {
    let count = 0;
    let scheduled = 0;
    for (const group of batchGroups) {
      const sourceActivity = activities[group.activityId];
      for (const t of group.todos) {
        if (!t.selected) continue;
        addTodo({
          titolo: t.titolo,
          tipo: t.tipo,
          priorita: t.priorita,
          scadenza: t.scadenza || undefined,
          note: t.note || undefined,
          contactId: sourceActivity?.contactId || undefined,
          status: 'da-fare',
          source: 'visita',
          sourceActivityId: group.activityId,
        });
        count++;
        if (scheduleActivityIfNeeded(t, sourceActivity?.contactId, sourceActivity?.dealId)) scheduled++;
      }
    }
    // Segna come analizzate tutte le visite passate nel batch, anche quelle senza azioni,
    // così la prossima analisi batch non le riconsidera.
    for (const activityId of batchAnalyzedIds) {
      updateActivity(activityId, { aiAnalyzedAt: Date.now() });
    }
    if (count > 0) showToast(`${count} attività aggiunte al To Do da ${batchAnalyzedIds.length} visite${scheduled > 0 ? ` · ${scheduled} appuntamento/i creato/i in Agenda` : ''}`, 'success');
    setBatchGroups([]);
    setBatchAnalyzedIds([]);
    setShowBatchModal(false);
  };
  return { ...prev, parseVoiceActivity, startVoiceSchedule, cancelVoiceSchedule, openCloseModal, TODO_TO_ACTIVITY_TYPE, analyzeResoconto, scheduleActivityIfNeeded, confirmAiTodos, pendingBatchActivities, openBatchModal, analyzeAllResoconti, confirmBatchTodos };
}

export type AgendaAiModel = ReturnType<typeof useAgendaAi>;
