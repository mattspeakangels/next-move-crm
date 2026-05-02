import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Asset, AssetStatus } from '../types';
import {
  Package, Plus, X, Pencil, Trash2, Search, AlertTriangle, CheckCircle,
  Clock, Archive, ChevronDown, ChevronUp, Calendar, Hash, Euro,
} from 'lucide-react';
import { useToast } from '../components/ui/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AssetStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  attivo:          { label: 'Attivo',          color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/30',  icon: <CheckCircle size={13} /> },
  scaduto:         { label: 'Scaduto',         color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', icon: <Clock size={13} /> },
  'da-sostituire': { label: 'Da sostituire',   color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30',      icon: <AlertTriangle size={13} /> },
  dismesso:        { label: 'Dismesso',        color: 'text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-700',       icon: <Archive size={13} /> },
};

// ─── Form ─────────────────────────────────────────────────────────────────────

interface AssetFormProps {
  contacts: Record<string, { company: string }>;
  initial?: Partial<Asset>;
  onSave: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ contacts, initial, onSave, onClose }) => {
  const [data, setData] = useState({
    contactId: initial?.contactId ?? '',
    description: initial?.description ?? '',
    serialNumber: initial?.serialNumber ?? '',
    installDate: initial?.installDate ? new Date(initial.installDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    expiryDate: initial?.expiryDate ? new Date(initial.expiryDate).toISOString().split('T')[0] : '',
    status: (initial?.status ?? 'attivo') as AssetStatus,
    purchaseAmount: initial?.purchaseAmount ? String(initial.purchaseAmount) : '',
    notes: initial?.notes ?? '',
  });

  const valid = data.contactId && data.description && data.installDate;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      contactId: data.contactId,
      description: data.description,
      serialNumber: data.serialNumber || undefined,
      installDate: new Date(data.installDate).getTime(),
      expiryDate: data.expiryDate ? new Date(data.expiryDate).getTime() : undefined,
      status: data.status,
      purchaseAmount: data.purchaseAmount ? parseFloat(data.purchaseAmount) : undefined,
      notes: data.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-black text-sm uppercase tracking-widest dark:text-white">
            {initial?.id ? 'Modifica Asset' : 'Nuovo Asset'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Cliente */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Cliente *</label>
            <select
              value={data.contactId}
              onChange={e => setData(d => ({ ...d, contactId: e.target.value }))}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-white dark:bg-gray-900 dark:text-white font-bold text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Seleziona cliente...</option>
              {Object.values(contacts).sort((a, b) => a.company.localeCompare(b.company)).map((c: any) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </select>
          </div>

          {/* Descrizione */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Descrizione *</label>
            <input
              type="text"
              placeholder="Es. Trapano MK2 Pro, Software ERP modulo vendite..."
              value={data.description}
              onChange={e => setData(d => ({ ...d, description: e.target.value }))}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-white dark:bg-gray-900 dark:text-white font-bold text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Serial */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Seriale</label>
              <input
                type="text"
                placeholder="SN-001234"
                value={data.serialNumber}
                onChange={e => setData(d => ({ ...d, serialNumber: e.target.value }))}
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-white dark:bg-gray-900 dark:text-white font-bold text-sm outline-none focus:border-indigo-400"
              />
            </div>

            {/* Importo */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Importo €</label>
              <input
                type="number"
                placeholder="0"
                value={data.purchaseAmount}
                onChange={e => setData(d => ({ ...d, purchaseAmount: e.target.value }))}
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-white dark:bg-gray-900 dark:text-white font-bold text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Data installazione */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Data installazione *</label>
              <input
                type="date"
                value={data.installDate}
                onChange={e => setData(d => ({ ...d, installDate: e.target.value }))}
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-white dark:bg-gray-900 dark:text-white font-bold text-sm outline-none focus:border-indigo-400"
              />
            </div>

            {/* Data scadenza */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Scadenza contratto</label>
              <input
                type="date"
                value={data.expiryDate}
                onChange={e => setData(d => ({ ...d, expiryDate: e.target.value }))}
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-white dark:bg-gray-900 dark:text-white font-bold text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Stato */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Stato</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STATUS_CONFIG) as AssetStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setData(d => ({ ...d, status: s }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    data.status === s
                      ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} ring-2 ring-current ring-offset-1`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}
                >
                  {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Note</label>
            <textarea
              rows={2}
              placeholder="Informazioni aggiuntive..."
              value={data.notes}
              onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
              className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 bg-white dark:bg-gray-900 dark:text-white font-bold text-sm outline-none focus:border-indigo-400 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!valid}
            className={`w-full py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors ${
              valid ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {initial?.id ? 'Salva Modifiche' : 'Aggiungi Asset'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AssetsView: React.FC = () => {
  const { assets, contacts, addAsset, updateAsset, removeAsset } = useStore();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<AssetStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

  const allAssets = Object.values(assets);
  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;

  // KPI
  const kpiAttivi = allAssets.filter(a => a.status === 'attivo').length;
  const kpiDaSostituire = allAssets.filter(a => a.status === 'da-sostituire').length;
  const kpiScaduti = allAssets.filter(a => a.status === 'scaduto').length;
  const kpiInScadenza = allAssets.filter(a =>
    a.status === 'attivo' && a.expiryDate && a.expiryDate - now < days30 && a.expiryDate > now
  ).length;

  // Filter
  const filtered = allAssets.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    const company = contacts[a.contactId]?.company ?? '';
    if (search && !a.description.toLowerCase().includes(search.toLowerCase()) &&
        !company.toLowerCase().includes(search.toLowerCase()) &&
        !(a.serialNumber ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by contact
  const byContact = new Map<string, Asset[]>();
  filtered.forEach(a => {
    if (!byContact.has(a.contactId)) byContact.set(a.contactId, []);
    byContact.get(a.contactId)!.push(a);
  });

  const handleAdd = (data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    addAsset({ ...data, id: `asset_${Date.now()}`, createdAt: Date.now(), updatedAt: Date.now() });
    showToast('Asset aggiunto!', 'success');
    setShowForm(false);
  };

  const handleEdit = (data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingAsset) return;
    updateAsset(editingAsset.id, data);
    showToast('Asset aggiornato!', 'success');
    setEditingAsset(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Eliminare questo asset?')) {
      removeAsset(id);
      showToast('Asset eliminato', 'success');
    }
  };

  const daysUntilExpiry = (expiryDate?: number) => {
    if (!expiryDate) return null;
    return Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Parco Installato</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Asset dei clienti</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus size={16} /> Aggiungi
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Attivi', value: kpiAttivi, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Da sostituire', value: kpiDaSostituire, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Scaduti', value: kpiScaduti, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { label: 'In scadenza 30gg', value: kpiInScadenza, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Alert: in scadenza */}
      {kpiInScadenza > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0" />
          <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
            {kpiInScadenza} asset in scadenza nei prossimi 30 giorni — ottima occasione di rinnovo!
          </p>
        </div>
      )}

      {/* Alert: da sostituire */}
      {kpiDaSostituire > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-bold text-red-700 dark:text-red-300">
            {kpiDaSostituire} asset marcati "Da sostituire" — contatta i clienti per la sostituzione.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca asset, seriale, cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-sm outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-2xl p-1 border border-gray-100 dark:border-gray-700">
          <button onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
            Tutti
          </button>
          {(Object.keys(STATUS_CONFIG) as AssetStatus[]).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === s ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}` : 'text-gray-400 hover:text-gray-600'}`}>
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {allAssets.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl">
          <Package size={44} className="mx-auto mb-4 text-gray-200 dark:text-gray-600" />
          <p className="font-black uppercase tracking-widest text-gray-300 dark:text-gray-600 text-sm">Nessun asset registrato</p>
          <p className="text-xs text-gray-400 mt-1">Aggiungi i prodotti/servizi installati presso i clienti</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors"
          >
            Aggiungi il primo asset
          </button>
        </div>
      )}

      {/* Asset grouped by contact */}
      <div className="space-y-3">
        {Array.from(byContact.entries()).map(([contactId, contactAssets]) => {
          const company = contacts[contactId]?.company ?? 'Cliente sconosciuto';
          const isExpanded = expandedContact === contactId;
          const hasAlert = contactAssets.some(a => a.status === 'da-sostituire' || a.status === 'scaduto' ||
            (a.status === 'attivo' && a.expiryDate && a.expiryDate - now < days30 && a.expiryDate > now));

          return (
            <div key={contactId} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setExpandedContact(isExpanded ? null : contactId)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                    <Package size={16} className="text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm dark:text-white">{company}</p>
                    <p className="text-[10px] text-gray-400 font-bold">
                      {contactAssets.length} asset · €{contactAssets.reduce((s, a) => s + (a.purchaseAmount ?? 0), 0).toLocaleString('it-IT')}
                    </p>
                  </div>
                  {hasAlert && <AlertTriangle size={14} className="text-red-500 ml-1" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {contactAssets.map(a => (
                      <span key={a.id} className={`w-2.5 h-2.5 rounded-full ${
                        a.status === 'attivo' ? 'bg-green-400' :
                        a.status === 'da-sostituire' ? 'bg-red-400' :
                        a.status === 'scaduto' ? 'bg-orange-400' : 'bg-gray-300'
                      }`} />
                    ))}
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-50 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
                  {contactAssets.map(asset => {
                    const days = daysUntilExpiry(asset.expiryDate);
                    return (
                      <div key={asset.id} className="px-5 py-4 flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-black text-sm dark:text-white">{asset.description}</p>
                            <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_CONFIG[asset.status].bg} ${STATUS_CONFIG[asset.status].color}`}>
                              {STATUS_CONFIG[asset.status].icon} {STATUS_CONFIG[asset.status].label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 font-bold">
                            {asset.serialNumber && (
                              <span className="flex items-center gap-1"><Hash size={10} /> {asset.serialNumber}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar size={10} /> {new Date(asset.installDate).toLocaleDateString('it-IT')}
                            </span>
                            {asset.purchaseAmount && (
                              <span className="flex items-center gap-1"><Euro size={10} /> {asset.purchaseAmount.toLocaleString('it-IT')}</span>
                            )}
                            {days !== null && (
                              <span className={`flex items-center gap-1 font-black ${
                                days < 0 ? 'text-red-500' : days < 30 ? 'text-yellow-500' : 'text-gray-400'
                              }`}>
                                <Clock size={10} />
                                {days < 0 ? `Scaduto ${Math.abs(days)}gg fa` : days === 0 ? 'Scade oggi' : `Scade in ${days}gg`}
                              </span>
                            )}
                          </div>
                          {asset.notes && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 italic">{asset.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingAsset(asset)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Form modals */}
      {showForm && (
        <AssetForm contacts={contacts} onSave={handleAdd} onClose={() => setShowForm(false)} />
      )}
      {editingAsset && (
        <AssetForm contacts={contacts} initial={editingAsset} onSave={handleEdit} onClose={() => setEditingAsset(null)} />
      )}
    </div>
  );
};
