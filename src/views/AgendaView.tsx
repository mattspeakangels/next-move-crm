import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Phone, MapPin, ExternalLink, Plus, X } from 'lucide-react';
import { Activity, ActivityType } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const AgendaView: React.FC = () => {
  const { activities, addActivity, contacts } = useStore();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    contactId: '',
    type: 'visita' as ActivityType,
    date: '',
    time: '09:00',
    notes: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactId) {
      showToast('Seleziona un\'azienda', 'error');
      return;
    }

    const dateTime = new Date(`${formData.date}T${formData.time}`).getTime();
    addActivity({
      id: `act_${Date.now()}`,
      contactId: formData.contactId,
      type: formData.type,
      date: dateTime,
      outcome: 'da-fare',
      notes: formData.notes,
      createdAt: Date.now()
    });

    showToast('Attività salvata!', 'success');
    setShowModal(false);
    setFormData({ contactId: '', type: 'visita', date: '', time: '09:00', notes: '' });
  };

  const handleExportToGoogle = (activity: Activity) => {
    const contact = contacts[activity.contactId];
    const title = encodeURIComponent(`${activity.type.toUpperCase()} - ${contact?.company || 'Cliente'}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black dark:text-white">Agenda</h1>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
          <Plus size={20} /> Nuova
        </button>
      </div>

      <div className="grid gap-4">
        {Object.values(activities).sort((a, b) => a.date - b.date).map(activity => (
          <div key={activity.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-50 flex items-center justify-between">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                {activity.type === 'visita' ? <MapPin size={20}/> : <Phone size={20}/>}
              </div>
              <div>
                <h3 className="font-black dark:text-white">{contacts[activity.contactId]?.company || 'Azienda'}</h3>
                <p className="text-sm text-gray-400 font-bold">{new Date(activity.date).toLocaleString('it-IT')}</p>
              </div>
            </div>
            <button onClick={() => handleExportToGoogle(activity)} className="p-3 text-gray-400 hover:text-indigo-600"><ExternalLink size={20}/></button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">Pianifica</h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Azienda</label>
                <select required value={formData.contactId} onChange={e => setFormData({...formData, contactId: e.target.value})} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-transparent outline-none">
                  <option value="">Seleziona...</option>
                  {Object.values(contacts).map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="border-2 border-gray-100 rounded-2xl p-4" />
                <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="border-2 border-gray-100 rounded-2xl p-4" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase">Salva</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
