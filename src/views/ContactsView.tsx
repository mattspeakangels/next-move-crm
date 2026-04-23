import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, MapPin, Trash2, Building2, X } from 'lucide-react';
import { useStore } from '../store/useStore';

export const ContactsView: React.FC<{ initialSearch?: string, onClearFilter?: () => void }> = ({ initialSearch = '', onClearFilter }) => {
  const { contacts, deleteContact } = useStore();
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch) setSearchTerm(initialSearch);
  }, [initialSearch]);

  const filteredContacts = Object.values(contacts).filter(contact =>
    (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.city && contact.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.contactName && contact.contactName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Aziende</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Anagrafica Clienti</p>
          
          {searchTerm && initialSearch && (
            <button 
              onClick={() => { setSearchTerm(''); onClearFilter?.(); }}
              className="mt-2 flex items-center gap-1 text-indigo-600 font-black uppercase text-[10px] tracking-widest bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors"
            >
              Filtro Mappa: {searchTerm} <X size={12} />
            </button>
          )}
        </div>

        {/* Tasto Nuova Azienda che utilizza l'icona "Plus" risolvendo l'errore */}
        <button className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg">
          <Plus size={18} strokeWidth={3} /> Nuova Azienda
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Cerca per nome o città..."
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-50 dark:border-gray-700 shadow-sm relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-black dark:text-white uppercase tracking-tight">{contact.company}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{contact.contactName}</p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Eliminare definitivamente ${contact.company}?`)) {
                    deleteContact(contact.id);
                  }
                }}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Elimina Azienda"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <MapPin size={14} className="text-indigo-600" /> {contact.address}, {contact.city}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <Phone size={14} className="text-indigo-600" /> {contact.phone}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
