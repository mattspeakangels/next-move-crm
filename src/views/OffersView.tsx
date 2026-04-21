import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, FileText, Trash2, CheckCircle, Clock, X, ChevronRight } from 'lucide-react';
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
      showToast('Seleziona un cliente e aggiungi almeno un prodotto', 'error');
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
      followUpDate: Date.now() + (7 * 24 * 60 * 60 * 1000) // Richiamo automatico +7gg
    };

    addOffer(newOffer);
    showToast('Offerta salvata con follow-up a 7 giorni!', 'success');
    setShowModal(false);
    setItems([]);
    setSelectedContact('');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Offerte</h1>
          <p className="text-gray-400 text-sm font-bold">Gestione preventivi e follow-up</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200">
          <Plus size={20} /> Nuova
        </button>
      </div>

      <div className="grid gap-4">
        {Object.values(offers).length > 0 ? (
          Object.values(offers).sort((a, b) => b.date - a.date).map(offer => {
            const contact = contacts[offer.contactId];
            const isOverdue = Date.now() > offer.followUpDate && offer.status !== 'accettata';
            
            return (
              <div key={offer.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-50 dark:border-gray-700 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                      {offer.offerNumber}
                    </span>
                    <h3 className="text-xl font-black mt-3 dark:text-white uppercase tracking-tight">
                      {contact?.company || 'Cliente eliminato'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black dark:text-white tracking-tighter">€ {offer.totalAmount.toLocaleString('it-IT')}</p>
                    <div className={`flex items-center gap-1 justify-end mt-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                      <Clock size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {isOverdue ? 'Follow-up Scaduto' : `Follow-up: ${new Date(offer.followUpDate).toLocaleDateString('it-IT')}`}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => updateOffer(offer.id, { status: 'accettata' })}
                    className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                      offer.status === 'accettata' ? 'bg-green-500 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-green-50 hover:text-green-600'
                    }`}
                  >
                    Vinta
                  </button>
                  <button 
                    onClick={() => updateOffer(offer.id, { status: 'inviata' })}
                    className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                      offer.status === 'inviata' ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    Inviata
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-700">
             <FileText size={48} className="mx-auto mb-4 text-gray-200" />
             <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">Nessuna offerta attiva</h3>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Nuovo Preventivo</h2>
              <button onClick={() => setShowModal(false)} className
