import { showNotice } from '../ui/Feedback';
import React, { useState, useRef } from 'react';
import { Plus, Trash2, Upload, FileText, Download } from 'lucide-react';
import { PdfButton } from '../ui/PdfButton';
import { useStore } from '../../store/useStore';

// Offerte del cliente nella scheda: elenco, PDF e nuova offerta da PDF.
export const InlineOfferSection: React.FC<{ contactId: string }> = ({ contactId }) => {
  const { offers, products, deals, addOffer, updateOffer, updateDeal } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [formItems, setFormItems] = useState<Array<{ id: string; productId: string; description: string; quantity: number; price: number; discount: number }>>([]);
  const [formDelivery, setFormDelivery] = useState('');
  const [formShipping, setFormShipping] = useState(0);
  const [formDealId, setFormDealId] = useState('');
  const [uploadingPdfId, setUploadingPdfId] = useState<string | null>(null);
  const [showPdfQuick, setShowPdfQuick] = useState(false);
  const [quickPdfFile, setQuickPdfFile] = useState<File | null>(null);
  const [quickPdfUploading, setQuickPdfUploading] = useState(false);
  const existingPdfRef = useRef<HTMLInputElement>(null);
  const pendingPdfOfferId = useRef<string | null>(null);

  const handleExistingPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const offerId = pendingPdfOfferId.current;
    if (!file || !offerId) return;
    e.target.value = '';
    setUploadingPdfId(offerId);
    try {
      const { uploadOfferPdf } = await import('../../lib/uploadPdf');
      const { url, name } = await uploadOfferPdf(offerId, file);
      updateOffer(offerId, { pdfUrl: url, pdfName: name });
    } catch (err: any) {
      showNotice(err?.message ?? 'Errore caricamento PDF');
    } finally {
      setUploadingPdfId(null);
    }
  };

  const handleQuickPdfSave = async () => {
    if (!quickPdfFile) return;
    setQuickPdfUploading(true);
    try {
      const { uploadOfferPdf } = await import('../../lib/uploadPdf');
      const offerId = `off_${Date.now()}`;
      const offerNumber = `OFF-${Object.keys(offers).length + 101}`;
      const { url, name } = await uploadOfferPdf(offerId, quickPdfFile);
      addOffer({
        id: offerId,
        contactId,
        offerNumber,
        date: Date.now(),
        items: [],
        status: 'inviata',
        totalAmount: 0,
        followUpDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
        pdfUrl: url,
        pdfName: name,
      });
      setShowPdfQuick(false);
      setQuickPdfFile(null);
    } catch (err: any) {
      showNotice(err?.message ?? 'Errore caricamento PDF');
    } finally {
      setQuickPdfUploading(false);
    }
  };

  const contactOffers = Object.values(offers).filter(o => o.contactId === contactId).sort((a, b) => b.date - a.date);
  const openDeals = Object.values(deals).filter(d => d.contactId === contactId && !['chiuso-vinto', 'chiuso-perso'].includes(d.stage));
  const catalogProducts = Object.values(products);

  const addFormItem = () => {
    setFormItems(prev => [...prev, { id: `fi_${Date.now()}`, productId: '', description: '', quantity: 1, price: 0, discount: 0 }]);
  };

  const updateFormItem = (id: string, field: string, value: any) => {
    setFormItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const selectProduct = (itemId: string, productId: string) => {
    const p = products[productId];
    if (!p) return;
    setFormItems(prev => prev.map(i => i.id === itemId ? { ...i, productId: p.id, description: p.description, price: p.price, discount: p.discount || 0 } : i));
  };

  const removeFormItem = (id: string) => setFormItems(prev => prev.filter(i => i.id !== id));

  const calcTotal = () => {
    const sum = formItems.reduce((acc, i) => acc + i.price * i.quantity * (1 - i.discount / 100), 0);
    return sum + Number(formShipping);
  };

  const handleSave = () => {
    if (formItems.length === 0) return;
    const newOffer = {
      id: `off_${Date.now()}`,
      contactId,
      offerNumber: `OFF-${Object.keys(offers).length + 101}`,
      date: Date.now(),
      items: formItems.map(i => ({ id: i.id, productId: i.productId || undefined, description: i.description, quantity: i.quantity, price: i.price, discount: i.discount })),
      status: 'bozza' as const,
      totalAmount: calcTotal(),
      followUpDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
      deliveryTime: formDelivery,
      shippingCost: Number(formShipping),
    };
    addOffer(newOffer);
    if (formDealId) updateDeal(formDealId, { offerRef: newOffer.id });
    setFormItems([]); setFormDelivery(''); setFormShipping(0); setFormDealId('');
    setShowForm(false);
  };

  const STATUS_BADGE: Record<string, string> = {
    bozza: 'bg-raised text-secondary dark:bg-raised dark:text-muted',
    inviata: 'bg-accent-soft text-accent dark:bg-accent-soft/40 dark:text-accent',
    accettata: 'bg-success-soft text-success dark:bg-success-soft dark:text-success',
    rifiutata: 'bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger',
  };

  const STATUS_LABELS: Record<string, string> = { bozza: 'Bozza', inviata: 'Inviata', accettata: 'Accettata', rifiutata: 'Rifiutata' };

  return (
    <section>
      {/* Hidden input for attaching PDF to existing offer */}
      <input ref={existingPdfRef} type="file" accept="application/pdf" className="hidden" onChange={handleExistingPdfChange} />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted   flex items-center gap-2">
          <FileText size={16} /> 7. Offerte
          <span className="text-xs bg-raised dark:bg-raised text-muted px-2 py-0.5 rounded-full font-semibold">{contactOffers.length}</span>
        </h3>
        <button
          onClick={() => { setShowPdfQuick(v => !v); setShowForm(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warning-soft dark:bg-warning-soft text-warning font-semibold text-xs uppercase tracking-wide hover:bg-warning-soft transition-colors"
        >
          <Upload size={12} /> Carica PDF
        </button>
      </div>

      {/* Quick PDF upload panel */}
      {showPdfQuick && (
        <div className="bg-warning-soft dark:bg-warning-soft border-2 border-warning dark:border-warning rounded-panel p-4 mb-3 space-y-3">
          <p className="text-xs font-semibold text-warning uppercase tracking-normal">Nuova offerta da PDF</p>
          <label className={`flex items-center gap-3 w-full border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-colors ${quickPdfFile ? 'border-warning bg-surface dark:bg-surface' : 'border-warning hover:border-warning'}`}>
            <FileText size={20} className={quickPdfFile ? 'text-warning' : 'text-warning'} />
            <div className="flex-1 min-w-0">
              {quickPdfFile
                ? <span className="text-xs font-semibold text-warning dark:text-warning break-all">{quickPdfFile.name}</span>
                : <span className="text-xs font-bold text-warning">Clicca per selezionare il PDF...</span>
              }
            </div>
            <input type="file" accept="application/pdf" className="hidden" onChange={e => setQuickPdfFile(e.target.files?.[0] || null)} />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleQuickPdfSave}
              disabled={!quickPdfFile || quickPdfUploading}
              className="flex-1 py-2.5 bg-warning text-status-foreground rounded-md font-semibold text-xs uppercase tracking-wide hover:bg-warning transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {quickPdfUploading
                ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-line border-t-transparent rounded-full" /> Caricamento...</>
                : <><Upload size={13} /> Crea Offerta</>
              }
            </button>
            <button onClick={() => { setShowPdfQuick(false); setQuickPdfFile(null); }} className="px-4 py-2.5 rounded-md bg-raised dark:bg-raised text-secondary font-semibold text-xs uppercase">Annulla</button>
          </div>
        </div>
      )}

      {contactOffers.length > 0 && (
        <div className="space-y-2 mb-3">
          {contactOffers.map(offer => (
            <div key={offer.id} className="bg-surface dark:bg-surface rounded-panel p-3 flex items-center gap-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-xs dark:text-foreground">{offer.offerNumber}</p>
                  <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded-full ${STATUS_BADGE[offer.status] ?? STATUS_BADGE['bozza']}`}>
                    {STATUS_LABELS[offer.status] ?? offer.status}
                  </span>
                </div>
                <p className="text-xs text-muted font-bold mt-0.5">{new Date(offer.date).toLocaleDateString('it-IT')} · {offer.manualTotal ? 'valore ordine' : `${offer.items.length} articoli`}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-accent">€{offer.totalAmount.toLocaleString('it-IT')}</span>
                <select
                  value={offer.status}
                  onChange={e => updateOffer(offer.id, { status: e.target.value as any })}
                  className="text-xs font-semibold border border-line dark:border-line rounded-lg px-1.5 py-1 bg-surface dark:bg-raised dark:text-foreground outline-none"
                >
                  <option value="bozza">Bozza</option>
                  <option value="inviata">Inviata</option>
                  <option value="accettata">Accettata</option>
                  <option value="rifiutata">Rifiutata</option>
                </select>
                {offer.pdfUrl && (
                  <PdfButton pdfUrl={offer.pdfUrl} pdfName={offer.pdfName}
                    className="p-1.5 rounded-lg bg-warning-soft dark:bg-warning-soft text-warning hover:bg-warning-soft transition-colors">
                    <Download size={12} />
                  </PdfButton>
                )}
                <button
                  title={offer.pdfUrl ? 'Sostituisci PDF' : 'Allega PDF'}
                  disabled={uploadingPdfId === offer.id}
                  onClick={() => { pendingPdfOfferId.current = offer.id; existingPdfRef.current?.click(); }}
                  className="p-1.5 rounded-lg bg-canvas dark:bg-raised text-muted hover:bg-warning-soft hover:text-warning transition-colors disabled:opacity-40"
                >
                  {uploadingPdfId === offer.id
                    ? <span className="animate-spin inline-block w-3 h-3 border-2 border-warning border-t-transparent rounded-full" />
                    : <Upload size={12} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contactOffers.length === 0 && !showForm && (
        <p className="text-xs text-muted font-bold italic mb-3">Nessuna offerta per questo cliente</p>
      )}

      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border-2 border-accent dark:border-accent mb-3 space-y-3">
          {openDeals.length > 0 && (
            <select value={formDealId} onChange={e => setFormDealId(e.target.value)}
              className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-surface dark:bg-raised dark:text-foreground text-sm font-bold outline-none focus:border-accent">
              <option value="">Collega a un deal (opzionale)</option>
              {openDeals.map(d => <option key={d.id} value={d.id}>{d.stage} · €{d.value.toLocaleString('it-IT')}</option>)}
            </select>
          )}

          <div className="space-y-2">
            {formItems.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center">
                <div className="col-span-12 sm:col-span-5">
                  <select value={item.productId} onChange={e => selectProduct(item.id, e.target.value)}
                    className="w-full border-2 border-line dark:border-line rounded-md px-2 py-2 bg-surface dark:bg-raised dark:text-foreground text-xs font-bold outline-none focus:border-accent">
                    <option value="">Seleziona prodotto...</option>
                    {catalogProducts.map(p => <option key={p.id} value={p.id}>{p.description}</option>)}
                  </select>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input type="number" min="1" value={item.quantity} onChange={e => updateFormItem(item.id, 'quantity', Number(e.target.value))}
                    placeholder="Qtà" className="w-full border-2 border-line dark:border-line rounded-md px-2 py-2 bg-transparent dark:text-foreground text-xs font-bold outline-none focus:border-accent" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input type="number" min="0" value={item.price} onChange={e => updateFormItem(item.id, 'price', Number(e.target.value))}
                    placeholder="€ prezzo" className="w-full border-2 border-line dark:border-line rounded-md px-2 py-2 bg-transparent dark:text-foreground text-xs font-bold outline-none focus:border-accent" />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <input type="number" min="0" max="100" value={item.discount} onChange={e => updateFormItem(item.id, 'discount', Number(e.target.value))}
                    placeholder="Sc%" className="w-full border-2 border-line dark:border-line rounded-md px-2 py-2 bg-transparent dark:text-foreground text-xs font-bold outline-none focus:border-accent" />
                </div>
                <div className="col-span-1">
                  <button onClick={() => removeFormItem(item.id)} className="p-1.5 text-muted hover:text-danger rounded-lg transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addFormItem}
            className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/20 px-3 py-2 rounded-md uppercase hover:bg-accent-soft transition-colors">
            <Plus size={12} /> Aggiungi prodotto
          </button>

          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Tempi consegna (es. 2 settimane)" value={formDelivery} onChange={e => setFormDelivery(e.target.value)}
              className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-transparent dark:text-foreground text-xs font-bold outline-none focus:border-accent" />
            <input type="number" min="0" placeholder="Spese spedizione €" value={formShipping || ''} onChange={e => setFormShipping(Number(e.target.value))}
              className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-transparent dark:text-foreground text-xs font-bold outline-none focus:border-accent" />
          </div>

          {formItems.length > 0 && (
            <p className="text-xs font-semibold text-accent">Totale: €{calcTotal().toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={formItems.length === 0}
              className="flex-1 py-2.5 rounded-md bg-action text-action-foreground font-semibold text-xs uppercase disabled:opacity-40">Salva Offerta</button>
            <button onClick={() => { setShowForm(false); setFormItems([]); }}
              className="py-2.5 px-4 rounded-md bg-raised dark:bg-raised text-secondary font-semibold text-xs uppercase">Annulla</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => { setShowForm(true); setFormItems([]); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/20 px-3 py-2 rounded-md uppercase hover:bg-accent-soft transition-colors">
          <Plus size={12} /> Nuova Offerta
        </button>
      )}
    </section>
  );
};
