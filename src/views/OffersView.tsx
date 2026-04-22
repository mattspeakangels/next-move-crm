import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, FileText, Trash2, Clock, X, Edit2, Truck, Mail, Printer } from 'lucide-react';
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
    
    let body = `Spett.le ${contact.company},\n\nIn allegato i dettagli del preventivo richiesto.\n\n`;
    body += `OFFERTA N° ${offer.offerNumber}\n`;
    body += `==================================================\n`;
    
    offer.items.forEach(item => {
      const lineTotal = (item.price * item.quantity) * (1 - item.discount / 100);
      body += `• ${item.description.toUpperCase()}\n`;
      if (item.sizes) body += `  Taglie: ${item.sizes}\n`;
      body += `  Q.tà: ${item.quantity} | Prezzo: €${item.price.toFixed(2)} | Sconto: ${item.discount}%\n`;
      body += `  Subtotale: €${lineTotal.toFixed(2)}\n`;
      body += `--------------------------------------------------\n`;
    });
    
    if (offer.shippingCost) body += `Spese di Trasporto: €${offer.shippingCost.toFixed(2)}\n`;
    if (offer.deliveryTime) body += `Tempi di Consegna: ${offer.deliveryTime}\n`;
    
    body += `\nTOTALE FINALE: €${offer.totalAmount.toFixed(2)}\n\n`;
    body += `Restiamo a disposizione per qualsiasi chiarimento.\n\nCordiali saluti,\n${profile?.name || ''}\n${profile?.company || ''}`;

    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${encodeURIComponent(body)}`;
  };

  // --- FUNZIONE STAMPA MIGLIORATA E COMPLETA ---
  const handlePrint = (offer: Offer) => {
    const contact = contacts[offer.contactId];
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
      showToast('Pop-up bloccato! Abilita i pop-up per stampare.', 'error');
      return;
    }

    const itemsHtml = offer.items.map(item => {
      const subtotal = (item.price * item.quantity) * (1 - item.discount / 100);
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <strong>${item.description.toUpperCase()}</strong><br/>
            <span style="font-size: 11px; color: #666;">${item.sizes ? 'Taglie: ' + item.sizes : ''}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">€ ${item.price.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.discount}%</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">€ ${subtotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Preventivo ${offer.offerNumber}</title>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a1a; margin: 0; padding: 40px; line-height: 1.5; }
            .container { max-width: 800px; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 40px; }
            .logo-area h1 { margin: 0; color: #4f46e5; font-size: 28px; text-transform: uppercase; letter-spacing: -1px; }
            .info-area { text-align: right; }
            .info-area h2 { margin: 0; font-size: 18px; color: #4f46e5; }
            .info-area p { margin: 4px 0; font-size: 12px; font-weight: bold; }
            .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .address-box h3 { font-size: 10px; text-transform: uppercase; color: #999; margin-bottom: 8px; letter-spacing: 1px; }
            .address-box p { margin: 0; font-size: 14px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8fafc; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            .totals-area { margin-left: auto; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .grand-total { font-size: 20px; font-weight: 900; color: #4f46e5; border-bottom: 0; padding-top: 15px; }
            .footer { margin-top: 80px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
            @media print {
              body { padding: 20px; }
              .container { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-area">
                <h1>${profile?.company || 'Preventivo'}</h1>
                <p style="margin:0; font-size: 12px; color: #666;">Emesso da: ${profile?.name || ''}</p>
              </div>
              <div class="info-area">
                <h2>DOCUMENTO N° ${offer.offerNumber}</h2>
                <p>DATA: ${new Date(offer.date).toLocaleDateString('it-IT')}</p>
              </div>
            </div>

            <div class="addresses">
              <div class="address-box">
                <h3>Mittente</h3>
                <p>${profile?.company}</p>
                <p style="font-weight: normal; font-size: 12px;">${profile?.role || ''}</p>
              </div>
              <div class="address-box">
                <h3>Destinatario</h3>
                <p>${contact?.company}</p>
                <p style="font-weight: normal; font-size: 12px;">All'attenzione di: ${contact?.contactName || 'Ufficio Acquisti'}</p>
                <p style="font-weight: normal; font-size: 12px;">${contact?.address || ''} ${contact?.city || ''}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Descrizione Articolo</th>
                  <th style="text-align: center">Q.tà</th>
                  <th style="text-align: right">Prezzo Unit.</th>
                  <th style="text-align: center">Sconto</th>
                  <th style="text-align: right">Totale</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals-area">
              ${offer.shippingCost ? `
                <div class="total-row">
                  <span>Spese di Trasporto</span>
                  <span>€ ${offer.shippingCost.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>TOTALE FINALE</span>
                <span>€ ${offer.totalAmount.toFixed(2)}</span>
              </div>
              ${offer.deliveryTime ? `
                <p style="font-size: 11px; color: #64748b; margin-top: 15px; text-align: right;">
                  <strong>Tempi di consegna stimati:</strong> ${offer.deliveryTime}
                </p>
              ` : ''}
            </div>

            <div class="footer">
              <p>Il presente preventivo ha validità di 30 giorni dalla data di emissione. <br/> Documento generato digitalmente tramite NextMove CRM.</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                // Rimosso window.close() automatico per permettere all'utente di vedere l'anteprima se fallisce
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
            const isOverdue = Date.now() > offer.followUpDate && offer.status !== 'accettata';
            return (
              <div key={offer.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{offer.offerNumber}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                        offer.status === 'accettata' ? 'bg-green-50 text-green-600' :
                        offer.status === 'inviata' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {offer.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-black mt-3 dark:text-white uppercase">{contact?.company || 'Azienda non trovata'}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black dark:text-white tracking-tighter">€ {offer.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    <div className={`flex items-center gap-1 justify-end mt-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                      <Clock size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {isOverdue ? 'Scaduta' : `Follow-up: ${new Date(offer.followUpDate).toLocaleDateString('it-IT')}`}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                  <div className="flex gap-2">
                    <button onClick={() => updateOffer(offer.id, { status: 'accettata' })} className="px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 hover:bg-green-500 hover:text-white transition-all">Vinta</button>
                    <button onClick={() => handleSendEmail(offer)} className="px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2">
                      <Mail size={12}/> Invia Email
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handlePrint(offer)} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors" title="Stampa Professionale">
                      <Printer size={16} />
                    </button>
                    <button onClick={() => openModal(offer)} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Modifica">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => removeOffer(offer.id)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors" title="Elimina">
                      <Trash2 size={16} />
                    </button>
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
              <button onClick={() => setShowModal(false)}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Cliente</label>
                <select className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none focus:border-indigo-500" value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)}>
                  <option value="">Seleziona Cliente...</option>
                  {Object.values(contacts).map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Articoli</label>
                  <button onClick={addLineItem} className="text-indigo-600 font-black text-xs uppercase bg-indigo-50 px-3 py-1 rounded-full">+ Aggiungi Riga</button>
                </div>
                
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-end bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
                    <div className="col-span-12 md:col-span-4">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Prodotto</label>
                      <select className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1 mb-2" onChange={(e) => handleProductSelect(item.id, e.target.value)}>
                        <option value="">Dal catalogo...</option>
                        {Object.values(products).map((p) => (
                          <option key={p.id} value={p.id}>{p.code} - {p.description}</option>
                        ))}
                      </select>
                      <input type="text" placeholder="Descrizione personalizzata" className="w-full bg-transparent font-bold outline-none text-xs text-gray-500 dark:text-gray-400" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                    </div>
                    
                    <div className="col-span-4 md:col-span-2">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Taglie</label>
                      <input type="text" placeholder="es. L, XL" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1" value={item.sizes || ''} onChange={(e) => updateItem(item.id, { sizes: e.target.value })} />
                    </div>
                    
                    <div className="col-span-4 md:col-span-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Q.tà</label>
                      <input type="number" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1 text-center" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} />
                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Sconto %</label>
                      <input type="number" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1 text-center" value={item.discount} onChange={(e) => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    
                    <div className="col-span-10 md:col-span-2 text-right">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Prezzo U.</label>
                      <input type="number" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1 text-right text-indigo-600" value={item.price} onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })} />
                    </div>

                    <div className="col-span-2 md:col-span-1 flex justify-end pb-1">
                      <button onClick={() => setItems(items.filter((i) => i.id !== item.id))} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 dark:bg-gray-900/50 p-6 rounded-2xl border border-indigo-50 dark:border-gray-700">
                <div>
                  <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Truck size={12}/> Tempi di Consegna</label>
                  <input type="text" placeholder="es. 15 giorni lavorativi" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1">Spese di Trasporto (€)</label>
                  <input type="number" className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} />
                </div>
              </div>

              <div className="pt-6 border-t dark:border-gray-700 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Totale Preventivo</p>
                  <div className="text-3xl font-black dark:text-white text-indigo-600">€ {calculateTotal().toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                </div>
                <button onClick={saveOffer} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-colors">
                  Salva Offerta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
