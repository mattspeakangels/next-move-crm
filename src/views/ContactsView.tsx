import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Trash2, 
  ChevronRight, 
  Building2
} from 'lucide-react';
import { useStore } from '../store/useStore';

export const ContactsView: React.FC = () => {
  const { contacts, deleteContact } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = Object.values(contacts).filter(contact =>
    contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Anagrafica Aziende</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
            {filteredContacts.length} Aziende in archivio
          </p>
        </div>
        <button className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg">
          <Plus size={18} strokeWidth={3} /> Nuova Azienda
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Cerca per nome, referente o città..."
          className="w-full pl-12 pr-4 py-5 bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-[2rem] font-bold outline-none focus:border-indigo-600 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-50 dark:border-gray-700 hover:shadow-xl transition-all relative">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Building2 size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">{contact.company}</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-green-100 text-green-600">
                    {contact.status}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Eliminare definitivamente ${contact.company}?`)) {
                    deleteContact(contact.id);
                  }
                }}
                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-500 font-bold text-sm">
                <MapPin size={16} className="text-indigo-600" /> {contact.address}, {contact.city}
              </div>
              <div className="flex items-center gap-3 text-gray-500 font-bold text-sm">
                <Phone size={16} className="text-indigo-600" /> {contact.phone}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
