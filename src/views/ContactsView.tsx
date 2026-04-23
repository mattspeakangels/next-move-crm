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
    (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header e Ricerca */}
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
          <button onClick={() => openModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 transition-all">
            <Plus size={20} /> Nuova
          </button>
        </div>
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
                    contact.customerType === 'dealer' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {contact.customerType === 'dealer' ? 'Dealer' : 'End User'}
                  </span>
                </div>
              </div>
              <button onClick={() => openModal(contact)} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 dark:bg-gray-700 rounded-xl transition-colors">
                <Edit2 size={16} />
              </button>
            </div>
            
            <div className="space-y-2 mt-6">
              <p className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                <MapPin size={14} className="text-gray-400"/> {contact.city || 'Città non inserita'} {contact.province ? `(${contact.province})` : ''}
              </p>
              <p className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                <Phone size={14} className="text-gray-400"/> {contact.phone || 'Nessun telefono'}
              </p>
              {contact.stakeholders && contact.stakeholders.length > 0 && (
                <p className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 w-max px-2 py-1 rounded-lg mt-3">
                  <Users size={14} /> {contact.stakeholders.length} Referent{contact.stakeholders.length === 1 ? 'e' : 'i'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-[2.5rem] flex flex-col max-h-[95vh] shadow-2xl overflow-hidden">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-black uppercase dark:text-white flex items-center gap-2">
                <Building2 className="text-indigo-600" /> 
                {editingContact?.id ? 'Modifica Azienda' : 'Nuova Azienda'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={24} className="text-gray-400 hover:text-gray-600"/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              
              {/* SEZIONE 1 */}
              <section>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Building2 size={16}/> 1. Dati Anagrafici</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900 p-6 rounded-3xl">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ragione Sociale *</label>
                    <input type="text" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={editingContact?.company || ''} onChange={e => setEditingContact({...editingContact!, company: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tipologia</label>
                    <select className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={editingContact?.customerType || 'end-user'} onChange={e => setEditingContact({...editingContact!, customerType: e.target.value as CustomerType})}>
                      <option value="end-user">End User (Utilizzatore Finale)</option>
                      <option value="dealer">Dealer (Rivenditore)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status CRM</label>
                    <select className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={editingContact?.status || 'potenziale'} onChange={e => setEditingContact({...editingContact!, status: e.target.value as any})}>
                      <option value="potenziale">Potenziale</option>
                      <option value="cliente">Cliente Attivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Telefono Gen.</label>
                    <input type="text" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={editingContact?.phone || ''} onChange={e => setEditingContact({...editingContact!, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email Gen.</label>
                    <input type="email" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={editingContact?.email || ''} onChange={e => setEditingContact({...editingContact!, email: e.target.value})} />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-12 gap-2 mt-2">
                    <div className="col-span-12 md:col-span-6">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Indirizzo</label>
                      <input type="text" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={editingContact?.address || ''} onChange={e => setEditingContact({...editingContact!, address: e.target.value})} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">CAP</label>
                      <input type="text" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={editingContact?.zipCode || ''} onChange={e => setEditingContact({...editingContact!, zipCode: e.target.value})} />
                    </div>
                    <div className="col-span-5 md:col-span-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Città</label>
                      <input type="text" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={editingContact?.city || ''} onChange={e => setEditingContact({...editingContact!, city: e.target.value})} />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Prov.</label>
                      <input type="text" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={editingContact?.province || ''} onChange={e => setEditingContact({...editingContact!, province: e.target.value})} />
                    </div>
                  </div>
                </div>
              </section>

              {/* SEZIONE 2 */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Users size={16}/> 2. Stakeholder (Referenti)</h3>
                  <button onClick={addStakeholder} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase flex items-center gap-1 hover:bg-indigo-100 transition-colors"><UserPlus size={12}/> Aggiungi Referente</button>
                </div>
                
                <div className="space-y-3">
                  {(!editingContact?.stakeholders || editingContact.stakeholders.length === 0) && (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-400 uppercase">Nessun referente inserito</p>
                    </div>
                  )}
                  {editingContact?.stakeholders?.map(sh => (
                    <div key={sh.id} className="grid grid-cols-12 gap-2 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-3 rounded-2xl items-center relative">
                      <div className="col-span-12 md:col-span-3">
                        <input type="text" placeholder="Nome Cognome" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white" value={sh.name} onChange={e => updateStakeholder(sh.id, 'name', e.target.value)} />
                      </div>
                      <div className="col-span-12 md:col-span-3">
                        <select className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg p-2 font-bold outline-none text-xs dark:text-white text-gray-600" value={sh.role} onChange={e => updateStakeholder(sh.id, 'role', e.target.value)}>
                          <option value="Titolare">Titolare / CEO</option>
                          <option value="Responsabile Acquisti">Resp. Acquisti</option>
                          <option value="Responsabile Tecnico">Resp. Tecnico / Prod.</option>
                          <option value="Altro">Altro</option>
                        </select>
                      </div>
                      <div className="col-span-12 md:col-span-3 flex items-center gap-2">
                        <Mail size={14} className="text-gray-400"/>
                        <input type="email" placeholder="Email" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white" value={sh.email} onChange={e => updateStakeholder(sh.id, 'email', e.target.value)} />
                      </div>
                      <div className="col-span-10 md:col-span-2 flex items-center gap-2">
                        <Phone size={14} className="text-gray-400"/>
                        <input type="text" placeholder="Telefono" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white" value={sh.phone} onChange={e => updateStakeholder(sh.id, 'phone', e.target.value)} />
                      </div>
                      <div className="col-span-2 md:col-span-1 flex justify-end">
                        <button onClick={() => removeStakeholder(sh.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SEZIONE 3 */}
              <section>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={16}/> 3. Commercial Intelligence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-50 dark:border-indigo-900/30">
                  
                  <div>
                    <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Cosa Comprano? (Tag liberi)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editingContact?.intelligence?.products?.map((tag, i) => (
                        <span key={i} className="text-[10px] font-black bg-indigo-600 text-white px-2 py-1 rounded-md uppercase flex items-center gap-1">
                          {tag} <button onClick={() => removeTag('products', tag)}><X size={10} className="hover:text-red-300"/></button>
                        </span>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Scrivi e premi Invio..." 
                      className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-sm"
                      value={tagInputProd}
                      onChange={e => setTagInputProd(e.target.value)}
                      onKeyDown={e => { if(e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag('products', tagInputProd); }}}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Competitors attuali (Tag liberi)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editingContact?.intelligence?.competitors?.map((tag, i) => (
                        <span key={i} className="text-[10px] font-black bg-orange-500 text-white px-2 py-1 rounded-md uppercase flex items-center gap-1">
                          {tag} <button onClick={() => removeTag('competitors', tag)}><X size={10} className="hover:text-red-900"/></button>
                        </span>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Scrivi e premi Invio..." 
                      className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-sm"
                      value={tagInputComp}
                      onChange={e => setTagInputComp(e.target.value)}
                      onKeyDown={e => { if(e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag('competitors', tagInputComp); }}}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Prezzi e Pagamenti</label>
                    <textarea 
                      placeholder="Es. Pagano a 60gg, sono sensibili al prezzo sul prodotto base..."
                      className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-sm min-h-[80px] resize-none"
                      value={editingContact?.intelligence?.pricesAndPayments || ''}
                      onChange={e => setEditingContact({
                        ...editingContact!, 
                        intelligence: {...(editingContact!.intelligence || defaultIntelligence), pricesAndPayments: e.target.value}
                      })}
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Logistica e Servizio</label>
                    <textarea 
                      placeholder="Es. Ordinano spesso all'ultimo minuto, esigono consegna in 24h..."
                      className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-sm min-h-[80px] resize-none"
                      value={editingContact?.intelligence?.logisticsAndService || ''}
                      onChange={e => setEditingContact({
                        ...editingContact!, 
                        intelligence: {...(editingContact!.intelligence || defaultIntelligence), logisticsAndService: e.target.value}
                      })}
                    />
                  </div>
                </div>
              </section>

              {/* SEZIONE 4 */}
              <section>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">4. Note Generali</h3>
                <textarea 
                  placeholder="Informazioni aggiuntive..." 
                  className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none resize-none min-h-[100px]"
                  value={editingContact?.notes || ''} 
                  onChange={e => setEditingContact({...editingContact!, notes: e.target.value})} 
                />
              </section>

            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button onClick={handleSave} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-colors">
                Salva Azienda
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
