import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../utils/search';
import { Upload, TrendingUp, Target, Zap, AlertTriangle, Euro, BarChart3, Star, RefreshCw } from 'lucide-react';
import { fmtEur, fatturatoAnno } from '../lib/storicoFormat';
import { KPICard } from '../components/storico/StoricoCards';
import { useStoricoView } from '../components/storico/useStoricoView';
import { StoricoTab } from '../components/storico/StoricoTab';
import { RiepilogoTab } from '../components/storico/RiepilogoTab';
import { BudgetTab } from '../components/storico/BudgetTab';
import { PipelineTab } from '../components/storico/PipelineTab';
import { PipelineModal } from '../components/storico/PipelineModal';

export function StoricoView() {
  const v = useStoricoView();
  const { clienti, fileName, anni, loading, firestoreLoading, activeTab, setActiveTab, searchQuery, setSearchQuery, setPage, fileRef, handleReset, pipelineModal, onDrop, onFileChange, annoCorr, annoPrev, totCorr, totPrev, deltaYoY, dormienti, nuoviCorr } = v;

  // ── EMPTY STATE ────────────────────────────────────────────────────────────
  if (clienti.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl  text-foreground dark:text-foreground tracking-tight">Storico Vendite & Pipeline</h1>
          <p className="text-muted text-sm mt-1">Carica il file Excel dello storico per generare la pipeline intelligente</p>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !firestoreLoading && fileRef.current?.click()}
          className="border-2 border-dashed border-line dark:border-line rounded-panel p-8 sm:p-16 text-center cursor-pointer hover:border-accent hover:bg-accent-soft/50 dark:hover:bg-accent-soft/10 transition-all group"
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.numbers" className="hidden" onChange={onFileChange} />
          {(loading || firestoreLoading)
            ? <RefreshCw size={40} className="mx-auto text-accent animate-spin mb-4" />
            : <Upload size={40} className="mx-auto text-muted group-hover:text-accent mb-4 transition-colors" />
          }
          <h3 className="font-semibold text-foreground dark:text-foreground text-lg mb-2">
            {loading ? 'Elaborazione in corso…' : firestoreLoading ? 'Caricamento dati dal cloud…' : 'Carica Storico Vendite'}
          </h3>
          <p className="text-muted text-sm mb-4">
            Trascina qui il file Excel (.xlsx) o clicca per selezionarlo
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted">
            <span className="bg-raised dark:bg-raised px-3 py-1 rounded-full">Formato standard ✓</span>
            <span className="bg-raised dark:bg-raised px-3 py-1 rounded-full">Anno 2024 ✓</span>
            <span className="bg-raised dark:bg-raised px-3 py-1 rounded-full">Anno 2025 ✓</span>
            <span className="bg-raised dark:bg-raised px-3 py-1 rounded-full">Pivot Excel ✓</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: BarChart3, label: 'Analisi storico per cliente', color: 'text-accent' },
            { icon: Target, label: 'Budget mensile configurabile', color: 'text-success' },
            { icon: Zap, label: 'Deal suggeriti automaticamente', color: 'text-warning' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="bg-surface dark:bg-surface rounded-panel p-5 border border-line dark:border-line">
              <Icon size={28} className={`${color} mx-auto mb-3`} />
              <p className="text-xs font-bold text-secondary dark:text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl  text-foreground dark:text-foreground tracking-tight">Storico & Pipeline</h1>
          <p className="text-muted text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            {fileName} · {clienti.length} clienti · Anni: {anni.join(', ')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-secondary bg-raised dark:bg-raised rounded-md hover:bg-raised transition-colors"
          >
            <Upload size={15} /> Cambia file
          </button>
        </div>
      </div>

      {/* Barra di ricerca */}
      <SearchDropdown
        value={searchQuery}
        onChange={v => { setSearchQuery(v); setPage(0); }}
        onSelect={c => { setSearchQuery(c.nome || `#${c.clientId}`); setPage(0); }}
        placeholder="Cerca cliente…"
        inputWrapperClassName={() => 'flex items-center gap-2 bg-canvas dark:bg-surface border-2 border-line dark:border-line rounded-panel px-3 py-2.5 focus-within:border-accent transition-colors'}
        results={(searchQuery.trim()
          ? sortByRelevance(searchQuery, clienti.filter(c => matchSearch(searchQuery, [c.nome])), c => [c.nome]).slice(0, 8)
          : []
        ).map(c => ({
          key: String(c.clientId),
          item: c,
          label: c.nome || `#${c.clientId}`,
          sublabel: `${fmtEur(fatturatoAnno(c, annoCorr))} (${annoCorr})`,
        }))}
      />

      {/* KPI Row */}
      <div className="cockpit-history-summary grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={`Fatturato ${annoPrev}`} value={fmtEur(totPrev)} sub={`${clienti.filter(c => fatturatoAnno(c, annoPrev) > 0).length} clienti attivi`} color="bg-action" icon={Euro} />
        <KPICard label={`Fatturato ${annoCorr}`} value={fmtEur(totCorr)} sub={`${deltaYoY > 0 ? '+' : ''}${deltaYoY.toFixed(1)}% vs ${annoPrev}`} color={deltaYoY >= 0 ? 'bg-success' : 'bg-danger'} icon={TrendingUp} />
        <KPICard label="Clienti Dormienti" value={String(dormienti.length)} sub={`attivi ${annoPrev}, assenti ${annoCorr}`} color="bg-warning" icon={AlertTriangle} />
        <KPICard label={`Nuovi ${annoCorr}`} value={String(nuoviCorr.length)} sub={`non presenti in ${annoPrev}`} color="bg-action" icon={Star} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-raised dark:bg-surface p-1 rounded-panel w-full sm:w-fit overflow-x-auto scrollbar-hide">
        {(['storico', 'riepilogo', 'budget', 'pipeline'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-5 py-2 rounded-md text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-surface dark:bg-raised shadow text-foreground dark:text-foreground' : 'text-secondary hover:text-foreground'}`}
          >
            {tab === 'storico' ? '📊 Storico' : tab === 'riepilogo' ? '📋 Riepilogo Cliente' : tab === 'budget' ? '🎯 Budget' : '⚡ Pipeline AI'}
          </button>
        ))}
      </div>

      {/* ── TAB: STORICO ── */}
      {activeTab === 'storico' && <StoricoTab v={v} />}

      {/* ── TAB: RIEPILOGO PER CLIENTE ── */}
      {activeTab === 'riepilogo' && <RiepilogoTab v={v} />}

      {/* ── TAB: BUDGET ── */}
      {activeTab === 'budget' && <BudgetTab v={v} />}

      {/* ── TAB: PIPELINE AI ── */}
      {activeTab === 'pipeline' && <PipelineTab v={v} />}

      {/* ── MODAL: Aggiungi a Pipeline ─────────────────────────────────────── */}
      {pipelineModal && <PipelineModal v={v} />}
    </div>
  );
}
