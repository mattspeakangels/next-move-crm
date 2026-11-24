import React, { useState } from 'react';
import { Activity } from '../../types';
import { findNearbyProspects, NearbyProspect } from './nearbyProspects';
import { defaultForm, addMinutesToTime, TYPE_LABELS, NO_CONTACT_TYPES, MULTI_CONTACT_TYPES, MULTI_DAY_TYPES, isSameDay } from './agendaShared';
import { AgendaCloseModel } from './useAgendaClose';

// Agenda: finestra nuovo/modifica appuntamento ed esportazione singola.
export function useAgendaForm(prev: AgendaCloseModel) {
  const { activities, addActivity, updateActivity, deleteActivity, contacts, showToast, setShowModal, editingId, setEditingId, setConfirmDeleteId, formData, setFormData, setContactSearch, voiceNotes } = prev;
  // Dopo un nuovo appuntamento: prospect entro 10 km da proporre nella stessa giornata
  const [nearby, setNearby] = useState<{ originName: string; date: string; nextTime: string; items: NearbyProspect[]; added: string[] } | null>(null);
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
      const origin = contacts[contactId];
      if (origin && endDay === formData.date) {
        const sameDay = new Set<string>(contactIds);
        for (const a of Object.values(activities)) {
          if (toLocalDateStr(new Date(a.date)) !== formData.date) continue;
          if (a.contactId) sameDay.add(a.contactId);
          for (const id of a.contactIds ?? []) sameDay.add(id);
        }
        const items = findNearbyProspects(origin, contacts, sameDay);
        if (items.length > 0) {
          const after = formData.allDay ? '09:00' : (formData.endTime || addMinutesToTime(formData.time, 60));
          setNearby({ originName: origin.company || origin.contactName, date: formData.date, nextTime: addMinutesToTime(after, 30), items, added: [] });
        }
      }
    }
    closeModal();
  };

  // Aggiunge una visita al prospect vicino nello stesso giorno, in coda alle precedenti (1h + 30 min di spostamento)
  const addNearbyVisit = (prospectId: string) => {
    if (!nearby || nearby.added.includes(prospectId)) return;
    const start = new Date(`${nearby.date}T${nearby.nextTime}`).getTime();
    const endTime = addMinutesToTime(nearby.nextTime, 60);
    addActivity({ id: `act_${Date.now()}_${prospectId}`, contactId: prospectId, contactIds: [prospectId], type: 'visita', date: start, endDate: new Date(`${nearby.date}T${endTime}`).getTime(), allDay: false, outcome: 'da-fare', notes: '', createdAt: Date.now() });
    showToast(`Visita a ${contacts[prospectId]?.company || 'prospect'} alle ${nearby.nextTime}`, 'success');
    setNearby({ ...nearby, nextTime: addMinutesToTime(endTime, 30), added: [...nearby.added, prospectId] });
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
  return { ...prev, nearby, setNearby, addNearbyVisit, toLocalDateStr, openNew, openEdit, closeModal, handleSave, handleDelete, handleExport };
}

export type AgendaFormModel = ReturnType<typeof useAgendaForm>;
