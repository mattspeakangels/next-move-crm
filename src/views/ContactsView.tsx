import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Search, UserPlus, Building2, MapPin, Phone } from 'lucide-react';
import { AddDealModal } from '../components/deals/AddDealModal';

export const ContactsView: React.FC = () => {
  const { contacts, addContact } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDeal, setShowAddDeal] = useState<string | null>(null);

  const filteredContacts = Object.values(contacts).filter(c => 
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca azienda o contatto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button 
          onClick={() => {
            const name = prompt("Nome Azienda?");
            if (name) addContact({
              id: `c_${Date.now()}`,
              company: name,
              contactName: prompt("Nome referente?") || '',
              role: '', email: '', phone: '', region: '', sector: '',
              createdAt: Date.now(), updatedAt: Date.now()
            });
          }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <UserPlus size={20} /> Nuovo Contatto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredContacts.map(contact => (
          <div key={contact.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{contact.company}</h3>
                  <p className="text-sm text-gray-500">{contact.contactName}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin size={14} /> {contact.region || 'Regione non specificata'}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Phone size={14} /> {contact.phone || 'Nessun telefono'}
              </div>
            </div>

            <button 
              onClick={() => setShowAddDeal(contact.id)}
              className="w-full py-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold transition-colors"
            >
              + Crea Trattativa
            </button>
          </div>
        ))}
      </div>

      {showAddDeal && (
        <AddDealModal 
          initialContactId={showAddDeal} 
          onClose={() => setShowAddDeal(null)} 
        />
      )}
    </div>
  );
};
