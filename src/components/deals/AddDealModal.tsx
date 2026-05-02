import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DealStage } from '../../types';
import { useToast } from '../ui/ToastContext';

interface AddDealModalProps {
  onClose: () => void;
  initialContactId?: string;
  dealToEdit?: string;
}

export const AddDealModal: React.FC<AddDealModalProps> = ({ onClose, initialContactId, dealToEdit }) => {
  const { contacts, deals, profile, addDeal, updateDeal, addCustomProduct } = useStore();
  const { showToast } = useToast();
  const editModeDeal = dealToEdit ? deals[dealToEdit] : null;

  const [contactId, setContactId] = useState(initialContactId || editModeDeal?.contactId || '');
  const [value, setValue] = useState(editModeDeal?.value.toString() || '');
  const [probability, setProbability] = useState(editModeDeal?.probability || 50);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(editModeDeal?.products || []);
  const [newProduct, setNewProduct] = useState('');
  const [stage, setStage] = useState<DealStage>(editModeDeal?.stage || 'lead');
  const [nextAction, setNextAction] = useState(editModeDeal?.nextAction || '');
  const [deadline, setDeadline] = useState(editModeDeal?.nextActionDeadline ? new Date(editModeDeal.nextActionDeadline).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [closingDate, setClosingDate] = useState(editModeDeal?.closingDate ? new Date(editModeDeal.closingDate).toISOString().split('T')[0] : '');
  const [contactSearch, setContactSearch] = useState('');
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);

  const sortedContacts = useMemo(() =>
    Object.values(contacts)
      .filter(c => c.company && c.company.trim())
      .sort((a, b) => a.company.localeCompare(b.company, 'it')),
    [contacts]
  );

  const filteredContacts = useMemo(() =>
    contactSearch.trim()
      ? sortedContacts.filter(c => c.company.toLowerCase().includes(contactSearch.toLowerCase()))
      : sortedContacts,
    [sortedContacts, contactSearch]
  );

  const selectedContactName = contactId ? contacts[contactId]?.company ?? '— contatto non trovato —' : '';

  const toggleProduct = (p: string) => {
    setSelectedProducts(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p]);
  };

  const handleAddNewProduct = () => {
    if (newProduct.trim()) {
      addCustomProduct(newProduct.trim());
      setSelectedProducts([...selectedProducts, newProduct.trim()]);
      setNewProduct('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || !value) return;

    const dealData = {
      contactId,
      value: parseFloat(value),
      probability,
      products: selectedProducts,
      stage,
      nextAction,
      nextActionDeadline: new Date(deadline).getTime(),
      closingDate: closingDate ? new Date(closingDate).getTime() : undefined,
      updatedAt: Date.now(),
    };

    if (editModeDeal) {
      updateDeal(editModeDeal.id, dealData);
      showToast('Aggiornato', 'success');
    } else {
      addDeal({ ...dealData, id: `d_${Date.now()}`, notes: '', createdAt: Date.now() });
      showToast('Creato', 'success');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold dark:text-white">Dettagli Deal</h3>
          <button onClick={onClose} className="text-gray-400"><X size={24}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div
              className="w-full border rounded-xl p-3 bg-transparent dark:text-white cursor-pointer flex items-center justify-between"
              onClick={() => setContactDropdownOpen(o => !o)}
            >
              <span className={selectedContactName ? 'dark:text-white' : 'text-gray-400'}>
                {selectedContactName || 'Seleziona Cliente'}
              </span>
              <X size={14} className={`text-gray-400 transition-transform ${contactDropdownOpen ? 'rotate-45' : ''}`} />
            </div>
            {contactDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <Search size={14} className="text-gray-400 flex-shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Cerca cliente..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm dark:text-white"
                  />
                  {contactSearch && <button onClick={() => setContactSearch('')}><X size={12} className="text-gray-400" /></button>}
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredContacts.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Nessun cliente trovato</p>
                  ) : filteredContacts.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setContactId(c.id); setContactDropdownOpen(false); setContactSearch(''); }}
                      className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${contactId === c.id ? 'bg-indigo-50 dark:bg-indigo-900/20 font-bold text-indigo-600' : 'dark:text-white'}`}
                    >
                      {c.company}
                      <span className="ml-2 text-[10px] text-gray-400">{c.status === 'cliente' ? 'Cliente' : 'Prospect'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="Valore €" className="w-full border rounded-xl p-3 bg-transparent dark:text-white" />
          <div className="flex gap-2 items-center">
             <label className="text-xs dark:text-gray-400">Probabilità {probability}%</label>
             <input type="range" min="0" max="100" value={probability} onChange={e => setProbability(Number(e.target.value))} className="flex-1" />
          </div>
          <select value={stage} onChange={e => setStage(e.target.value as DealStage)} className="w-full border rounded-xl p-3 bg-transparent dark:text-white">
            <option value="lead">Lead</option><option value="qualificato">Qualificato</option><option value="proposta">Proposta</option><option value="negoziazione">Trattativa</option>
          </select>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full border rounded-xl p-3 bg-transparent dark:text-white" />
          <input type="text" value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Prossima azione" className="w-full border rounded-xl p-3 bg-transparent dark:text-white" />
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Data chiusura prevista</label>
            <input
              type="date"
              value={closingDate}
              onChange={e => setClosingDate(e.target.value)}
              className="w-full border rounded-xl p-3 bg-transparent dark:text-white"
            />
          </div>
          <div className="p-2 border rounded-xl">
            <div className="flex flex-wrap gap-1 mb-2">
              {profile?.customProducts.map(p => (
                <button key={p} type="button" onClick={() => toggleProduct(p)} className={`px-2 py-1 rounded-md text-[10px] ${selectedProducts.includes(p) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>{p}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newProduct} onChange={e => setNewProduct(e.target.value)} placeholder="Altro prodotto..." className="flex-1 text-xs bg-transparent dark:text-white" />
              <button type="button" onClick={handleAddNewProduct} className="text-xs text-indigo-600 font-bold">Aggiungi</button>
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Salva Deal</button>
        </form>
      </div>
    </div>
  );
};
