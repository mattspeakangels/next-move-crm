import { showNotice } from '../components/ui/Feedback';
import { DialogFrame } from '../components/ui/DialogFrame';
import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from '../lib/spreadsheet';
import { useStoricoStore } from '../store/storicoStore';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../lib/authContext';
import { saveStoricoToFirestore, loadStoricoFromFirestore, deleteStoricoFromFirestore } from '../lib/storicoFirestore';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch, sortByRelevance } from '../utils/search';
import {
  Upload, TrendingUp, TrendingDown, Target, Zap, AlertTriangle,
  ChevronDown, ChevronUp, Euro, BarChart3,
  Star, ArrowRight, RefreshCw,
  Minus, Plus, X, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import type { DealSuggerito } from '../utils/pipelineSuggestions';
import { MESI, generaDeal, getSeasonalBase } from '../utils/pipelineSuggestions';


import { detectColumns, parseCSVData, convertToClienteRecord, isPivotFormat, parsePivotData } from '../lib/storicoParse';
import { analyzeClientSignals } from '../lib/storicoSignals';
import { fmt, fmtEur } from '../lib/storicoFormat';
import { KPICard, DealCard } from '../components/storico/StoricoCards';

// ─── MAIN VIEW ────────────────────────────────────────────────────────────────

export function StoricoView() {
  // ── Stato persistente (Zustand store con persist su localStorage) ──
  const { clienti, clientiDettagliati, fileName, anni, budget, setClienti, setClientiDettagliati, setFileName, setAnni, setBudget, reset } = useStoricoStore();
  const { contacts, addDeal } = useStore();
  const { showToast } = useToast();
  const { user } = useAuth();

  // ── Stato locale di UI (non serve che sopravviva alla navigazione) ──
  const [loading, setLoading] = useState(false);
  const [firestoreLoading, setFirestoreLoading] = useState(false);
  const [budgetMode, setBudgetMode] = useState<'annuale' | 'mensile'>('annuale');
  const [activeTab, setActiveTab] = useState<'storico' | 'riepilogo' | 'budget' | 'pipeline'>('storico');
  const [riepilogoSearch, setRiepilogoSearch] = useState('');
  const [sortField, setSortField] = useState<'id' | 'f2023' | 'f2024' | 'delta'>('f2024');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterDormienti, setFilterDormienti] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Caricamento da Firestore al primo accesso (sync cross-device) ──
  useEffect(() => {
    if (!user || clienti.length > 0) return;
    setFirestoreLoading(true);
    loadStoricoFromFirestore()
      .then(data => {
        if (data) {
          setClienti(data.clienti);
          setClientiDettagliati(data.clientiDettagliati);
          setFileName(data.fileName);
          setAnni(data.anni);
          setBudget(data.budget);
        }
      })
      .catch(() => { /* fallback silenzioso: mostra upload prompt */ })
      .finally(() => setFirestoreLoading(false));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = useCallback(async () => {
    reset();
    if (user) {
      deleteStoricoFromFirestore().catch(() => {});
    }
  }, [user, reset]);

  // ── Analisi ordini dal passato ──
  const clientiSignals = clientiDettagliati.map(c => analyzeClientSignals(c, new Date())).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  // ── Pipeline modal ──
  const [pipelineModal, setPipelineModal] = useState<DealSuggerito | null>(null);
  const [pmContactId, setPmContactId] = useState('');
  const [pmValue, setPmValue] = useState(0);

  // Normalizza nome per confronto fuzzy: maiuscolo, no spazi doppi, no punteggiatura
  const normName = (s: string) =>
    s.toUpperCase().trim().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ');

  const findContactByName = (nomeStorico: string) => {
    const key = normName(nomeStorico);
    const all = Object.values(contacts);
    // Match esatto
    const exact = all.find(c => normName(c.company) === key);
    if (exact) return exact;
    // Match parziale: uno contiene l'altro (min 6 caratteri per sicurezza)
    if (key.length >= 6) {
      return all.find(c => {
        const cn = normName(c.company);
        return cn.length >= 6 && (cn.includes(key) || key.includes(cn));
      });
    }
    return undefined;
  };

  const openPipelineModal = (deal: DealSuggerito) => {
    setPipelineModal(deal);
    const matched = findContactByName(deal.nomeCliente);
    setPmContactId(matched?.id ?? '');
    setPmValue(deal.valoreStimato);
  };

  const confirmAddToPipeline = () => {
    if (!pipelineModal) return;
    const now = Date.now();
    const prodStr = pipelineModal.prodottiSuggeriti.length > 0
      ? `\nProdotti suggeriti: ${pipelineModal.prodottiSuggeriti.join(', ')}`
      : '';
    addDeal({
      id: `deal_storico_${now}`,
      contactId: pmContactId,
      value: pmValue,
      probability: pipelineModal.priorita === 'alta' ? 70 : pipelineModal.priorita === 'media' ? 50 : 30,
      products: pipelineModal.prodottiSuggeriti,
      stage: 'lead',
      nextAction: pipelineModal.motivazione,
      nextActionDeadline: now + 7 * 24 * 60 * 60 * 1000, // +7 giorni
      nextActionType: 'chiama',
      nextActionPriority: pipelineModal.priorita === 'alta' ? 'alta' : pipelineModal.priorita === 'media' ? 'media' : 'bassa',
      notes: `[Da Storico] Cliente #${pipelineModal.clientId} — ${pipelineModal.motivazione}${prodStr}`,
      nomeStorico: pipelineModal.nomeCliente,
      createdAt: now,
      updatedAt: now,
    });
    showToast('Deal aggiunto alla Pipeline! ✅', 'success');
    setPipelineModal(null);
  };

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });

      // Prova ogni foglio in ordine e usa il primo con colonne valide
      let rows: string[][] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const candidate = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];
        const cols = detectColumns(candidate);
        const valid = cols.colCustomerName >= 0 && cols.colItemId >= 0 && cols.colItemName >= 0 && cols.colDate >= 0
          && (cols.yearAmountCols.length > 0 || cols.colAmount >= 0);
        if (valid) { rows = candidate; break; }
      }
      if (rows.length === 0) {
        // Fallback al primo foglio
        rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as string[][];
      }

      // Detect which years are present — dalle intestazioni (formato wide) o dalla colonna Anno (formato long)
      const anniSet = new Set<string>();
      const detectedCols = detectColumns(rows);
      if (detectedCols.isLongFormat && detectedCols.colAnno >= 0) {
        // Formato long: scansiona la colonna Anno su tutte le righe dati
        for (const row of rows.slice(1)) {
          const v = row[detectedCols.colAnno];
          const y = typeof v === 'number' ? v : parseInt(String(v || ''));
          if (y >= 2023 && y <= 2026) anniSet.add(String(y));
        }
      } else {
        // Formato wide: anni codificati nelle intestazioni
        for (const row of rows.slice(0, 3)) {
          for (const cell of row) {
            const s = String(cell || '');
            ['2023','2024','2025','2026'].forEach(y => { if (s.includes(y)) anniSet.add(y); });
          }
        }
      }
      setAnni([...anniSet].sort());

      const parsedDettagliato = isPivotFormat(rows) ? parsePivotData(rows) : parseCSVData(rows);
      setClientiDettagliati(parsedDettagliato);
      const parsedRecords = parsedDettagliato.map(convertToClienteRecord);
      setClienti(parsedRecords);

      // Sync su Firestore per renderlo disponibile su tutti i dispositivi
      if (user && parsedRecords.length > 0) {
        saveStoricoToFirestore(parsedRecords, [...anniSet].sort(), file.name, budget, parsedDettagliato)
          .then(() => showToast('Storico sincronizzato sul cloud ✅', 'success'))
          .catch(() => showToast('Sync cloud fallita — dati salvati localmente', 'error'));
      }
    } catch (e) {
      showNotice('Errore nel leggere il file. Assicurati sia un file Excel o CSV valido.');
    }
    setLoading(false);
  }, [user, budget, showToast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Determina dinamicamente gli anni da confrontare in base ai dati reali
  const anniConDatiKPI = ([2023, 2024, 2025, 2026] as const).filter(y =>
    clienti.some(c => ((c as any)[`fatturato${y}`] || 0) > 0)
  );
  const annoCorr: number = anniConDatiKPI.length > 0 ? anniConDatiKPI[anniConDatiKPI.length - 1] : 2024;
  const annoPrev: number = anniConDatiKPI.length > 1 ? anniConDatiKPI[anniConDatiKPI.length - 2] : annoCorr - 1;
  const totCorr = clienti.reduce((s, c) => s + (((c as any)[`fatturato${annoCorr}`] as number) || 0), 0);
  const totPrev = clienti.reduce((s, c) => s + (((c as any)[`fatturato${annoPrev}`] as number) || 0), 0);
  // Mantieni tot2024 per compatibilità con sezione Budget che lo usa
  const tot2024 = clienti.reduce((s, c) => s + c.fatturato2024, 0);
  const deltaYoY = totPrev > 0 ? ((totCorr - totPrev) / totPrev * 100) : 0;
  const dormienti = clienti.filter(c => (((c as any)[`fatturato${annoPrev}`] as number) || 0) > 0 && (((c as any)[`fatturato${annoCorr}`] as number) || 0) === 0);
  const nuoviCorr = clienti.filter(c => (((c as any)[`fatturato${annoPrev}`] as number) || 0) === 0 && (((c as any)[`fatturato${annoCorr}`] as number) || 0) > 0);

  // Budget calculations
  const budgetAnnuale = budget.annuale || 0;
  const budgetMensileBase = budgetAnnuale / 12;
  const deals = clientiDettagliati.length > 0 ? generaDeal(clientiDettagliati) : [];
  const totalePipeline = deals.reduce((s, d) => s + d.valoreStimato, 0);
  const gapBudget = Math.max(0, budgetAnnuale - tot2024);

  // Sort clienti
  const clientiSorted = [...clienti]
    .filter(c => !filterDormienti || ((((c as any)[`fatturato${annoPrev}`] as number) || 0) > 0 && (((c as any)[`fatturato${annoCorr}`] as number) || 0) === 0))
    .filter(c => matchSearch(searchQuery, [c.nome]))
    .sort((a, b) => {
      let va = 0, vb = 0;
      if (sortField === 'id') { va = a.clientId; vb = b.clientId; }
      else if (sortField === 'f2023') { va = (((a as any)[`fatturato${annoPrev}`] as number) || 0); vb = (((b as any)[`fatturato${annoPrev}`] as number) || 0); }
      else if (sortField === 'f2024') { va = (((a as any)[`fatturato${annoCorr}`] as number) || 0); vb = (((b as any)[`fatturato${annoCorr}`] as number) || 0); }
      else if (sortField === 'delta') {
        const aPrev = (((a as any)[`fatturato${annoPrev}`] as number) || 0);
        const aCorr = (((a as any)[`fatturato${annoCorr}`] as number) || 0);
        const bPrev = (((b as any)[`fatturato${annoPrev}`] as number) || 0);
        const bCorr = (((b as any)[`fatturato${annoCorr}`] as number) || 0);
        va = aPrev > 0 ? (aCorr - aPrev) / aPrev : 0;
        vb = bPrev > 0 ? (bCorr - bPrev) / bPrev : 0;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });

  // Chart data
  const topClientiChart = [...clienti]
    .sort((a, b) => (((b as any)[`fatturato${annoCorr}`] as number) || 0) - (((a as any)[`fatturato${annoCorr}`] as number) || 0))
    .slice(0, 12)
    .map(c => ({
      name: c.nome ? (c.nome.length > 15 ? c.nome.substring(0, 15) + '…' : c.nome) : `#${c.clientId}`,
      [`${annoPrev}`]: Math.round((((c as any)[`fatturato${annoPrev}`] as number) || 0)),
      [`${annoCorr}`]: Math.round((((c as any)[`fatturato${annoCorr}`] as number) || 0)),
    }));

  // ── RIEPILOGO PER CLIENTE ──────────────────────────────────────────────────
  // Replica del foglio "Riepilogo per cliente": fatturato + quantità per anno,
  // totale e variazioni %. Calcolato dai dati dettagliati (stessa fonte del foglio).
  const riepilogoRows = clienti
    .map(c => {
      const d = clientiDettagliati.find(x => x.nome === c.nome);
      const qtyYear = (y: number) =>
        d ? d.prodotti.reduce((s, p) => s + p.ordini.filter(o => o.year === y).reduce((ss, o) => ss + (o.quantity || 0), 0), 0) : 0;
      const f2024 = c.fatturato2024 || 0;
      const f2025 = c.fatturato2025 || 0;
      const f2026 = c.fatturato2026 || 0;
      return {
        nome: c.nome || `#${c.clientId}`,
        f2024, f2025, f2026,
        totale: f2024 + f2025 + f2026,
        q2024: qtyYear(2024),
        q2025: qtyYear(2025),
        q2026: qtyYear(2026),
        var2425: f2024 > 0 ? (f2025 - f2024) / f2024 : null,
        var2526: f2025 > 0 ? (f2026 - f2025) / f2025 : null,
      };
    })
    .filter(r => matchSearch(riepilogoSearch, [r.nome]))
    .sort((a, b) => b.totale - a.totale);

  const riepilogoTotali = riepilogoRows.reduce(
    (acc, r) => ({
      f2024: acc.f2024 + r.f2024, f2025: acc.f2025 + r.f2025, f2026: acc.f2026 + r.f2026,
      totale: acc.totale + r.totale,
      q2024: acc.q2024 + r.q2024, q2025: acc.q2025 + r.q2025, q2026: acc.q2026 + r.q2026,
    }),
    { f2024: 0, f2025: 0, f2026: 0, totale: 0, q2024: 0, q2025: 0, q2026: 0 }
  );

  const fmtPct = (v: number | null) =>
    v === null ? '—' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    sortField === field
      ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
      : <Minus size={12} className="text-muted" />
  );

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
          sublabel: `${fmtEur((((c as any)[`fatturato${annoCorr}`] as number) || 0))} (${annoCorr})`,
        }))}
      />

      {/* KPI Row */}
      <div className="cockpit-history-summary grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={`Fatturato ${annoPrev}`} value={fmtEur(totPrev)} sub={`${clienti.filter(c => (((c as any)[`fatturato${annoPrev}`] as number) || 0) > 0).length} clienti attivi`} color="bg-action" icon={Euro} />
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
      {activeTab === 'storico' && (
        <div className="space-y-6">
          {/* Chart */}
          <div className="min-w-0 overflow-hidden bg-surface dark:bg-surface rounded-panel p-5 border border-line dark:border-line">
            <h3 className="font-semibold text-foreground dark:text-foreground mb-4 text-sm  ">Top 12 Clienti per Fatturato</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topClientiChart} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--syrio-line))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${Math.round(v/1000)}K`} />
                <Tooltip formatter={(v: number) => fmtEur(v)} />
                <Legend />
                <Bar dataKey={String(annoPrev)} fill="var(--syrio-chart-2)" radius={[4,4,0,0]} />
                <Bar dataKey={String(annoCorr)} fill="var(--syrio-chart-1)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setFilterDormienti(!filterDormienti)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all border ${filterDormienti ? 'bg-warning-soft border-warning text-warning' : 'bg-surface dark:bg-surface border-line dark:border-line text-secondary'}`}
            >
              <AlertTriangle size={14} /> Solo dormienti ({dormienti.length})
            </button>
          </div>

          {/* Table */}
          <div className="bg-surface dark:bg-surface rounded-panel border border-line dark:border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line dark:border-line">
                    <th className="w-8 px-2" />
                    {[
                      { label: 'Cliente', field: 'id' as const },
                      { label: `${annoPrev} (€)`, field: 'f2023' as const },
                      { label: `${annoCorr} (€)`, field: 'f2024' as const },
                      { label: 'Δ YoY', field: 'delta' as const },
                    ].map(({ label, field }) => (
                      <th key={field} onClick={() => toggleSort(field)} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted cursor-pointer hover:text-secondary select-none">
                        <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted">2025 (€)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted">2026 (€)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {clientiSorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(c => {
                    const cPrev = (((c as any)[`fatturato${annoPrev}`] as number) || 0);
                    const cCorr = (((c as any)[`fatturato${annoCorr}`] as number) || 0);
                    const delta = cPrev > 0 ? ((cCorr - cPrev) / cPrev * 100) : null;
                    const isDormiente = cPrev > 0 && cCorr === 0;
                    const isNuovo = cPrev === 0 && cCorr > 0;
                    const isExpanded = expandedClientId === c.clientId;
                    const hasProdotti = c.prodotti.length > 0;
                    // Cerca i dati dettagliati con ordini individuali
                    const dettaglio = clientiDettagliati.find(d => d.nome === c.nome);
                    const allOrdini = dettaglio
                      ? dettaglio.prodotti.flatMap(p =>
                          p.ordini.map(o => ({
                            itemId: p.itemId,
                            nome: p.nome,
                            date: o.date,
                            year: o.year,
                            amount: o.amount,
                            margin: o.margin,
                            quantity: o.quantity,
                            mese: o.mese || '',
                            classe: o.classe || '',
                            productModel: o.productModel || '',
                          }))
                        ).sort((a, b) => {
                          // Ordina per data (più recente prima)
                          const parseDate = (d: string) => {
                            const parts = d.split('-');
                            if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]).getTime();
                            return 0;
                          };
                          return parseDate(b.date) - parseDate(a.date);
                        })
                      : [];
                    return (
                      <>
                        <tr
                          key={c.clientId}
                          onClick={() => hasProdotti && setExpandedClientId(isExpanded ? null : c.clientId)}
                          className={`border-b border-line dark:border-line/50 transition-colors ${hasProdotti ? 'cursor-pointer hover:bg-accent-soft/60 dark:hover:bg-accent-soft/10' : 'hover:bg-canvas dark:hover:bg-raised/50'} ${isExpanded ? 'bg-accent-soft/40 dark:bg-accent-soft/10' : ''}`}
                        >
                          <td className="w-8 px-2 py-3 text-muted">
                            {hasProdotti && (isExpanded ? <ChevronUp size={14} className="text-accent" /> : <ChevronDown size={14} />)}
                          </td>
                          <td className="px-4 py-3 font-bold text-foreground dark:text-foreground truncate max-w-[250px]" title={c.nome || `#${c.clientId}`}>{c.nome || `#${c.clientId}`}</td>
                          <td className="px-4 py-3 font-mono text-secondary dark:text-muted">{cPrev > 0 ? fmtEur(cPrev) : '—'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground dark:text-foreground">{cCorr > 0 ? fmtEur(cCorr) : '—'}</td>
                          <td className="px-4 py-3">
                            {delta !== null ? (
                              <span className={`flex items-center gap-1 font-bold text-xs ${delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted'}`}>
                                {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                                {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-secondary dark:text-muted">{(c.fatturato2025 || 0) > 0 ? fmtEur(c.fatturato2025!) : '—'}</td>
                          <td className="px-4 py-3 font-mono text-secondary dark:text-muted">{(c.fatturato2026 || 0) > 0 ? fmtEur(c.fatturato2026!) : '—'}</td>
                          <td className="px-4 py-3">
                            {isDormiente && <span className="text-xs bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning px-2 py-0.5 rounded-lg font-bold">Dormiente</span>}
                            {isNuovo && <span className="text-xs bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent px-2 py-0.5 rounded-lg font-bold">Nuovo {annoCorr}</span>}
                            {!isDormiente && !isNuovo && delta !== null && delta > 20 && <span className="text-xs bg-success-soft text-success dark:bg-success-soft dark:text-success px-2 py-0.5 rounded-lg font-bold">In crescita</span>}
                            {!isDormiente && !isNuovo && delta !== null && delta < -20 && <span className="text-xs bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger px-2 py-0.5 rounded-lg font-bold">In calo</span>}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${c.clientId}-prodotti`} className="border-b border-accent dark:border-accent/30">
                            <td colSpan={8} className="px-0 py-0">
                              <div className="bg-accent-soft/50 dark:bg-accent-soft/10 px-6 py-3">
                                {allOrdini.length > 0 ? (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted uppercase tracking-normal font-semibold">
                                        <th className="text-left pb-2 pr-3">Data</th>
                                        <th className="text-left pb-2 pr-3">Mese</th>
                                        <th className="text-left pb-2 pr-3">Class</th>
                                        <th className="text-left pb-2 pr-3">Product Model</th>
                                        <th className="text-left pb-2">Prodotto</th>
                                        <th className="text-right pb-2 pr-3">Importo</th>
                                        <th className="text-right pb-2">Qtà</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                      {allOrdini.map((o, idx) => (
                                        <tr key={`${o.itemId}-${o.date}-${idx}`} className="text-secondary dark:text-muted">
                                          <td className="py-1.5 pr-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                              o.year === 2023 ? 'bg-accent-soft text-accent' :
                                              o.year === 2024 ? 'bg-accent-soft text-accent' :
                                              o.year === 2025 ? 'bg-accent-soft text-accent' :
                                              'bg-accent-soft text-accent'
                                            }`}>{o.date}</span>
                                          </td>
                                          <td className="py-1.5 pr-3 text-secondary whitespace-nowrap">{o.mese || '—'}</td>
                                          <td className="py-1.5 pr-3 text-secondary whitespace-nowrap">{o.classe || '—'}</td>
                                          <td className="py-1.5 pr-3 font-mono text-muted whitespace-nowrap">{o.productModel || o.itemId || '—'}</td>
                                          <td className="py-1.5 pr-3 font-medium max-w-xs truncate" title={o.nome}>{o.nome}</td>
                                          <td className="py-1.5 pr-3 text-right font-mono font-bold text-foreground dark:text-foreground">{fmtEur(o.amount)}</td>
                                          <td className="py-1.5 text-right font-mono text-secondary">{o.quantity > 0 ? o.quantity : '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-xs text-muted py-2">Ricarica il file per vedere il dettaglio ordini con date</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
              {clientiSorted.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-line dark:border-line">
                  <span className="text-xs text-muted">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, clientiSorted.length)} di {clientiSorted.length} clienti
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setPage(p => p - 1); setExpandedClientId(null); }}
                      disabled={page === 0}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-line dark:border-line disabled:opacity-30 disabled:cursor-not-allowed hover:bg-canvas dark:hover:bg-raised transition-colors"
                    >
                      ← Prec
                    </button>
                    {Array.from({ length: Math.ceil(clientiSorted.length / PAGE_SIZE) }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => { setPage(i); setExpandedClientId(null); }}
                        className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${page === i ? 'bg-action text-action-foreground' : 'border border-line dark:border-line hover:bg-canvas dark:hover:bg-raised text-secondary dark:text-muted'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => { setPage(p => p + 1); setExpandedClientId(null); }}
                      disabled={page >= Math.ceil(clientiSorted.length / PAGE_SIZE) - 1}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-line dark:border-line disabled:opacity-30 disabled:cursor-not-allowed hover:bg-canvas dark:hover:bg-raised transition-colors"
                    >
                      Succ →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: RIEPILOGO PER CLIENTE ── */}
      {activeTab === 'riepilogo' && (
        <div className="space-y-6">
          {/* Header + ricerca */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-foreground dark:text-foreground text-sm  ">📋 Riepilogo per Cliente</h3>
              <p className="text-xs text-muted mt-1">Fatturato e quantità per cliente · 2024 · 2025 · 2026 (YTD) · {riepilogoRows.length} clienti</p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={riepilogoSearch}
                onChange={e => setRiepilogoSearch(e.target.value)}
                placeholder="Cerca cliente…"
                className="pl-9 pr-3 py-2 text-sm rounded-md border border-line dark:border-line bg-surface dark:bg-surface text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="bg-surface dark:bg-surface rounded-panel border border-line dark:border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-line dark:border-line text-xs font-semibold uppercase tracking-normal text-muted">
                    <th className="text-left px-4 py-3">Cliente</th>
                    <th className="text-right px-4 py-3">Fatt. 2024 (€)</th>
                    <th className="text-right px-4 py-3">Fatt. 2025 (€)</th>
                    <th className="text-right px-4 py-3">Fatt. 2026 YTD (€)</th>
                    <th className="text-right px-4 py-3">Totale (€)</th>
                    <th className="text-right px-4 py-3">Qtà 2024</th>
                    <th className="text-right px-4 py-3">Qtà 2025</th>
                    <th className="text-right px-4 py-3">Qtà 2026</th>
                    <th className="text-right px-4 py-3">Var. 24→25</th>
                    <th className="text-right px-4 py-3">Var. 25→26</th>
                  </tr>
                </thead>
                <tbody>
                  {riepilogoRows.map((r, i) => (
                    <tr key={`${r.nome}-${i}`} className="border-b border-line dark:border-line/50 hover:bg-canvas dark:hover:bg-raised/40 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-foreground dark:text-foreground max-w-[260px] truncate" title={r.nome}>{r.nome}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-secondary dark:text-muted">{r.f2024 > 0 ? fmtEur(r.f2024) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-secondary dark:text-muted">{r.f2025 > 0 ? fmtEur(r.f2025) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-secondary dark:text-muted">{r.f2026 > 0 ? fmtEur(r.f2026) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground dark:text-foreground">{fmtEur(r.totale)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-secondary">{r.q2024 > 0 ? fmt(r.q2024) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-secondary">{r.q2025 > 0 ? fmt(r.q2025) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-secondary">{r.q2026 > 0 ? fmt(r.q2026) : '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.var2425 === null ? 'text-muted' : r.var2425 >= 0 ? 'text-success' : 'text-danger'}`}>{fmtPct(r.var2425)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.var2526 === null ? 'text-muted' : r.var2526 >= 0 ? 'text-success' : 'text-danger'}`}>{fmtPct(r.var2526)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line dark:border-line bg-canvas dark:bg-raised/40 font-semibold text-foreground dark:text-foreground">
                    <td className="px-4 py-3 uppercase text-xs tracking-normal">Totale ({riepilogoRows.length})</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.f2024)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.f2025)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.f2026)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.totale)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(riepilogoTotali.q2024)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(riepilogoTotali.q2025)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(riepilogoTotali.q2026)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">—</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">—</td>
                  </tr>
                </tfoot>
              </table>
              {riepilogoRows.length === 0 && (
                <p className="text-center text-sm text-muted py-8">Nessun cliente trovato.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: BUDGET ── */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          {/* Budget input */}
          <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
            <h3 className="font-semibold text-foreground dark:text-foreground text-sm   mb-5">🎯 Imposta Budget Annuale</h3>

            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-secondary uppercase tracking-normal mb-2">Budget Annuale (€)</label>
                <div className="relative">
                  <Euro size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="number"
                    value={budget.annuale || ''}
                    onChange={e => setBudget(b => ({ ...b, annuale: parseFloat(e.target.value) || 0 }))}
                    placeholder="es. 500000"
                    className="w-full pl-9 pr-4 py-3 border border-line dark:border-line rounded-md text-lg font-bold bg-canvas dark:bg-raised dark:text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setBudgetMode('annuale')}
                  className={`px-4 py-3 rounded-md text-sm font-bold transition-all ${budgetMode === 'annuale' ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
                >
                  Annuale
                </button>
                <button
                  onClick={() => setBudgetMode('mensile')}
                  className={`px-4 py-3 rounded-md text-sm font-bold transition-all ${budgetMode === 'mensile' ? 'bg-action text-action-foreground' : 'bg-raised dark:bg-raised text-secondary'}`}
                >
                  Per Mese
                </button>
              </div>
            </div>

            {budget.annuale > 0 && (
              <div className="mt-4 p-4 bg-accent-soft dark:bg-accent-soft/20 rounded-md">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-secondary uppercase tracking-wider mb-1">Mensile Base</div>
                    <div className="font-semibold text-accent">{fmtEur(budgetMensileBase)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary uppercase tracking-wider mb-1">vs 2024</div>
                    <div className={`font-black ${budget.annuale > tot2024 ? 'text-warning' : 'text-success'}`}>
                      {budget.annuale > tot2024 ? '+' : ''}{fmtEur(budget.annuale - tot2024)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary uppercase tracking-wider mb-1">Crescita %</div>
                    <div className="font-semibold text-foreground dark:text-muted">
                      {tot2024 > 0 ? `${((budget.annuale - tot2024) / tot2024 * 100).toFixed(1)}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Griglia mensile */}
          {budgetMode === 'mensile' && budget.annuale > 0 && (
            <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
              <h3 className="font-semibold text-foreground dark:text-foreground text-sm   mb-5">📅 Suddivisione Mensile</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {MESI.map(m => {
                  const val = budget.mensile[m] || budgetMensileBase;
                  const pct = budget.annuale > 0 ? (val / budget.annuale * 100) : 0;
                  return (
                    <div key={m} className="bg-canvas dark:bg-raised rounded-md p-3">
                      <div className="text-xs font-semibold uppercase tracking-normal text-secondary mb-2">{m}</div>
                      <input
                        type="number"
                        value={Math.round(val)}
                        onChange={e => setBudget(b => ({ ...b, mensile: { ...b.mensile, [m]: parseFloat(e.target.value) || 0 } }))}
                        className="w-full text-sm font-bold bg-transparent dark:text-foreground focus:outline-none border-b border-line dark:border-line pb-1"
                      />
                      <div className="text-xs text-muted mt-1">{pct.toFixed(1)}%</div>
                      <div className="h-1.5 bg-raised dark:bg-raised rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-action rounded-full" style={{ width: `${Math.min(pct * 12, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-sm text-secondary">
                Totale mensile: <strong className="text-foreground dark:text-foreground">{fmtEur(Object.values(budget.mensile).reduce((s, v) => s + v, 0) || budget.annuale)}</strong>
              </div>
            </div>
          )}

          {/* Confronto storico vs budget */}
          {budget.annuale > 0 && (
            <div className="bg-surface dark:bg-surface rounded-panel p-5 border border-line dark:border-line">
              <h3 className="font-semibold text-foreground dark:text-foreground text-sm   mb-4">📊 Storico vs Budget</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { anno: String(annoPrev), fatturato: Math.round(totPrev), budget: 0 },
                  { anno: String(annoCorr), fatturato: Math.round(totCorr), budget: 0 },
                  { anno: `${annoCorr + 1} (prev)`, fatturato: 0, budget: Math.round(budget.annuale) },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--syrio-line))" />
                  <XAxis dataKey="anno" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${Math.round(v / 1000)}K`} />
                  <Tooltip formatter={(v: number) => fmtEur(v)} />
                  <Legend />
                  <Bar dataKey="fatturato" name="Fatturato Reale" fill="var(--syrio-chart-1)" radius={[6,6,0,0]} />
                  <Bar dataKey="budget" name="Budget Target" fill="rgb(var(--syrio-warning))" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {budget.annuale === 0 && (
            <div className="text-center py-12 text-muted">
              <Target size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Inserisci il budget annuale per vedere le analisi</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PIPELINE AI ── */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Alert gap */}
          {budgetAnnuale > 0 && (
            <div className={`rounded-panel p-5 border flex items-center justify-between gap-4 flex-wrap ${gapBudget > 0 ? 'bg-danger-soft dark:bg-danger-soft border-danger dark:border-danger' : 'bg-success-soft dark:bg-success-soft border-success dark:border-success'}`}>
              <div className="flex items-center gap-4">
                <div className="text-3xl">{gapBudget > 0 ? '⚠️' : '✅'}</div>
                <div>
                  <div className={`font-semibold text-sm ${gapBudget > 0 ? 'text-danger dark:text-danger' : 'text-success dark:text-success'}`}>
                    {gapBudget > 0 ? `Gap da colmare: ${fmtEur(gapBudget)}` : 'Budget raggiunto!'}
                  </div>
                  <div className="text-xs text-secondary mt-0.5">
                    {gapBudget > 0
                      ? `Il sistema ha identificato ${deals.length} deal con potenziale totale di ${fmtEur(totalePipeline)}`
                      : `Fatturato 2024 ${fmtEur(tot2024)} supera il target`
                    }
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-foreground dark:text-foreground">{fmtEur(totalePipeline)}</div>
                <div className="text-xs text-secondary">Potenziale pipeline</div>
              </div>
            </div>
          )}

          {budgetAnnuale === 0 && (
            <div className="bg-warning-soft dark:bg-warning-soft border border-warning dark:border-warning rounded-panel p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-warning flex-shrink-0" />
              <p className="text-sm text-warning dark:text-warning">
                <strong>Imposta il budget</strong> nel tab Budget per vedere il gap da colmare. La pipeline è comunque visibile.
              </p>
              <button onClick={() => setActiveTab('budget')} className="ml-auto text-xs font-bold text-warning whitespace-nowrap flex items-center gap-1">
                Vai al Budget <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Statistiche pipeline */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line text-center">
              <div className="text-2xl font-semibold text-danger">{deals.filter(d => d.priorita === 'alta').length}</div>
              <div className="text-xs text-muted uppercase tracking-normal mt-1">Alta Priorità</div>
            </div>
            <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line text-center">
              <div className="text-2xl font-semibold text-warning">{deals.filter(d => d.priorita === 'media').length}</div>
              <div className="text-xs text-muted uppercase tracking-normal mt-1">Media Priorità</div>
            </div>
            <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line text-center">
              <div className="text-2xl font-semibold text-accent">{fmtEur(totalePipeline)}</div>
              <div className="text-xs text-muted uppercase tracking-normal mt-1">Totale Pipeline</div>
            </div>
          </div>

          {/* Lista deal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {deals.map((deal, i) => (
              <DealCard key={deal.clientId} deal={deal} rank={i + 1} onAddToPipeline={openPipelineModal} />
            ))}
          </div>

          {/* ── Ordini dal Passato ── */}
          {clientiSignals.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-foreground dark:text-foreground text-sm   mb-4 flex items-center gap-2">
                  🔄 Ordini dal Passato
                  <span className="text-xs bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent px-2 py-1 rounded-lg">{clientiSignals.length}</span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {clientiSignals.slice(0, 10).map((signal) => {
                    const colorMap = {
                      ritardo: { bg: 'bg-danger-soft dark:bg-danger-soft', border: 'border-danger dark:border-danger', badge: 'bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger', icon: '🔥' },
                      stagione: { bg: 'bg-accent-soft dark:bg-accent-soft/10', border: 'border-accent dark:border-accent', badge: 'bg-accent-soft text-accent dark:bg-accent-soft/30 dark:text-accent', icon: '📅' },
                      prodotto_perso: { bg: 'bg-warning-soft dark:bg-warning-soft', border: 'border-warning dark:border-warning', badge: 'bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning', icon: '⚠️' },
                      crescita: { bg: 'bg-success-soft dark:bg-success-soft', border: 'border-success dark:border-success', badge: 'bg-success-soft text-success dark:bg-success-soft dark:text-success', icon: '📈' },
                      nessuno: { bg: 'bg-canvas dark:bg-surface', border: 'border-line dark:border-line', badge: 'bg-raised text-secondary dark:bg-raised dark:text-muted', icon: '⭕' },
                    };
                    const c = colorMap[signal.primarySignal];

                    return (
                      <div key={signal.clientId} className={`rounded-panel border ${c.bg} ${c.border} overflow-hidden transition-all p-4`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-semibold text-foreground dark:text-foreground text-sm truncate" title={signal.nomeCliente}>{signal.nomeCliente}</div>
                            <div className="text-xs text-secondary mt-0.5">Score: {signal.score}/100</div>
                          </div>
                          <div className="text-2xl ml-2">{c.icon}</div>
                        </div>

                        {/* Segnali attivi */}
                        <div className="space-y-1.5 mb-3">
                          {signal.recency.status !== 'puntuale' && signal.recency.giorni > 0 && (
                            <div className="text-xs bg-surface/50 dark:bg-black/20 px-2 py-1 rounded">
                              <span className="font-bold">⏱️ {signal.recency.status === 'ritardo' ? 'Ritardo' : 'Dormiente'}</span> {signal.recency.giorni}gg da ultimo ordine
                            </div>
                          )}
                          {signal.seasonality.meseAtteso && signal.frequency.mediaGiorni > 0 && (
                            <div className="text-xs bg-surface/50 dark:bg-black/20 px-2 py-1 rounded">
                              <span className="font-bold">📅 Ordina ogni</span> {signal.frequency.mediaGiorni}gg
                            </div>
                          )}
                          {signal.productsLost.length > 0 && (
                            <div className="text-xs bg-surface/50 dark:bg-black/20 px-2 py-1 rounded">
                              <span className="font-bold">⚠️ Perso:</span> {signal.productsLost[0].nome}
                            </div>
                          )}
                          {Math.abs(signal.quantityTrend.pctChange) > 10 && (
                            <div className="text-xs bg-surface/50 dark:bg-black/20 px-2 py-1 rounded">
                              <span className="font-bold">📈 Qty</span> {signal.quantityTrend.direction === 'crescita' ? '+' : ''}{signal.quantityTrend.pctChange.toFixed(0)}%
                            </div>
                          )}
                        </div>

                        <div className="mb-3 p-2 bg-surface/30 dark:bg-black/20 rounded-lg">
                          <p className="text-xs font-bold text-foreground dark:text-foreground">{signal.action}</p>
                        </div>

                        <button
                          onClick={() => {
                            const clienteData = clientiDettagliati.find(c => c.clientId === signal.clientId);
                            const estimatedValue = Math.round(signal.frequency.mediaGiorni > 0 ? (clienteData?.fatturato2024 || 0) / (365 / signal.frequency.mediaGiorni) : (clienteData?.fatturato2024 || 0) * 0.25);
                            const seasonal = clienteData ? getSeasonalBase(clienteData) : null;
                            const newDeal: DealSuggerito = {
                              clientId: signal.clientId,
                              nomeCliente: signal.nomeCliente,
                              valoreStimato: seasonal && seasonal.base > 0 ? Math.round(seasonal.base) : estimatedValue,
                              motivazione: signal.action,
                              priorita: signal.score > 75 ? 'alta' : signal.score > 50 ? 'media' : 'bassa',
                              trend: signal.quantityTrend.direction as 'crescita' | 'stabile' | 'calo',
                              prodottiSuggeriti: signal.productsLost.map(p => p.nome).slice(0, 3),
                              deltaPct: Math.round(signal.quantityTrend.pctChange),
                              mensili: seasonal?.byYear ?? [],
                              mesiWindow: seasonal?.mesiConsiderati ?? [],
                            };
                            setPipelineModal(newDeal);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-action hover:bg-action-hover text-action-foreground text-xs font-semibold uppercase tracking-wide transition-all"
                        >
                          <Plus size={14} /> Aggiungi a Pipeline
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {deals.length === 0 && clientiSignals.length === 0 && (
            <div className="text-center py-12 text-muted">
              <Zap size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Carica lo storico per generare i deal suggeriti</p>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: Aggiungi a Pipeline ─────────────────────────────────────── */}
      {pipelineModal && (() => {
        return (
        <DialogFrame className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-surface rounded-panel shadow-panel w-full max-w-md p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground dark:text-foreground text-lg">Aggiungi a Pipeline</h3>
                <p className="text-xs text-muted mt-0.5">{pipelineModal.nomeCliente} · {pipelineModal.motivazione}</p>
              </div>
              <button onClick={() => setPipelineModal(null)} className="p-2 rounded-md hover:bg-raised dark:hover:bg-raised text-muted transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Contesto storico — cerca per clientId O per nome CRM collegato */}
            {(() => {
              const byId = clienti.find(c => c.clientId === pipelineModal.clientId);
              const byCrm = pmContactId
                ? (() => {
                    const crm = contacts[pmContactId];
                    return crm ? clienti.find(c => normName(c.nome) === normName(crm.company)) : undefined;
                  })()
                : undefined;
              const rec = byId ?? byCrm;
              if (!rec) return null;
              const yearsWithData = ([2023, 2024, 2025, 2026] as const).filter(y =>
                (rec[`fatturato${y}` as keyof typeof rec] as number) > 0
              );
              if (yearsWithData.length === 0) return null;
              return (
                <div className="mb-4 p-3 bg-canvas dark:bg-canvas/50 rounded-md border border-line dark:border-line">
                  <p className="text-xs font-semibold text-muted uppercase tracking-normal mb-2">📊 Fatturato effettivo (da storico)</p>
                  <div className="flex gap-4 flex-wrap">
                    {yearsWithData.map(y => (
                      <div key={y}>
                        <p className="text-xs text-muted">{y}{y === 2026 ? ' YTD' : ''}</p>
                        <p className="text-sm font-semibold text-foreground dark:text-foreground">
                          {fmtEur(rec[`fatturato${y}` as keyof typeof rec] as number)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Valore opportunità — basato sui prodotti top, NON sul fatturato totale */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1">Valore Opportunità (€)</label>
              <p className="text-xs text-muted mb-1.5">
                Stimato sui <strong>prodotti top</strong> del cliente — modifica liberamente
              </p>
              <div className="relative">
                <Euro size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="number"
                  value={pmValue}
                  onChange={e => setPmValue(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-4 py-3 border-2 border-line dark:border-line rounded-md font-semibold text-lg bg-canvas dark:bg-canvas dark:text-foreground outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Selezione azienda CRM */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-muted uppercase tracking-normal block mb-1.5">
                Collega ad Azienda CRM
                {pmContactId && <span className="ml-2 text-success font-semibold normal-case">✓ Collegato automaticamente</span>}
              </label>
              <select
                value={pmContactId}
                onChange={e => setPmContactId(e.target.value)}
                className={`w-full border-2 rounded-md px-3 py-3 bg-canvas dark:bg-canvas dark:text-foreground font-bold outline-none focus:border-accent transition-colors text-sm ${pmContactId ? 'border-success dark:border-success' : 'border-line dark:border-line'}`}
              >
                <option value="">— Nessuna azienda (aggiungila dopo) —</option>
                {(() => {
                  const all = Object.values(contacts).sort((a, b) => a.company.localeCompare(b.company));
                  const clienti = all.filter(c => c.status === 'cliente');
                  const prospect = all.filter(c => c.status !== 'cliente');
                  return (
                    <>
                      {clienti.length > 0 && <option disabled>── Clienti ──</option>}
                      {clienti.map(c => {
                        const storicoC = clienti.length > 0 ? clientiDettagliati.find(s => normName(s.nome) === normName(c.company)) : undefined;
                        const fattLabel = storicoC ? ` · storico €${fmt(storicoC.fatturato2024 || storicoC.fatturato2025 || storicoC.fatturato2023)}` : '';
                        return <option key={c.id} value={c.id}>{c.company}{fattLabel}</option>;
                      })}
                      {prospect.length > 0 && <option disabled>── Prospect ──</option>}
                      {prospect.map(c => {
                        const storicoC = clientiDettagliati.find(s => normName(s.nome) === normName(c.company));
                        const fattLabel = storicoC ? ` · storico €${fmt(storicoC.fatturato2024 || storicoC.fatturato2025 || storicoC.fatturato2023)}` : '';
                        return <option key={c.id} value={c.id}>{c.company}{fattLabel}</option>;
                      })}
                    </>
                  );
                })()}
              </select>
              <p className="text-xs text-muted mt-1.5">
                Il collegamento viene cercato automaticamente per nome — modifica se necessario
              </p>
            </div>

            {/* Prodotti suggeriti (read-only) */}
            {pipelineModal.prodottiSuggeriti.length > 0 && (
              <div className="mb-5 p-3 bg-accent-soft dark:bg-accent-soft/20 rounded-md">
                <p className="text-xs font-semibold text-accent uppercase tracking-normal mb-2">Prodotti da proporre</p>
                <div className="space-y-1">
                  {pipelineModal.prodottiSuggeriti.map((p, i) => (
                    <div key={i} className="text-xs text-accent dark:text-accent flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setPipelineModal(null)}
                className="flex-1 py-3 rounded-md border-2 border-line dark:border-line font-semibold text-sm text-secondary hover:bg-canvas transition-colors">
                Annulla
              </button>
              <button onClick={confirmAddToPipeline}
                className="flex-1 py-3 rounded-md bg-action hover:bg-action-hover text-action-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-panel">
                <Plus size={16} /> Crea Deal
              </button>
            </div>
          </div>
        </DialogFrame>
        );
      })()}
    </div>
  );
}
