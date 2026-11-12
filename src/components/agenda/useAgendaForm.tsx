import React from 'react';
import { Activity } from '../../types';
import { defaultForm, addMinutesToTime, TYPE_LABELS, NO_CONTACT_TYPES, MULTI_CONTACT_TYPES, MULTI_DAY_TYPES, isSameDay } from './agendaShared';
import { AgendaCloseModel } from './useAgendaClose';

// Agenda: finestra nuovo/modifica appuntamento ed esportazione singola.
export function useAgendaForm(prev: AgendaCloseModel) {
  const { addActivity, updateActivity, deleteActivity, contacts, showToast, setShowModal, editingId, setEditingId, setConfirmDeleteId, formData, setFormData, setContactSearch, voiceNotes } = prev;
  // ── Modal helpers ──

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const openNew = (prefillDate?: Date) => {
    setEditingId(null);
    const d = prefillDate ?? new Date();
    const time = d.toTimeString().slice(0, 5);
    setFormData({
      ...defaultForm(),
      date: toLocalDateStr(d),
      time,
      endTime: addMinutesToTime(time, 60),
    });
    setShowModal(true);
  };

  const openEdit = (activity: Activity) => {
    const d = new Date(activity.date);
    const time = d.toTimeString().slice(0, 5);
    const endD = activity.endDate ? new Date(activity.endDate) : null;
    setEditingId(activity.id);
    const contactIds = activity.contactIds?.length ? activity.contactIds : (activity.contactId ? [activity.contactId] : []);
    setFormData({
      contactIds,
      type: activity.type,
      date: toLocalDateStr(d),
      time,
      endTime: endD ? endD.toTimeString().slice(0, 5) : addMinutesToTime(time, 60),
      endDateDay: endD && !isSameDay(d, endD) ? toLocalDateStr(endD) : '',
      allDay: !!activity.allDay,
      notes: activity.notes || '',
    });
    setContactSearch(MULTI_CONTACT_TYPES.includes(activity.type) ? '' : contacts[activity.contactId]?.company || '');
    setShowModal(true);
  };

  const closeModal = () => { if (voiceNotes.isRecording) voiceNotes.stop(); setShowModal(false); setEditingId(null); setFormData(defaultForm()); setContactSearch(''); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const noContact = NO_CONTACT_TYPES.includes(formData.type);
    if (!noContact && formData.contactIds.length === 0) { showToast("Seleziona un'azienda", 'error'); return; }
    const contactIds = noContact ? [] : formData.contactIds;
    const contactId = contactIds[0] ?? '';
    const dateTime = new Date(`${formData.date}T${formData.time}`).getTime();
    const endDay = (MULTI_DAY_TYPES.includes(formData.type) && formData.endDateDay) ? formData.endDateDay : formData.date;
    const endDateTime = formData.endTime ? new Date(`${endDay}T${formData.endTime}`).getTime() : undefined;
    if (endDateTime !== undefined && endDateTime <= dateTime) {
      showToast(endDay !== formData.date ? "La data/ora di fine deve essere dopo l'inizio" : "L'ora di fine deve essere dopo l'ora di inizio", 'error');
      return;
    }
    if (editingId) {
      updateActivity(editingId, { contactId, contactIds, type: formData.type, date: dateTime, endDate: endDateTime, allDay: formData.allDay, notes: formData.notes });
      showToast('Attività aggiornata!', 'success');
    } else {
      addActivity({ id: `act_${Date.now()}`, contactId, contactIds, type: formData.type, date: dateTime, endDate: endDateTime, allDay: formData.allDay, outcome: 'da-fare', notes: formData.notes, createdAt: Date.now() });
      showToast('Attività salvata!', 'success');
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteActivity(id);
    setConfirmDeleteId(null);
    showToast('Attività eliminata', 'success');
  };

  // ── Outlook deep-link export (single activity) ──
  const handleExport = (activity: Activity) => {
    const contact = contacts[activity.contactId];
    const title = encodeURIComponent(`${TYPE_LABELS[activity.type]} - ${contact?.company || 'Cliente'}`);
    const start = new Date(activity.date);
    const end   = new Date(activity.endDate ?? activity.date + 60 * 60 * 1000); // usa la durata reale se impostata, altrimenti +1h
    // Outlook Web deep-link format: YYYY-MM-DDTHH:MM:SS (no trailing Z = local time)
    const fmtOutlook = (d: Date) =>
      d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + 'T' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':00';
    const body = encodeURIComponent(activity.notes || '');
    window.open(
      `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&startdt=${encodeURIComponent(fmtOutlook(start))}&enddt=${encodeURIComponent(fmtOutlook(end))}&body=${body}`,
      '_blank'
    );
  };
  return { ...prev, toLocalDateStr, openNew, openEdit, closeModal, handleSave, handleDelete, handleExport };
}

export type AgendaFormModel = ReturnType<typeof useAgendaForm>;
