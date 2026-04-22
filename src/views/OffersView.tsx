import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, FileText, Trash2, X, Edit2, Truck, Mail, Printer } from 'lucide-react';
import { Offer, OfferItem, OfferStatus } from '../types';
import { useToast } from '../components/ui/ToastContext';

export const OffersView: React.FC = () => {
  const { contacts, products, offers, addOffer, updateOffer, removeOffer, profile } = useStore();
  const { showToast } = useToast();
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [selectedContact, setSelectedContact] = useState('');
  const [items, setItems] = useState<OfferItem[]>([]);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [shippingCost, setShippingCost] = useState(0);

  const openModal = (offer?: Offer) => {
    if (offer) {
      setEditingId(offer.id);
      setSelectedContact(offer.contactId);
      setItems(offer.items);
      setDeliveryTime(offer.deliveryTime || '');
      setShippingCost(offer.shippingCost || 0);
    } else {
      setEditingId(null);
      setSelectedContact('');
      setItems([]);
      setDeliveryTime('');
      setShippingCost(0);
    }
    setShowModal(true);
  };

  const addLineItem = () => {
    const newItem: OfferItem = {
      id: `item_${Date.now()}`,
      description: '',
      sizes: '',
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
        description: product.description,
        sizes: product.sizes || '',
        price: product.price,
        discount: product.discount || 0
      });
    }
  };

  const calculateTotal = () => {
    const itemsTotal = items.reduce((acc, item) => {
      const lineTotal = (item.price * item.quantity) * (1 - item.discount / 100);
      return acc + lineTotal;
    }, 0);
    return itemsTotal + Number(shippingCost);
  };

  const saveOffer = () => {
    if (!selectedContact || items.length === 0) {
      showToast('Seleziona un cliente e almeno un prodotto', 'error');
      return;
    }

    const offerData: Offer = {
      id: editingId || `off_${Date.now()}`,
      contactId: selectedContact,
      offerNumber: editingId ? offers[editingId].offerNumber : `OFF-${Object.keys(offers).length + 101}`,
      date: editingId ? offers[editingId].date : Date.now(),
      items: items,
      status: editingId ? offers[editingId].status : ('bozza' as OfferStatus),
      totalAmount: calculateTotal(),
      followUpDate: editingId ? offers[editingId].followUpDate : Date.now() + (7 * 24 * 60 * 60 * 1000),
      deliveryTime,
      shippingCost: Number(shippingCost)
    };

    if (editingId) {
      updateOffer(editingId, offerData);
      showToast('Offerta aggiornata!', 'success');
    } else {
      addOffer(offerData);
      showToast('Offerta creata!', 'success');
    }
    
    setShowModal(false);
  };

  const handleSendEmail = (offer: Offer) => {
    const contact = contacts[offer.contactId];
    if (!contact) return;

    const subject = encodeURIComponent(`Preventivo ${offer.offerNumber} - ${profile?.company || 'CRM'}`);
    let body = `Spett.le ${contact.company},\n\nIn allegato i dettagli del preventivo richiesto.\n\nOFFERTA N° ${offer.offerNumber}\n\n`;
    
    offer.items.forEach(item => {
      const lineTotal = (item.price * item.quantity) * (1 - item.discount / 100);
      body += `• ${item.description.toUpperCase()} ${item.sizes ? '['+item.sizes+']' : ''}\n  Q.tà: ${item.quantity} | Prezzo: €${item.price.toFixed(2)} | Tot: €${lineTotal.toFixed(2)}\n\n`;
    });
    
    body += `TOTALE FINALE: €${offer.totalAmount.toFixed(2)}\n\nCordiali saluti,\n${profile?.name || ''}\n${profile?.company || ''}`;
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${encodeURIComponent(body)}`;
  };

  const handlePrint = (offer: Offer) => {
    const contact = contacts[offer.contactId];
    
    const itemsHtml = offer.items.map(item => {
      const subtotal = (item.price * item.quantity) * (1 - item.discount / 100);
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; text-transform: uppercase;">${item.description}</div>
            <div style="font-size: 11px; color: #666;">${item.sizes ? 'Taglie: ' + item.sizes : ''}</div>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">€ ${item.price.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.discount}%</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">€ ${subtotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
            .logo h1 { margin: 0; color: #4f46e5; font-size: 32px; }
            .doc-info { text-align: right; }
            .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .address-box { width: 45%; }
            .address-box h4 { margin: 0 0 5px 0; font-size: 12px; color: #999; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8fafc; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            .totals { float: right; width: 250px; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .grand-total { font-size: 20px; font-weight: bold; color: #4f46e5; border: none; }
            .footer { margin-top: 100px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo"><h1>${profile?.company || 'CRM'}</h1><p>${profile?.name || ''}</p></div>
            <div class="doc-info"><h2>PREVENTIVO</h2><p>N° ${offer.offerNumber}</p><p>Data: ${new Date(offer.date).toLocaleDateString('it-IT')}</p></div>
          </div>
          <div class="addresses">
            <div class="address-box"><h4>Da:</h4><strong>${profile?.company}</strong></div>
            <div class="address-box"><h4>Per:</h4><strong>${contact?.company}</strong><br/>${contact?.address || ''}<br/>${contact?.city || ''}</div>
          </div>
          <table>
            <thead><tr><th>Descrizione</th><th>Q.tà</th><th>Prezzo</th><th>Sconto</th><th>Totale</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="totals">
            ${offer.shippingCost ? `<div class="total-row"><span>Trasporto</span><span>€ ${offer.shippingCost.toFixed(2)}</span></div>` : ''}
            <div class="total-row grand-total"><span>TOTALE</span><span>€ ${offer.totalAmount.toFixed(2)}</span></div>
            ${offer.deliveryTime ? `<p style="font-size: 11px; margin-top: 10px;">Consegna: ${offer.deliveryTime}</p>` : ''}
          </div>
          <div class="footer">Documento valido 30 giorni. Generato con NextMove CRM.</div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Offerte</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Gestione Preventivi</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all">
          <Plus size={20} /> Nuova
        </button>
      </div>

      <div className="grid gap-4">
        {Object.values(offers).length > 0 ? (
          Object.values(offers).sort((a, b) => b.date - a.date).map((offer) => {
            const contact = contacts[offer.contactId];
            return (
              <div key={offer.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{offer.offerNumber}</span>
                    <h3 className="text-xl font-black mt-3 dark:text-white uppercase">{contact?.company || 'Azienda'}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black dark:text-white tracking-tighter">€ {offer.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{offer.status}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-700">
                  <div className="flex gap-2">
                    <button onClick={() => updateOffer(offer.id, { status: 'accettata' })} className="px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all">Vinta</button>
                    <button onClick={() => handleSendEmail(offer)} className="px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"><Mail size={12}/> Email</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handlePrint(offer)} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100"><Printer size={18} /></button>
                    <button onClick={() => openModal(offer)} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit2 size={18} /></button>
                    <button onClick={() => removeOffer(offer.id)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-700">
             <FileText size={48} className="mx-auto mb-4 text-gray-200 dark:text-gray-600" />
             <p className="text-gray-400 font-bold uppercase tracking-widest">Nessuna offerta registrata</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase dark:text-white">{editingId ? 'Modifica Preventivo' : 'Nuovo Preventivo'}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-gray-400"/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Cliente</label>
                <select className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none" value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)}>
                  <option value="">Seleziona Cliente...</option>
                  {Object.values(contacts).map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Articoli</label>
                  <button onClick={addLineItem} className="text-indigo-600 font-black text-xs uppercase bg-indigo-50 px-3 py-1 rounded-full">+ Aggiungi Riga</button>
                </div>
                
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-end bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
                    <div className="col-span-12 md:col-span-4">
                      <select className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b mb-2" onChange={(e) => handleProductSelect(item.id, e.target.value)}>
                        <option value="">Catalogo...</option>
                        {Object.values(products).map((p) => <option key={p.id} value={p.id}>{p.code} - {p.description}</option>)}
                      </select>
                      <input type="text" placeholder="Descrizione personalizzata" className="w-full bg-transparent font-bold outline-none text-xs text-gray-500" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input type="text" placeholder="Taglie" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b" value={item.sizes || ''} onChange={(e) => updateItem(item.id, { sizes: e.target.value })} />
                    </div>
                    <div className="col-span-4 md:col-span-1">
                      <input type="number" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b text-center" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input type="number" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b text-center" value={item.discount} onChange={(e) => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-10 md:col-span-2 text-right">
                      <input type="number" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b text-indigo-600" value={item.price} onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <button onClick={() => setItems(items.filter((i) => i.id !== item.id))} className="text-red-400"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 dark:bg-gray-900/50 p-6 rounded-2xl border border-indigo-50 dark:border-gray-700">
                <div>
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">Tempi Consegna</label>
                  <input type="text" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">Spese Trasporto (€)</label>
                  <input type="number" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} />
                </div>
              </div>

              <div className="pt-6 border-t dark:border-gray-700 flex justify-between items-center">
                <div className="text-3xl font-black dark:text-white text-indigo-600">€ {calculateTotal().toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                <button onClick={saveOffer} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
