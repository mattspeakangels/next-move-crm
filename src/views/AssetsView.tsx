import { confirmAction } from '../components/ui/Feedback';
import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Asset, AssetStatus } from '../types';
import {
  Package, Plus, X, Pencil, Trash2, AlertTriangle, CheckCircle,
  Clock, Archive, ChevronDown, ChevronUp, Calendar, Hash, Euro,
} from 'lucide-react';
import { useToast } from '../components/ui/ToastContext';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../utils/search';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AssetStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  attivo:          { label: 'Attivo',          color: 'text-success',  bg: 'bg-success-soft dark:bg-success-soft',  icon: <CheckCircle size={13} /> },
  scaduto:         { label: 'Scaduto',         color: 'text-warning', bg: 'bg-warning-soft dark:bg-warning-soft', icon: <Clock size={13} /> },
  'da-sostituire': { label: 'Da sostituire',   color: 'text-danger',    bg: 'bg-danger-soft dark:bg-danger-soft',      icon: <AlertTriangle size={13} /> },
  dismesso:        { label: 'Dismesso',        color: 'text-muted',   bg: 'bg-raised dark:bg-raised',       icon: <Archive size={13} /> },
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
  const [contactSearch, setContactSearch] = useState(() => (initial?.contactId && contacts[initial.contactId]?.company) || '');

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
    <DialogFrame className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface dark:bg-surface rounded-panel shadow-panel w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-line dark:border-line">
          <h2 className="font-semibold text-sm   dark:text-foreground">
            {initial?.id ? 'Modifica Asset' : 'Nuovo Asset'}
          </h2>
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="p-1.5 text-muted hover:text-secondary rounded-md hover:bg-raised dark:hover:bg-raised">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Cliente */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-normal text-muted block mb-1.5">Cliente *</label>
            <SearchDropdown
              value={contactSearch}
              onChange={v => { setContactSearch(v); if (data.contactId) setData(d => ({ ...d, contactId: '' })); }}
              placeholder="Cerca cliente per nome, azienda..."
              showWhenEmpty
              totalCount={Object.keys(contacts).length}
              inputWrapperClassName={() => 'w-full flex items-center gap-2 border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-surface dark:bg-canvas dark:text-foreground font-bold text-sm outline-none focus-within:border-accent transition-all'}
              results={sortByRelevance(contactSearch, (contactSearch.trim()
                ? Object.values(contacts).filter((c: any) => matchSearch(contactSearch, [c.company]))
                : Object.values(contacts)
              ), (c: any) => [c.company]).slice(0, 8).map((c: any) => ({
                key: c.id,
                item: c,
                label: c.company,
              }))}
              onSelect={(c: any) => { setData(d => ({ ...d, contactId: c.id })); setContactSearch(c.company); }}
            />
          </div>

          {/* Descrizione */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-normal text-muted block mb-1.5">Descrizione *</label>
            <input
              type="text"
              placeholder="Es. Trapano MK2 Pro, Software ERP modulo vendite..."
              value={data.description}
              onChange={e => setData(d => ({ ...d, description: e.target.value }))}
              className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-surface dark:bg-canvas dark:text-foreground font-bold text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Serial */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-normal text-muted block mb-1.5">Seriale</label>
              <input
                type="text"
                placeholder="SN-001234"
                value={data.serialNumber}
                onChange={e => setData(d => ({ ...d, serialNumber: e.target.value }))}
                className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-surface dark:bg-canvas dark:text-foreground font-bold text-sm outline-none focus:border-accent"
              />
            </div>

            {/* Importo */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-normal text-muted block mb-1.5">Importo €</label>
              <input
                type="number"
                placeholder="0"
                value={data.purchaseAmount}
                onChange={e => setData(d => ({ ...d, purchaseAmount: e.target.value }))}
                className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-surface dark:bg-canvas dark:text-foreground font-bold text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Data installazione */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-normal text-muted block mb-1.5">Data installazione *</label>
              <input
                type="date"
                value={data.installDate}
                onChange={e => setData(d => ({ ...d, installDate: e.target.value }))}
                className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-surface dark:bg-canvas dark:text-foreground font-bold text-sm outline-none focus:border-accent"
              />
            </div>

            {/* Data scadenza */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-normal text-muted block mb-1.5">Scadenza contratto</label>
              <input
                type="date"
                value={data.expiryDate}
                onChange={e => setData(d => ({ ...d, expiryDate: e.target.value }))}
                className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-surface dark:bg-canvas dark:text-foreground font-bold text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Stato */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-normal text-muted block mb-2">Stato</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STATUS_CONFIG) as AssetStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setData(d => ({ ...d, status: s }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${
                    data.status === s
                      ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} ring-2 ring-current ring-offset-1`
                      : 'bg-raised dark:bg-raised text-muted'
                  }`}
                >
                  {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-normal text-muted block mb-1.5">Note</label>
            <textarea
              rows={2}
              placeholder="Informazioni aggiuntive..."
              value={data.notes}
              onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
              className="w-full border-2 border-line dark:border-line rounded-panel px-4 py-3 bg-surface dark:bg-canvas dark:text-foreground font-bold text-sm outline-none focus:border-accent resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!valid}
            className={`w-full py-3.5 rounded-panel font-semibold uppercase text-xs tracking-normal transition-colors ${
              valid ? 'bg-action text-action-foreground hover:bg-action-hover' : 'bg-raised text-muted cursor-not-allowed'
            }`}
          >
            {initial?.id ? 'Salva Modifiche' : 'Aggiungi Asset'}
          </button>
        </div>
      </div>
    </DialogFrame>
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
    const contact = contacts[a.contactId];
    if (search && !matchSearch(search, [
      a.description, a.serialNumber, contact?.company, contact?.contactName, contact?.city,
    ])) return false;
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

  const handleDelete = async (id: string) => {
    if (await confirmAction('Eliminare questo asset?')) {
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
          <h1 className="text-2xl  dark:text-foreground  ">Parco Installato</h1>
          <p className="text-muted text-sm font-bold uppercase tracking-normal">Asset dei clienti</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-action text-action-foreground px-5 py-2.5 rounded-panel font-bold flex items-center gap-2 shadow-panel hover:bg-action-hover transition-colors text-sm"
        >
          <Plus size={16} /> Aggiungi
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Attivi', value: kpiAttivi, color: 'text-success', bg: 'bg-success-soft dark:bg-success-soft' },
          { label: 'Da sostituire', value: kpiDaSostituire, color: 'text-danger', bg: 'bg-danger-soft dark:bg-danger-soft' },
          { label: 'Scaduti', value: kpiScaduti, color: 'text-warning', bg: 'bg-warning-soft dark:bg-warning-soft' },
          { label: 'In scadenza 30gg', value: kpiInScadenza, color: 'text-warning', bg: 'bg-warning-soft dark:bg-warning-soft' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-panel p-4 text-center`}>
            <p className={`text-2xl font-semibold ${k.color}`}>{k.value}</p>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Alert: in scadenza */}
      {kpiInScadenza > 0 && (
        <div className="bg-warning-soft dark:bg-warning-soft border-2 border-warning dark:border-warning rounded-panel px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-warning flex-shrink-0" />
          <p className="text-sm font-bold text-warning dark:text-warning">
            {kpiInScadenza} asset in scadenza nei prossimi 30 giorni — ottima occasione di rinnovo!
          </p>
        </div>
      )}

      {/* Alert: da sostituire */}
      {kpiDaSostituire > 0 && (
        <div className="bg-danger-soft dark:bg-danger-soft border-2 border-danger dark:border-danger rounded-panel px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-danger flex-shrink-0" />
          <p className="text-sm font-bold text-danger dark:text-danger">
            {kpiDaSostituire} asset marcati "Da sostituire" — contatta i clienti per la sostituzione.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchDropdown
          className="flex-1 min-w-[200px]"
          value={search}
          onChange={setSearch}
          onSelect={a => setSearch(a.description)}
          placeholder="Cerca asset, seriale, cliente..."
          inputWrapperClassName={() => 'flex items-center gap-2 pl-3.5 pr-4 py-3 bg-surface dark:bg-surface border-2 border-line dark:border-line rounded-panel font-bold text-sm outline-none focus-within:border-accent'}
          results={(search.trim()
            ? allAssets.filter(a => {
                const q = search.toLowerCase();
                const company = contacts[a.contactId]?.company ?? '';
                return a.description.toLowerCase().includes(q) ||
                  company.toLowerCase().includes(q) ||
                  (a.serialNumber ?? '').toLowerCase().includes(q);
              }).slice(0, 8)
            : []
          ).map(a => ({
            key: a.id,
            item: a,
            label: a.description,
            sublabel: [contacts[a.contactId]?.company, a.serialNumber].filter(Boolean).join(' · '),
          }))}
        />
        <div className="flex gap-1 bg-surface dark:bg-surface rounded-panel p-1 border border-line dark:border-line">
          <button onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${filterStatus === 'all' ? 'bg-action text-action-foreground' : 'text-muted hover:text-secondary'}`}>
            Tutti
          </button>
          {(Object.keys(STATUS_CONFIG) as AssetStatus[]).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${filterStatus === s ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}` : 'text-muted hover:text-secondary'}`}>
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {allAssets.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-line dark:border-line rounded-panel">
          <Package size={44} className="mx-auto mb-4 text-muted dark:text-secondary" />
          <p className="font-semibold uppercase tracking-normal text-muted dark:text-secondary text-sm">Nessun asset registrato</p>
          <p className="text-xs text-muted mt-1">Aggiungi i prodotti/servizi installati presso i clienti</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-action text-action-foreground px-5 py-2.5 rounded-panel font-bold text-sm hover:bg-action-hover transition-colors"
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
            <div key={contactId} className="bg-surface dark:bg-surface rounded-panel shadow-sm border border-line dark:border-line overflow-hidden">
              <button
                onClick={() => setExpandedContact(isExpanded ? null : contactId)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-canvas dark:hover:bg-raised/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-accent-soft dark:bg-accent-soft/30 rounded-md flex items-center justify-center">
                    <Package size={16} className="text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm dark:text-foreground">{company}</p>
                    <p className="text-xs text-muted font-bold">
                      {contactAssets.length} asset · €{contactAssets.reduce((s, a) => s + (a.purchaseAmount ?? 0), 0).toLocaleString('it-IT')}
                    </p>
                  </div>
                  {hasAlert && <AlertTriangle size={14} className="text-danger ml-1" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {contactAssets.map(a => (
                      <span key={a.id} className={`w-2.5 h-2.5 rounded-full ${
                        a.status === 'attivo' ? 'bg-success' :
                        a.status === 'da-sostituire' ? 'bg-danger' :
                        a.status === 'scaduto' ? 'bg-warning' : 'bg-raised'
                      }`} />
                    ))}
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-line dark:border-line divide-y divide-line dark:divide-line">
                  {contactAssets.map(asset => {
                    const days = daysUntilExpiry(asset.expiryDate);
                    return (
                      <div key={asset.id} className="px-5 py-4 flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-sm dark:text-foreground">{asset.description}</p>
                            <span className={`flex items-center gap-1 text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${STATUS_CONFIG[asset.status].bg} ${STATUS_CONFIG[asset.status].color}`}>
                              {STATUS_CONFIG[asset.status].icon} {STATUS_CONFIG[asset.status].label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted font-bold">
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
                                days < 0 ? 'text-danger' : days < 30 ? 'text-warning' : 'text-muted'
                              }`}>
                                <Clock size={10} />
                                {days < 0 ? `Scaduto ${Math.abs(days)}gg fa` : days === 0 ? 'Scade oggi' : `Scade in ${days}gg`}
                              </span>
                            )}
                          </div>
                          {asset.notes && (
                            <p className="text-xs text-secondary dark:text-muted mt-1 italic">{asset.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingAsset(asset)}
                            className="p-2 text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/20 rounded-md transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="p-2 text-muted hover:text-danger hover:bg-danger-soft dark:hover:bg-danger-soft rounded-md transition-colors"
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
