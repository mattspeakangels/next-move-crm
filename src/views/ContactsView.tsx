import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Search, UserPlus, MapPin, Phone, Building2, X, ChevronRight, Upload } from 'lucide-react';
import { Contact, ContactStatus } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const ContactsView: React.FC = () => {
  const { contacts, addContact, updateContact, addContactsBatch } = useStore();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stati del Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Se c'è un ID, stiamo modificando
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    company: '', contactName: '', role: '', email: '', phone: '', website: '', 
    vatNumber: '', address: '', city: '', zipCode: '', province: '', 
    country: 'Italia', status: 'potenziale' as ContactStatus, classification: 'B', 
    sector: '', notes: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const openNewModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingId(contact.id);
    setFormData({
      company: contact.company || '',
      contactName: contact.contactName || '',
      role: contact.role || '',
      email: contact.email || '',
      phone: contact.phone || '',
      website: contact.website || '',
      vatNumber: contact.vatNumber || '',
      address: contact.address || '',
      city: contact.city || '',
      zipCode: contact.zipCode || '',
      province: contact.province || '',
      country: contact.country || 'Italia',
      status: contact.status || 'potenziale',
      classification: contact.classification || 'B',
      sector: contact.sector || '',
      notes: contact.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Modifica esistente
      updateContact(editingId, { ...formData, updatedAt: Date.now() });
      showToast('Azienda aggiornata', 'success');
    } else {
      // Nuovo inserimento
      const newContact: Contact = {
        ...formData,
        id: `c_${Date.now()}`,
        region: formData.province,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addContact(newContact);
      showToast('Azienda creata', 'success');
    }
    
    setShowModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newContacts: Contact[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(/[;,]/); 
        if (values.length >= 2 && values[0]) {
          newContacts.push({
            id: `c_${Date.now()}_${i}`,
            company: values[0]?.trim() || '',
            contactName: values[1]?.trim() || '',
            role: values[2]?.trim() || '',
            email: values[3]?.trim() || '',
            phone: values[4]?.trim() || '',
            region: values[5]?.trim() || '',
            province: values[5]?.trim() || '',
            sector: values[6]?.trim() || '',
            status: 'potenziale',
            classification: 'B',
            country: 'Italia',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }

      if (newContacts.length > 0) {
        addContactsBatch(newContacts);
        showToast(`${newContacts.length} aziende importate!`, 'success');
      } else {
        showToast('Nessun dato valido', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const filteredContacts = Object.values(contacts).filter(c => 
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black dark:text-white">Aziende</h1>
        <div className="flex gap-2">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white dark:bg-gray-800 text-indigo-600 border-2 border-indigo-100 dark:border-gray-700 px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all"
          >
            <Upload size={20} /> <span className="hidden md:inline">Importa</span>
          </button>
          
          <button 
            onClick={openNewModal}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <UserPlus size={20} /> Aggiungi Azienda
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text"
          placeholder="Cerca per azienda o referente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none"
        />
      </div>

      <div className="grid gap-4">
        {filteredContacts.map(contact => (
          <div 
            key={contact.id} 
            onClick={() => openEditModal(contact)}
            className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-700 flex items-center justify-between group hover:border-indigo-300 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl uppercase">
                {contact.company[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black dark:text-white">{contact.company}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${contact.status === 'cliente' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {contact.status}
                  </span>
                  {contact.classification && <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{contact.classification}</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
                  <span className="flex items-center gap-1"><UserPlus size={14}/> {contact.contactName}</span>
                  {contact.province && <span className="flex items-center gap-1"><MapPin size={14}/> {contact.province}</span>}
                </div>
              </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
          </div>
        ))}
        {filteredContacts.length === 0 && (
          <div className="text-center py-10 text-gray-400">Nessuna azienda trovata.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] h-[90vh] md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-black dark:text-white">
                {editingId ? 'Modifica Azienda' : 'Nuova Azienda'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={24} className="text-gray-400"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Le sezioni del form rimangono identiche */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                    <Building2 size={18} className="text-indigo-600"/>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Informazioni Base</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <input required placeholder="Nome Azienda*" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  <input placeholder="Partita IVA" value={formData.vatNumber} onChange={e => setFormData({...formData, vatNumber: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ContactStatus})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none">
                    <option value="potenziale">Stato: Potenziale</option>
                    <option value="cliente">Stato: Cliente</option>
                  </select>
                  <select value={formData.classification} onChange={e => setFormData({...formData, classification: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none">
                    <option value="A">Classe A (Top)</option>
                    <option value="B">Classe B (Medium)</option>
                    <option value="C">Classe C (Small)</option>
                  </select>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                    <Phone size={18} className="text-indigo-600"/>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Referente & Contatti</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <input required placeholder="Nome Referente*" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  <input placeholder="Ruolo" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  <input placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  <input placeholder="Telefono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                    <MapPin size={18} className="text-indigo-600"/>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Localizzazione</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <input placeholder="Città" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  <input placeholder="Provincia (es: MI)" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                </div>
              </section>
              
              <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all uppercase">
                  {editingId ? 'Salva Modifiche' : 'Salva Azienda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
