import { useMemo } from 'react';
import { isShownInAgenda } from '../../lib/agendaFilter';
import { matchSearch, sortByRelevance } from '../../utils/search';
import { convertToLead, startSequenceForContact } from '../../lib/prospecting';
import { VISITA_FREDDO_AVVIA_SEQUENZA, activityOccursOnDay } from './agendaShared';
import { AgendaAiModel } from './useAgendaAi';

// Agenda: chiusura dell'appuntamento ed elenco attività visibili.
export function useAgendaClose(prev: AgendaAiModel) {
  const { activities, updateActivity, contacts, updateContact, addTodo, sequences, prospectingTracks, addProspectingTrack, updateProspectingTrack, addProspectEmailDraftsBatch, addDeal, showToast, today, selectedDay, categories, contactSearch, closingActivity, setClosingActivity, closeOutcome, closeNotes, setCloseNotes, closeSettore, setAiTodos, setAiError } = prev;
  const handleCloseActivity = () => {
    if (!closingActivity) return;
    // Se l'attività era già chiusa, questa è una correzione a posteriori dell'esito:
    // aggiorniamo solo i campi dell'attività e saltiamo tutti gli effetti collaterali
    // (avvio sequenza, conversione a lead, todo automatici), che sono scattati già una
    // volta alla prima chiusura e non vanno ripetuti/duplicati.
    const wasAlreadyClosed = closingActivity.outcome !== 'da-fare';

    updateActivity(closingActivity.id, {
      outcome: 'fatto',
      outcomeType: closeOutcome,
      results: closeNotes || undefined,
    });

    if (wasAlreadyClosed) {
      showToast('Esito aggiornato!', 'success');
      setClosingActivity(null);
      setCloseNotes('');
      setAiTodos([]);
      setAiError(null);
      return;
    }

    const contact = closingActivity.contactId ? contacts[closingActivity.contactId] : null;

    // ── Prospecting: "Richiesta offerta" è l'esito trasversale che converte il prospect in
    // Lead e lo sposta in Pipeline, qualunque sia il tipo di attività chiusa (visita, chiamata, email...).
    if (contact && closeOutcome === 'richiesta-offerta') {
      const { deal, contactUpdates } = convertToLead(contact);
      addDeal(deal);
      updateContact(contact.id, contactUpdates);
      const activeTrack = Object.values(prospectingTracks).find(t => t.contactId === contact.id && t.stato === 'attiva');
      if (activeTrack) updateProspectingTrack(activeTrack.id, { stato: 'stoppata' });
      showToast('Richiesta offerta registrata: prospect spostato in Pipeline come Lead!', 'success');
    }
    // ── Visita a freddo con esito che avvia una sequenza di prospecting per settore ──
    else if (contact && closingActivity.type === 'visita-freddo' && VISITA_FREDDO_AVVIA_SEQUENZA.includes(closeOutcome)) {
      const sequence = Object.values(sequences).find(s => s.settore === closeSettore);
      if (sequence) {
        const { track, emailDrafts } = startSequenceForContact(contact, sequence, closeNotes);
        addProspectingTrack(track);
        addProspectEmailDraftsBatch(emailDrafts);
        updateContact(contact.id, { prospectingStato: 'in_sequenza', prospectingSettore: closeSettore });
        showToast(`Sequenza prospecting "${sequence.nome}" avviata!`, 'success');
      } else {
        showToast('Nessuna sequenza trovata per questo settore: riprova, ricaricando la pagina se persiste.', 'error');
      }
    }
    // ── Una risposta positiva su un'attività di follow-up ferma l'avanzamento automatico
    // della sequenza (regola "solo il silenzio fa avanzare il tocco") ──
    else if (contact && contact.prospectingStato === 'in_sequenza' && (closeOutcome === 'riuscita' || closeOutcome === 'parziale')) {
      const activeTrack = Object.values(prospectingTracks).find(t => t.contactId === contact.id && t.stato === 'attiva');
      if (activeTrack) updateProspectingTrack(activeTrack.id, { stato: 'stoppata' });
      updateContact(contact.id, { prospectingStato: 'risposto' });
    }

    // Auto-generazione Todo dai next step della profilazione
    const profiling = contact?.profiling;
    if (profiling?.nextStepAzioni?.length) {
      const MAP: Record<string, { tipo: import('../../types').TodoTipo; priorita: import('../../types').TodoPriorita }> = {
        'Email entro 24h con scheda tecnica / campionatura': { tipo: 'email-info',      priorita: 'alta'  },
        'Demo B2B Webshop':                                 { tipo: 'demo',             priorita: 'media' },
        'Demo Webshop B2B':                                 { tipo: 'demo',             priorita: 'media' },
        'Visita formazione venditori':                      { tipo: 'visita',           priorita: 'media' },
        'Proposta commerciale':                             { tipo: 'offerta',          priorita: 'alta'  },
        'Co-presenza fiera / evento':                       { tipo: 'visita',           priorita: 'bassa' },
        'Campionatura 30 giorni su cantiere':               { tipo: 'campionatura',     priorita: 'media' },
        'Riunione RSPP + Acquisti':                         { tipo: 'visita',           priorita: 'alta'  },
        'Schede EN per DVR':                                { tipo: 'scheda-tecnica',   priorita: 'media' },
        'Calcolo TCO condiviso':                            { tipo: 'altro',            priorita: 'bassa' },
      };
      let created = 0;
      for (const azione of profiling.nextStepAzioni) {
        if (azione === 'Archivia') continue;
        const cfg = MAP[azione] ?? { tipo: 'altro' as const, priorita: 'media' as const };
        addTodo({
          titolo: azione,
          tipo: cfg.tipo,
          priorita: cfg.priorita,
          scadenza: profiling.nextStepData || undefined,
          contactId: closingActivity.contactId || undefined,
          note: profiling.nextStepNote || undefined,
          status: 'da-fare',
          source: 'visita',
          sourceActivityId: closingActivity.id,
        });
        created++;
      }
      if (created > 0) {
        showToast(`${created} attività aggiunte al To Do`, 'success');
      }
    }

    showToast('Appuntamento chiuso!', 'success');
    setClosingActivity(null);
    setCloseNotes('');
    setAiTodos([]);
    setAiError(null);
  };

  // Attività visibili in Agenda secondo le categorie scelte (mai quelle archiviate)
  const allActivities = Object.values(activities).filter(a => isShownInAgenda(a, categories));

  // Filtered contacts for picker — computed outside JSX for reliability
  const filteredContacts = useMemo(() => {
    return sortByRelevance(contactSearch, Object.values(contacts)
      .filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city, c.phone, c.email]))
      .sort((a, b) => (a.company ?? '').localeCompare(b.company ?? '')), c => [c.company, c.contactName]);
  }, [contacts, contactSearch]);

  // Activities for a given day (include eventi multi-giorno, es. Fiera, su ogni giorno coperto)
  const activitiesForDay = (day: Date) =>
    allActivities.filter(a => activityOccursOnDay(a, day)).sort((a, b) => a.date - b.date);

  // Activities shown in list (all upcoming or selected day)
  const listActivities = selectedDay
    ? activitiesForDay(selectedDay)
    : allActivities.filter(a => a.date >= today.getTime()).sort((a, b) => a.date - b.date);

  // Il giorno selezionato ha almeno una visita/sopralluogo con un cliente geolocalizzato?
  // Serve per mostrare il tasto "Vedi itinerario" solo quando ha senso aprire la mappa.
  const dayHasMappedVisits = !!selectedDay && listActivities.some(a =>
    (a.type === 'visita' || a.type === 'sopralluogo') &&
    contacts[a.contactId]?.lat && contacts[a.contactId]?.lng
  );
  return { ...prev, handleCloseActivity, allActivities, filteredContacts, activitiesForDay, listActivities, dayHasMappedVisits };
}

export type AgendaCloseModel = ReturnType<typeof useAgendaClose>;
