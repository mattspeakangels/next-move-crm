import { confirmAction } from '../ui/Feedback';
import { Plus, Phone, MapPin, Building2, X, Users, UserPlus, Trash2, Upload, History, Link, ArrowUp, ArrowDown, Star, RefreshCw } from 'lucide-react';
import { SearchDropdown } from '../ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../../utils/search';
import { ContactsModel, type ContactDraft } from './useContactsView';

export function ContactListPanel({ v }: { v: ContactsModel }) {
  const { initialSearch, onClearFilter, contacts, updateContact, deleteContact, searchTerm, setSearchTerm, fileInputRef, setDetailContact, setEditingContact, setPendingDeleteAll, setHistoryContact, setShowImportModal, activeTab, setActiveTab, topFilter, setTopFilter, subFilter, setSubFilter, visibleCount, setVisibleCount, sortBy, setSortBy, sortDir, setSortDir, clientiCount, prospectCount, rankedFilteredList, fileInputRefProspect, openDetail, handleFileUpload, recheckDealerClassification } = v;
  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-2xl dark:text-foreground">Clienti</h1>
          <p className="cockpit-page-description">Relazioni, contatti e opportunità in un unico posto.</p>
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
            <div className="cockpit-filter-bar flex flex-col md:flex-row gap-3">
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
                const newContact: ContactDraft = {
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
                          contact.customerType === 'dealer' ? 'bg-accent-soft text-accent' : 'bg-accent-soft text-accent'
                        }`}>
                          {contact.customerType === 'dealer' ? 'Dealer' : 'End User'}
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
                      {contact.city || 'Città non inserita'} {contact.province ? `(${contact.province})` : ''}
                    </p>
                    <p className="flex items-center gap-2 text-xs font-bold text-secondary dark:text-muted">
                      <Phone size={13} className="text-muted flex-shrink-0" />
                      {contact.phone || 'Nessun telefono'}
                    </p>
                    {(contact.stakeholders?.length ?? 0) > 0 && (
                      <p className={`flex items-center gap-1.5 text-xs font-bold w-max px-2 py-1 rounded-lg mt-2 ${isProspect ? 'text-warning bg-warning-soft dark:bg-warning-soft' : 'text-accent bg-accent-soft dark:bg-accent-soft/20'}`}>
                        <Users size={13} /> {(contact.stakeholders?.length ?? 0)} Referent{(contact.stakeholders?.length ?? 0) === 1 ? 'e' : 'i'}
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
  );
}
