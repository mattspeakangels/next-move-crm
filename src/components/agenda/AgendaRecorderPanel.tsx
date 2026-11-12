import { ConversationRecorder, mergeProfilingPatch } from '../ai/ConversationRecorder';
import { AgendaCalendarModel } from './useAgendaCalendar';

export function AgendaRecorderPanel({ v }: { v: AgendaCalendarModel }) {
  const { updateActivity, contacts, updateContact, showToast, viewActivity, showRecorder, setShowRecorder } = v;
  return (
    <>
      {showRecorder && viewActivity && viewActivity.contactId && contacts[viewActivity.contactId] && (
        <ConversationRecorder
          contact={contacts[viewActivity.contactId]}
          onClose={() => setShowRecorder(false)}
          onSave={(transcript, result) => {
            updateActivity(viewActivity.id, { transcript });
            const contact = contacts[viewActivity.contactId];
            const isDealer = contact.customerType === 'dealer' || contact.segment === 'dealer';
            const existingProfiling = contact.profiling ?? (isDealer
              ? { type: 'dealer' as const, dataVisita: new Date().toISOString().split('T')[0], segmento: '', numDipendenti: '', fatturatoEst: '', canaleVendita: [], modelloOrdini: [], clienteFinale: [], percWorkwear: '', brandAttuali: [], brandAltro: '', brandDominante: '', dpiCatIII: '', dpiParziale: '', reclamiResi: '', reclamiMotivo: '', processoRiordino: [], painPoints: [], painAltro: '', painPrioritario: '', fraseEsatta: '', prodottiInteresse: [], prodottiAltro: '', campionaturaLasciata: '', qualificazione: { esigenzaReale: 1, decisionMaker: 1, aperturaFornitore: 1, timeline: 1, budget: 1 }, noteQualificazione: '', competitor: [], nextStepAzioni: [], nextStepData: '', nextStepNote: '' }
              : { type: 'end-user' as const, dataVisita: new Date().toISOString().split('T')[0], rsppNome: '', respAcquisti: '', segmentoEdilizia: '', segmentoIndustria: '', numDipendentiTotali: '', numDipendentiDPI: '', fatturatoStimato: '', certificazioni: [], obiettiviESG: '', livelloDPI: '', rischiSpecifici: [], dvrAggiornato: '', ispezioniRecenti: '', ispezioniEsito: '', schedeEN: '', fornitoreAttuale: '', canaleAcquisto: [], frequenzaRinnovo: '', durataMediaCapo: '', spesaDipAnno: '', lamenteleLavoratori: '', chiGestisceLogistica: [], painPoints: [], painAltro: '', painPrioritario: '', fraseEsatta: '', tcoCostoCapo: '', tcoDurataMesi: '', tcoNumDipendenti: '', tcoCostoFlotta: '', tcoNote: '', prodottiInteresse: [], prodottiAltro: '', campionaturaLasciata: '', qualificazione: { esigenzaReale: 1, decisionMaker: 1, aperturaFornitore: 1, timeline: 1, budget: 1 }, noteQualificazione: '', nextStepAzioni: [], nextStepData: '', nextStepNote: '' }
            );
            const merged = mergeProfilingPatch(existingProfiling, result.profiling, result.obiezioni);
            updateContact(contact.id, { profiling: merged, updatedAt: Date.now() });
            setShowRecorder(false);
            showToast(`Profilazione aggiornata: ${result.obiezioni.length > 0 ? `${result.obiezioni.length} obiezioni salvate` : 'dati estratti applicati'}`, 'success');
          }}
        />
      )}
    </>
  );
}
