import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Phone, MapPin, Building2, X, Users, UserPlus, Trash2, Upload, FileText, ArrowLeft, Sparkles, Activity, History, Calendar, TrendingUp, ClipboardList, Download, Link, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { PdfButton } from '../components/ui/PdfButton';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { useStore } from '../store/useStore';
import { Contact, ContactSegment } from '../types';
import { AddDealModal } from '../components/deals/AddDealModal';
import { useClaudeAI } from '../hooks/useClaudeAI';
import { AiPanel } from '../components/ai/AiPanel';
import { ProfilingForm } from '../components/profiling/ProfilingForm';
import { ImportFromUrlModal } from '../components/contacts/ImportFromUrlModal';
import { DeviceAuthModal } from '../components/ui/DeviceAuthModal';
import { ContactHistoryView } from './ContactHistoryView';
import { matchSearch } from '../utils/search';

const InlineProgrammaSection: React.FC<{ contactId: string }> = ({ contactId }) => {
  const { activities, addActivity, deleteActivity } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<'visita' | 'chiamata' | 'email'>('visita');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');

  const planned = Object.values(activities)
    .filter(a => a.contactId === contactId && a.outcome === 'da-fare')
    .sort((a, b) => a.date - b.date);

  const handleAdd = () => {
    addActivity({
      id: `act_${Date.now()}`,
      contactId,
      type: newType,
      date: new Date(newDate).getTime(),
      outcome: 'da-fare',
      notes: newNotes,
      createdAt: Date.now(),
    });
    setNewNotes('');
    setShowForm(false);
  };

  const TYPE_CONFIG = {
    visita:   { label: 'Visita',    color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
    chiamata: { label: 'Chiamata',  color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/40'   },
    email:    { label: 'Email',     color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/40'     },
  };

  return (
    <section>
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Calendar size={16} /> 5. Programma Attività
        <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-black">{planned.length} programmate</span>
      </h3>
      {planned.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 font-bold italic mb-3">Nessuna attività programmata</p>
      )}
      {planned.length > 0 && (
        <div className="space-y-2 mb-3">
          {planned.map(act => {
            const cfg = TYPE_CONFIG[act.type as 'visita' | 'chiamata' | 'email'] ?? TYPE_CONFIG['visita'];
            const isPast = act.date < Date.now();
            return (
              <div key={act.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm ${isPast ? 'border border-orange-200 dark:border-orange-700' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.bg} ${cfg.color} text-xs font-black`}>
                  {cfg.label[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-xs dark:text-white">{cfg.label}</p>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${isPast ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {isPast ? 'Scaduta' : 'In attesa'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">{new Date(act.date).toLocaleDateString('it-IT')}{act.notes ? ` · ${act.notes}` : ''}</p>
                </div>
                <button onClick={() => deleteActivity(act.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 border-indigo-200 dark:border-indigo-700 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={newType} onChange={e => setNewType(e.target.value as any)}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-700 dark:text-white text-sm font-bold outline-none focus:border-indigo-400">
              <option value="visita">Visita</option>
              <option value="chiamata">Chiamata</option>
              <option value="email">Email</option>
            </select>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-transparent dark:text-white text-sm font-bold outline-none focus:border-indigo-400" />
          </div>
          <input type="text" placeholder="Note (opzionale)" value={newNotes} onChange={e => setNewNotes(e.target.value)}
            className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-transparent dark:text-white text-sm font-bold outline-none focus:border-indigo-400" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase">Aggiungi</button>
            <button onClick={() => setShowForm(false)} className="py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 font-black text-xs uppercase">Annulla</button>
          </div>
        </div>
      )}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-xl uppercase hover:bg-indigo-100 transition-colors">
          <Plus size={12} /> Programma attività
        </button>
      )}
    </section>
  );
};

const ProfilingCollapsible: React.FC<{ contact: Contact }> = ({ contact }) => {
  const [open, setOpen] = useState(false);
  const badge = contact.profiling
    ? (() => {
        const q = contact.profiling.qualificazione;
        const t = q.esigenzaReale + q.decisionMaker + q.aperturaFornitore + q.timeline + q.budget;
        return t >= 20 ? 'HOT' : t >= 15 ? 'WARM' : t >= 10 ? 'COLD' : 'TRASH';
      })()
    : null;
  const BADGE_STYLE: Record<string, string> = {
    HOT: 'bg-red-500 text-white', WARM: 'bg-amber-400 text-white',
    COLD: 'bg-green-500 text-white', TRASH: 'bg-gray-400 text-white',
  };
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <ClipboardList size={16} /> 2. Profilazione Blaklader
          {badge && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${BADGE_STYLE[badge]}`}>{badge}</span>}
          {!contact.profiling && <span className="text-[10px] font-bold text-gray-300 normal-case tracking-normal">Non compilata</span>}
        </h3>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all
            ${open
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-indigo-900'}`}>
          <ClipboardList size={12} />
          {open ? 'Chiudi' : contact.profiling ? 'Modifica' : 'Compila'}
        </button>
      </div>
      {open && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-700">
          <ProfilingForm contact={contact} key={contact.id} />
        </div>
      )}
    </section>
  );
};

const InlineOfferSection: React.FC<{ contactId: string }> = ({ contactId }) => {
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
      const { uploadOfferPdf } = await import('../lib/uploadPdf');
      const { url, name } = await uploadOfferPdf(offerId, file);
      updateOffer(offerId, { pdfUrl: url, pdfName: name });
    } catch (err: any) {
      alert(err?.message ?? 'Errore caricamento PDF');
    } finally {
      setUploadingPdfId(null);
    }
  };

  const handleQuickPdfSave = async () => {
    if (!quickPdfFile) return;
    setQuickPdfUploading(true);
    try {
      const { uploadOfferPdf } = await import('../lib/uploadPdf');
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
      alert(err?.message ?? 'Errore caricamento PDF');
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
    bozza: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
    inviata: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    accettata: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    rifiutata: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };

  const STATUS_LABELS: Record<string, string> = { bozza: 'Bozza', inviata: 'Inviata', accettata: 'Accettata', rifiutata: 'Rifiutata' };

  return (
    <section>
      {/* Hidden input for attaching PDF to existing offer */}
      <input ref={existingPdfRef} type="file" accept="application/pdf" className="hidden" onChange={handleExistingPdfChange} />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <FileText size={16} /> 7. Offerte
          <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-black">{contactOffers.length}</span>
        </h3>
        <button
          onClick={() => { setShowPdfQuick(v => !v); setShowForm(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-black text-[10px] uppercase tracking-wide hover:bg-orange-100 transition-colors"
        >
          <Upload size={12} /> Carica PDF
        </button>
      </div>

      {/* Quick PDF upload panel */}
      {showPdfQuick && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl p-4 mb-3 space-y-3">
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Nuova offerta da PDF</p>
          <label className={`flex items-center gap-3 w-full border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-colors ${quickPdfFile ? 'border-orange-400 bg-white dark:bg-gray-800' : 'border-orange-200 hover:border-orange-400'}`}>
            <FileText size={20} className={quickPdfFile ? 'text-orange-500' : 'text-orange-300'} />
            <div className="flex-1 min-w-0">
              {quickPdfFile
                ? <span className="text-xs font-black text-orange-700 dark:text-orange-300 break-all">{quickPdfFile.name}</span>
                : <span className="text-xs font-bold text-orange-400">Clicca per selezionare il PDF...</span>
              }
            </div>
            <input type="file" accept="application/pdf" className="hidden" onChange={e => setQuickPdfFile(e.target.files?.[0] || null)} />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleQuickPdfSave}
              disabled={!quickPdfFile || quickPdfUploading}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-wide hover:bg-orange-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {quickPdfUploading
                ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Caricamento...</>
                : <><Upload size={13} /> Crea Offerta</>
              }
            </button>
            <button onClick={() => { setShowPdfQuick(false); setQuickPdfFile(null); }} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 font-black text-xs uppercase">Annulla</button>
          </div>
        </div>
      )}

      {contactOffers.length > 0 && (
        <div className="space-y-2 mb-3">
          {contactOffers.map(offer => (
            <div key={offer.id} className="bg-white dark:bg-gray-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-xs dark:text-white">{offer.offerNumber}</p>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${STATUS_BADGE[offer.status] ?? STATUS_BADGE['bozza']}`}>
                    {STATUS_LABELS[offer.status] ?? offer.status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date(offer.date).toLocaleDateString('it-IT')} · {offer.manualTotal ? 'valore ordine' : `${offer.items.length} articoli`}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-indigo-600">€{offer.totalAmount.toLocaleString('it-IT')}</span>
                <select
                  value={offer.status}
                  onChange={e => updateOffer(offer.id, { status: e.target.value as any })}
                  className="text-[9px] font-black border border-gray-200 dark:border-gray-600 rounded-lg px-1.5 py-1 bg-white dark:bg-gray-700 dark:text-white outline-none"
                >
                  <option value="bozza">Bozza</option>
                  <option value="inviata">Inviata</option>
                  <option value="accettata">Accettata</option>
                  <option value="rifiutata">Rifiutata</option>
                </select>
                {offer.pdfUrl && (
                  <PdfButton pdfUrl={offer.pdfUrl} pdfName={offer.pdfName}
                    className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 hover:bg-orange-100 transition-colors">
                    <Download size={12} />
                  </PdfButton>
                )}
                <button
                  title={offer.pdfUrl ? 'Sostituisci PDF' : 'Allega PDF'}
                  disabled={uploadingPdfId === offer.id}
                  onClick={() => { pendingPdfOfferId.current = offer.id; existingPdfRef.current?.click(); }}
                  className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors disabled:opacity-40"
                >
                  {uploadingPdfId === offer.id
                    ? <span className="animate-spin inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full" />
                    : <Upload size={12} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contactOffers.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 font-bold italic mb-3">Nessuna offerta per questo cliente</p>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 border-indigo-200 dark:border-indigo-700 mb-3 space-y-3">
          {openDeals.length > 0 && (
            <select value={formDealId} onChange={e => setFormDealId(e.target.value)}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-700 dark:text-white text-sm font-bold outline-none focus:border-indigo-400">
              <option value="">Collega a un deal (opzionale)</option>
              {openDeals.map(d => <option key={d.id} value={d.id}>{d.stage} · €{d.value.toLocaleString('it-IT')}</option>)}
            </select>
          )}

          <div className="space-y-2">
            {formItems.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center">
                <div className="col-span-12 sm:col-span-5">
                  <select value={item.productId} onChange={e => selectProduct(item.id, e.target.value)}
                    className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-2 py-2 bg-white dark:bg-gray-700 dark:text-white text-xs font-bold outline-none focus:border-indigo-400">
                    <option value="">Seleziona prodotto...</option>
                    {catalogProducts.map(p => <option key={p.id} value={p.id}>{p.description}</option>)}
                  </select>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input type="number" min="1" value={item.quantity} onChange={e => updateFormItem(item.id, 'quantity', Number(e.target.value))}
                    placeholder="Qtà" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-2 py-2 bg-transparent dark:text-white text-xs font-bold outline-none focus:border-indigo-400" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input type="number" min="0" value={item.price} onChange={e => updateFormItem(item.id, 'price', Number(e.target.value))}
                    placeholder="€ prezzo" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-2 py-2 bg-transparent dark:text-white text-xs font-bold outline-none focus:border-indigo-400" />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <input type="number" min="0" max="100" value={item.discount} onChange={e => updateFormItem(item.id, 'discount', Number(e.target.value))}
                    placeholder="Sc%" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-2 py-2 bg-transparent dark:text-white text-xs font-bold outline-none focus:border-indigo-400" />
                </div>
                <div className="col-span-1">
                  <button onClick={() => removeFormItem(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addFormItem}
            className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-xl uppercase hover:bg-indigo-100 transition-colors">
            <Plus size={12} /> Aggiungi prodotto
          </button>

          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Tempi consegna (es. 2 settimane)" value={formDelivery} onChange={e => setFormDelivery(e.target.value)}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-transparent dark:text-white text-xs font-bold outline-none focus:border-indigo-400" />
            <input type="number" min="0" placeholder="Spese spedizione €" value={formShipping || ''} onChange={e => setFormShipping(Number(e.target.value))}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-transparent dark:text-white text-xs font-bold outline-none focus:border-indigo-400" />
          </div>

          {formItems.length > 0 && (
            <p className="text-xs font-black text-indigo-600">Totale: €{calcTotal().toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={formItems.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase disabled:opacity-40">Salva Offerta</button>
            <button onClick={() => { setShowForm(false); setFormItems([]); }}
              className="py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 font-black text-xs uppercase">Annulla</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => { setShowForm(true); setFormItems([]); }}
          className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-xl uppercase hover:bg-indigo-100 transition-colors">
          <Plus size={12} /> Nuova Offerta
        </button>
      )}
    </section>
  );
};

function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const InlineBiSection: React.FC<{ contactId: string }> = ({ contactId }) => {
  const { contacts, updateContact } = useStore();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const contact = contacts[contactId];
  const docs = (contact?.biDocuments ?? []).slice().sort((a, b) => b.uploadedAt - a.uploadedAt);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { uploadBiDocument } = await import('../lib/uploadBiDocument');
      const doc = await uploadBiDocument(contactId, file);
      const current = contacts[contactId]?.biDocuments ?? [];
      updateContact(contactId, { biDocuments: [...current, doc] });
    } catch (err: any) {
      alert(err?.message ?? 'Errore caricamento documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (docId: string) => {
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    setDownloadingId(docId);
    try {
      const { downloadBiDocument } = await import('../lib/uploadBiDocument');
      await downloadBiDocument(doc);
    } catch (err: any) {
      alert(err?.message ?? 'Errore download documento');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    setDeletingId(docId);
    try {
      const { deleteBiDocument } = await import('../lib/uploadBiDocument');
      await deleteBiDocument(doc);
      const current = contacts[contactId]?.biDocuments ?? [];
      updateContact(contactId, { biDocuments: current.filter(d => d.id !== docId) });
    } catch (err: any) {
      alert(err?.message ?? 'Errore eliminazione documento');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section>
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleFileChange} />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <FileText size={16} /> 8. Business Intelligence
          <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-black">{docs.length}</span>
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-black text-[10px] uppercase tracking-wide hover:bg-orange-100 transition-colors disabled:opacity-40"
        >
          {uploading
            ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full" /> Caricamento...</>
            : <><Upload size={12} /> Carica Documento</>
          }
        </button>
      </div>

      {docs.length === 0 && (
        <p className="text-xs text-gray-400 font-bold italic">Nessun documento caricato per questo cliente</p>
      )}

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
              <FileText size={18} className="text-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-xs dark:text-white truncate">{doc.name}</p>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  {new Date(doc.uploadedAt).toLocaleDateString('it-IT')} · {fmtFileSize(doc.size)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(doc.id)}
                disabled={downloadingId === doc.id}
                className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 hover:bg-orange-100 transition-colors disabled:opacity-40"
              >
                {downloadingId === doc.id
                  ? <span className="animate-spin inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full" />
                  : <Download size={12} />
                }
              </button>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
              >
                {deletingId === doc.id
                  ? <span className="animate-spin inline-block w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                  : <Trash2 size={12} />
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const InlinePhotoSection: React.FC<{ contactId: string }> = ({ contactId }) => {
  const { contacts, updateContact } = useStore();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ photo: any; fullUrl: string | null; loading: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const contact = contacts[contactId];
  const photos = (contact?.photos ?? []).slice().sort((a, b) => b.uploadedAt - a.uploadedAt);

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { uploadContactPhoto } = await import('../lib/uploadPhoto');
      for (const file of files) {
        const photo = await uploadContactPhoto(contactId, file);
        const current = contacts[contactId]?.photos ?? [];
        updateContact(contactId, { photos: [...current, photo] });
      }
    } catch (err: any) {
      alert(err?.message ?? 'Errore caricamento foto');
    } finally {
      setUploading(false);
    }
  };

  const openViewer = async (photo: any) => {
    setViewer({ photo, fullUrl: null, loading: true });
    try {
      const { getContactPhotoFullDataUrl } = await import('../lib/uploadPhoto');
      const fullUrl = await getContactPhotoFullDataUrl(photo);
      setViewer({ photo, fullUrl, loading: false });
    } catch (err: any) {
      alert(err?.message ?? 'Errore apertura foto');
      setViewer(null);
    }
  };

  const handleDelete = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    setDeletingId(photoId);
    try {
      const { deleteContactPhoto } = await import('../lib/uploadPhoto');
      await deleteContactPhoto(photo);
      const current = contacts[contactId]?.photos ?? [];
      updateContact(contactId, { photos: current.filter(p => p.id !== photoId) });
      setViewer(null);
    } catch (err: any) {
      alert(err?.message ?? 'Errore eliminazione foto');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section>
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFilesChange} />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <ImageIcon size={16} /> 9. Foto Punto Vendita / Assortimento
          <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-black">{photos.length}</span>
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-black text-[10px] uppercase tracking-wide hover:bg-orange-100 transition-colors disabled:opacity-40"
        >
          {uploading
            ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full" /> Caricamento...</>
            : <><Upload size={12} /> Carica Foto</>
          }
        </button>
      </div>

      {photos.length === 0 && (
        <p className="text-xs text-gray-400 font-bold italic">Nessuna foto caricata per questo cliente</p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {photos.map(photo => (
            <button
              key={photo.id}
              onClick={() => openViewer(photo)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm group"
            >
              <img src={photo.thumb} alt={photo.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {viewer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                {viewer.loading
                  ? <span className="animate-spin inline-block w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full" />
                  : <img src={viewer.fullUrl ?? viewer.photo.thumb} alt={viewer.photo.name} className="w-full h-full object-contain" />
                }
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <p className="text-[10px] text-gray-400 font-bold truncate">
                  {new Date(viewer.photo.uploadedAt).toLocaleDateString('it-IT')} · {fmtFileSize(viewer.photo.size)}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(viewer.photo.id)}
                    disabled={deletingId === viewer.photo.id}
                    className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {deletingId === viewer.photo.id
                      ? <span className="animate-spin inline-block w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                      : <Trash2 size={12} />
                    }
                  </button>
                  <button onClick={() => setViewer(null)} className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-gray-100 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

interface ContactsViewProps {
  initialSearch?: string;
  onClearFilter?: () => void;
  selectedContactId?: string | null;
  onClearSelectedContact?: () => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ initialSearch = '', onClearFilter, selectedContactId, onClearSelectedContact }) => {
  const { contacts, addContact, updateContact, deleteContact, deleteAllContacts, addContactsBatch, deals, activities } = useStore();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detailContact, setDetailContact] = useState<any>(null);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [addDealForContact, setAddDealForContact] = useState<string | null>(null);
  const [pendingDeleteAll, setPendingDeleteAll] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'clienti' | 'prospect'>('clienti');
  const [segmentFilter, setSegmentFilter] = useState<ContactSegment | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);

  // Debounce ricerca — evita filter su ogni keystroke con 9k+ contatti
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setVisibleCount(50); }, 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Badge counts — memoizzati per evitare iterazione completa ad ogni render
  const clientiCount  = useMemo(() => Object.values(contacts).filter(c => c.status === 'cliente').length,   [contacts]);
  const prospectCount = useMemo(() => Object.values(contacts).filter(c => c.status === 'potenziale').length, [contacts]);

  // Lista filtrata completa — memoizzata
  const filteredList = useMemo(() => {
    const statusFilter = activeTab === 'prospect' ? 'potenziale' : 'cliente';
    return Object.values(contacts)
      .filter(c => c.status === statusFilter)
      .filter(c => !segmentFilter || c.segment === segmentFilter)
      .filter(c => matchSearch(debouncedSearch, [
        c.company, c.contactName, c.city, c.province, c.email, c.phone, c.vatNumber, c.address,
      ]));
  }, [contacts, activeTab, segmentFilter, debouncedSearch]);

  // Reset paginazione quando cambia lista
  useEffect(() => { setVisibleCount(50); }, [filteredList]);
  const fileInputRefProspect = useRef<HTMLInputElement>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { result: aiResult, loading: aiLoading, error: aiError, run: aiRun, reset: aiReset } = useClaudeAI();

  useEffect(() => {
    if (initialSearch) setSearchTerm(initialSearch);
  }, [initialSearch]);


  const handleGeocode = async () => {
    if (!editingContact) return;
    setGeoLoading(true);
    setGeoStatus('idle');
    try {
      const params = new URLSearchParams();
      if (editingContact.city) params.set('city', editingContact.city);
      if (editingContact.province) params.set('province', editingContact.province);
      if (editingContact.address) params.set('address', editingContact.address);
      const res = await fetch(`/api/geocode?${params}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const jitter = () => (Math.random() - 0.5) * 0.004;
        const lat = parseFloat(data[0].lat) + jitter();
        const lng = parseFloat(data[0].lon) + jitter();
        setEditingContact((prev: any) => ({ ...prev, lat, lng }));
        if (contacts[editingContact.id]) updateContact(editingContact.id, { lat, lng });
        setGeoStatus('ok');
      } else {
        setGeoStatus('error');
      }
    } catch {
      setGeoStatus('error');
    } finally {
      setGeoLoading(false);
    }
  };

  const openDetail = (contact?: Contact | any) => {
    setGeoStatus('idle');
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

  // Parser CSV che gestisce campi tra virgolette, separatori multipli, \r\n e BOM
  const parseCSVLine = (line: string, sep: string): string[] => {
    const result: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (line.slice(i, i + sep.length) === sep) {
          result.push(field.trim());
          field = '';
          i += sep.length - 1;
        } else {
          field += ch;
        }
      }
    }
    result.push(field.trim());
    console.log('🎉 PARSECSV COMPLETED:', result.length, 'contatti');
    return result;
  };

  // Divide il CSV in record rispettando campi tra virgolette che contengono newline
  const splitCSVRecords = (text: string): string[] => {
    const records: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; current += ch; }
      } else if (ch === '\n' && !inQuotes) {
        if (current.trim()) records.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) records.push(current);
    return records;
  };

  const classifySegment = (industry: string = '', company: string = ''): ContactSegment => {
    const text = ((industry || '') + ' ' + (company || '')).toLowerCase();
    if (text.match(/rivendit|ferramenta|hardware|magazzin|distribu|consorz|agrario|edile|negozio|shop/)) return 'dealer';
    if (text.match(/costruz|edil|cantier|impresa|carpentr|murature|edilizia/)) return 'edilizia';
    return 'industria';
  };

  const parseCSVContacts = (text: string, fallbackStatus: 'potenziale' | 'cliente'): Contact[] => {
    // Rimuovi BOM e normalizza line endings
    const cleaned = text.replace(/\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = splitCSVRecords(cleaned);
    if (lines.length < 2) return [];

    // ─── Rileva il separatore ───
    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes('\t')) separator = '\t';
    else if (firstLine.includes('|')) separator = '|';
    else if (firstLine.includes(';') && (firstLine.split(';').length > firstLine.split(',').length)) separator = ';';

    const headerLine = parseCSVLine(lines[0], separator).map(h => h.toLowerCase().replace(/["""'']/g, ''));

    // ─── findColumn: itera keywords in priorità, non colonne ───
    // In questo modo il primo keyword più specifico vince sempre.
    const findColumn = (keywords: string[]): number => {
      for (const kw of keywords) {
        const idx = headerLine.findIndex(h => h.includes(kw.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // Trova TUTTE le colonne che matchano almeno un keyword (escluse quelle con excludes)
    const findAllColumns = (includes: string[], excludes: string[] = []): number[] => {
      const results: number[] = [];
      headerLine.forEach((h, i) => {
        const matched = includes.some(kw => h.includes(kw.toLowerCase()));
        const excluded = excludes.some(kw => h.includes(kw.toLowerCase()));
        if (matched && !excluded) results.push(i);
      });
      return results;
    };

    // Mapping colonne — keywords in ordine di specificità (più specifico prima)
    const col: Record<string, number> = {
      company:     findColumn(['aziende', 'ragione sociale', 'nome azienda', 'company name', 'azienda', 'company', 'organizzazione', 'organization', 'name']),
      status:      findColumn(['stato azienda', 'stato cliente', 'stato', 'status', 'tipo cliente', 'tipologia', 'ruolo']),
      contactName: findColumn(['referente', 'contatto principale', 'nome contatto', 'contatto', 'contact name', 'contact', 'person']),
      role:        findColumn(['ruolo', 'qualifica', 'posizione', 'role', 'title', 'job']),
      phone:       findColumn(['numero di telefono', 'telefono fisso', 'telefono 1', 'telefono', 'telefoni', 'phone', 'tel ']),
      mobile:      findColumn(['cellulare', 'mobile', 'cell', 'telefono 2']),
      website:     findColumn(['web', 'sito web', 'website', 'url', 'sito']),
      address:     findColumn(['indirizzo', 'address', 'via ', 'strada', 'street']),
      city:        findColumn(['citt', 'city', 'comune', 'località']),
      province:    findColumn(['provincia', 'province', 'prov']),
      zipCode:     findColumn(['codice postale', 'cap', 'zip', 'postal']),
      sector:      findColumn(['settore', 'sector', 'industria', 'attività', 'categoria']),
      notes:       findColumn(['commenti', 'note', 'notes', 'comments', 'osservazioni']),
    };

    // Tutte le colonne email (info, vendite, direzione, tecnico, ecc.) escludendo i flag "verificate"
    const emailCols = findAllColumns(['email', 'e-mail', 'mail', 'posta'], ['verificat']);

    const get = (row: string[], key: string): string =>
      col[key] >= 0 ? (row[col[key]] ?? '').trim() : '';

    // Prima email non vuota tra tutte le colonne email trovate
    const getEmail = (row: string[]): string =>
      emailCols.map(i => (row[i] ?? '').trim()).find(v => v) ?? '';

    const parseStatus = (raw: string): 'potenziale' | 'cliente' => {
      const v = raw.toLowerCase().trim();
      if (v.includes('client') || v.includes('enduser') || v === 'attivo' || v === 'active') return 'cliente';
      if (v.includes('potenzial') || v.includes('prospect') || v.includes('lead')) return 'potenziale';
      return fallbackStatus;
    };

    const result: Contact[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line, separator);

      // Fallback: se nessuna colonna company trovata, usa la prima colonna
      const company = col['company'] >= 0 ? values[col['company']] || '' : values[0] || '';
      if (!company) continue;

      // Telefono: preferisce 'phone', poi 'mobile'; prende solo il primo numero se ce ne sono più
      const rawPhone = get(values, 'phone') || get(values, 'mobile');
      const phone = rawPhone.split(',')[0].trim();

      // Status: dalla colonna CSV se disponibile, altrimenti fallbackStatus
      const statusRaw = get(values, 'status');
      const contactStatus = statusRaw ? parseStatus(statusRaw) : fallbackStatus;

      const sectorVal = get(values, 'sector');
      result.push({
        id: `c_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
        company,
        contactName: get(values, 'contactName'),
        role:        get(values, 'role'),
        email:       getEmail(values),
        phone,
        website:     get(values, 'website'),
        address:     get(values, 'address'),
        city:        get(values, 'city'),
        province:    get(values, 'province'),
        zipCode:     get(values, 'zipCode'),
        region:      get(values, 'province'),
        sector:      sectorVal,
        segment:     classifySegment(sectorVal, company),
        notes:       get(values, 'notes'),
        status:      contactStatus,
        country:     'Italia',
        createdAt:   Date.now(),
        updatedAt:   Date.now(),
      });
    }
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, status: 'potenziale' | 'cliente' = 'potenziale') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    console.log('📥 FILE CARICATO:', file.name, file.size, 'bytes', isExcel ? '(Excel)' : '(CSV)');
    const reader = new FileReader();
    const processText = (text: string) => {
      console.log('📄 CSV TEXT (first 500 chars):', text.substring(0, 500));
      const newContacts = parseCSVContacts(text, status);
      console.log('✅ CONTATTI PARSATI:', newContacts.length);
      console.log('📋 SAMPLE CONTATTI:', newContacts.slice(0, 3).map(c => ({
        company: c.company,
        address: c.address,
        city: c.city,
        phone: c.phone,
        status: c.status
      })));
      if (newContacts.length > 0) {
        addContactsBatch(newContacts);
        console.log('✨ CONTATTI AGGIUNTI NELLO STORE (mantenuti i precedenti)');
      } else {
        console.warn('⚠️ NESSUN CONTATTO PARSATO!');
      }
      if (fileInputRef.current)         fileInputRef.current.value = '';
      if (fileInputRefProspect.current) fileInputRefProspect.current.value = '';
    };
    if (isExcel) {
      reader.onload = (event) => {
        const wb = XLSX.read(event.target?.result, { type: 'array' });
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
        processText(csv);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => processText(event.target?.result as string);
      reader.readAsText(file);
    }
  };

  const geocodeOne = async (city?: string, province?: string, address?: string) => {
    if (!city && !province && !address) return null;
    try {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (province) params.set('province', province);
      if (address) params.set('address', address);
      const res = await fetch(`/api/geocode?${params}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const jitter = () => (Math.random() - 0.5) * 0.004;
        return { lat: parseFloat(data[0].lat) + jitter(), lng: parseFloat(data[0].lon) + jitter() };
      }
    } catch {
      // geocoding silenzioso — non blocca il salvataggio
    }
    return null;
  };

  const handleSave = async () => {
    if (!editingContact?.company) return alert('Inserisci la ragione sociale');
    const isNew = !contacts[editingContact.id];
    if (isNew) {
      addContact(editingContact as Contact);
    } else {
      updateContact(editingContact.id, editingContact);
    }
    setDetailContact(null);

    const contactId = editingContact.id;
    const updates: Record<string, any> = {};

    // Geocodifica automatica solo per nuovi clienti con almeno città o indirizzo
    if (isNew && (editingContact.city || editingContact.province || editingContact.address)) {
      const coords = await geocodeOne(editingContact.city, editingContact.province, editingContact.address);
      if (coords) Object.assign(updates, coords);
    }

    // Geocodifica automatica delle sedi aggiuntive che non hanno ancora coordinate
    const locations: any[] = editingContact.locations || [];
    const toGeocode = locations.filter(l => (l.city || l.province || l.address) && !(l.lat && l.lng));
    if (toGeocode.length > 0) {
      const geocoded = await Promise.all(
        toGeocode.map(l => geocodeOne(l.city, l.province, l.address))
      );
      const newLocations = locations.map(l => {
        const idx = toGeocode.findIndex(t => t.id === l.id);
        if (idx === -1) return l;
        const coords = geocoded[idx];
        return coords ? { ...l, ...coords } : l;
      });
      updates.locations = newLocations;
    }

    if (Object.keys(updates).length > 0) {
      updateContact(contactId, updates);
    }
  };


  // ── Storico Clienti sub-page ──
  if (historyContact) {
    return (
      <ContactHistoryView
        contact={historyContact}
        onBack={() => setHistoryContact(null)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">

      {detailContact !== null ? (
        // FULL SCREEN DETAIL
        <div className="min-h-screen -m-4 md:-m-8 bg-gray-50 dark:bg-gray-900">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 md:px-8 py-4 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setDetailContact(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 flex-shrink-0"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="min-w-0">
                  <h2 className="font-black text-lg dark:text-white uppercase tracking-tight truncate">
                    {editingContact?.company || 'Nuova Azienda'}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scheda Azienda</p>
                </div>
              </div>
              <button
                onClick={handleSave}
                className="flex-shrink-0 bg-indigo-600 text-white px-5 sm:px-6 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-colors"
              >
                Salva
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {editingContact?.id && contacts[editingContact.id] && (
                <button
                  onClick={() => setHistoryContact(contacts[editingContact.id])}
                  className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-3 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-100 transition-colors"
                >
                  <History size={14} /> <span className="hidden sm:inline">Storico</span>
                </button>
              )}
              {editingContact?.id && contacts[editingContact.id] && (
                <button
                  onClick={() => {
                    const contactDeals = Object.values(deals)
                      .filter(d => d.contactId === editingContact.id && !['chiuso-vinto','chiuso-perso'].includes(d.stage))
                      .map(d => ({
                        stage: d.stage,
                        value: d.value,
                        nextAction: d.nextAction,
                        notes: d.notes,
                      }));
                    const { activities } = useStore.getState();
                    const recentActivities = Object.values(activities)
                      .filter(a => a.contactId === editingContact.id)
                      .sort((a, b) => b.date - a.date)
                      .slice(0, 5)
                      .map(a => ({
                        type: a.type,
                        date: new Date(a.date).toLocaleDateString('it-IT'),
                        outcome: a.outcome,
                        notes: a.notes,
                      }));
                    setShowAiPanel(true);
                    aiRun('prepara-visita', {
                      company: editingContact.company,
                      sector: editingContact.sector || '',
                      customerType: editingContact.customerType,
                      region: editingContact.region,
                      intelligence: editingContact.intelligence,
                      stakeholders: editingContact.stakeholders,
                      openDeals: contactDeals,
                      recentActivities,
                    });
                  }}
                  className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-3 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-100 transition-colors"
                >
                  <Sparkles size={14} /> <span className="hidden sm:inline">Prepara Visita</span>
                </button>
              )}
              {/* Bottone sincronizzazione mappa — visibile se mancano le coordinate */}
              {!(editingContact?.lat && editingContact?.lng) && (editingContact?.city || editingContact?.address) && (
                <button
                  onClick={handleGeocode}
                  disabled={geoLoading}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors border ${
                    geoStatus === 'ok'
                      ? 'bg-green-50 border-green-200 text-green-600'
                      : geoStatus === 'error'
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                  } disabled:opacity-60`}
                >
                  <MapPin size={14} className={geoLoading ? 'animate-bounce' : ''} />
                  <span className="hidden sm:inline">
                    {geoLoading ? 'Ricerca…' : geoStatus === 'ok' ? 'Posizionato!' : geoStatus === 'error' ? 'Non trovato' : 'Posiziona su Mappa'}
                  </span>
                </button>
              )}
              {(editingContact?.lat && editingContact?.lng) && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] font-black text-green-500 uppercase tracking-widest">
                  <MapPin size={11} /> In mappa
                </span>
              )}
              <button
                onClick={() => setConfirmDeleteId(editingContact?.id ?? null)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-black uppercase text-xs tracking-widest transition-colors"
              >
                <Trash2 size={13} /> Elimina
              </button>
            </div>
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
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Settore di Riferimento</label>
                  <select className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none" value={editingContact?.sector || ''} onChange={e => setEditingContact({...editingContact, sector: e.target.value})}>
                    <option value="">— Seleziona settore —</option>
                    <option value="Edilizia">Edilizia / Costruzioni</option>
                    <option value="Industria">Industria / Manifattura</option>
                    <option value="Idraulica">Idraulica / Termoidraulica</option>
                    <option value="Elettricista">Elettricista / Impianti Elettrici</option>
                    <option value="Ferramenta">Ferramenta / Antinfortunistica</option>
                    <option value="Trasporti e logistica">Trasporti e Logistica</option>
                    <option value="Agricoltura">Agricoltura / Forestale</option>
                    <option value="Servizi">Servizi</option>
                    <option value="Energia e utilities">Energia e Utilities</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Partita IVA</label>
                  <input type="text" className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all font-mono" placeholder="es. 01234567890" value={editingContact?.vatNumber || ''} onChange={e => setEditingContact({...editingContact, vatNumber: e.target.value})} />
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

            {/* SEZIONE 1A-BIS - Sedi Aggiuntive */}
            {(() => {
              const locations: any[] = editingContact?.locations || [];
              const inputCls = "w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all text-sm";
              const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1";

              const updateLocation = (id: string, field: string, val: string) => {
                setEditingContact({ ...editingContact, locations: locations.map(l => l.id === id ? { ...l, [field]: val } : l) });
              };
              const addLocation = () => {
                setEditingContact({ ...editingContact, locations: [...locations, { id: `loc_${Date.now()}`, label: '', address: '', city: '', zipCode: '', province: '', country: 'IT' }] });
              };
              const removeLocation = (id: string) => {
                setEditingContact({ ...editingContact, locations: locations.filter(l => l.id !== id) });
              };

              return (
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MapPin size={16}/> Sedi Aggiuntive
                  </h3>
                  <div className="space-y-4">
                    {locations.map(l => (
                      <div key={l.id} className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border-2 border-gray-100 dark:border-gray-700 relative">
                        <button onClick={() => removeLocation(l.id)} className="absolute top-4 right-4 p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={14} />
                        </button>
                        <div className="mb-3">
                          <label className={labelCls}>Nome Sede</label>
                          <input type="text" className={inputCls} placeholder="es. Negozio Milano, Filiale Nord…" value={l.label || ''} onChange={e => updateLocation(l.id, 'label', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-12 md:col-span-6">
                            <label className={labelCls}>Indirizzo</label>
                            <input type="text" className={inputCls} value={l.address || ''} onChange={e => updateLocation(l.id, 'address', e.target.value)} />
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <label className={labelCls}>CAP</label>
                            <input type="text" className={inputCls} value={l.zipCode || ''} onChange={e => updateLocation(l.id, 'zipCode', e.target.value)} />
                          </div>
                          <div className="col-span-5 md:col-span-3">
                            <label className={labelCls}>Città</label>
                            <input type="text" className={inputCls} value={l.city || ''} onChange={e => updateLocation(l.id, 'city', e.target.value)} />
                          </div>
                          <div className="col-span-3 md:col-span-1">
                            <label className={labelCls}>Prov.</label>
                            <input type="text" className={inputCls} value={l.province || ''} onChange={e => updateLocation(l.id, 'province', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button onClick={addLocation} className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-xs font-black text-gray-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
                      <Plus size={14} /> Aggiungi Sede
                    </button>
                  </div>
                </section>
              );
            })()}

            {/* SEZIONE 1B - Persone di Riferimento */}
            {(() => {
              const allSh: typeof editingContact.stakeholders = editingContact?.stakeholders || [];
              const titolare = allSh.find((s: any) => s.role === 'Titolare');
              const altre = allSh.filter((s: any) => s.role !== 'Titolare');

              const setTitolare = (field: string, val: string) => {
                if (titolare) {
                  setEditingContact({ ...editingContact, stakeholders: allSh.map((s: any) => s.role === 'Titolare' ? { ...s, [field]: val } : s) });
                } else {
                  setEditingContact({ ...editingContact, stakeholders: [{ id: `sh_titolare_${Date.now()}`, role: 'Titolare', firstName: '', lastName: '', email: '', phone: '', [field]: val }, ...altre] });
                }
              };

              const updateAltra = (id: string, field: string, val: string) => {
                setEditingContact({ ...editingContact, stakeholders: allSh.map((s: any) => s.id === id ? { ...s, [field]: val } : s) });
              };

              const addAltra = () => {
                const titItem = titolare ? [titolare] : [];
                setEditingContact({ ...editingContact, stakeholders: [...titItem, ...altre, { id: `sh_${Date.now()}`, role: '', firstName: '', lastName: '', email: '', phone: '' }] });
              };

              const removeAltra = (id: string) => {
                setEditingContact({ ...editingContact, stakeholders: allSh.filter((s: any) => s.id !== id) });
              };

              const inputCls = "w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-all text-sm";
              const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1";

              return (
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users size={16}/> 1b. Persone di Riferimento
                  </h3>
                  <div className="space-y-4">
                    {/* Titolare */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border-2 border-indigo-100 dark:border-indigo-900/40">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Titolare</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Nome</label>
                          <input type="text" className={inputCls} placeholder="Nome" value={titolare?.firstName || ''} onChange={e => setTitolare('firstName', e.target.value)} />
                        </div>
                        <div>
                          <label className={labelCls}>Cognome</label>
                          <input type="text" className={inputCls} placeholder="Cognome" value={titolare?.lastName || ''} onChange={e => setTitolare('lastName', e.target.value)} />
                        </div>
                        <div>
                          <label className={labelCls}>Email</label>
                          <input type="email" className={inputCls} placeholder="email@azienda.it" value={titolare?.email || ''} onChange={e => setTitolare('email', e.target.value)} />
                        </div>
                        <div>
                          <label className={labelCls}>Cellulare</label>
                          <input type="tel" className={inputCls} placeholder="+39 333 000 0000" value={titolare?.phone || ''} onChange={e => setTitolare('phone', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Altre figure */}
                    {altre.map((s: any) => (
                      <div key={s.id} className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border-2 border-gray-100 dark:border-gray-700 relative">
                        <button onClick={() => removeAltra(s.id)} className="absolute top-4 right-4 p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={14} />
                        </button>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Figura di Riferimento</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Nome</label>
                            <input type="text" className={inputCls} placeholder="Nome" value={s.firstName || ''} onChange={e => updateAltra(s.id, 'firstName', e.target.value)} />
                          </div>
                          <div>
                            <label className={labelCls}>Cognome</label>
                            <input type="text" className={inputCls} placeholder="Cognome" value={s.lastName || ''} onChange={e => updateAltra(s.id, 'lastName', e.target.value)} />
                          </div>
                          <div>
                            <label className={labelCls}>Email</label>
                            <input type="email" className={inputCls} placeholder="email@azienda.it" value={s.email || ''} onChange={e => updateAltra(s.id, 'email', e.target.value)} />
                          </div>
                          <div>
                            <label className={labelCls}>Cellulare</label>
                            <input type="tel" className={inputCls} placeholder="+39 333 000 0000" value={s.phone || ''} onChange={e => updateAltra(s.id, 'phone', e.target.value)} />
                          </div>
                          <div className="col-span-2">
                            <label className={labelCls}>Ruolo in Azienda</label>
                            <input type="text" className={inputCls} placeholder="es. Responsabile Acquisti, Ufficio Tecnico…" value={s.role || ''} onChange={e => updateAltra(s.id, 'role', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button onClick={addAltra} className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-xs font-black text-gray-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
                      <Plus size={14} /> Aggiungi Figura di Riferimento
                    </button>
                  </div>
                </section>
              );
            })()}

            {/* SEZIONE 2 - Profilazione Blaklader (collassabile) */}
            {editingContact?.id && contacts[editingContact.id] && (
              <ProfilingCollapsible contact={contacts[editingContact.id]} />
            )}

            {/* SEZIONE 5 - Programma Attività (solo in modifica) */}
            {editingContact?.id && contacts[editingContact.id] && (
              <InlineProgrammaSection contactId={editingContact.id} />
            )}

            {/* SEZIONE 5B - Customer Interaction Score (solo in modifica) */}
            {editingContact?.id && contacts[editingContact.id] && (() => {
              const contactActivities = Object.values(activities).filter(a => a.contactId === editingContact.id);
              const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
              const recent90 = contactActivities.filter(a => (a.date || 0) >= cutoff90);
              const lastActivity = contactActivities.length > 0
                ? Math.max(...contactActivities.map(a => a.date || 0)) : null;
              const isSilent = !lastActivity || lastActivity < cutoff90;
              const activityTypes = recent90.reduce((acc, a) => {
                acc[a.type] = (acc[a.type] || 0) + 1; return acc;
              }, {} as Record<string, number>);
              return (
                <section className={`rounded-3xl p-4 border-2 ${isSilent ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800' : 'border-green-100 bg-green-50 dark:bg-green-900/10 dark:border-green-800'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={16} className={isSilent ? 'text-orange-500' : 'text-green-500'} />
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Interaction Score</h3>
                    {isSilent && <span className="text-[9px] font-black bg-orange-200 text-orange-700 px-2 py-0.5 rounded-full uppercase">SILENTE</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-black dark:text-white">{recent90.length}</p>
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Attività 90gg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black dark:text-white">{contactActivities.length}</p>
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Totali</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black dark:text-white">
                        {lastActivity ? `${Math.floor((Date.now() - lastActivity) / (24 * 60 * 60 * 1000))}gg fa` : '—'}
                      </p>
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Ultima att.</p>
                    </div>
                  </div>
                  {Object.keys(activityTypes).length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {Object.entries(activityTypes).map(([type, count]) => (
                        <span key={type} className="text-[9px] font-black bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg uppercase">
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              );
            })()}

            {/* SEZIONE 6 - Deal Aperti (solo in modifica) */}
            {editingContact?.id && contacts[editingContact.id] && (() => {
              const contactDeals = Object.values(deals).filter(
                d => d.contactId === editingContact.id && !['chiuso-vinto', 'chiuso-perso'].includes(d.stage)
              );
              const stageBadge: Record<string, string> = {
                lead: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
                qualificato: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
                proposta: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
                negoziazione: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
              };
              const stageLabels: Record<string, string> = { lead: 'Lead', qualificato: 'Qualificato', proposta: 'Proposta', negoziazione: 'Trattativa' };
              return (
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp size={16}/> 6. Deal Aperti
                    <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-black">{contactDeals.length}</span>
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Opportunità aperte</span>
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
                        {contactDeals.map(deal => {
                          const isPastClosing = deal.closingDate && deal.closingDate < Date.now();
                          const daysToClose = deal.closingDate ? Math.ceil((deal.closingDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                          return (
                            <div key={deal.id} className={`rounded-2xl p-3 flex items-center gap-2 ${isPastClosing ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-900'}`}>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${stageBadge[deal.stage] || 'bg-gray-100 text-gray-600'}`}>
                                {stageLabels[deal.stage] || deal.stage}
                              </span>
                              <span className="font-bold text-xs text-indigo-600">€{deal.value.toLocaleString('it-IT')}</span>
                              {deal.closingDate && (
                                <span className={`text-[9px] font-black ml-auto flex-shrink-0 ${isPastClosing ? 'text-red-500' : daysToClose && daysToClose <= 7 ? 'text-orange-500' : 'text-gray-400'}`}>
                                  {isPastClosing ? `Scaduto ${Math.abs(daysToClose!)}gg fa` : `Chiusura: ${new Date(deal.closingDate).toLocaleDateString('it-IT')}`}
                                </span>
                              )}
                              {deal.nextAction && !deal.closingDate && (
                                <span className="text-[10px] text-gray-500 truncate flex-1">{deal.nextAction}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* SEZIONE 7 - Offerte (solo in modifica) */}
            {editingContact?.id && contacts[editingContact.id] && (
              <InlineOfferSection contactId={editingContact.id} />
            )}

            {/* SEZIONE 8 - Business Intelligence (solo in modifica) */}
            {editingContact?.id && contacts[editingContact.id] && (
              <InlineBiSection contactId={editingContact.id} />
            )}

            {/* SEZIONE 9 - Foto Punto Vendita / Assortimento (solo in modifica) */}
            {editingContact?.id && contacts[editingContact.id] && (
              <InlinePhotoSection contactId={editingContact.id} />
            )}

          </div>
        </div>
      ) : (
        // LIST VIEW
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Clienti</h1>
              <div className="flex gap-2 mt-2 flex-wrap">
                {searchTerm && initialSearch && (
                  <button onClick={() => { setSearchTerm(''); onClearFilter?.(); }}
                    className="flex items-center gap-1 text-indigo-600 font-black uppercase text-[10px] tracking-widest bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors">
                    Filtro Mappa: {searchTerm} <X size={12} />
                  </button>
                )}
                {Object.values(contacts).length > 0 && (
                  <button onClick={() => setPendingDeleteAll(true)}
                    className="flex items-center gap-1 text-red-600 font-black uppercase text-[10px] tracking-widest bg-red-50 px-2 py-1 rounded-md hover:bg-red-100 transition-colors">
                    <Trash2 size={12} /> Pulisci DB
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
            <button onClick={() => setActiveTab('clienti')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${activeTab === 'clienti' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <Users size={16} />
              Clienti
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-2 py-0.5 rounded-full font-black">
                {clientiCount}
              </span>
            </button>
            <button onClick={() => setActiveTab('prospect')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${activeTab === 'prospect' ? 'bg-white dark:bg-gray-700 shadow text-amber-500' : 'text-gray-500 hover:text-gray-700'}`}>
              <UserPlus size={16} />
              Prospect
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full font-black">
                {prospectCount}
              </span>
            </button>
          </div>

          {/* Search + actions */}
          {(() => {
            const isProspect = activeTab === 'prospect';
            const statusFilter = isProspect ? 'potenziale' : 'cliente';
            const csvRef    = isProspect ? fileInputRefProspect : fileInputRef;
            const accentCls = isProspect ? 'text-amber-500 border-amber-100 hover:bg-amber-50' : 'text-indigo-600 border-indigo-100 hover:bg-indigo-50';
            const btnCls    = isProspect ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700';

            const list = filteredList;

            const searchPreview = searchTerm.trim()
              ? Object.values(contacts)
                  .filter(c => c.status === statusFilter)
                  .filter(c => matchSearch(searchTerm, [
                    c.company, c.contactName, c.city, c.province, c.email, c.phone, c.vatNumber, c.address,
                  ]))
                  .slice(0, 8)
              : [];

            return (
              <>
                <div className="flex flex-col md:flex-row gap-3">
                  <SearchDropdown
                    className="flex-1"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    onSelect={c => setSearchTerm(c.company || c.contactName)}
                    placeholder={`Cerca ${isProspect ? 'prospect' : 'cliente'} per nome, azienda, città, email, telefono…`}
                    inputWrapperClassName={() => 'flex items-center gap-2 pl-4 pr-4 py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold outline-none focus-within:border-indigo-400 transition-all shadow-sm text-sm'}
                    results={searchPreview.map(c => ({
                      key: c.id,
                      item: c,
                      label: c.company || c.contactName,
                      sublabel: [c.company && c.contactName, c.city].filter(Boolean).join(' · ') || undefined,
                      badge: {
                        text: c.status === 'cliente' ? 'Cliente' : 'Prospect',
                        className: c.status === 'cliente'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                      },
                    }))}
                  />

                  {/* CSV input — clienti */}
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef}
                    onChange={e => handleFileUpload(e, 'cliente')} />
                  {/* CSV input — prospect */}
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRefProspect}
                    onChange={e => handleFileUpload(e, 'potenziale')} />

                  <button onClick={() => csvRef.current?.click()}
                    className={`bg-white dark:bg-gray-800 border-2 dark:border-gray-700 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all text-sm ${accentCls}`}>
                    <Upload size={18} /> <span className="hidden md:inline">Importa CSV</span>
                  </button>
                  <button onClick={() => setShowImportModal(true)}
                    className={`bg-white dark:bg-gray-800 border-2 dark:border-gray-700 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all text-sm ${accentCls}`}
                    title="Crea contatto da sito web">
                    <Link size={18} /> <span className="hidden md:inline">Da URL</span>
                  </button>
                  <button onClick={() => {
                    const newContact = {
                      id: `c_${Date.now()}`,
                      company: '', customerType: 'end-user',
                      status: statusFilter,
                      stakeholders: [],
                      intelligence: { products: [], competitors: [], pricesAndPayments: '', logisticsAndService: '' }
                    };
                    setDetailContact(newContact);
                    setEditingContact(newContact);
                  }}
                    className={`text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-sm ${btnCls}`}>
                    <Plus size={18} /> {isProspect ? 'Nuovo Prospect' : 'Nuovo Cliente'}
                  </button>
                </div>

                {/* Filtri Segment */}
                {!isProspect && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSegmentFilter(null)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                        segmentFilter === null
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      Tutti ({Object.values(contacts).filter(c => c.status === statusFilter).length})
                    </button>
                    {([
                      { key: 'dealer',    label: '🏪 Dealer' },
                      { key: 'industria', label: '🏭 Industria' },
                      { key: 'edilizia',  label: '🏗️ Edilizia' },
                      { key: 'end-user',  label: '👤 End User' },
                    ] as const).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setSegmentFilter(key)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                          segmentFilter === key
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {label} ({Object.values(contacts).filter(c => c.status === statusFilter && c.segment === key).length})
                      </button>
                    ))}
                  </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.length === 0 ? (
                    <div className="col-span-3 bg-white dark:bg-gray-800 rounded-[2.5rem] py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-700">
                      {isProspect ? <UserPlus size={44} className="mx-auto mb-4 text-amber-200" /> : <Users size={44} className="mx-auto mb-4 text-indigo-200" />}
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
                        Nessun {isProspect ? 'prospect' : 'cliente'} trovato
                      </p>
                      <p className="text-gray-300 text-xs mt-1">Importa un CSV o aggiungi manualmente</p>
                    </div>
                  ) : list.slice(0, visibleCount).map(contact => (
                    <div key={contact.id} onClick={() => openDetail(contact)}
                      className={`bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border-2 transition-all cursor-pointer ${
                        isProspect
                          ? 'border-amber-100 dark:border-amber-900/30 hover:border-amber-300'
                          : 'border-gray-100 dark:border-gray-700 hover:border-indigo-200'
                      }`}>

                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${isProspect ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'}`}>
                            {isProspect ? <UserPlus size={22} /> : <Building2 size={22} />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black dark:text-white uppercase leading-tight truncate">{contact.company}</h3>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              (contact as any).customerType === 'dealer' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {(contact as any).customerType === 'dealer' ? 'Dealer' : 'End User'}
                            </span>
                          </div>
                        </div>

                        <button onClick={e => { e.stopPropagation(); if (window.confirm(`Elimina ${contact.company}?`)) deleteContact(contact.id); }}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex-shrink-0">
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <p className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                          <MapPin size={13} className="text-gray-300 flex-shrink-0" />
                          {contact.city || 'Città non inserita'} {(contact as any).province ? `(${(contact as any).province})` : ''}
                        </p>
                        <p className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                          <Phone size={13} className="text-gray-300 flex-shrink-0" />
                          {contact.phone || 'Nessun telefono'}
                        </p>
                        {(contact as any).stakeholders?.length > 0 && (
                          <p className={`flex items-center gap-1.5 text-xs font-bold w-max px-2 py-1 rounded-lg mt-2 ${isProspect ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'}`}>
                            <Users size={13} /> {(contact as any).stakeholders.length} Referent{(contact as any).stakeholders.length === 1 ? 'e' : 'i'}
                          </p>
                        )}
                      </div>

                      {/* Azioni footer card */}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); setHistoryContact(contact); }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-black uppercase tracking-wide hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all"
                        >
                          <History size={13} /> Storico
                        </button>
                        {isProspect && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (window.confirm(`Converti "${contact.company}" in Cliente?`)) {
                                updateContact(contact.id, { status: 'cliente' });
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-xs font-black uppercase tracking-wide hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            <Users size={13} /> Converti
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginazione */}
                {list.length > visibleCount && (
                  <div className="flex flex-col items-center gap-2 pt-2 pb-6">
                    <p className="text-xs text-gray-400">
                      Mostrati <strong>{visibleCount}</strong> di <strong>{list.length}</strong>
                    </p>
                    <button
                      onClick={() => setVisibleCount(v => v + 50)}
                      className="px-6 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-black text-gray-500 dark:text-gray-300 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                    >
                      Carica altri 50
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* AddDeal Modal */}
      {addDealForContact && (
        <AddDealModal
          initialContactId={addDealForContact}
          onClose={() => setAddDealForContact(null)}
        />
      )}

      {/* DeviceAuth — Pulisci DB */}
      {pendingDeleteAll && (
        <DeviceAuthModal
          title="Elimina tutti i contatti"
          description={`Stai per eliminare ${Object.values(contacts).length} contatti dal database. Questa azione non è reversibile.`}
          onConfirm={() => { deleteAllContacts(); setPendingDeleteAll(false); }}
          onCancel={() => setPendingDeleteAll(false)}
        />
      )}

      {/* AI Panel — Prepara Visita */}
      {showAiPanel && (
        <AiPanel
          title="Prepara Visita"
          subtitle={editingContact?.company}
          loading={aiLoading}
          result={aiResult}
          error={aiError}
          onClose={() => { setShowAiPanel(false); aiReset(); }}
          onRetry={() => {
            const contactDeals = Object.values(deals)
              .filter(d => d.contactId === editingContact?.id && !['chiuso-vinto','chiuso-perso'].includes(d.stage))
              .map(d => ({ stage: d.stage, value: d.value, nextAction: d.nextAction, notes: d.notes }));
            aiRun('prepara-visita', {
              company: editingContact?.company,
              sector: editingContact?.sector || '',
              customerType: editingContact?.customerType,
              region: editingContact?.region,
              intelligence: editingContact?.intelligence,
              stakeholders: editingContact?.stakeholders,
              openDeals: contactDeals,
              recentActivities: [],
            });
          }}
        />
      )}

      {/* Modal conferma eliminazione singolo contatto */}
      {confirmDeleteId && (() => {
        const c = contacts[confirmDeleteId];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
              <div className="flex items-center gap-3 mb-3">
                <Trash2 size={20} className="text-red-500 shrink-0" />
                <h4 className="font-black text-gray-800 dark:text-white">Elimina contatto</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                Stai per eliminare <strong>{c?.company}</strong>.
              </p>
              <p className="text-xs text-red-500 mb-5">Questa azione non è reversibile.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    deleteContact(confirmDeleteId);
                    setConfirmDeleteId(null);
                    setEditingContact(null);
                  }}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl"
                >
                  Sì, elimina
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Import da URL */}
      {showImportModal && (
        <ImportFromUrlModal
          onClose={() => setShowImportModal(false)}
          onImport={scraped => {
            const now = Date.now();
            const newContact = {
              id: `c_${now}`,
              company: scraped.company,
              customerType: 'end-user',
              status: 'potenziale',
              contactName: '',
              role: '',
              email: scraped.email,
              phone: scraped.phone,
              website: scraped.website,
              vatNumber: scraped.vatNumber,
              address: scraped.address,
              city: scraped.city,
              zipCode: scraped.zipCode,
              province: scraped.province,
              country: scraped.country || 'IT',
              sector: scraped.sector,
              notes: scraped.notes,
              region: '',
              stakeholders: [],
              intelligence: { products: [], competitors: [], pricesAndPayments: '', logisticsAndService: '' },
              createdAt: now,
              updatedAt: now,
            };
            setDetailContact(newContact);
            setEditingContact(newContact);
          }}
        />
      )}

    </div>
  );
};
