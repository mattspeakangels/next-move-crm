import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Search, UserPlus, Building2, MapPin, Phone, Upload, FileText } from 'lucide-react';
import { AddDealModal } from '../components/deals/AddDealModal';
import { useToast } from '../components/ui/ToastContext';
import { Contact } from '../types';

export const ContactsView: React.FC = () => {
  const { contacts, addContact, addContactsBatch } = useStore();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDeal, setShowAddDeal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredContacts = Object.values(contacts).filter(c => 
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newContacts: Contact[] = [];

      // Salta la prima riga (header) se presente
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Gestisce separatori virgola o punto e virgola
        const columns = line.includes(';') ? line.split(';') : line.split(',');
        
        if (columns.length >= 2) {
          newContacts.push({
            id: `c_${Date.now()}_${i}`,
            company: columns[0].trim(),
            contactName: columns[1].trim(),
            role: columns[2]?.trim() || '',
            email: columns[3]?.trim() || '',
            phone: columns[4]?.trim() || '',
            region: columns[5]?.trim() || '',
            sector: columns[6]?.trim() || '',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }

      if (newContacts.length > 0) {
        addContactsBatch(newContacts);
        showToast(`Importati con successo ${newContacts.length} contatti`, 'success');
      } else {
        showToast('Nessun dato valido trovato nel file', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
            title="Importa da CSV"
          >
            <Upload size={20} />
          </button>
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
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <UserPlus size={20} /> <span className="hidden sm:inline">Nuovo Contatto</span>
          </button>
        </div>
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nessun contatto trovato. Importa un file CSV con le colonne:<br/>
          <code className="text-[10px] bg-gray-100 dark:bg-gray-900 p-1 rounded mt-2 inline-block">Azienda, Nome, Ruolo, Email, Telefono, Regione, Settore</code></p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredContacts.map(contact => (
          <div key={contact.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  {contact.company.substring(0,1).toUpperCase()}
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
