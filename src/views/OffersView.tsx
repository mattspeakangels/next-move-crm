import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, FileText, Trash2, Clock, X } from 'lucide-react';
import { Offer, OfferItem, OfferStatus } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const OffersView: React.FC = () => {
  const { contacts, products, offers, addOffer, updateOffer } = useStore();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  
  const [selectedContact, setSelectedContact] = useState('');
  const [items, setItems] = useState<OfferItem[]>([]);

  const addLineItem = () => {
    const newItem: OfferItem = {
      id: `item_${Date.now()}`,
      description: '',
      quantity: 1,
      price: 0,
      discount: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<OfferItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleProductSelect = (id: string, productId: string) => {
    const product = products[productId];
    if (product) {
      updateItem(id, { 
        productId: product.id, 
        description: product.description, // <-- Aggiornato qui
        price: product.price 
      });
    }
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => {
      const lineTotal = (item.price * item.quantity) * (1 - item.discount / 100);
      return acc + lineTotal;
    }, 0);
  };

  const saveOffer = () => {
    if (!selectedContact || items.length === 0) {
      showToast('Seleziona un cliente e almeno un prodotto', 'error');
      return;
    }

    const newOffer: Offer = {
      id: `off_${Date.now()}`,
      contactId: selectedContact,
      offerNumber: `OFF-${Object.keys(offers).length + 101}`,
      date: Date.now(),
      items: items,
      status: 'bozza' as OfferStatus,
      totalAmount: calculateTotal(),
      followUpDate: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };

    addOffer(newOffer);
    showToast('Offerta salvata!', 'success');
    setShowModal(false);
    setItems([]);
    setSelectedContact('');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Offerte</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Gestione Preventivi</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg">
          <Plus size={20} /> Nuova
        </button>
      </div>

      <div className="grid gap-4">
        {Object.values(offers).length > 0 ? (
          Object.values(offers).sort((a, b) => b.date - a.date).map((offer) => {
            const contact = contacts[offer.contactId];
            const isOverdue = Date.now() > offer.followUpDate && offer.status !== 'accettata';
            return (
              <div key={offer.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{offer.offerNumber}</span>
                    <h3 className="text-xl font-black mt-3 dark:text-white uppercase">{contact?.company || 'Azienda'}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black dark:text-white tracking-tighter">€ {offer.totalAmount.toLocaleString('it-IT')}</p>
                    <div className={`flex items-center gap-1 justify-end mt-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                      <Clock size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {isOverdue ? 'Scaduta' : `Follow-up: ${new Date(offer.followUpDate).toLocaleDateString('it-IT')}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => updateOffer(offer.id, { status: 'accettata' })} className="flex-1 py-3 rounded-2xl font-black text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-green-500 hover:text-white transition-all">Vinta</button>
                  <button onClick={() => updateOffer(offer.id, { status: 'inviata' })} className="flex-1 py-3 rounded-2xl font-black text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-indigo-600 hover:text-white transition-all">Inviata</button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] py-20 text-center border-2 border-dashed border-gray-100">
             <FileText size={48} className="mx-auto mb-4 text-gray-200" />
             <p className="text-gray-400 font-bold uppercase tracking-widest">Nessuna offerta registrata</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase dark:text-white">Nuovo Preventivo</h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-gray-400"/></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Cliente</label>
                <select className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none" value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {Object.values(contacts).map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Articoli</label>
                  <button onClick={addLineItem} className="text-indigo-600 font-black text-xs uppercase">+ Riga</button>
                </div>
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl">
                    <div className="col-span-7">
                      <select className="w-full bg-transparent font-bold outline-none text-sm dark:text-white" onChange={(e) => handleProductSelect(item.id, e.target.value)}>
                        <option value="">Catalogo...</option>
                        {Object.values(products).map((p) => (
                          <option key={p.id} value={p.id}>{p.description}</option> // <-- Aggiornato qui
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input type="number" className="w-full bg-transparent text-center font-bold outline-none dark:text-white" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2 text-right"><p className="font-bold text-sm text-indigo-600">€{item.price}</p></div>
                    <div className="col-span-1 text-right">
                      <button onClick={() => setItems(items.filter((i) => i.id !== item.id))} className="text-red-400"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-8 border-t dark:border-gray-700 flex justify-between items-center">
                <div className="text-2xl font-black dark:text-white">€ {calculateTotal().toLocaleString('it-IT')}</div>
                <button onClick={saveOffer} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
