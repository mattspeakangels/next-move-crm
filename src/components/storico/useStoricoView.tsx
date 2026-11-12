import { fatturatoAnno } from '../../lib/storicoFormat';
import { showNotice } from '../ui/Feedback';
import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from '../../lib/spreadsheet';
import { useStoricoStore } from '../../store/storicoStore';
import { useStore } from '../../store/useStore';
import { useToast } from '../ui/ToastContext';
import { useAuth } from '../../lib/authContext';
import { saveStoricoToFirestore, loadStoricoFromFirestore, deleteStoricoFromFirestore } from '../../lib/storicoFirestore';
import { matchSearch } from '../../utils/search';
import { ChevronDown, ChevronUp, Minus } from 'lucide-react';
import type { DealSuggerito } from '../../utils/pipelineSuggestions';
import { generaDeal } from '../../utils/pipelineSuggestions';
import { detectColumns, parseCSVData, convertToClienteRecord } from '../../lib/storicoParse';
import { isPivotFormat, parsePivotData } from '../../lib/storicoPivot';
import { analyzeClientSignals } from '../../lib/storicoSignals';

// Stato e calcoli della vista Storico (dati, filtri, ordinamento, finestra Pipeline).
export function useStoricoView() {
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
    clienti.some(c => fatturatoAnno(c, y) > 0)
  );
  const annoCorr: number = anniConDatiKPI.length > 0 ? anniConDatiKPI[anniConDatiKPI.length - 1] : 2024;
  const annoPrev: number = anniConDatiKPI.length > 1 ? anniConDatiKPI[anniConDatiKPI.length - 2] : annoCorr - 1;
  const totCorr = clienti.reduce((s, c) => s + fatturatoAnno(c, annoCorr), 0);
  const totPrev = clienti.reduce((s, c) => s + fatturatoAnno(c, annoPrev), 0);
  // Mantieni tot2024 per compatibilità con sezione Budget che lo usa
  const tot2024 = clienti.reduce((s, c) => s + c.fatturato2024, 0);
  const deltaYoY = totPrev > 0 ? ((totCorr - totPrev) / totPrev * 100) : 0;
  const dormienti = clienti.filter(c => fatturatoAnno(c, annoPrev) > 0 && fatturatoAnno(c, annoCorr) === 0);
  const nuoviCorr = clienti.filter(c => fatturatoAnno(c, annoPrev) === 0 && fatturatoAnno(c, annoCorr) > 0);

  // Budget calculations
  const budgetAnnuale = budget.annuale || 0;
  const budgetMensileBase = budgetAnnuale / 12;
  const deals = clientiDettagliati.length > 0 ? generaDeal(clientiDettagliati) : [];
  const totalePipeline = deals.reduce((s, d) => s + d.valoreStimato, 0);
  const gapBudget = Math.max(0, budgetAnnuale - tot2024);

  // Sort clienti
  const clientiSorted = [...clienti]
    .filter(c => !filterDormienti || (fatturatoAnno(c, annoPrev) > 0 && fatturatoAnno(c, annoCorr) === 0))
    .filter(c => matchSearch(searchQuery, [c.nome]))
    .sort((a, b) => {
      let va = 0, vb = 0;
      if (sortField === 'id') { va = a.clientId; vb = b.clientId; }
      else if (sortField === 'f2023') { va = fatturatoAnno(a, annoPrev); vb = fatturatoAnno(b, annoPrev); }
      else if (sortField === 'f2024') { va = fatturatoAnno(a, annoCorr); vb = fatturatoAnno(b, annoCorr); }
      else if (sortField === 'delta') {
        const aPrev = fatturatoAnno(a, annoPrev);
        const aCorr = fatturatoAnno(a, annoCorr);
        const bPrev = fatturatoAnno(b, annoPrev);
        const bCorr = fatturatoAnno(b, annoCorr);
        va = aPrev > 0 ? (aCorr - aPrev) / aPrev : 0;
        vb = bPrev > 0 ? (bCorr - bPrev) / bPrev : 0;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });

  // Chart data
  const topClientiChart = [...clienti]
    .sort((a, b) => fatturatoAnno(b, annoCorr) - fatturatoAnno(a, annoCorr))
    .slice(0, 12)
    .map(c => ({
      name: c.nome ? (c.nome.length > 15 ? c.nome.substring(0, 15) + '…' : c.nome) : `#${c.clientId}`,
      [`${annoPrev}`]: Math.round(fatturatoAnno(c, annoPrev)),
      [`${annoCorr}`]: Math.round(fatturatoAnno(c, annoCorr)),
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

  return { clienti, clientiDettagliati, fileName, anni, budget, setClienti, setClientiDettagliati, setFileName, setAnni, setBudget, reset, contacts, addDeal, showToast, user, loading, setLoading, firestoreLoading, setFirestoreLoading, budgetMode, setBudgetMode, activeTab, setActiveTab, riepilogoSearch, setRiepilogoSearch, sortField, setSortField, sortDir, setSortDir, filterDormienti, setFilterDormienti, searchQuery, setSearchQuery, expandedClientId, setExpandedClientId, page, setPage, PAGE_SIZE, fileRef, handleReset, clientiSignals, pipelineModal, setPipelineModal, pmContactId, setPmContactId, pmValue, setPmValue, normName, findContactByName, openPipelineModal, confirmAddToPipeline, handleFile, onDrop, onFileChange, anniConDatiKPI, annoCorr, annoPrev, totCorr, totPrev, tot2024, deltaYoY, dormienti, nuoviCorr, budgetAnnuale, budgetMensileBase, deals, totalePipeline, gapBudget, clientiSorted, topClientiChart, riepilogoRows, riepilogoTotali, fmtPct, toggleSort, SortIcon };
}

export type StoricoViewModel = ReturnType<typeof useStoricoView>;
