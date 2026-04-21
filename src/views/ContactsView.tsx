import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Search, UserPlus, MapPin, Phone, Mail, Globe, Building2, X, Filter, ChevronRight } from 'lucide-react';
import { Contact, ContactStatus } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const ContactsView: React.FC = () => {
  const { contacts, addContact } = useStore();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Stato per il nuovo contatto (profilazione avanzata)
  const [formData, setFormData] = useState({
    company: '',
    contactName: '',
    role: '',
    email: '',
    phone: '',
    website: '',
    vatNumber: '',
    address: '',
    city: '',
    zipCode: '',
    province: '',
    country: 'Italia',
    status: 'potenziale' as ContactStatus,
    classification: 'B',
    sector: '',
    notes: ''
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newContact: Contact = {
      ...formData,
      id: `c_${Date.now()}`,
      region: formData.province, // Usiamo la provincia come regione per ora
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addContact(newContact);
    setShowAddModal(false);
    showToast('Azienda aggiunta con successo', 'success');
    setFormData({ company: '', contactName: '', role: '', email: '', phone: '', website: '', vatNumber: '', address: '', city: '', zipCode: '', province: '', country: 'Italia', status: 'potenziale', classification: 'B', sector: '', notes: '' });
  };

  const filteredContacts = Object.values(contacts).filter(c => 
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black dark:text-white">Anagrafica Aziende</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <UserPlus size={20} /> Aggiungi Azienda
        </button>
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
          <div key={contact.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-700 flex items-center justify-between group hover:border-indigo-300 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl">
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
                  {contact.city && <span className="flex items-center gap-1"><MapPin size={14}/> {contact.city} ({contact.province})</span>}
                </div>
              </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] h-[90vh] md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-black dark:text-white">Nuova Scheda Azienda</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={24} className="text-gray-400"/></button>
            </div>
            
            <form onSubmit={handleAdd} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Sezione 1: Informazioni Generali */}
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

              {/* Sezione 2: Contatto */}
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
                  <div className="md:col-span-2">
                    <input placeholder="Sito Web (es: www.azienda.it)" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  </div>
                </div>
              </section>

              {/* Sezione 3: Indirizzo */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                    <MapPin size={18} className="text-indigo-600"/>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Localizzazione</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input placeholder="Indirizzo (Via e numero)" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  </div>
                  <input placeholder="Città" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  <input placeholder="CAP" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  <input placeholder="Provincia (es: MI)" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                  <input placeholder="Paese" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-transparent dark:text-white focus:border-indigo-500 outline-none" />
                </div>
              </section>
              
              <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all">
                  SALVA AZIENDA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
