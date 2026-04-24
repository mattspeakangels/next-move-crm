import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Phone, MapPin, Building2, X, Users, UserPlus, Mail, Target, Trash2, Upload, FileText, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Contact } from '../types';
import { AddDealModal } from '../components/deals/AddDealModal';

interface ContactsViewProps {
  initialSearch?: string;
  onClearFilter?: () => void;
  selectedContactId?: string | null;
  onClearSelectedContact?: () => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ initialSearch = '', onClearFilter, selectedContactId, onClearSelectedContact }) => {
  const { contacts, addContact, updateContact, deleteContact, addContactsBatch, deals, offers } = useStore();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detailContact, setDetailContact] = useState<any>(null);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [tagInputProd, setTagInputProd] = useState('');
  const [tagInputComp, setTagInputComp] = useState('');
  const [addDealForContact, setAddDealForContact] = useState<string | null>(null);

  useEffect(() => {
    if (initialSearch) setSearchTerm(initialSearch);
  }, [initialSearch]);

  const filteredContacts = Object.values(contacts).filter(c =>
    (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openDetail = (contact?: Contact | any) => {
    if (contact) {
      setDetailContact(contact);
      setEditingContact(contact);
    } else {
      const newContact = {
        id: `c_${Date.now()}`,
        company: '',
        customerType: 'end-user',
        status: 'potenziale',
        stakeholders: [],
        intelligence: { products: [], competitors: [], pricesAndPayments: '', logisticsAndService: '' }
      };
      setDetailContact(newContact);
      setEditingContact(newContact);
    }
  };

  useEffect(() => {
    if (selectedContactId && contacts[selectedContactId]) {
      openDetail(contacts[selectedContactId]);
      onClearSelectedContact?.();
    }
  }, [selectedContactId]);

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
            address: values[5]?.trim() || '',
            city: values[6]?.trim() || '',
            province: values[7]?.trim() || '',
            region: values[7]?.trim() || '',
            sector: values[8]?.trim() || '',
            status: 'potenziale',
            country: 'Italia',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }
      if (newContacts.length > 0) {
        addContactsBatch(newContacts);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (!editingContact?.company) return alert('Inserisci la ragione sociale');
    if (contacts[editingContact.id]) {
      updateContact(editingContact.id, editingContact);
    } else {
      addContact(editingContact as Contact);
    }
    setDetailContact(null);
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

      {detailContact !== null ? (
        // FULL SCREEN DETAIL
        <div className="min-h-screen -m-4 md:-m-8 bg-gray-50 dark:bg-gray-900">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDetailContact(null)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="font-black text-lg dark:text-white uppercase tracking-tight">
                  {editingContact?.company || 'Nuova Azienda'}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scheda Azienda</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-colors"
            >
              Salva
            </button>
          </div>

          {/* Content */}
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">

            {/* SEZIONE 1 */}
            <section>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Building2 size={16}/> 1. Dati Anagrafici</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ragione Sociale *</label>
                  <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all" value={editingContact?.company || ''} onChange={e => setEditingContact({...editingContact, company: e.target.value})} />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tipologia</label>
                  <select className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none" value={editingContact?.customerType || 'end-user'} onChange={e => setEditingContact({...editingContact, customerType: e.target.value})}>
                    <option value="end-user">End User (Utilizzatore Finale)</option>
                    <option value="dealer">Dealer (Rivenditore)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status CRM</label>
                  <select className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none" value={editingContact?.status || 'potenziale'} onChange={e => setEditingContact({...editingContact, status: e.target.value})}>
                    <option value="potenziale">Potenziale</option>
                    <option value="cliente">Cliente Attivo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Telefono Gen.</label>
                  <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all" value={editingContact?.phone || ''} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email Gen.</label>
                  <input type="email" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all" value={editingContact?.email || ''} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
                </div>

                <div className="md:col-span-2 grid grid-cols-12 gap-2 mt-2">
                  <div className="col-span-12 md:col-span-6">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Indirizzo</label>
                    <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all" value={editingContact?.address || ''} onChange={e => setEditingContact({...editingContact, address: e.target.value})} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">CAP</label>
                    <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all" value={editingContact?.zipCode || ''} onChange={e => setEditingContact({...editingContact, zipCode: e.target.value})} />
                  </div>
                  <div className="col-span-5 md:col-span-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Città</label>
                    <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all" value={editingContact?.city || ''} onChange={e => setEditingContact({...editingContact, city: e.target.value})} />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Prov.</label>
                    <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all" value={editingContact?.province || ''} onChange={e => setEditingContact({...editingContact, province: e.target.value})} />
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
                  <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-bold text-gray-400 uppercase">Nessun referente inserito</p>
                  </div>
                )}
                {editingContact?.stakeholders?.map((sh: any) => (
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
                    {editingContact?.intelligence?.products?.map((tag: string, i: number) => (
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
                    {editingContact?.intelligence?.competitors?.map((tag: string, i: number) => (
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
                      ...editingContact,
                      intelligence: {...(editingContact.intelligence || defaultIntelligence), pricesAndPayments: e.target.value}
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
                      ...editingContact,
                      intelligence: {...(editingContact.intelligence || defaultIntelligence), logisticsAndService: e.target.value}
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
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none resize-none min-h-[100px] shadow-sm"
                value={editingContact?.notes || ''}
                onChange={e => setEditingContact({...editingContact, notes: e.target.value})}
              />
            </section>

            {/* SEZIONE 5 - Deal & Offerte (solo in modifica) */}
            {editingContact?.id && contacts[editingContact.id] && (() => {
              const contactDeals = Object.values(deals).filter(
                d => d.contactId === editingContact.id && !['chiuso-vinto', 'chiuso-perso'].includes(d.stage)
              );
              const contactOffers = Object.values(offers).filter(
                o => o.contactId === editingContact.id
              );
              const stageBadge: Record<string, string> = {
                lead: 'bg-blue-100 text-blue-600',
                qualificato: 'bg-purple-100 text-purple-600',
                proposta: 'bg-orange-100 text-orange-600',
                negoziazione: 'bg-indigo-100 text-indigo-600',
              };
              const offerBadge: Record<string, string> = {
                bozza: 'bg-gray-100 text-gray-600',
                inviata: 'bg-blue-100 text-blue-600',
                accettata: 'bg-green-100 text-green-600',
                rifiutata: 'bg-red-100 text-red-600',
              };
              return (
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText size={16}/> 5. Deal & Offerte
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Deal aperti */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deal Aperti</span>
                        <button
                          onClick={() => setAddDealForContact(editingContact.id)}
                          className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                        >
                          <Plus size={10}/> Aggiungi
                        </button>
                      </div>
                      {contactDeals.length === 0 ? (
                        <p className="text-xs text-gray-400 font-bold italic">Nessun deal aperto</p>
                      ) : (
                        <div className="space-y-2">
                          {contactDeals.map(deal => (
                            <div key={deal.id} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 flex items-center gap-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${stageBadge[deal.stage] || 'bg-gray-100 text-gray-600'}`}>
                                {deal.stage}
                              </span>
                              <span className="font-bold text-xs text-indigo-600">€{(deal.value / 1000).toFixed(0)}k</span>
                              {deal.nextAction && (
                                <span className="text-[10px] text-gray-500 truncate flex-1">{deal.nextAction}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Offerte */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Offerte</span>
                      {contactOffers.length === 0 ? (
                        <p className="text-xs text-gray-400 font-bold italic">Nessuna offerta</p>
                      ) : (
                        <div className="space-y-2">
                          {contactOffers.map(offer => (
                            <div key={offer.id} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-600 dark:text-gray-300">{offer.offerNumber}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${offerBadge[offer.status] || 'bg-gray-100 text-gray-600'}`}>
                                {offer.status}
                              </span>
                              <span className="font-bold text-xs text-indigo-600 ml-auto">€{offer.totalAmount.toLocaleString('it-IT')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })()}

          </div>
        </div>
      ) : (
        // LIST VIEW
        <>
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
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="bg-white dark:bg-gray-800 text-indigo-600 border-2 border-indigo-100 dark:border-gray-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all">
              <Upload size={20} /> <span className="hidden md:inline">Importa CSV</span>
            </button>
            <button onClick={() => openDetail()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 transition-all">
              <Plus size={20} /> Nuova
            </button>
          </div>

          {/* Griglia Aziende */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => openDetail(contact)}
                className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700 hover:border-indigo-100 transition-colors cursor-pointer"
              >
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

                  {/* Tasto cestino */}
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
        </>
      )}

      {/* AddDeal Modal — sempre presente fuori dal detail view */}
      {addDealForContact && (
        <AddDealModal
          initialContactId={addDealForContact}
          onClose={() => setAddDealForContact(null)}
        />
      )}

    </div>
  );
};
