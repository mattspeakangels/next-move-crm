import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Phone, MapPin, ExternalLink, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { Activity, ActivityType } from '../types';
import { useToast } from '../components/ui/ToastContext';

type FormData = {
  contactId: string;
  type: ActivityType;
  date: string;
  time: string;
  notes: string;
};

const defaultForm = (): FormData => ({
  contactId: '',
  type: 'visita',
  date: '',
  time: '09:00',
  notes: '',
});

const TYPE_LABELS: Record<ActivityType, string> = {
  chiamata: 'Chiamata',
  email: 'Email',
  visita: 'Visita',
  nota: 'Nota',
};

export const AgendaView: React.FC = () => {
  const { activities, addActivity, updateActivity, deleteActivity, contacts } = useStore();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm());

  // ── Open modal for NEW activity
  const openNew = () => {
    setEditingId(null);
    setFormData(defaultForm());
    setShowModal(true);
  };

  // ── Open modal to EDIT existing activity
  const openEdit = (activity: Activity) => {
    const d = new Date(activity.date);
    setEditingId(activity.id);
    setFormData({
      contactId: activity.contactId,
      type: activity.type,
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
      notes: activity.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(defaultForm());
  };

  // ── Save (create or update)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactId) {
      showToast("Seleziona un'azienda", 'error');
      return;
    }
    const dateTime = new Date(`${formData.date}T${formData.time}`).getTime();

    if (editingId) {
      updateActivity(editingId, {
        contactId: formData.contactId,
        type: formData.type,
        date: dateTime,
        notes: formData.notes,
      });
      showToast('Attività aggiornata!', 'success');
    } else {
      addActivity({
        id: `act_${Date.now()}`,
        contactId: formData.contactId,
        type: formData.type,
        date: dateTime,
        outcome: 'da-fare',
        notes: formData.notes,
        createdAt: Date.now(),
      });
      showToast('Attività salvata!', 'success');
    }
    closeModal();
  };

  // ── Delete
  const handleDelete = (id: string) => {
    deleteActivity(id);
    setConfirmDeleteId(null);
    showToast('Attività eliminata', 'success');
  };

  const handleExportToGoogle = (activity: Activity) => {
    const contact = contacts[activity.contactId];
    const title = encodeURIComponent(`${activity.type.toUpperCase()} - ${contact?.company || 'Cliente'}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`;
    window.open(url, '_blank');
  };

  const sortedActivities = Object.values(activities).sort((a, b) => a.date - b.date);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black dark:text-white">Agenda</h1>
        <button
          onClick={openNew}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
        >
          <Plus size={20} /> Nuova
        </button>
      </div>

      {sortedActivities.length === 0 && (
        <div className="text-center py-16 text-gray-300 dark:text-gray-600">
          <p className="font-black uppercase tracking-widest text-sm">Nessun appuntamento</p>
          <p className="text-xs mt-1">Premi Nuova per pianificare</p>
        </div>
      )}

      <div className="grid gap-4">
        {sortedActivities.map(activity => (
          <div
            key={activity.id}
            className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-700 flex items-center justify-between gap-4"
          >
            <div className="flex gap-4 items-center flex-1 min-w-0">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex-shrink-0 flex items-center justify-center text-indigo-600">
                {activity.type === 'visita' ? <MapPin size={20} /> : <Phone size={20} />}
              </div>
              <div className="min-w-0">
                <h3 className="font-black dark:text-white truncate">
                  {contacts[activity.contactId]?.company || 'Azienda'}
                </h3>
                <p className="text-sm text-gray-400 font-bold">
                  {new Date(activity.date).toLocaleString('it-IT', {
                    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                {activity.notes ? (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{activity.notes}</p>
                ) : null}
                <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
                  {TYPE_LABELS[activity.type]}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleExportToGoogle(activity)}
                className="p-2.5 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                title="Esporta su Google Calendar"
              >
                <ExternalLink size={16} />
              </button>
              <button
                onClick={() => openEdit(activity)}
                className="p-2.5 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                title="Modifica"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setConfirmDeleteId(activity.id)}
                className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Elimina"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black dark:text-white">
                {editingId ? 'Modifica Appuntamento' : 'Pianifica'}
              </h2>
              <button onClick={closeModal}>
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Azienda */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Azienda</label>
                <select
                  required
                  value={formData.contactId}
                  onChange={e => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white outline-none focus:border-indigo-400 transition-colors"
                >
                  <option value="">Seleziona...</option>
                  {Object.values(contacts)
                    .sort((a, b) => a.company.localeCompare(b.company))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.company}</option>
                    ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Tipo</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TYPE_LABELS) as ActivityType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t })}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        formData.type === t
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data e ora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Data</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ora</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Note</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Dettagli, obiettivo della visita..."
                  rows={2}
                  className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-transparent dark:text-white outline-none focus:border-indigo-400 transition-colors text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-indigo-700 transition-colors"
              >
                {editingId ? 'Aggiorna' : 'Salva'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
            <p className="font-black text-lg dark:text-white mb-2">Elimina appuntamento?</p>
            <p className="text-sm text-gray-400 mb-6">Questa azione non è reversibile.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-2xl font-black bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-3 rounded-2xl font-black bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
