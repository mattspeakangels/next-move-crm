import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Plus, FileText, Trash2, X, Edit2, Mail, Printer, Sparkles, ChevronDown, ChevronUp, CheckCircle, XCircle, Upload, Download } from 'lucide-react';
import { uploadOfferPdf, openOfferPdf } from '../lib/uploadPdf';
import { PdfButton } from '../components/ui/PdfButton';
import { Offer, OfferItem, OfferStatus } from '../types';
import { useToast } from '../components/ui/ToastContext';
import { useClaudeAI } from '../hooks/useClaudeAI';
import { AiPanel } from '../components/ai/AiPanel';

export const OffersView: React.FC = () => {
  const { contacts, products, offers, addOffer, updateOffer, removeOffer, profile } = useStore();
  const { showToast } = useToast();
  
  const [showModal, setShowModal] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTargetOffer, setAiTargetOffer] = useState<Offer | null>(null);
  const { result: aiResult, loading: aiLoading, error: aiError, run: aiRun, reset: aiReset } = useClaudeAI();

  const handleWriteEmail = (offer: Offer) => {
    const contact = contacts[offer.contactId];
    setAiTargetOffer(offer);
    setShowAiPanel(true);
    aiRun('email-offerta', {
      offerNumber: offer.offerNumber,
      company: contact?.company ?? '',
      contactName: contact?.contactName,
      contactRole: contact?.role,
      customerType: contact?.customerType,
      sector: contact?.sector,
      items: offer.items.map(it => ({
        description: it.description,
        quantity: it.quantity,
        price: it.price,
        discount: it.discount,
      })),
      totalAmount: offer.totalAmount,
      deliveryTime: offer.deliveryTime,
    });
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadOfferId = useRef<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfModalContactId, setPdfModalContactId] = useState('');
  const [pdfModalFile, setPdfModalFile] = useState<File | null>(null);
  const [pdfModalUploading, setPdfModalUploading] = useState(false);

  const triggerPdfUpload = (offerId: string) => {
    pendingUploadOfferId.current = offerId;
    pdfInputRef.current?.click();
  };

  const handlePdfModalConfirm = async () => {
    if (!pdfModalContactId || !pdfModalFile) return;
    setPdfModalUploading(true);
    try {
      const offerId = `offer_${Date.now()}`;
      const allOffers = Object.values(offers);
      const offerNumber = `OFF-${new Date().getFullYear()}-${String(allOffers.length + 1).padStart(3, '0')}`;
      const { url, name } = await uploadOfferPdf(offerId, pdfModalFile);
      addOffer({
        id: offerId,
        contactId: pdfModalContactId,
        offerNumber,
        date: Date.now(),
        items: [],
        status: 'inviata',
        totalAmount: 0,
        followUpDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
        pdfUrl: url,
        pdfName: name,
      });
      showToast('PDF caricato e offerta creata!', 'success');
      setShowPdfModal(false);
      setPdfModalContactId('');
      setPdfModalFile(null);
    } catch (err: any) {
      showToast(err?.message ?? 'Errore caricamento PDF', 'error');
    } finally {
      setPdfModalUploading(false);
    }
  };

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const offerId = pendingUploadOfferId.current;
    if (!file || !offerId) return;
    e.target.value = '';
    setUploadingId(offerId);
    try {
      const { url, name } = await uploadOfferPdf(offerId, file);
      updateOffer(offerId, { pdfUrl: url, pdfName: name });
      showToast('PDF caricato!', 'success');
    } catch (err: any) {
      showToast(err?.message ?? 'Errore caricamento PDF', 'error');
    } finally {
      setUploadingId(null);
    }
  };
  
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

    // Validate offer items (business logic)
    for (const item of items) {
      if (item.discount < 0) {
        showToast(`Errore: Lo sconto non può essere negativo (${item.description})`, 'error');
        return;
      }
      if (item.discount > 100) {
        showToast(`Errore: Lo sconto non può superare il 100% (${item.description})`, 'error');
        return;
      }
      if (item.quantity <= 0) {
        showToast(`Errore: La quantità deve essere almeno 1 (${item.description})`, 'error');
        return;
      }
      if (item.price < 0) {
        showToast(`Errore: Il prezzo non può essere negativo (${item.description})`, 'error');
        return;
      }
    }

    if (Number(shippingCost) < 0) {
      showToast('Errore: Il costo di trasporto non può essere negativo', 'error');
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

  const handleSendEmail = async (offer: Offer) => {
    const contact = contacts[offer.contactId];
    if (!contact) return;
    const subject = `Preventivo ${offer.offerNumber} - ${profile?.company || 'CRM'}`;

    if (offer.pdfUrl) {
      try {
        const { getPdfDataUrl, dataUrlToBlob } = await import('../lib/uploadPdf');
        const dataUrl = await getPdfDataUrl(offer.pdfUrl);
        const fileName = offer.pdfName || `${offer.offerNumber}.pdf`;
        const blob = dataUrlToBlob(dataUrl);

        // Auto-download the PDF so it's ready to attach
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

        showToast(`PDF "${fileName}" scaricato — allegalo nella finestra email`, 'success');

        // Open email client after a short delay
        setTimeout(() => {
          window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`;
        }, 600);
      } catch (err: any) {
        showToast(err?.message ?? 'Errore', 'error');
      }
      return;
    }

    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`;
  };

  const handlePrint = async (offer: Offer) => {
    // If PDF attached, print that instead of the generated HTML
    if (offer.pdfUrl) {
      try { await openOfferPdf(offer.pdfUrl, true); } catch (err: any) { showToast(err?.message ?? 'Errore apertura PDF', 'error'); }
      return;
    }
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
      {/* Hidden PDF file input shared across all offers */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfFileChange}
      />

      {/* Modal: Carica PDF offerta */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase dark:text-white">Carica PDF Offerta</h2>
              <button onClick={() => { setShowPdfModal(false); setPdfModalFile(null); setPdfModalContactId(''); }}>
                <X size={22} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Cliente</label>
                <select
                  className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white font-bold outline-none"
                  value={pdfModalContactId}
                  onChange={e => setPdfModalContactId(e.target.value)}
                >
                  <option value="">Seleziona cliente...</option>
                  {Object.values(contacts).sort((a, b) => a.company.localeCompare(b.company)).map(c => (
                    <option key={c.id} value={c.id}>{c.company}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">File PDF</label>
                <label className={`flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-2xl py-8 cursor-pointer transition-colors ${pdfModalFile ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'}`}>
                  <FileText size={32} className={pdfModalFile ? 'text-orange-500' : 'text-gray-300'} />
                  {pdfModalFile ? (
                    <span className="text-sm font-black text-orange-600 dark:text-orange-400 px-4 text-center break-all">{pdfModalFile.name}</span>
                  ) : (
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Clicca per selezionare il PDF</span>
                  )}
                  <input type="file" accept="application/pdf" className="hidden" onChange={e => setPdfModalFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <button
                onClick={handlePdfModalConfirm}
                disabled={!pdfModalContactId || !pdfModalFile || pdfModalUploading}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-wide hover:bg-orange-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {pdfModalUploading ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Caricamento...</>
                ) : (
                  <><Upload size={16} /> Crea Offerta con PDF</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Offerte</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Gestione Preventivi</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPdfModal(true)} className="bg-orange-500 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-orange-600 transition-all">
            <Upload size={18} /> Carica PDF
          </button>
          <button onClick={() => openModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all">
            <Plus size={20} /> Nuova
          </button>
        </div>
      </div>

      {(() => {
        const allOffers = Object.values(offers).sort((a, b) => b.date - a.date);
        const active   = allOffers.filter(o => o.status === 'bozza' || o.status === 'inviata');
        const archived = allOffers.filter(o => o.status === 'accettata' || o.status === 'rifiutata');

        const STATUS_CONFIG: Record<OfferStatus, { label: string; bg: string; text: string; activeBg: string; activeText: string }> = {
          bozza:     { label: 'Bozza',     bg: 'bg-gray-100 dark:bg-gray-700',     text: 'text-gray-500 dark:text-gray-300', activeBg: 'bg-gray-500',   activeText: 'text-white' },
          inviata:   { label: 'Inviata',   bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-500',                    activeBg: 'bg-blue-500',   activeText: 'text-white' },
          accettata: { label: 'Accettata', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600',                   activeBg: 'bg-green-500',  activeText: 'text-white' },
          rifiutata: { label: 'Rifiutata', bg: 'bg-red-50 dark:bg-red-900/20',     text: 'text-red-500',                     activeBg: 'bg-red-500',    activeText: 'text-white' },
        };

        const OfferCard = ({ offer }: { offer: typeof allOffers[0] }) => {
          const contact = contacts[offer.contactId];
          return (
            <div className={`bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border-2 transition-colors ${
              offer.status === 'inviata' ? 'border-blue-200 dark:border-blue-800' : 'border-gray-100 dark:border-gray-700'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                    {offer.offerNumber}
                  </span>
                  <h3 className="text-xl font-black mt-3 dark:text-white uppercase">{contact?.company || 'Azienda'}</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    {new Date(offer.date).toLocaleDateString('it-IT')} · {offer.items.length} articol{offer.items.length === 1 ? 'o' : 'i'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black dark:text-white tracking-tighter">
                    € {offer.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Stato offerta</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(STATUS_CONFIG) as OfferStatus[]).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = offer.status === s;
                    return (
                      <button key={s} onClick={() => updateOffer(offer.id, { status: s })}
                        className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wide transition-all ${
                          isActive ? `${cfg.activeBg} ${cfg.activeText} shadow-sm` : `${cfg.bg} ${cfg.text} hover:opacity-80`
                        }`}>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* PDF row */}
              {offer.pdfUrl && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800">
                  <FileText size={14} className="text-orange-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-orange-700 dark:text-orange-300 truncate flex-1">{offer.pdfName}</span>
                  <PdfButton pdfUrl={offer.pdfUrl} pdfName={offer.pdfName}
                    className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-black text-[10px] uppercase hover:bg-orange-600 transition-colors flex-shrink-0 flex items-center gap-1.5">
                    <Download size={12} /> Visualizza
                  </PdfButton>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => handleSendEmail(offer)} className="px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2">
                    <Mail size={12} /> Email
                  </button>
                  <button onClick={() => handleWriteEmail(offer)} className="px-3 py-2 rounded-xl font-black text-[10px] uppercase bg-purple-50 dark:bg-purple-900/30 text-purple-600 hover:bg-purple-600 hover:text-white transition-all flex items-center gap-1.5" title="Scrivi email con Claude AI">
                    <Sparkles size={12} /> AI
                  </button>
                  <button
                    onClick={() => triggerPdfUpload(offer.id)}
                    disabled={uploadingId === offer.id}
                    className="px-3 py-2 rounded-xl font-black text-[10px] uppercase bg-orange-50 dark:bg-orange-900/30 text-orange-600 hover:bg-orange-600 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {uploadingId === offer.id ? (
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full" />
                    ) : <Upload size={12} />}
                    {offer.pdfUrl ? 'Sostituisci PDF' : 'Allega PDF'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePrint(offer)} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-gray-100 transition-colors"><Printer size={18} /></button>
                  <button onClick={() => openModal(offer)} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors"><Edit2 size={18} /></button>
                  <button onClick={() => removeOffer(offer.id)} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          );
        };

        return (
          <>
            {/* ── OFFERTE ATTIVE ── */}
            <div className="grid gap-4">
              {active.length > 0 ? (
                active.map(o => <OfferCard key={o.id} offer={o} />)
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-700">
                  <FileText size={48} className="mx-auto mb-4 text-gray-200 dark:text-gray-600" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest">Nessuna offerta attiva</p>
                </div>
              )}
            </div>

            {/* ── ARCHIVIO ── */}
            {archived.length > 0 && (
              <div className="mt-2">
                {/* Header collapsible */}
                <button
                  onClick={() => setArchiveOpen(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Archivio</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      <CheckCircle size={11} /> {archived.filter(o => o.status === 'accettata').length} accettate
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                      <XCircle size={11} /> {archived.filter(o => o.status === 'rifiutata').length} rifiutate
                    </span>
                    <span className="text-xs font-black text-gray-400">
                      · € {archived.filter(o => o.status === 'accettata').reduce((s, o) => s + o.totalAmount, 0).toLocaleString('it-IT', { maximumFractionDigits: 0 })} vinti
                    </span>
                  </div>
                  {archiveOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {/* Lista compatta archivio */}
                {archiveOpen && (
                  <div className="mt-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {archived.map((offer, idx) => {
                      const contact = contacts[offer.contactId];
                      const won = offer.status === 'accettata';
                      return (
                        <div key={offer.id} className={`flex items-center justify-between px-5 py-3.5 gap-4 ${idx < archived.length - 1 ? 'border-b border-gray-50 dark:border-gray-700/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors`}>
                          {/* Icona stato */}
                          <div className="flex-shrink-0">
                            {won
                              ? <CheckCircle size={18} className="text-green-500" />
                              : <XCircle size={18} className="text-red-400" />
                            }
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{offer.offerNumber}</span>
                              <span className="text-sm font-black text-gray-800 dark:text-white truncate">{contact?.company || 'Azienda'}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(offer.date).toLocaleDateString('it-IT')} · {offer.items.length} articol{offer.items.length === 1 ? 'o' : 'i'}
                            </p>
                          </div>

                          {/* Importo */}
                          <div className={`text-base font-black flex-shrink-0 ${won ? 'text-green-600' : 'text-red-400'}`}>
                            € {offer.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>

                          {/* Azioni minime */}
                          <div className="flex gap-1.5 flex-shrink-0">
                            {offer.pdfUrl && (
                              <PdfButton pdfUrl={offer.pdfUrl} pdfName={offer.pdfName}
                                className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                                <FileText size={14} />
                              </PdfButton>
                            )}
                            <button
                              onClick={() => triggerPdfUpload(offer.id)}
                              disabled={uploadingId === offer.id}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
                              title="Allega PDF"
                            >
                              {uploadingId === offer.id
                                ? <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full" />
                                : <Upload size={14} />}
                            </button>
                            <button onClick={() => updateOffer(offer.id, { status: 'inviata' })} title="Riporta in lavorazione"
                              className="p-1.5 rounded-lg text-xs text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 transition-colors font-bold">
                              ↩
                            </button>
                            <button onClick={() => handlePrint(offer)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><Printer size={14} /></button>
                            <button onClick={() => removeOffer(offer.id)} className="p-1.5 rounded-lg text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

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

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Articoli</label>
                  <button onClick={addLineItem} className="text-indigo-600 font-black text-xs uppercase bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors">+ Aggiungi Riga</button>
                </div>

                {items.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                    <p className="text-gray-400 text-xs font-bold">Premi "+ Aggiungi Riga" per inserire un articolo</p>
                  </div>
                )}

                {items.map((item, idx) => {
                  const lineTotal = item.price * item.quantity * (1 - item.discount / 100);
                  return (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 space-y-3">
                      {/* Row header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Articolo {idx + 1}</span>
                        <button
                          onClick={() => setItems(items.filter(i => i.id !== item.id))}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Catalog selector */}
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-1">Da catalogo</label>
                        <select
                          className="w-full border-2 border-white dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 dark:text-white font-bold text-sm outline-none focus:border-indigo-400 transition-colors"
                          onChange={e => handleProductSelect(item.id, e.target.value)}
                          defaultValue=""
                        >
                          <option value="">Seleziona dal catalogo (opzionale)...</option>
                          {Object.values(products).map(p => (
                            <option key={p.id} value={p.id}>{p.code} — {p.description}</option>
                          ))}
                        </select>
                      </div>

                      {/* Description + Sizes */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-1">Descrizione *</label>
                          <input
                            type="text"
                            placeholder="Es. Giubbotto invernale"
                            className="w-full border-2 border-white dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 dark:text-white font-bold text-sm outline-none focus:border-indigo-400 transition-colors"
                            value={item.description}
                            onChange={e => updateItem(item.id, { description: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-1">Taglie / Mis.</label>
                          <input
                            type="text"
                            placeholder="Es. S/M/L/XL"
                            className="w-full border-2 border-white dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 dark:text-white font-bold text-sm outline-none focus:border-indigo-400 transition-colors"
                            value={item.sizes || ''}
                            onChange={e => updateItem(item.id, { sizes: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Qty + Price + Discount + Total */}
                      <div className="grid grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-1">Q.tà</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full border-2 border-white dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 dark:text-white font-black text-sm text-center outline-none focus:border-indigo-400 transition-colors"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-1">Prezzo €</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full border-2 border-white dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 dark:text-white font-black text-sm text-center outline-none focus:border-indigo-400 transition-colors"
                            value={item.price || ''}
                            onChange={e => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-1">Sconto %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            className="w-full border-2 border-white dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 dark:text-white font-black text-sm text-center outline-none focus:border-indigo-400 transition-colors"
                            value={item.discount || ''}
                            onChange={e => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-indigo-600 rounded-xl px-3 py-2.5 text-center">
                          <p className="text-[9px] font-black text-indigo-300 uppercase tracking-wide">Totale riga</p>
                          <p className="font-black text-white text-sm">€ {lineTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
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

      {showAiPanel && (
        <AiPanel
          title="Scrivi Email Offerta"
          subtitle={aiTargetOffer?.offerNumber}
          loading={aiLoading}
          result={aiResult}
          error={aiError}
          onClose={() => { setShowAiPanel(false); setAiTargetOffer(null); aiReset(); }}
          onRetry={() => aiTargetOffer && handleWriteEmail(aiTargetOffer)}
        />
      )}
    </div>
  );
};
