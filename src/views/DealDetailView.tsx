import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Phone, Mail, MapPin, Calendar, CheckCircle2, Trash2, Edit3, MessageSquare } from 'lucide-react';
import { ActivityFormModal } from '../components/deals/ActivityFormModal';
import { AddDealModal } from '../components/deals/AddDealModal';
import { ActivityType } from '../types';

export const DealDetailView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deals, contacts, activities, deleteDeal } = useStore();
  const [activeModal, setActiveModal] = useState<ActivityType | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const deal = deals[id || ''];
  const contact = deal ? contacts[deal.contactId] : null;

  if (!deal || !contact) return <div className="p-10 text-center">Deal non trovato.</div>;

  const dealActivities = Object.values(activities)
    .filter(a => a.dealId === deal.id)
    .sort((a, b) => b.date - a.date);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{contact.company}</h2>
            <p className="text-indigo-600 font-bold">{deal.products.join(', ')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEdit(true)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><Edit3 size={18}/></button>
            <button 
              onClick={() => { if(window.confirm('Eliminare?')) { deleteDeal(deal.id); navigate('/'); } }} 
              className="p-2 bg-red-50 text-red-500 rounded-full"
            >
              <Trash2 size={18}/>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-700">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valore Deal</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">€{deal.value.toLocaleString('it-IT')}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Probabilità</p>
            <p className="text-xl font-black text-indigo-600">{deal.probability}%</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {[
          { type: 'chiamata' as ActivityType, icon: Phone, label: 'Chiamata' },
          { type: 'email' as ActivityType, icon: Mail, label: 'Email' },
          { type: 'visita' as ActivityType, icon: MapPin, label: 'Visita' },
          { type: 'nota' as ActivityType, icon: MessageSquare, label: 'Nota' }
        ].map(btn => (
          <button key={btn.type} onClick={() => setActiveModal(btn.type)} className="flex-1 min-w-[100px] bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center gap-2 font-bold text-xs">
            <btn.icon size={20} className="text-indigo-600" /> {btn.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold mb-6 flex items-center gap-2"><Calendar size={18} className="text-indigo-600"/> Storia Attività</h3>
        <div className="space-y-6">
          {dealActivities.map(act => (
            <div key={act.id} className="flex gap-4">
              <div className="relative">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600">
                  <CheckCircle2 size={16} />
                </div>
                <div className="absolute top-8 left-4 w-px h-full bg-gray-100 dark:bg-gray-700 last:hidden" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-gray-400 uppercase">{new Date(act.date).toLocaleDateString()}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{act.type}: {act.outcome}</p>
                {act.notes && <p className="text-xs text-gray-500 mt-1 italic">{act.notes}</p>}
              </div>
            </div>
          ))}
          {dealActivities.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">Nessuna attività registrata.</p>}
        </div>
      </div>

      {activeModal && <ActivityFormModal dealId={deal.id} type={activeModal} onClose={() => setActiveModal(null)} />}
      {showEdit && <AddDealModal dealToEdit={deal.id} onClose={() => setShowEdit(false)} />}
    </div>
  );
};
