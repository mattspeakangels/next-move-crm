import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Building2, MapPin, Phone, Mail, Trash2, X, Edit2, Users, Target, UserPlus } from 'lucide-react';
import { Contact, Stakeholder, CustomerType } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const ContactsView: React.FC = () => {
  const { contacts, addContact, updateContact } = useStore();
  const { showToast } = useToast();
  
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const defaultIntelligence = { products: [], competitors: [], pricesAndPayments: '', logisticsAndService: '' };
  
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
  const [tagInputProd, setTagInputProd] = useState('');
  const [tagInputComp, setTagInputComp] = useState('');

  const openModal = (contact?: Contact) => {
    if (contact) {
      setEditingContact({
        ...contact,
        stakeholders: contact.stakeholders || [],
        intelligence: contact.intelligence || defaultIntelligence
      });
    } else {
      setEditingContact({
        company: '', customerType: 'end-user', email: '', phone: '', website: '', address: '', 
        city: '', zipCode: '', province: '', status: 'potenziale', sector: '', region: '',
        stakeholders: [], intelligence: defaultIntelligence, contactName: '', role: ''
      });
    }
    setShowModal(true);
  };

  const handleAddTag = (type: 'products' | 'competitors', value: string) => {
    if (!value.trim() || !editingContact) return;
    const intel = editingContact.intelligence || defaultIntelligence;
    const currentTags = intel[type] || [];
    
    if (!currentTags.includes(value.trim())) {
      setEditingContact({
        ...editingContact,
        intelligence: { ...intel, [type]: [...currentTags, value.trim()] }
      });
    }
    if (type === 'products') setTagInputProd('');
    else setTagInputComp('');
  };

  const removeTag = (type: 'products' | 'competitors', tagToRemove: string) => {
    if (!editingContact || !editingContact.intelligence) return;
    const intel = editingContact.intelligence;
    setEditingContact({
      ...editingContact,
      intelligence: { ...intel, [type]: (intel[type] || []).filter(t => t !== tagToRemove) }
    });
  };

  const addStakeholder = () => {
    if (!editingContact) return;
    const sh = editingContact.stakeholders || [];
    setEditingContact({
      ...editingContact,
      stakeholders: [...sh, { id: `sh_${Date.now()}`, name: '', role: 'Altro', email: '', phone: '' }]
    });
  };

  const updateStakeholder = (id: string, field: keyof Stakeholder, value: string) => {
    if (!editingContact) return;
    const sh = editingContact.stakeholders || [];
    setEditingContact({
      ...editingContact,
      stakeholders: sh.map(s => s.id === id ? { ...s, [field]: value } : s)
    });
  };

  const removeStakeholder = (id: string) => {
    if (!editingContact) return;
    const sh = editingContact.stakeholders || [];
    setEditingContact({ ...editingContact, stakeholders: sh.filter(s => s.id !== id) });
  };

  const handleSave = () => {
    if (!editingContact?.company) {
      showToast('Il nome dell\'azienda è obbligatorio', 'error');
      return;
    }

    const contactData: Contact = {
      ...(editingContact as Contact),
      id: editingContact.id || `cont_${Date.now()}`,
      createdAt: editingContact.id ? editingContact.createdAt! : Date.now(),
      updatedAt: Date.now()
    };

    if (editingContact.id) {
      updateContact(contactData.id, contactData);
      showToast('Azienda aggiornata', 'success');
    } else {
      addContact(contactData);
      showToast('Azienda aggiunta', 'success');
    }
    setShowModal(false);
  };

  const filteredContacts = Object.values(contacts).filter(c => 
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Aziende</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Anagrafica & Intelligence</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Cerca azienda..." 
            className="flex-1 md:w-64 border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={() => openModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 transition
