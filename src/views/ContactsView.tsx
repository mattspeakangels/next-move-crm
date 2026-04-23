import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, MapPin, Building2, X, Edit2, Users, UserPlus, Mail, Target, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Contact } from '../types';

interface ContactsViewProps {
  initialSearch?: string;
  onClearFilter?: () => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ initialSearch = '', onClearFilter }) => {
  const { contacts, addContact, updateContact, deleteContact } = useStore();
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  // Stati per il Modal originale
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [tagInputProd, setTagInputProd] = useState('');
  const [tagInputComp, setTagInputComp] = useState('');

  // Filtro mappa
  useEffect(() => {
    if (initialSearch) setSearchTerm(initialSearch);
  }, [initialSearch]);

  const filteredContacts = Object.values(contacts).filter(c => 
    (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- Funzioni del tuo Modal originale ---
  const openModal = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
    } else {
      setEditingContact({
        id: Date.now().toString(),
        company: '',
        customerType: 'end-user',
        status: 'potenziale',
        stakeholders: [],
        intelligence: { products: [], competitors: [], pricesAndPayments: '', logisticsAndService: '' }
      });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!editingContact?.company) return alert('Inserisci la ragione sociale');
    if (contacts[editingContact.id]) {
      updateContact(editingContact.id, editingContact);
    } else {
      addContact(editingContact as Contact);
    }
    setShowModal(false);
  };

  const addStakeholder = () => {
    setEditingContact((prev: any) => ({
      ...prev,
      stakeholders: [...(prev.stakeholders || []), { id: Date.now().toString(), name: '', role: 'Altro', email: '', phone: '' }]
    }));
  };

  const updateStakeholder = (id: string, field: string, value: string) => {
    setEditingContact((prev: any) => ({
      ...prev,
      stakeholders: prev.stakeholders.map((sh: any) => sh.id === id ? { ...sh, [field]: value } : sh)
    }));
  };

  const removeStakeholder = (id: string) => {
    setEditingContact((prev: any) => ({
      ...prev,
      stakeholders: prev.stakeholders.filter((sh: any) => sh.id !== id)
    }));
  };

  const handleAddTag = (type: 'products' | 'competitors', value: string) => {
    if (!value.trim() || !editingContact) return;
    const currentTags = editingContact.intelligence?.[type] || [];
    if (!currentTags.includes(value.trim())) {
      setEditingContact({
        ...editingContact,
        intelligence: { ...editingContact.intelligence, [type]: [...currentTags, value.trim()] }
      });
    }
    if (type === 'products') setTagInputProd('');
    else setTagInputComp('');
  };

  const removeTag = (type: 'products' | 'competitors', value: string) => {
    setEditingContact((prev: any) => ({
      ...prev,
      intelligence: { ...prev.intelligence, [type]: prev.intelligence[type].filter((t: string) => t !== value) }
    }));
  };

  const defaultIntelligence = { products: [], competitors: [], pricesAndPayments: '', logisticsAndService: '' };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header e Ricerca */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Aziende</h1>
          {searchTerm && initialSearch && (
            <button 
              onClick={() => { setSearchTerm(''); onClearFilter?.(); }}
              className="mt-2 flex items-center gap-1 text-indigo-600 font-black uppercase text-[10px] tracking-widest bg-indigo-50 px-2 py-1 rounded-md"
            >
              Filtro Mappa: {searchTerm} <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cerca azienda o città..."
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 transition-all">
          <Plus size={20} /> Nuova
        </button>
      </div>

      {/* Griglia Aziende */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(contact => (
          <div key={contact.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700 hover:border-indigo-100 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-black dark:text-white uppercase leading-tight">{contact.company}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    (contact as any).customerType === 'dealer' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {(contact as any).customerType === 'dealer' ? 'Dealer' : 'End User'}
                  </span>
                </div>
              </div>
              
              {/* TASTI AZIONE: Modifica (Originale) + Elimina (Nuovo) */}
              <div className="flex gap-2">
                <button onClick={() => openModal(contact)} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 dark:bg-gray-700 rounded-xl transition-colors" title="Modifica">
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Sei sicuro di voler eliminare l'azienda ${contact.company}?`)) {
                      deleteContact(contact.id);
                    }
                  }} 
                  className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 dark:bg-gray-700 rounded-xl transition-colors" 
                  title="Elimina"
                >
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
            
            <div className="space-y-2 mt-6">
              <p className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                <MapPin size={14} className="text-gray-400"/> {contact.city || 'Città non inserita'} {(contact as any).province ? `(${(contact as any).province})` : ''}
              </p>
              <p className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                <Phone size={14} className="text-gray-400"/> {contact.phone || 'Nessun telefono'}
              </p>
              {(contact as any).stakeholders && (contact as any).stakeholders.length > 0 && (
                <p className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 w-max px-2 py-1 rounded-lg mt-3">
                  <Users size={14} /> {(contact as any).stakeholders.length} Referent{(contact as any).stakeholders.length === 1 ? 'e' : 'i'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Originale Intatto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-[2.5rem] flex flex-col max-h-[95vh] shadow-2xl overflow-hidden">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-black uppercase dark:text-white flex items-center gap-2">
                <Building2 className="text-
