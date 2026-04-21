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
        description: product.name, 
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
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Offerte</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Gestione Preventivi</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg"
        >
          <Plus size={20} /> Nuova
        </button>
      </div>

      {/* LISTA */}
      <div className="grid gap-4">
        {Object.values(offers).length > 0 ? (
          Object.values(offers).sort((a, b) => b.date - a.date).map(offer => {
            const contact = contacts[offer.contactId];
            const isOverdue = Date.now() > offer.followUpDate && offer.status !== 'accettata';
            return (
              <div key={offer.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                      {offer.offerNumber}
                    </span>
                    <h3 className="text-xl font-black mt-3 dark:text-white uppercase">
                      {contact?.company || 'Azienda'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black dark:text-white">€ {offer.totalAmount.toLocaleString('it-IT')}</p>
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
          <div className="bg
