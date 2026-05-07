import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Phone, MapPin, Building2, X, Users, UserPlus, Mail, Target, Trash2, Upload, FileText, ArrowLeft, Sparkles, Activity, History, Calendar, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Contact } from '../types';
import { AddDealModal } from '../components/deals/AddDealModal';
import { useClaudeAI } from '../hooks/useClaudeAI';
import { AiPanel } from '../components/ai/AiPanel';
import { ContactHistoryView } from './ContactHistoryView';

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

const InlineOfferSection: React.FC<{ contactId: string }> = ({ contactId }) => {
  const { offers, products, deals, addOffer, updateOffer, updateDeal } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [formItems, setFormItems] = useState<Array<{ id: string; productId: string; description: string; quantity: number; price: number; discount: number }>>([]);
  const [formDelivery, setFormDelivery] = useState('');
  const [formShipping, setFormShipping] = useState(0);
  const [formDealId, setFormDealId] = useState('');

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
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <FileText size={16} /> 7. Offerte
        <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-black">{contactOffers.length}</span>
      </h3>

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
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date(offer.date).toLocaleDateString('it-IT')} · {offer.items.length} articoli</p>
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
  const [tagInputProd, setTagInputProd] = useState('');
  const [tagInputComp, setTagInputComp] = useState('');
  const [addDealForContact, setAddDealForContact] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<'clienti' | 'prospect'>('clienti');
  const fileInputRefProspect = useRef<HTMLInputElement>(null);
  const { result: aiResult, loading: aiLoading, error: aiError, run: aiRun, reset: aiReset } = useClaudeAI();

  useEffect(() => {
    if (initialSearch) setSearchTerm(initialSearch);
  }, [initialSearch]);


  const openDetail = (contact?: Contact | any) => {
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

    // Mapping colonne — keywords in ordine di specificità (più specifico prima)
    const col: Record<string, number> = {
      company:     findColumn(['aziende', 'ragione sociale', 'nome azienda', 'company name', 'azienda', 'company', 'organizzazione', 'organization']),
      status:      findColumn(['stato azienda', 'stato cliente', 'stato', 'status', 'tipo cliente', 'tipologia']),
      contactName: findColumn(['referente', 'contatto principale', 'nome contatto', 'contatto', 'contact name', 'contact', 'nome', 'person']),
      role:        findColumn(['ruolo', 'qualifica', 'posizione', 'role', 'title', 'job']),
      email:       findColumn(['e-mail', 'email', 'mail', 'posta']),
      phone:       findColumn(['numero di telefono', 'telefono fisso', 'telefono 1', 'telefono', 'phone', 'tel ']),
      mobile:      findColumn(['cellulare', 'mobile', 'cell', 'telefono 2']),
      website:     findColumn(['web', 'sito web', 'website', 'url', 'sito']),
      address:     findColumn(['indirizzo', 'address', 'via ', 'strada']),
      city:        findColumn(['citt', 'city', 'comune', 'località']),
      province:    findColumn(['provincia', 'province', 'prov']),
      zipCode:     findColumn(['codice postale', 'cap', 'zip', 'postal']),
      sector:      findColumn(['settore', 'sector', 'industria', 'attività', 'categoria']),
      notes:       findColumn(['commenti', 'note', 'notes', 'comments', 'osservazioni']),
    };

    const get = (row: string[], key: string): string =>
      col[key] >= 0 ? (row[col[key]] ?? '').trim() : '';

    const parseStatus = (raw: string): 'potenziale' | 'cliente' => {
      const v = raw.toLowerCase().trim();
      if (v.includes('client') || v === 'attivo' || v === 'active') return 'cliente';
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

      // Telefono: preferisce 'phone', poi 'mobile' se phone è vuoto
      const phone = get(values, 'phone') || get(values, 'mobile');

      // Status: dalla colonna CSV se disponibile, altrimenti fallbackStatus
      const statusRaw = get(values, 'status');
      const contactStatus = statusRaw ? parseStatus(statusRaw) : fallbackStatus;

      result.push({
        id: `c_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
        company,
        contactName: get(values, 'contactName'),
        role:        get(values, 'role'),
        email:       get(values, 'email'),
        phone,
        website:     get(values, 'website'),
        address:     get(values, 'address'),
        city:        get(values, 'city'),
        province:    get(values, 'province'),
        zipCode:     get(values, 'zipCode'),
        region:      get(values, 'province'),
        sector:      get(values, 'sector'),
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
    console.log('📥 CSV CARICATO:', file.name, file.size, 'bytes');
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
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
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (!editingContact?.company) return alert('Inserisci la ragione sociale');
    if (contacts[editingContact.id]) {
      updateContact(editingContact.id, editingContact);
    } else {
      addContact(editingContact as Contact);
    }
    setDetailContact(null);
  };

  const addStakeholder = () => {
    setEditingContact((prev: any) => ({
      ...prev,
      stakeholders: [...(prev.stakeholders || []), { id: Date.now().toString(), name: '', role: 'Altro', email: '', phone: '' }]
    }));
  };

  const updateStakeholder = (id: string, field: string, value: string) => {
    setEditingContact((prev: any) => ({
      ...prev,
      stakeholders: prev.stakeholders.map((sh: any) => sh.id === id ? { ...sh, [field]: value } : sh)
    }));
  };

  const removeStakeholder = (id: string) => {
    setEditingContact((prev: any) => ({
      ...prev,
      stakeholders: prev.stakeholders.filter((sh: any) => sh.id !== id)
    }));
  };

  const handleAddTag = (type: 'products' | 'competitors', value: string) => {
    if (!value.trim() || !editingContact) return;
    const currentTags = editingContact.intelligence?.[type] || [];
    if (!currentTags.includes(value.trim())) {
      setEditingContact({
        ...editingContact,
        intelligence: { ...editingContact.intelligence, [type]: [...currentTags, value.trim()] }
      });
    }
    if (type === 'products') setTagInputProd('');
    else setTagInputComp('');
  };

  const removeTag = (type: 'products' | 'competitors', value: string) => {
    setEditingContact((prev: any) => ({
      ...prev,
      intelligence: { ...prev.intelligence, [type]: prev.intelligence[type].filter((t: string) => t !== value) }
    }));
  };

  const defaultIntelligence = { products: [], competitors: [], pricesAndPayments: '', logisticsAndService: '' };

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
          <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDetailContact(null)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="font-black text-lg dark:text-white uppercase tracking-tight">
                  {editingContact?.company || 'Nuova Azienda'}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scheda Azienda</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-colors"
              >
                Salva
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

            {/* SEZIONE 2 */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Users size={16}/> 2. Stakeholder (Referenti)</h3>
                <button onClick={addStakeholder} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase flex items-center gap-1 hover:bg-indigo-100 transition-colors"><UserPlus size={12}/> Aggiungi Referente</button>
              </div>

              <div className="space-y-3">
                {(!editingContact?.stakeholders || editingContact.stakeholders.length === 0) && (
                  <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-bold text-gray-400 uppercase">Nessun referente inserito</p>
                  </div>
                )}
                {editingContact?.stakeholders?.map((sh: any) => (
                  <div key={sh.id} className="grid grid-cols-12 gap-2 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-3 rounded-2xl items-center relative">
                    <div className="col-span-12 md:col-span-3">
                      <input type="text" placeholder="Nome Cognome" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white" value={sh.name} onChange={e => updateStakeholder(sh.id, 'name', e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <select className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg p-2 font-bold outline-none text-xs dark:text-white text-gray-600" value={sh.role} onChange={e => updateStakeholder(sh.id, 'role', e.target.value)}>
                        <option value="Titolare">Titolare / CEO</option>
                        <option value="Responsabile Acquisti">Resp. Acquisti</option>
                        <option value="Responsabile Tecnico">Resp. Tecnico / Prod.</option>
                        <option value="Altro">Altro</option>
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-3 flex items-center gap-2">
                      <Mail size={14} className="text-gray-400"/>
                      <input type="email" placeholder="Email" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white" value={sh.email} onChange={e => updateStakeholder(sh.id, 'email', e.target.value)} />
                    </div>
                    <div className="col-span-10 md:col-span-2 flex items-center gap-2">
                      <Phone size={14} className="text-gray-400"/>
                      <input type="text" placeholder="Telefono" className="w-full bg-transparent font-bold outline-none text-sm dark:text-white" value={sh.phone} onChange={e => updateStakeholder(sh.id, 'phone', e.target.value)} />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <button onClick={() => removeStakeholder(sh.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SEZIONE 3 */}
            <section>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={16}/> 3. Commercial Intelligence</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-50 dark:border-indigo-900/30">

                <div>
                  <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Cosa Comprano? (Tag liberi)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editingContact?.intelligence?.products?.map((tag: string, i: number) => (
                      <span key={i} className="text-[10px] font-black bg-indigo-600 text-white px-2 py-1 rounded-md uppercase flex items-center gap-1">
                        {tag} <button onClick={() => removeTag('products', tag)}><X size={10} className="hover:text-red-300"/></button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Scrivi e premi Invio..."
                    className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-sm"
                    value={tagInputProd}
                    onChange={e => setTagInputProd(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag('products', tagInputProd); }}}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Competitors attuali (Tag liberi)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editingContact?.intelligence?.competitors?.map((tag: string, i: number) => (
                      <span key={i} className="text-[10px] font-black bg-orange-500 text-white px-2 py-1 rounded-md uppercase flex items-center gap-1">
                        {tag} <button onClick={() => removeTag('competitors', tag)}><X size={10} className="hover:text-red-900"/></button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Scrivi e premi Invio..."
                    className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-sm"
                    value={tagInputComp}
                    onChange={e => setTagInputComp(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag('competitors', tagInputComp); }}}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Prezzi e Pagamenti</label>
                  <textarea
                    placeholder="Es. Pagano a 60gg, sono sensibili al prezzo sul prodotto base..."
                    className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-sm min-h-[80px] resize-none"
                    value={editingContact?.intelligence?.pricesAndPayments || ''}
                    onChange={e => setEditingContact({
                      ...editingContact,
                      intelligence: {...(editingContact.intelligence || defaultIntelligence), pricesAndPayments: e.target.value}
                    })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Logistica e Servizio</label>
                  <textarea
                    placeholder="Es. Ordinano spesso all'ultimo minuto, esigono consegna in 24h..."
                    className="w-full border-2 border-white dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none text-sm min-h-[80px] resize-none"
                    value={editingContact?.intelligence?.logisticsAndService || ''}
                    onChange={e => setEditingContact({
                      ...editingContact,
                      intelligence: {...(editingContact.intelligence || defaultIntelligence), logisticsAndService: e.target.value}
                    })}
                  />
                </div>
              </div>
            </section>

            {/* SEZIONE 4 */}
            <section>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">4. Note Generali</h3>
              <textarea
                placeholder="Informazioni aggiuntive..."
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none resize-none min-h-[100px] shadow-sm"
                value={editingContact?.notes || ''}
                onChange={e => setEditingContact({...editingContact, notes: e.target.value})}
              />
            </section>

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
                  <button onClick={() => { if (window.confirm('🗑️ Elimina TUTTI i contatti dal database? Questa azione non è reversibile!')) deleteAllContacts(); }}
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
                {Object.values(contacts).filter(c => c.status === 'cliente').length}
              </span>
            </button>
            <button onClick={() => setActiveTab('prospect')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${activeTab === 'prospect' ? 'bg-white dark:bg-gray-700 shadow text-amber-500' : 'text-gray-500 hover:text-gray-700'}`}>
              <UserPlus size={16} />
              Prospect
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full font-black">
                {Object.values(contacts).filter(c => c.status === 'potenziale').length}
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

            const list = Object.values(contacts)
              .filter(c => c.status === statusFilter)
              .filter(c =>
                (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.city    && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
              );

            return (
              <>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text"
                      placeholder={`Cerca ${isProspect ? 'prospect' : 'cliente'} o città…`}
                      className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold outline-none focus:border-indigo-400 transition-all shadow-sm text-sm"
                      value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>

                  {/* CSV input — clienti */}
                  <input type="file" accept=".csv" className="hidden" ref={fileInputRef}
                    onChange={e => handleFileUpload(e, 'cliente')} />
                  {/* CSV input — prospect */}
                  <input type="file" accept=".csv" className="hidden" ref={fileInputRefProspect}
                    onChange={e => handleFileUpload(e, 'potenziale')} />

                  <button onClick={() => csvRef.current?.click()}
                    className={`bg-white dark:bg-gray-800 border-2 dark:border-gray-700 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all text-sm ${accentCls}`}>
                    <Upload size={18} /> <span className="hidden md:inline">Importa CSV</span>
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
                  ) : list.map(contact => (
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

    </div>
  );
};
