import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DealStage } from '../../types';
import { useToast } from '../ui/ToastContext';
import { SearchDropdown } from '../ui/SearchDropdown';
import { matchSearch } from '../../utils/search';

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
  const [contactSearch, setContactSearch] = useState(() => contactId ? (contacts[contactId]?.company ?? '') : '');

  const sortedContacts = useMemo(() =>
    Object.values(contacts)
      .filter(c => c.company && c.company.trim() && !c.id.startsWith('contact_') && !c.id.startsWith('hist__'))
      .sort((a, b) => a.company.localeCompare(b.company, 'it')),
    [contacts]
  );

  const filteredContacts = useMemo(() =>
    contactSearch.trim()
      ? sortedContacts.filter(c => matchSearch(contactSearch, [c.company, c.contactName, c.city, c.email, c.phone]))
      : sortedContacts,
    [sortedContacts, contactSearch]
  );

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
          <SearchDropdown
            value={contactSearch}
            onChange={v => { setContactSearch(v); if (contactId) setContactId(''); }}
            onSelect={c => { setContactId(c.id); setContactSearch(c.company); }}
            placeholder="Cerca cliente..."
            autoFocus={!editModeDeal}
            showWhenEmpty
            totalCount={sortedContacts.length}
            emptyTitle="Nessun cliente trovato"
            emptySubtitle="Prova con un termine diverso"
            inputWrapperClassName={() => 'w-full border rounded-xl p-3 bg-transparent dark:text-white flex items-center gap-2'}
            dropdownClassName="z-50"
            results={filteredContacts.map(c => ({
              key: c.id,
              item: c,
              label: c.company,
              badge: {
                text: c.status === 'cliente' ? 'Cliente' : 'Prospect',
                className: c.status === 'cliente'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
              },
            }))}
          />
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
