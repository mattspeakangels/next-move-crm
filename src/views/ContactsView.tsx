import { showNotice, confirmAction } from '../components/ui/Feedback';
import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Phone, MapPin, Building2, X, Users, UserPlus, Trash2, Upload, FileText, ArrowLeft, Activity, History, Calendar, TrendingUp, ClipboardList, Download, Link, Image as ImageIcon, ZoomIn, ArrowUp, ArrowDown, StickyNote, Star, RefreshCw } from 'lucide-react';
import { PdfButton } from '../components/ui/PdfButton';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { useStore } from '../store/useStore';
import { Contact, ContactSegment } from '../types';
import { AddDealModal } from '../components/deals/AddDealModal';
import { ProfilingForm } from '../components/profiling/ProfilingForm';
import { ImportFromUrlModal } from '../components/contacts/ImportFromUrlModal';
import { allSectors, sectorLabel } from '../lib/sectors';
import { DeviceAuthModal } from '../components/ui/DeviceAuthModal';
import { ContactHistoryView } from './ContactHistoryView';
import { matchSearch, sortByRelevance } from '../utils/search';

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
    visita:   { label: 'Visita',    color: 'text-accent', bg: 'bg-accent-soft dark:bg-accent-soft/40' },
    chiamata: { label: 'Chiamata',  color: 'text-success',  bg: 'bg-success-soft dark:bg-success-soft'   },
    email:    { label: 'Email',     color: 'text-accent',   bg: 'bg-accent-soft dark:bg-accent-soft/40'     },
  };

  return (
    <section>
      <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2">
        <Calendar size={16} /> 5. Programma Attività
        <span className="text-xs bg-raised dark:bg-raised text-muted px-2 py-0.5 rounded-full font-semibold">{planned.length} programmate</span>
      </h3>
      {planned.length === 0 && !showForm && (
        <p className="text-xs text-muted font-bold italic mb-3">Nessuna attività programmata</p>
      )}
      {planned.length > 0 && (
        <div className="space-y-2 mb-3">
          {planned.map(act => {
            const cfg = TYPE_CONFIG[act.type as 'visita' | 'chiamata' | 'email'] ?? TYPE_CONFIG['visita'];
            const isPast = act.date < Date.now();
            return (
              <div key={act.id} className={`bg-surface dark:bg-surface rounded-panel p-3 flex items-center gap-3 shadow-sm ${isPast ? 'border border-warning dark:border-warning' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.bg} ${cfg.color} text-xs font-semibold`}>
                  {cfg.label[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-xs dark:text-foreground">{cfg.label}</p>
                    <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded-full ${isPast ? 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning' : 'bg-raised text-secondary dark:bg-raised dark:text-muted'}`}>
                      {isPast ? 'Scaduta' : 'In attesa'}
                    </span>
                  </div>
                  <p className="text-xs text-muted font-bold">{new Date(act.date).toLocaleDateString('it-IT')}{act.notes ? ` · ${act.notes}` : ''}</p>
                </div>
                <button onClick={() => deleteActivity(act.id)}
                  className="p-1.5 text-muted hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft rounded-lg transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border-2 border-accent dark:border-accent mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={newType} onChange={e => setNewType(e.target.value as any)}
              className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-surface dark:bg-raised dark:text-foreground text-sm font-bold outline-none focus:border-accent">
              <option value="visita">Visita</option>
              <option value="chiamata">Chiamata</option>
              <option value="email">Email</option>
            </select>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-transparent dark:text-foreground text-sm font-bold outline-none focus:border-accent" />
          </div>
          <input type="text" placeholder="Note (opzionale)" value={newNotes} onChange={e => setNewNotes(e.target.value)}
            className="w-full border-2 border-line dark:border-line rounded-md px-3 py-2.5 bg-transparent dark:text-foreground text-sm font-bold outline-none focus:border-accent" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-md bg-action text-action-foreground font-semibold text-xs uppercase">Aggiungi</button>
            <button onClick={() => setShowForm(false)} className="py-2.5 px-4 rounded-md bg-raised dark:bg-raised text-secondary font-semibold text-xs uppercase">Annulla</button>
          </div>
        </div>
      )}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent-soft dark:bg-accent-soft/20 px-3 py-2 rounded-md uppercase hover:bg-accent-soft transition-colors">
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
    HOT: 'bg-danger text-status-foreground', WARM: 'bg-warning text-status-foreground',
    COLD: 'bg-success text-status-foreground', TRASH: 'bg-raised text-foreground',
  };
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted   flex items-center gap-2">
          <ClipboardList size={16} /> 2. Profilazione Blaklader
          {badge && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLE[badge]}`}>{badge}</span>}
          {!contact.profiling && <span className="text-xs font-bold text-muted normal-case tracking-normal">Non compilata</span>}
        </h3>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wide transition-all
            ${open
              ? 'bg-raised dark:bg-raised text-secondary dark:text-muted'
              : 'bg-action text-action-foreground hover:bg-action-hover shadow-panel  '}`}>
          <ClipboardList size={12} />
          {open ? 'Chiudi' : contact.profiling ? 'Modifica' : 'Compila'}
        </button>
      </div>
      {open && (
        <div className="bg-canvas dark:bg-canvas rounded-panel p-5 border border-line dark:border-line">
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
      showNotice(err?.message ?? 'Errore caricamento PDF');
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
      showNotice(err?.message ?? 'Errore caricamento documento');
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
      showNotice(err?.message ?? 'Errore download documento');
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
      showNotice(err?.message ?? 'Errore eliminazione documento');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section>
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleFileChange} />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted   flex items-center gap-2">
          <FileText size={16} /> 8. Business Intelligence
          <span className="text-xs bg-raised dark:bg-raised text-muted px-2 py-0.5 rounded-full font-semibold">{docs.length}</span>
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warning-soft dark:bg-warning-soft text-warning font-semibold text-xs uppercase tracking-wide hover:bg-warning-soft transition-colors disabled:opacity-40"
        >
          {uploading
            ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-warning border-t-transparent rounded-full" /> Caricamento...</>
            : <><Upload size={12} /> Carica Documento</>
          }
        </button>
      </div>

      {docs.length === 0 && (
        <p className="text-xs text-muted font-bold italic">Nessun documento caricato per questo cliente</p>
      )}

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="bg-surface dark:bg-surface rounded-panel p-3 flex items-center gap-3 shadow-sm">
              <FileText size={18} className="text-warning flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs dark:text-foreground truncate">{doc.name}</p>
                <p className="text-xs text-muted font-bold mt-0.5">
                  {new Date(doc.uploadedAt).toLocaleDateString('it-IT')} · {fmtFileSize(doc.size)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(doc.id)}
                disabled={downloadingId === doc.id}
                className="p-1.5 rounded-lg bg-warning-soft dark:bg-warning-soft text-warning hover:bg-warning-soft transition-colors disabled:opacity-40"
              >
                {downloadingId === doc.id
                  ? <span className="animate-spin inline-block w-3 h-3 border-2 border-warning border-t-transparent rounded-full" />
                  : <Download size={12} />
                }
              </button>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="p-1.5 rounded-lg bg-canvas dark:bg-raised text-muted hover:bg-danger-soft hover:text-danger transition-colors disabled:opacity-40"
              >
                {deletingId === doc.id
                  ? <span className="animate-spin inline-block w-3 h-3 border-2 border-danger border-t-transparent rounded-full" />
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
      showNotice(err?.message ?? 'Errore caricamento foto');
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
      showNotice(err?.message ?? 'Errore apertura foto');
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
      showNotice(err?.message ?? 'Errore eliminazione foto');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesChange} />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted   flex items-center gap-2">
          <ImageIcon size={16} /> 9. Foto Punto Vendita / Assortimento
          <span className="text-xs bg-raised dark:bg-raised text-muted px-2 py-0.5 rounded-full font-semibold">{photos.length}</span>
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warning-soft dark:bg-warning-soft text-warning font-semibold text-xs uppercase tracking-wide hover:bg-warning-soft transition-colors disabled:opacity-40"
        >
          {uploading
            ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-warning border-t-transparent rounded-full" /> Caricamento...</>
            : <><Upload size={12} /> Carica Foto</>
          }
        </button>
      </div>

      {photos.length === 0 && (
        <p className="text-xs text-muted font-bold italic">Nessuna foto caricata per questo cliente</p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {photos.map(photo => (
            <button
              key={photo.id}
              onClick={() => openViewer(photo)}
              className="relative aspect-square rounded-panel overflow-hidden bg-raised dark:bg-surface shadow-sm group"
            >
              <img src={photo.thumb} alt={photo.name} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-foreground text-xs font-semibold">
                {fmtFileSize(photo.size)}
              </span>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn size={18} className="text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {viewer && (
        <DialogFrame className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-surface dark:bg-surface rounded-panel overflow-hidden shadow-panel">
              <div className="aspect-square bg-raised dark:bg-canvas flex items-center justify-center">
                {viewer.loading
                  ? <span className="animate-spin inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
                  : <img src={viewer.fullUrl ?? viewer.photo.thumb} alt={viewer.photo.name} className="w-full h-full object-contain" />
                }
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <p className="text-xs text-muted font-bold truncate">
                  {new Date(viewer.photo.uploadedAt).toLocaleDateString('it-IT')} · {fmtFileSize(viewer.photo.size)}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(viewer.photo.id)}
                    disabled={deletingId === viewer.photo.id}
                    className="p-1.5 rounded-lg bg-canvas dark:bg-raised text-muted hover:bg-danger-soft hover:text-danger transition-colors disabled:opacity-40"
                  >
                    {deletingId === viewer.photo.id
                      ? <span className="animate-spin inline-block w-3 h-3 border-2 border-danger border-t-transparent rounded-full" />
                      : <Trash2 size={12} />
                    }
                  </button>
                  <button onClick={() => setViewer(null)} className="p-1.5 rounded-lg bg-canvas dark:bg-raised text-muted hover:bg-raised transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogFrame>
      )}
    </section>
  );
};

interface ContactsViewProps {
  initialSearch?: string;
  onClearFilter?: () => void;
  selectedContactId?: string | null;
  onClearSelectedContact?: () => void;
  onNewOfferForContact?: (contactId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ initialSearch = '', onClearFilter, selectedContactId, onClearSelectedContact, onNewOfferForContact }) => {
  const { contacts, addContact, updateContact, deleteContact, deleteAllContacts, addContactsBatch, bulkUpdateSegments, deals, activities, groups, customSectors } = useStore();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detailContact, setDetailContact] = useState<any>(null);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [addDealForContact, setAddDealForContact] = useState<string | null>(null);
  const [pendingDeleteAll, setPendingDeleteAll] = useState(false);
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'clienti' | 'prospect'>('clienti');
  const [topFilter, setTopFilter] = useState<'dealer' | 'end-user' | null>(null);
  const [subFilter, setSubFilter] = useState<'industria' | 'edilizia' | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [sortBy, setSortBy] = useState<'nome' | 'data' | 'citta' | 'interazione'>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Debounce ricerca — evita filter su ogni keystroke con 9k+ contatti
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setVisibleCount(50); }, 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Badge counts — memoizzati per evitare iterazione completa ad ogni render
  const clientiCount  = useMemo(() => Object.values(contacts).filter(c => c.status === 'cliente').length,   [contacts]);
  const prospectCount = useMemo(() => Object.values(contacts).filter(c => c.status === 'potenziale').length, [contacts]);

  // Data dell'ultima interazione (attività) per contatto — usata per l'ordinamento "Ultima interazione"
  const lastActivityByContact = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of Object.values(activities)) {
      if (!a.contactId) continue;
      if (!map[a.contactId] || a.date > map[a.contactId]) map[a.contactId] = a.date;
    }
    return map;
  }, [activities]);

  // Lista filtrata completa — memoizzata
  const filteredList = useMemo(() => {
    const statusFilter = activeTab === 'prospect' ? 'potenziale' : 'cliente';
    return Object.values(contacts)
      .filter(c => c.status === statusFilter)
      .filter(c => {
        if (!topFilter) return true;
        if (topFilter === 'dealer') return c.segment === 'dealer';
        if (!subFilter) return c.segment === 'end-user' || c.segment === 'industria' || c.segment === 'edilizia';
        return c.segment === subFilter;
      })
      .filter(c => matchSearch(debouncedSearch, [
        c.company, c.contactName, c.city, c.province, c.email, c.phone, c.vatNumber, c.address,
      ]))
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'data') return ((a.createdAt || 0) - (b.createdAt || 0)) * dir;
        if (sortBy === 'citta') return (a.city || '').localeCompare(b.city || '', 'it', { sensitivity: 'base' }) * dir;
        if (sortBy === 'interazione') return ((lastActivityByContact[a.id] || 0) - (lastActivityByContact[b.id] || 0)) * dir;
        return (a.company || a.contactName || '').localeCompare(b.company || b.contactName || '', 'it', { sensitivity: 'base' }) * dir;
      });
  }, [contacts, activeTab, topFilter, subFilter, debouncedSearch, sortBy, sortDir, lastActivityByContact]);

  // Mentre si sta cercando, anteponi i risultati più rilevanti (nome/azienda che iniziano
  // per il termine cercato) a parità di criterio di ordinamento scelto dall'utente.
  const rankedFilteredList = useMemo(
    () => sortByRelevance(debouncedSearch, filteredList, c => [c.company, c.contactName]),
    [filteredList, debouncedSearch]
  );

  // Reset paginazione quando cambia lista
  useEffect(() => { setVisibleCount(50); }, [filteredList]);
  const fileInputRefProspect = useRef<HTMLInputElement>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      status:      findColumn(['stato azienda', 'stato cliente', 'stato', 'status']),
      businessType: findColumn(['tipologia cliente', 'tipo di cliente', 'tipo cliente', 'tipologia', 'canale', 'segmento cliente', 'segmento', 'customer type', 'business type']),
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

    // Tipologia cliente esplicita (Dealer / End User) da colonna dedicata, se presente:
    // ha priorità sull'euristica basata su settore/nome azienda che spesso sbaglia.
    const parseBusinessType = (raw: string): ContactSegment | null => {
      const v = raw.toLowerCase().trim();
      if (!v) return null;
      if (v.match(/dealer|rivendit|distribu|reseller/)) return 'dealer';
      if (v.match(/end.?user|utilizzat|finale/)) return 'end-user';
      return null;
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
      const explicitBusinessType = parseBusinessType(get(values, 'businessType'));
      const segmentVal = explicitBusinessType || classifySegment(sectorVal, company);
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
        segment:     segmentVal,
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

  const recheckDealerClassification = async () => {
    const updates: Record<string, ContactSegment> = {};
    Object.values(contacts).forEach(c => {
      if (c.segment === 'dealer') return;
      const suggested = classifySegment(c.sector || '', c.company || '');
      if (suggested === 'dealer') updates[c.id] = 'dealer';
    });
    const count = Object.keys(updates).length;
    if (count === 0) {
      showNotice('Nessun contatto da correggere: in base a settore e ragione sociale, nessuno risulta erroneamente classificato come End User.');
      return;
    }
    const names = Object.keys(updates).slice(0, 8).map(id => contacts[id].company).join(', ');
    const preview = count > 8 ? `${names}, +${count - 8} altri` : names;
    if (!await confirmAction(`Trovati ${count} contatti classificati come End User che, in base a settore/ragione sociale, sembrano in realtà Dealer:\n\n${preview}\n\nCorreggerli ora in Dealer?`)) return;
    bulkUpdateSegments(updates);
    showNotice(`${count} contatti aggiornati a Dealer.`);
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
    if (!editingContact?.company) return showNotice('Inserisci la ragione sociale');
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
        onNewOfferForContact={onNewOfferForContact}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">

      {detailContact !== null ? (
        // FULL SCREEN DETAIL
        <div className="min-h-screen -m-4 md:-m-8 bg-canvas dark:bg-canvas">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 bg-surface dark:bg-surface border-b border-line dark:border-line px-4 md:px-8 py-4 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setDetailContact(null)}
                  className="p-2 rounded-md hover:bg-raised dark:hover:bg-raised transition-colors text-secondary flex-shrink-0"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-semibold text-lg dark:text-foreground  tracking-tight truncate">
                      {editingContact?.company || 'Nuova Azienda'}
                    </h2>
                    <button
                      onClick={() => setEditingContact({ ...editingContact, priorityToVisit: !editingContact?.priorityToVisit })}
                      title={editingContact?.priorityToVisit ? 'Rimuovi priorità' : 'Segna come prioritario'}
                      className={`p-1 rounded-lg transition-colors flex-shrink-0 ${editingContact?.priorityToVisit ? 'text-warning' : 'text-muted hover:text-warning'}`}
                    >
                      <Star size={18} fill={editingContact?.priorityToVisit ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <p className="text-xs text-muted font-bold uppercase tracking-normal">Scheda Azienda</p>
                </div>
              </div>
              <button
                onClick={handleSave}
                className="flex-shrink-0 bg-action text-action-foreground px-5 sm:px-6 py-2.5 rounded-panel font-semibold uppercase text-xs tracking-normal shadow-panel hover:bg-action-hover transition-colors"
              >
                Salva
              </button>
            </div>
            <div className="flex items-start gap-2 bg-accent-soft dark:bg-accent-soft/10 border-2 border-accent dark:border-accent rounded-panel px-3 py-2">
              <StickyNote size={14} className="text-accent flex-shrink-0 mt-1" />
              <textarea
                rows={2}
                placeholder="Note rapide di identificazione (es. portineria, referente in loco, orari, accessi particolari...)"
                className="w-full bg-transparent resize-none outline-none text-xs font-bold text-accent dark:text-accent placeholder:text-accent placeholder:font-semibold max-h-20 overflow-y-auto"
                value={editingContact?.notes || ''}
                onChange={e => setEditingContact({ ...editingContact, notes: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {editingContact?.id && contacts[editingContact.id] && (
                <button
                  onClick={() => setHistoryContact(contacts[editingContact.id])}
                  className="flex items-center gap-1.5 bg-accent-soft dark:bg-accent-soft/30 text-accent px-3 py-2.5 rounded-panel font-semibold uppercase text-xs tracking-normal hover:bg-accent-soft transition-colors"
                >
                  <History size={14} /> <span className="hidden sm:inline">Storico</span>
                </button>
              )}
              {/* Bottone sincronizzazione mappa — visibile se mancano le coordinate */}
              {!(editingContact?.lat && editingContact?.lng) && (editingContact?.city || editingContact?.address) && (
                <button
                  onClick={handleGeocode}
                  disabled={geoLoading}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-panel font-semibold uppercase text-xs tracking-normal transition-colors border ${
                    geoStatus === 'ok'
                      ? 'bg-success-soft border-success text-success'
                      : geoStatus === 'error'
                      ? 'bg-danger-soft border-danger text-danger'
                      : 'bg-warning-soft border-warning text-warning hover:bg-warning-soft'
                  } disabled:opacity-60`}
                >
                  <MapPin size={14} className={geoLoading ? 'animate-bounce' : ''} />
                  <span className="hidden sm:inline">
                    {geoLoading ? 'Ricerca…' : geoStatus === 'ok' ? 'Posizionato!' : geoStatus === 'error' ? 'Non trovato' : 'Posiziona su Mappa'}
                  </span>
                </button>
              )}
              {(editingContact?.lat && editingContact?.lng) && (
                <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-success uppercase tracking-normal">
                  <MapPin size={11} /> In mappa
                </span>
              )}
              <button
                onClick={() => setConfirmDeleteId(editingContact?.id ?? null)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-panel border-2 border-danger dark:border-danger text-danger hover:bg-danger-soft dark:hover:bg-danger-soft font-semibold uppercase text-xs tracking-normal transition-colors"
              >
                <Trash2 size={13} /> Elimina
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">

            {/* SEZIONE 1 */}
            <section>
              <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2"><Building2 size={16}/> 1. Dati Anagrafici</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface dark:bg-surface p-6 rounded-panel shadow-sm">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Ragione Sociale *</label>
                  <input type="text" style={{ textTransform: 'uppercase' }} className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.company || ''} onChange={e => setEditingContact({...editingContact, company: e.target.value.toUpperCase()})} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Tipologia</label>
                  <select className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none" value={editingContact?.segment === 'dealer' ? 'dealer' : 'end-user'} onChange={e => setEditingContact({...editingContact, segment: e.target.value as ContactSegment, customerType: e.target.value})}>
                    <option value="end-user">End User (Utilizzatore Finale)</option>
                    <option value="dealer">Dealer (Rivenditore)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Status CRM</label>
                  <select className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none" value={editingContact?.status || 'potenziale'} onChange={e => setEditingContact({...editingContact, status: e.target.value})}>
                    <option value="potenziale">Potenziale</option>
                    <option value="cliente">Cliente Attivo</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Gruppo strategico</label>
                  <select className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none" value={editingContact?.groupId || ''} onChange={e => setEditingContact({...editingContact, groupId: e.target.value || undefined})}>
                    <option value="">— Nessun gruppo —</option>
                    {Object.values(groups).sort((a, b) => a.nome.localeCompare(b.nome, 'it')).map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Settore di Riferimento</label>
                  <select className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none" value={editingContact?.sector || ''} onChange={e => setEditingContact({...editingContact, sector: e.target.value})}>
                    <option value="">— Seleziona settore —</option>
                    {allSectors(customSectors).map(s => (
                      <option key={s} value={s}>{sectorLabel(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Partita IVA</label>
                  <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all font-mono" placeholder="es. 01234567890" value={editingContact?.vatNumber || ''} onChange={e => setEditingContact({...editingContact, vatNumber: e.target.value})} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Telefono Gen.</label>
                  <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.phone || ''} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Email Gen.</label>
                  <input type="email" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.email || ''} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Sito Web</label>
                  <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" placeholder="es. www.azienda.it" value={editingContact?.website || ''} onChange={e => setEditingContact({...editingContact, website: e.target.value})} />
                </div>

                <div className="md:col-span-2 grid grid-cols-12 gap-2 mt-2">
                  <div className="col-span-12 md:col-span-6">
                    <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Indirizzo</label>
                    <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.address || ''} onChange={e => setEditingContact({...editingContact, address: e.target.value})} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">CAP</label>
                    <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.zipCode || ''} onChange={e => setEditingContact({...editingContact, zipCode: e.target.value})} />
                  </div>
                  <div className="col-span-5 md:col-span-3">
                    <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Città</label>
                    <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.city || ''} onChange={e => setEditingContact({...editingContact, city: e.target.value})} />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Prov.</label>
                    <input type="text" className="w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all" value={editingContact?.province || ''} onChange={e => setEditingContact({...editingContact, province: e.target.value})} />
                  </div>
                </div>
              </div>
            </section>

            {/* SEZIONE 1A-BIS - Sedi Aggiuntive */}
            {(() => {
              const locations: any[] = editingContact?.locations || [];
              const inputCls = "w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all text-sm";
              const labelCls = "text-xs font-semibold text-muted uppercase tracking-normal block mb-1";

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
                  <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2">
                    <MapPin size={16}/> Sedi Aggiuntive
                  </h3>
                  <div className="space-y-4">
                    {locations.map(l => (
                      <div key={l.id} className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm border-2 border-line dark:border-line relative">
                        <button onClick={() => removeLocation(l.id)} className="absolute top-4 right-4 p-1.5 rounded-lg text-danger hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors">
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

                    <button onClick={addLocation} className="w-full py-3 rounded-panel border-2 border-dashed border-line dark:border-line text-xs font-semibold text-muted uppercase tracking-normal hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2">
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

              const inputCls = "w-full border-2 border-line dark:border-line rounded-md p-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-all text-sm";
              const labelCls = "text-xs font-semibold text-muted uppercase tracking-normal block mb-1";

              return (
                <section>
                  <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2">
                    <Users size={16}/> 1b. Persone di Riferimento
                  </h3>
                  <div className="space-y-4">
                    {/* Titolare */}
                    <div className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm border-2 border-accent dark:border-accent/40">
                      <p className="text-xs font-semibold text-accent uppercase tracking-normal mb-3">Titolare</p>
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
                      <div key={s.id} className="bg-surface dark:bg-surface rounded-panel p-5 shadow-sm border-2 border-line dark:border-line relative">
                        <button onClick={() => removeAltra(s.id)} className="absolute top-4 right-4 p-1.5 rounded-lg text-danger hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors">
                          <Trash2 size={14} />
                        </button>
                        <p className="text-xs font-semibold text-muted uppercase tracking-normal mb-3">Figura di Riferimento</p>
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

                    <button onClick={addAltra} className="w-full py-3 rounded-panel border-2 border-dashed border-line dark:border-line text-xs font-semibold text-muted uppercase tracking-normal hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2">
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
                <section className={`rounded-panel p-4 border-2 ${isSilent ? 'border-warning bg-warning-soft dark:bg-warning-soft dark:border-warning' : 'border-success bg-success-soft dark:bg-success-soft dark:border-success'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={16} className={isSilent ? 'text-warning' : 'text-success'} />
                    <h3 className="text-xs font-semibold text-secondary  ">Interaction Score</h3>
                    {isSilent && <span className="text-xs font-semibold bg-warning-soft text-warning px-2 py-0.5 rounded-full uppercase">SILENTE</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-semibold dark:text-foreground">{recent90.length}</p>
                      <p className="text-xs font-semibold uppercase text-muted tracking-normal">Attività 90gg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold dark:text-foreground">{contactActivities.length}</p>
                      <p className="text-xs font-semibold uppercase text-muted tracking-normal">Totali</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold dark:text-foreground">
                        {lastActivity ? `${Math.floor((Date.now() - lastActivity) / (24 * 60 * 60 * 1000))}gg fa` : '—'}
                      </p>
                      <p className="text-xs font-semibold uppercase text-muted tracking-normal">Ultima att.</p>
                    </div>
                  </div>
                  {Object.keys(activityTypes).length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {Object.entries(activityTypes).map(([type, count]) => (
                        <span key={type} className="text-xs font-semibold bg-surface dark:bg-surface border border-line dark:border-line text-secondary dark:text-muted px-2 py-1 rounded-lg uppercase">
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
                lead: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent',
                qualificato: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent',
                proposta: 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning',
                negoziazione: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent',
              };
              const stageLabels: Record<string, string> = { lead: 'Lead', qualificato: 'Qualificato', proposta: 'Proposta', negoziazione: 'Trattativa' };
              return (
                <section>
                  <h3 className="text-xs font-semibold text-muted   mb-4 flex items-center gap-2">
                    <TrendingUp size={16}/> 6. Deal Aperti
                    <span className="text-xs bg-raised dark:bg-raised text-muted px-2 py-0.5 rounded-full font-semibold">{contactDeals.length}</span>
                  </h3>
                  <div className="bg-surface dark:bg-surface rounded-panel p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-muted uppercase tracking-normal">Opportunità aperte</span>
                      <button
                        onClick={() => setAddDealForContact(editingContact.id)}
                        className="text-xs font-semibold text-accent bg-accent-soft px-2 py-1 rounded-full uppercase flex items-center gap-1 hover:bg-accent-soft transition-colors"
                      >
                        <Plus size={10}/> Aggiungi
                      </button>
                    </div>
                    {contactDeals.length === 0 ? (
                      <p className="text-xs text-muted font-bold italic">Nessun deal aperto</p>
                    ) : (
                      <div className="space-y-2">
                        {contactDeals.map(deal => {
                          const isPastClosing = deal.closingDate && deal.closingDate < Date.now();
                          const daysToClose = deal.closingDate ? Math.ceil((deal.closingDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                          return (
                            <div key={deal.id} className={`rounded-panel p-3 flex items-center gap-2 ${isPastClosing ? 'bg-danger-soft dark:bg-danger-soft border border-danger dark:border-danger' : 'bg-canvas dark:bg-canvas'}`}>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${stageBadge[deal.stage] || 'bg-raised text-secondary'}`}>
                                {stageLabels[deal.stage] || deal.stage}
                              </span>
                              <span className="font-bold text-xs text-accent">€{deal.value.toLocaleString('it-IT')}</span>
                              {deal.closingDate && (
                                <span className={`text-xs font-semibold ml-auto flex-shrink-0 ${isPastClosing ? 'text-danger' : daysToClose && daysToClose <= 7 ? 'text-warning' : 'text-muted'}`}>
                                  {isPastClosing ? `Scaduto ${Math.abs(daysToClose!)}gg fa` : `Chiusura: ${new Date(deal.closingDate).toLocaleDateString('it-IT')}`}
                                </span>
                              )}
                              {deal.nextAction && !deal.closingDate && (
                                <span className="text-xs text-secondary truncate flex-1">{deal.nextAction}</span>
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
              <h1 className="text-2xl  dark:text-foreground  ">Clienti</h1>
              <div className="flex gap-2 mt-2 flex-wrap">
                {searchTerm && initialSearch && (
                  <button onClick={() => { setSearchTerm(''); onClearFilter?.(); }}
                    className="flex items-center gap-1 text-accent font-semibold uppercase text-xs tracking-normal bg-accent-soft px-2 py-1 rounded-md hover:bg-accent-soft transition-colors">
                    Filtro Mappa: {searchTerm} <X size={12} />
                  </button>
                )}
                {Object.values(contacts).length > 0 && (
                  <button onClick={() => setPendingDeleteAll(true)}
                    className="flex items-center gap-1 text-danger font-semibold uppercase text-xs tracking-normal bg-danger-soft px-2 py-1 rounded-md hover:bg-danger-soft transition-colors">
                    <Trash2 size={12} /> Pulisci DB
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 bg-raised dark:bg-surface p-1 rounded-panel w-fit max-w-full">
            <button onClick={() => setActiveTab('clienti')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold uppercase tracking-wide transition-all ${activeTab === 'clienti' ? 'bg-surface dark:bg-raised shadow text-accent' : 'text-secondary hover:text-foreground'}`}>
              <Users size={16} />
              Clienti
              <span className="text-xs bg-accent-soft dark:bg-accent-soft/40 text-accent px-2 py-0.5 rounded-full font-semibold">
                {clientiCount}
              </span>
            </button>
            <button onClick={() => setActiveTab('prospect')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold uppercase tracking-wide transition-all ${activeTab === 'prospect' ? 'bg-surface dark:bg-raised shadow text-warning' : 'text-secondary hover:text-foreground'}`}>
              <UserPlus size={16} />
              Prospect
              <span className="text-xs bg-warning-soft dark:bg-warning-soft text-warning px-2 py-0.5 rounded-full font-semibold">
                {prospectCount}
              </span>
            </button>
          </div>

          {/* Search + actions */}
          {(() => {
            const isProspect = activeTab === 'prospect';
            const statusFilter = isProspect ? 'potenziale' : 'cliente';
            const csvRef    = isProspect ? fileInputRefProspect : fileInputRef;
            const accentCls = isProspect ? 'text-warning border-warning hover:bg-warning-soft' : 'text-accent border-accent hover:bg-accent-soft';
            const btnCls = 'bg-action text-action-foreground hover:bg-action-hover';

            const list = rankedFilteredList;

            const searchPreview = searchTerm.trim()
              ? sortByRelevance(searchTerm, Object.values(contacts)
                  .filter(c => c.status === statusFilter)
                  .filter(c => matchSearch(searchTerm, [
                    c.company, c.contactName, c.city, c.province, c.email, c.phone, c.vatNumber, c.address,
                  ])), c => [c.company, c.contactName]).slice(0, 8)
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
                    inputWrapperClassName={() => 'flex items-center gap-2 pl-4 pr-4 py-3.5 bg-surface dark:bg-surface border-2 border-line dark:border-line rounded-panel font-bold outline-none focus-within:border-accent transition-all shadow-sm text-sm'}
                    results={searchPreview.map(c => ({
                      key: c.id,
                      item: c,
                      label: c.company || c.contactName,
                      sublabel: [c.company && c.contactName, c.city].filter(Boolean).join(' · ') || undefined,
                      badge: {
                        text: c.status === 'cliente' ? 'Cliente' : 'Prospect',
                        className: c.status === 'cliente'
                          ? 'bg-success-soft text-success dark:bg-success-soft dark:text-success'
                          : 'bg-accent-soft text-accent dark:bg-accent-soft/40 dark:text-accent',
                      },
                    }))}
                  />

                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'nome' | 'data' | 'citta' | 'interazione')}
                    className="bg-surface dark:bg-surface border-2 border-line dark:border-line rounded-panel px-4 py-3.5 font-bold outline-none focus:border-accent transition-all shadow-sm text-sm text-secondary dark:text-muted"
                    title="Ordina per"
                  >
                    <option value="nome">Nome</option>
                    <option value="data">Data creazione</option>
                    <option value="citta">Città</option>
                    <option value="interazione">Ultima interazione</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                    className="bg-surface dark:bg-surface border-2 border-line dark:border-line rounded-panel px-3.5 py-3.5 font-bold outline-none focus:border-accent transition-all shadow-sm text-secondary dark:text-muted hover:bg-canvas dark:hover:bg-raised"
                    title={sortDir === 'asc' ? 'Crescente' : 'Decrescente'}
                  >
                    {sortDir === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                  </button>

                  {/* CSV input — clienti */}
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef}
                    onChange={e => handleFileUpload(e, 'cliente')} />
                  {/* CSV input — prospect */}
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRefProspect}
                    onChange={e => handleFileUpload(e, 'potenziale')} />

                  <button onClick={() => setShowImportModal(true)}
                    className={`bg-surface dark:bg-surface border-2 dark:border-line px-5 py-3 rounded-panel font-bold flex items-center gap-2 transition-all text-sm ${accentCls}`}
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
                    className={`text-action-foreground px-5 py-3 rounded-panel font-bold flex items-center justify-center gap-2 shadow-panel transition-all text-sm ${btnCls}`}>
                    <Plus size={18} /> {isProspect ? 'Nuovo Prospect' : 'Nuovo Cliente'}
                  </button>
                </div>

                {/* Filtri Segment */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setTopFilter(null); setSubFilter(null); }}
                      className={`px-4 py-2 rounded-md font-bold text-xs uppercase transition-all ${
                        topFilter === null
                          ? 'bg-action text-action-foreground'
                          : 'bg-raised dark:bg-raised text-secondary dark:text-muted hover:bg-raised'
                      }`}
                    >
                      Tutti ({Object.values(contacts).filter(c => c.status === statusFilter).length})
                    </button>
                    <button
                      onClick={() => { setTopFilter('dealer'); setSubFilter(null); }}
                      className={`px-4 py-2 rounded-md font-bold text-xs uppercase transition-all ${
                        topFilter === 'dealer'
                          ? 'bg-action text-action-foreground'
                          : 'bg-raised dark:bg-raised text-secondary dark:text-muted hover:bg-raised'
                      }`}
                    >
                      🏪 Dealer ({Object.values(contacts).filter(c => c.status === statusFilter && c.segment === 'dealer').length})
                    </button>
                    <button
                      onClick={() => { setTopFilter('end-user'); setSubFilter(null); }}
                      className={`px-4 py-2 rounded-md font-bold text-xs uppercase transition-all ${
                        topFilter === 'end-user'
                          ? 'bg-action text-action-foreground'
                          : 'bg-raised dark:bg-raised text-secondary dark:text-muted hover:bg-raised'
                      }`}
                    >
                      👤 End User ({Object.values(contacts).filter(c => c.status === statusFilter && (c.segment === 'end-user' || c.segment === 'industria' || c.segment === 'edilizia')).length})
                    </button>
                  </div>

                  {topFilter === 'end-user' && (
                    <div className="flex flex-wrap gap-2 pl-3 border-l-2 border-line dark:border-line">
                      <button
                        onClick={() => setSubFilter(null)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase transition-all ${
                          subFilter === null
                            ? 'bg-action text-action-foreground'
                            : 'bg-canvas dark:bg-surface text-secondary dark:text-muted hover:bg-raised'
                        }`}
                      >
                        Tutti End User
                      </button>
                      {([
                        { key: 'industria', label: '🏭 Industria' },
                        { key: 'edilizia',  label: '🏗️ Edilizia' },
                      ] as const).map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setSubFilter(key)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase transition-all ${
                            subFilter === key
                              ? 'bg-action text-action-foreground'
                              : 'bg-canvas dark:bg-surface text-secondary dark:text-muted hover:bg-raised'
                          }`}
                        >
                          {label} ({Object.values(contacts).filter(c => c.status === statusFilter && c.segment === key).length})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.length === 0 ? (
                    <div className="col-span-3 bg-surface dark:bg-surface rounded-panel py-20 text-center border-2 border-dashed border-line dark:border-line">
                      {isProspect ? <UserPlus size={44} className="mx-auto mb-4 text-warning" /> : <Users size={44} className="mx-auto mb-4 text-accent" />}
                      <p className="text-muted font-bold uppercase tracking-normal text-sm">
                        Nessun {isProspect ? 'prospect' : 'cliente'} trovato
                      </p>
                      <p className="text-muted text-xs mt-1">Importa un CSV o aggiungi manualmente</p>
                    </div>
                  ) : list.slice(0, visibleCount).map(contact => (
                    <div key={contact.id} onClick={() => openDetail(contact)}
                      className={`bg-surface dark:bg-surface p-6 rounded-panel shadow-sm border-2 transition-all cursor-pointer ${
                        isProspect
                          ? 'border-warning dark:border-warning hover:border-warning'
                          : 'border-line dark:border-line hover:border-accent'
                      }`}>

                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-panel flex items-center justify-center flex-shrink-0 ${isProspect ? 'bg-warning-soft dark:bg-warning-soft text-warning' : 'bg-accent-soft dark:bg-accent-soft/30 text-accent'}`}>
                            {isProspect ? <UserPlus size={22} /> : <Building2 size={22} />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold dark:text-foreground  leading-tight break-words">{contact.company}</h3>
                            <span className={`text-xs font-semibold uppercase tracking-normal px-2 py-0.5 rounded-full ${
                              (contact as any).customerType === 'dealer' ? 'bg-accent-soft text-accent' : 'bg-accent-soft text-accent'
                            }`}>
                              {(contact as any).customerType === 'dealer' ? 'Dealer' : 'End User'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); updateContact(contact.id, { priorityToVisit: !contact.priorityToVisit }); }}
                            title={contact.priorityToVisit ? 'Rimuovi priorità' : 'Segna come prioritario'}
                            className={`p-2 rounded-xl transition-colors ${contact.priorityToVisit ? 'text-warning hover:bg-warning-soft dark:hover:bg-warning-soft' : 'text-muted hover:text-warning hover:bg-warning-soft dark:hover:bg-warning-soft'}`}>
                            <Star size={15} fill={contact.priorityToVisit ? 'currentColor' : 'none'} />
                          </button>
                          <button aria-label={`Elimina ${contact.company}`} onClick={async e => { e.stopPropagation(); if (await confirmAction(`Elimina ${contact.company}?`)) deleteContact(contact.id); }}
                            className="p-2 text-muted hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft rounded-md transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="flex items-center gap-2 text-xs font-bold text-secondary dark:text-muted">
                          <MapPin size={13} className="text-muted flex-shrink-0" />
                          {contact.city || 'Città non inserita'} {(contact as any).province ? `(${(contact as any).province})` : ''}
                        </p>
                        <p className="flex items-center gap-2 text-xs font-bold text-secondary dark:text-muted">
                          <Phone size={13} className="text-muted flex-shrink-0" />
                          {contact.phone || 'Nessun telefono'}
                        </p>
                        {(contact as any).stakeholders?.length > 0 && (
                          <p className={`flex items-center gap-1.5 text-xs font-bold w-max px-2 py-1 rounded-lg mt-2 ${isProspect ? 'text-warning bg-warning-soft dark:bg-warning-soft' : 'text-accent bg-accent-soft dark:bg-accent-soft/20'}`}>
                            <Users size={13} /> {(contact as any).stakeholders.length} Referent{(contact as any).stakeholders.length === 1 ? 'e' : 'i'}
                          </p>
                        )}
                      </div>

                      {/* Azioni footer card */}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); setHistoryContact(contact); }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-canvas dark:bg-raised text-secondary dark:text-muted text-xs font-semibold uppercase tracking-wide hover:bg-accent-soft dark:hover:bg-accent-soft/20 hover:text-accent transition-all"
                        >
                          <History size={13} /> Storico
                        </button>
                        {isProspect && (
                          <button
                            onClick={async e => {
                              e.stopPropagation();
                              if (await confirmAction(`Converti "${contact.company}" in Cliente?`)) {
                                updateContact(contact.id, { status: 'cliente' });
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-accent-soft dark:bg-accent-soft/20 text-accent text-xs font-semibold uppercase tracking-wide hover:bg-action-hover hover:text-action-foreground transition-all"
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
                    <p className="text-xs text-muted">
                      Mostrati <strong>{visibleCount}</strong> di <strong>{list.length}</strong>
                    </p>
                    <button
                      onClick={() => setVisibleCount(v => v + 50)}
                      className="px-6 py-2.5 bg-surface dark:bg-surface border-2 border-line dark:border-line rounded-panel text-sm font-semibold text-secondary dark:text-muted hover:border-accent hover:text-accent transition-all"
                    >
                      Carica altri 50
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap justify-center items-center gap-3 pb-6">
                  <button onClick={() => csvRef.current?.click()}
                    className={`bg-surface dark:bg-surface border-2 dark:border-line px-[30px] py-[18px] rounded-panel font-bold flex items-center gap-[9px] transition-all text-[15px] ${accentCls}`}>
                    <Upload size={27} /> Importa CSV
                  </button>
                  <button onClick={recheckDealerClassification}
                    className="px-[30px] py-[18px] bg-surface dark:bg-surface border-2 border-line dark:border-line rounded-panel text-[15px] font-semibold text-muted dark:text-secondary hover:text-accent hover:border-accent transition-all flex items-center gap-[9px]"
                    title="Ricontrolla in blocco i contatti già importati e correggi i Dealer classificati come End User">
                    <RefreshCw size={27} /> Ricontrolla Dealer
                  </button>
                </div>
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

      {/* Modal conferma eliminazione singolo contatto */}
      {confirmDeleteId && (() => {
        const c = contacts[confirmDeleteId];
        return (
          <DialogFrame className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface dark:bg-surface rounded-panel p-6 shadow-panel max-w-sm w-full mx-4">
              <div className="flex items-center gap-3 mb-3">
                <Trash2 size={20} className="text-danger shrink-0" />
                <h4 className="font-semibold text-foreground dark:text-foreground">Elimina contatto</h4>
              </div>
              <p className="text-sm text-secondary dark:text-muted mb-1">
                Stai per eliminare <strong>{c?.company}</strong>.
              </p>
              <p className="text-xs text-danger mb-5">Questa azione non è reversibile.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2 border border-line dark:border-line rounded-md text-sm font-bold text-secondary dark:text-muted hover:bg-canvas dark:hover:bg-raised"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    deleteContact(confirmDeleteId);
                    setConfirmDeleteId(null);
                    setEditingContact(null);
                  }}
                  className="flex-1 py-2 bg-danger hover:bg-danger text-status-foreground text-sm font-bold rounded-md"
                >
                  Sì, elimina
                </button>
              </div>
            </div>
          </DialogFrame>
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
