import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Calendar as CalendarIcon, Phone, MapPin, Edit3, ExternalLink, Plus, X } from 'lucide-react';
import { Activity, ActivityType } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const AgendaView: React.FC = () => {
  const { activities, addActivity, deals, contacts } = useStore();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);

  // Stato per la nuova attività
  const [formData, setFormData] = useState({
    dealId: '',
    type: 'visita' as ActivityType,
    date: '',
    time: '09:00',
    notes: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dealId) {
      showToast('Seleziona un deal/cliente a cui associare l\'attività', 'error');
      return;
    }

    const dateTime = new Date(`${formData.date}T${formData.time}`).getTime();

    const newActivity: Activity = {
      id: `act_${Date.now()}`,
      dealId: formData.dealId,
      type: formData.type,
      date: dateTime,
      outcome: 'da-fare',
      notes: formData.notes,
      createdAt: Date.now()
    };

    addActivity(newActivity);
    showToast('Attività aggiunta in agenda!', 'success');
    setShowModal(false);
    setFormData({ dealId: '', type: 'visita', date: '', time: '09:00', notes: '' });
  };

  // Funzione Magica: Esporta in Google Calendar
  const handleExportToGoogle = (activity: Activity) => {
    const deal = deals[activity.dealId];
    const contact = deal ? contacts[deal.contactId] : null;
    
    const companyName = contact ? contact.company : 'Cliente Ignoto';
    const title = encodeURIComponent(`${activity.type.toUpperCase()} - ${companyName}`);
    
    // Calcoliamo la data di inizio e fine (ipotizziamo 1 ora di durata)
    const startDate = new Date(activity.date);
    const endDate = new Date(activity.date + 60 * 60 * 1000); 
    
    const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
    
    let descriptionText = activity.notes || 'Nessuna nota aggiuntiva inserita nel CRM.';
    if (contact && contact.contactName) {
      descriptionText += `\n\nReferente: ${contact.contactName} (${contact.phone || 'Nessun telefono'})`;
    }
    const details = encodeURIComponent(descriptionText);
    
    const locationStr = contact?.city ? `${contact.address || ''}, ${contact.city}` : '';
    const location = encodeURIComponent(locationStr);

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    
    window.open(url, '_blank');
  };

  // Icone dinamiche
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'chiamata': return <Phone size={18} />;
      case 'visita': return <MapPin size={18} />;
      case 'nota': return <Edit3 size={18} />;
      default: return <CalendarIcon size={18} />;
    }
  };

  // Ordina attività dalla più recente/imminente
  const sortedActivities = Object.values(activities).sort((a, b) => a.date - b.date);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black dark:text-white">La tua Agenda</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <Plus size={20} /> Nuova Attività
        </button>
      </div>

      <div className="space-y-4">
        {sortedActivities.map(activity => {
          const deal = deals[activity.dealId];
          const contact = deal ? contacts[deal.contactId] : null;
          const actDate = new Date(activity.date);

          return (
            <div key={activity.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${
                  activity.type === 'visita' ? 'bg-orange-50 text-orange-600' : 
                  activity.type === 'chiamata' ? 'bg-blue-50 text-blue-600' : 
                  'bg-gray-50 text-gray-600'
                }`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <h3 className="font-black dark:text-white text-lg">
                    {contact?.company || 'Trattativa senza azienda'}
                  </h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm font-bold text-gray-500">
                    <span className="text-indigo-600">
                      {actDate.toLocaleDateString('it-IT')} ore {actDate.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className="capitalize px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">
                      {activity.type}
                    </span>
                  </div>
                  {activity.notes && <p className="text-sm text-gray-400 mt-2">{activity.notes}</p>}
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => handleExportToGoogle(activity)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-200 hover:border-indigo-600 hover:text-indigo-600 transition-all"
                  title="Aggiungi a Google Calendar"
                >
                  <ExternalLink size={16} /> G.Calendar
                </button>
              </div>
            </div>
          );
        })}

        {sortedActivities.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-50 dark:bg-gray-800/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-400">Nessuna attività in agenda</h3>
            <p className="text-sm text-gray-400">Clicca su "Nuova Attività" per pianificare la tua settimana.</p>
          </div>
        )}
      </div>

      {/* MODAL NUOVA ATTIVITÀ */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black dark:text-white">Pianifica</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X size={24} className="text-gray-400"/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">A quale Trattativa (Deal) è legata?</label>
                <select 
                  required
                  value={formData.dealId} 
                  onChange={e => setFormData({...formData, dealId: e.target.value})}
                  className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white mt-1 outline-none focus:border-indigo-500"
                >
                  <option value="">Seleziona...</option>
                  {Object.values(deals).map(d => (
                    <option key={d.id} value={d.id}>
                      {contacts[d.contactId]?.company} - €{d.value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Tipo</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value as ActivityType})}
                    className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white mt-1 outline-none"
                  >
                    <option value="visita">Visita</option>
                    <option value="chiamata">Chiamata</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white mt-1 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Ora</label>
                <input 
                  type="time" 
                  required
                  value={formData.time} 
                  onChange={e => setFormData({...formData, time: e.target.value})}
                  className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white mt-1 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Note / Argomento</label>
                <textarea 
                  rows={3}
                  placeholder="Es: Presentazione nuovo listino prezzi..."
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white mt-1 outline-none resize-none focus:border-indigo-500"
                />
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase mt-4">
                Salva in Agenda
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
