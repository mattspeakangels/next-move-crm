import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useStoricoStore, ClienteRecord } from '../store/storicoStore';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/ToastContext';
import {
  Upload, TrendingUp, TrendingDown, Target, Zap, AlertTriangle,
  ChevronDown, ChevronUp, Euro, BarChart3,
  Star, ArrowRight, RefreshCw,
  Minus, Plus, X, ArrowRightCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';

// ─── TYPES ────────────────────────────────────────────────────────────────────
// ClienteRecord, ProdottoRecord, StoricoBudget are imported from storicoStore

interface OrderRecord {
  date: string; // DD-MM-YYYY o raw
  year: number; // Anno estratto dalla data
  amount: number;
  margin: number;
  quantity: number;
}

interface ProdottoDettagliato {
  itemId: string;
  nome: string;
  ordini: OrderRecord[]; // Ordini individuali per questo prodotto
}

interface ClienteDettagliato {
  clientId: number;
  nome: string;
  prodotti: ProdottoDettagliato[];
  // Aggregati per anno (calcolati da ordini)
  fatturato2023: number;
  fatturato2024: number;
  fatturato2025: number;
  fatturato2026: number;
  margine2023: number;
  margine2024: number;
  margine2025: number;
  margine2026: number;
}

interface DealSuggerito {
  clientId: number;
  nomeCliente: string;
  valoreStimato: number;
  motivazione: string;
  priorita: 'alta' | 'media' | 'bassa';
  trend: 'crescita' | 'stabile' | 'calo';
  prodottiSuggeriti: string[];
  deltaPct: number;
}


const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

// ─── PARSER ───────────────────────────────────────────────────────────────────

/**
 * Converte un valore cella in numero.
 * Gestisce sia numeri già parsati (7529) sia stringhe italiane ("7.529" o "7.529 ").
 * I numeri italiani usano il punto come separatore migliaia e la virgola come decimale.
 */
function parseAmount(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.abs(isNaN(val) ? 0 : val);

  // Rimuovi spazi, parentesi (valori negativi), segni
  let s = String(val).trim();
  s = s.replace(/[()]/g, '').replace(/\s/g, '');
  if (s === '' || s === '-') return 0;

  // Formato italiano: punto = migliaia, virgola = decimale
  // es: "1.583.885" → 1583885, "7.529" → 7529, "33,3" → 33.3
  // Distingui: se ci sono più punti o punto+virgola → formato italiano
  const hasComma = s.includes(',');
  const dotCount = (s.match(/\./g) || []).length;

  if (dotCount > 1) {
    // Es: "1.583.885" → tutti punti sono migliaia
    s = s.replace(/\./g, '');
    if (hasComma) s = s.replace(',', '.');
  } else if (dotCount === 1 && hasComma) {
    // Es: "1.234,56" → punto=migliaia, virgola=decimale
    s = s.replace('.', '').replace(',', '.');
  } else if (dotCount === 0 && hasComma) {
    // Es: "1234,56" o "33,3" → virgola=decimale
    s = s.replace(',', '.');
  } else if (dotCount === 1 && !hasComma) {
    // Es: "7.529" potrebbe essere italiano (migliaia) o inglese (decimale)
    // Se le cifre dopo il punto sono 3 → migliaia; altrimenti → decimale
    const afterDot = s.split('.')[1] || '';
    if (afterDot.length === 3) s = s.replace('.', ''); // migliaia
    // altrimenti lascia com'è (decimale)
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.abs(n);
}

function parseMargin(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Rileva le posizioni delle colonne cercando i header.
 */
function detectColumns(rows: any[][]): {
  colCustomerName: number;
  colItemId: number;
  colItemName: number;
  colDate: number;
  yearAmountCols: number[];
} {
  const result = {
    colCustomerName: -1,
    colItemId: -1,
    colItemName: -1,
    colDate: -1,
    yearAmountCols: [] as number[],
  };

  // Cerca le intestazioni nelle prime 3 righe
  for (let r = 0; r < Math.min(3, rows.length); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toLowerCase().trim();

      if (cell.includes('customer name') || cell.includes('customer')) result.colCustomerName = c;
      if (cell.includes('item id')) result.colItemId = c;
      if (cell.includes('item name')) result.colItemName = c;
      if (cell.includes('date')) result.colDate = c;
      if (cell.includes('invoiced line am')) {
        if (!result.yearAmountCols.includes(c)) {
          result.yearAmountCols.push(c);
        }
      }
    }
  }

  return result;
}

/**
 * Parsing ordini individuali dalla nuova struttura orizzontale.
 * Ogni riga = 1 ordine, con colonne rilevate dinamicamente.
 */
function parseCSVData(rows: any[][]): ClienteDettagliato[] {
  const clientMap = new Map<string, ClienteDettagliato>();
  const cols = detectColumns(rows);

  console.log('📊 Parsed file - Total rows:', rows.length);
  console.log('🔍 Detected columns:', cols);
  console.log('📊 First 3 rows:', rows.slice(0, 3));

  // Validate column detection
  if (cols.colCustomerName < 0 || cols.colItemId < 0 || cols.colItemName < 0 || cols.colDate < 0 || cols.yearAmountCols.length === 0) {
    console.error('❌ Column detection failed:', cols);
    alert('Errore: Non riesco a trovare le colonne nel file. Controlla la struttura del file.');
    return [];
  }

  let currentCustomerName = '';
  let debugCount = 0;

  for (const row of rows) {
    if (row.length < Math.max(cols.colCustomerName, cols.colItemId, cols.colItemName, cols.colDate) + 1) {
      continue;
    }

    const rawCustomerName = String(row[cols.colCustomerName] || '').trim();
    const itemId = String(row[cols.colItemId] || '').trim();
    const itemName = String(row[cols.colItemName] || '').trim();
    const dateOrder = String(row[cols.colDate] || '').trim();

    // Aggiorna il nome cliente corrente se presente nella riga
    if (rawCustomerName && rawCustomerName !== 'Customer name' && !rawCustomerName.toLowerCase().includes('calendar')) {
      currentCustomerName = rawCustomerName;
    }

    // Skip header rows and rows without data
    if (!currentCustomerName || !itemId || !itemName || !dateOrder) {
      continue;
    }

    const customerName = currentCustomerName;

    // Debug: log prime righe per capire il formato
    if (clientMap.size === 0 && debugCount < 3) {
      console.log(`📋 Row sample [${debugCount}]:`, {
        customerName, itemId, itemName, dateOrder,
        rawDateType: typeof row[cols.colDate],
        rawDateValue: row[cols.colDate],
        amountCols: cols.yearAmountCols.map(c => ({ col: c, val: row[c], type: typeof row[c] })),
      });
      debugCount++;
    }

    // Estrai anno dalla data e normalizza formato DD-MM-YYYY
    let yearFromDate = 0;
    let normalizedDate = dateOrder;
    const rawDate = row[cols.colDate];

    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      // Oggetto Date JS (da cellDates: true)
      yearFromDate = rawDate.getFullYear();
      const dd = String(rawDate.getDate()).padStart(2, '0');
      const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
      normalizedDate = `${dd}-${mm}-${yearFromDate}`;
    } else if (typeof rawDate === 'number' && rawDate > 40000) {
      // Numero seriale Excel → converti
      const utcDays = Math.floor(rawDate - 25569);
      const jsDate = new Date(utcDays * 86400000);
      yearFromDate = jsDate.getUTCFullYear();
      const dd = String(jsDate.getUTCDate()).padStart(2, '0');
      const mm = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
      normalizedDate = `${dd}-${mm}-${yearFromDate}`;
    } else {
      // Stringa: prova DD-MM-YYYY o DD/MM/YYYY
      const s = String(rawDate || '');
      const dateParts = s.replace(/\//g, '-').split('-');
      if (dateParts.length >= 3) {
        yearFromDate = parseInt(dateParts[2]);
        normalizedDate = dateParts.join('-');
      }
    }

    if (yearFromDate < 2023 || yearFromDate > 2026) continue;

    // Inizializza cliente
    if (!clientMap.has(customerName)) {
      clientMap.set(customerName, {
        clientId: clientMap.size + 1,
        nome: customerName,
        prodotti: [],
        fatturato2023: 0, margine2023: 0,
        fatturato2024: 0, margine2024: 0,
        fatturato2025: 0, margine2025: 0,
        fatturato2026: 0, margine2026: 0,
      });
    }

    const cliente = clientMap.get(customerName)!;

    // Trova o crea prodotto
    let prodotto = cliente.prodotti.find(p => p.itemId === itemId);
    if (!prodotto) {
      prodotto = { itemId, nome: itemName, ordini: [] };
      cliente.prodotti.push(prodotto);
    }

    // Determina quale colonna leggere in base all'anno
    let colAmountIdx = 0;
    if (yearFromDate === 2023) colAmountIdx = cols.yearAmountCols[0] || 0;
    else if (yearFromDate === 2024) colAmountIdx = cols.yearAmountCols[1] || 0;
    else if (yearFromDate === 2025) colAmountIdx = cols.yearAmountCols[2] || 0;
    else if (yearFromDate === 2026) colAmountIdx = cols.yearAmountCols[3] || 0;

    if (colAmountIdx === 0) continue; // Colonna non trovata

    // Estrai amount, margin, quantity
    const amount = parseAmount(row[colAmountIdx]);
    const margin = parseMargin(row[colAmountIdx + 1]);
    const quantity = parseAmount(row[colAmountIdx + 2]);

    // Registra ordine se ha importo
    if (amount > 0) {
      prodotto.ordini.push({ date: normalizedDate, year: yearFromDate, amount, margin, quantity });

      // Aggrega per anno
      const key = `fatturato${yearFromDate}` as keyof ClienteDettagliato;
      const marginKey = `margine${yearFromDate}` as keyof ClienteDettagliato;
      const oldTotal = (cliente[key] as number) || 0;
      const oldMargin = (cliente[marginKey] as number) || 0;
      const newTotal = oldTotal + amount;
      (cliente[key] as number) = newTotal;
      (cliente[marginKey] as number) = oldTotal > 0 ? (oldMargin * oldTotal + margin * amount) / newTotal : margin;
    }
  }

  const result = Array.from(clientMap.values()).filter(
    c => c.fatturato2023 > 0 || c.fatturato2024 > 0 || c.fatturato2025 > 0 || c.fatturato2026 > 0
  );

  console.log('✅ Parsed clients (dettagliato):', result.length);
  if (result.length > 0) {
    const c = result[0];
    console.log('👥 First client:', c.nome, '| prodotti:', c.prodotti.length);
    if (c.prodotti.length > 0) {
      console.log('📦 First product ordini:', c.prodotti[0].itemId, c.prodotti[0].nome, c.prodotti[0].ordini);
    }
  }

  return result;
}

/**
 * Converte ClienteDettagliato (con ordini granulari) a ClienteRecord (aggregato per compatibility con store).
 */
function convertToClienteRecord(dettagliato: ClienteDettagliato): ClienteRecord {
  return {
    clientId: dettagliato.clientId,
    nome: dettagliato.nome,
    fatturato2023: dettagliato.fatturato2023,
    margine2023: dettagliato.margine2023,
    fatturato2024: dettagliato.fatturato2024,
    margine2024: dettagliato.margine2024,
    fatturato2025: dettagliato.fatturato2025,
    margine2025: dettagliato.margine2025,
    fatturato2026: dettagliato.fatturato2026,
    margine2026: dettagliato.margine2026,
    prodotti: dettagliato.prodotti.map(p => ({
      itemId: p.itemId,
      nome: p.nome,
      fatturato2023: p.ordini.filter(o => o.year === 2023).reduce((s, o) => s + o.amount, 0),
      fatturato2024: p.ordini.filter(o => o.year === 2024).reduce((s, o) => s + o.amount, 0),
      fatturato2025: p.ordini.filter(o => o.year === 2025).reduce((s, o) => s + o.amount, 0),
      fatturato2026: p.ordini.filter(o => o.year === 2026).reduce((s, o) => s + o.amount, 0),
    })),
  };
}

// ─── SIGNAL ANALYSIS (Ordini dal Passato) ─────────────────────────────────────

interface ClientSignals {
  clientId: number;
  nomeCliente: string;
  recency: { giorni: number; status: 'dormiente' | 'ritardo' | 'puntuale' | 'atteso' };
  frequency: { mediaGiorni: number; ultimoGap: number; prossimoPrevisto: string };
  seasonality: { mesiTipici: number[]; meseAtteso: number | null };
  productsLost: { itemId: string; nome: string; ultimoAnno: number; ultimoImporto: number }[];
  quantityTrend: { direction: 'crescita' | 'stabile' | 'calo'; pctChange: number };
  score: number;
  primarySignal: 'ritardo' | 'stagione' | 'prodotto_perso' | 'crescita' | 'nessuno';
  action: string;
}

function analyzeClientSignals(cliente: ClienteDettagliato, oggi: Date): ClientSignals {
  const allOrdini = cliente.prodotti.flatMap(p => p.ordini).sort((a, b) => {
    const dateA = new Date(a.date.split('-').reverse().join('-'));
    const dateB = new Date(b.date.split('-').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });

  if (allOrdini.length === 0) {
    return {
      clientId: cliente.clientId,
      nomeCliente: cliente.nome,
      recency: { giorni: 999, status: 'dormiente' },
      frequency: { mediaGiorni: 0, ultimoGap: 0, prossimoPrevisto: '' },
      seasonality: { mesiTipici: [], meseAtteso: null },
      productsLost: [],
      quantityTrend: { direction: 'stabile', pctChange: 0 },
      score: 0,
      primarySignal: 'nessuno',
      action: '',
    };
  }

  // Recency: giorni dall'ultimo ordine
  const ultimoOrdine = new Date(allOrdini[0].date.split('-').reverse().join('-'));
  const giorniDalUltimo = Math.floor((oggi.getTime() - ultimoOrdine.getTime()) / (1000 * 60 * 60 * 24));

  // Frequency: gap medio tra ordini
  const gaps: number[] = [];
  for (let i = 0; i < allOrdini.length - 1; i++) {
    const d1 = new Date(allOrdini[i].date.split('-').reverse().join('-'));
    const d2 = new Date(allOrdini[i + 1].date.split('-').reverse().join('-'));
    gaps.push(Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)));
  }
  const mediaGiorni = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b) / gaps.length) : 0;
  const ultimoGap = gaps.length > 0 ? gaps[0] : 0;

  // Seasonality: mesi di ordine tipici
  const mesiOrdini = allOrdini.map(o => {
    const parts = o.date.split('-');
    return parseInt(parts[1]);
  });
  const mesiTipici = [...new Set(mesiOrdini)];
  const meseAtteso = mesiTipici.length > 0 ? (oggi.getMonth() + 1) : null;
  const meseAttesoBool = meseAtteso && mesiTipici.includes(meseAtteso);

  // Products Lost: prodotti ordinati prima ma non dopo
  const productsLost: ClientSignals['productsLost'] = [];
  for (const prod of cliente.prodotti) {
    const anni = new Set(prod.ordini.map(o => o.year));
    const maxAnno = Math.max(...anni);
    if (maxAnno < 2024) {
      const ultimoOrd = prod.ordini.filter(o => o.year === maxAnno)[0];
      productsLost.push({
        itemId: prod.itemId,
        nome: prod.nome,
        ultimoAnno: maxAnno,
        ultimoImporto: ultimoOrd?.amount || 0,
      });
    }
  }

  // Quantity Trend: confronta quantità 2024 vs 2023
  const qty2023 = allOrdini.filter(o => o.year === 2023).reduce((s, o) => s + o.quantity, 0);
  const qty2024 = allOrdini.filter(o => o.year === 2024).reduce((s, o) => s + o.quantity, 0);
  const pctChange = qty2023 > 0 ? ((qty2024 - qty2023) / qty2023) * 100 : 0;

  // Score calculation
  let score = 0;
  let primarySignal: ClientSignals['primarySignal'] = 'nessuno';

  if (giorniDalUltimo > mediaGiorni + 30) {
    score += 35; // Ritardo riordino
    primarySignal = 'ritardo';
  } else if (giorniDalUltimo > mediaGiorni) {
    score += 20;
  }

  if (giorniDalUltimo > 180) score += 20; // Molto dormiente
  if (giorniDalUltimo > 365) score += 25; // Estremamente dormiente

  if (meseAttesoBool) {
    score += 20; // Stagionalità attiva
    if (primarySignal === 'nessuno') primarySignal = 'stagione';
  }

  if (productsLost.length > 0) {
    score += Math.min(productsLost.length * 8, 25); // Prodotti persi
    if (primarySignal === 'nessuno') primarySignal = 'prodotto_perso';
  }

  if (pctChange > 25) {
    score += 15; // Crescita quantità
    if (primarySignal === 'nessuno') primarySignal = 'crescita';
  }

  // Action text
  let action = '';
  if (primarySignal === 'ritardo') {
    action = `Ritardo riordino di ${giorniDalUltimo - mediaGiorni} giorni — contattare`;
  } else if (primarySignal === 'stagione') {
    action = `Riordino stagionale previsto — ${new Date(oggi.getFullYear(), meseAtteso! - 1, 15).toLocaleDateString('it-IT', { month: 'long' })}`;
  } else if (primarySignal === 'prodotto_perso') {
    action = `Recuperare ${productsLost[0].nome} — ordinato fino al ${productsLost[0].ultimoAnno}`;
  } else if (primarySignal === 'crescita') {
    action = `Quantità in crescita (+${pctChange.toFixed(0)}%) — proporre volume`;
  }

  return {
    clientId: cliente.clientId,
    nomeCliente: cliente.nome,
    recency: {
      giorni: giorniDalUltimo,
      status: giorniDalUltimo > mediaGiorni + 30 ? 'ritardo' : giorniDalUltimo > 180 ? 'dormiente' : 'puntuale',
    },
    frequency: { mediaGiorni, ultimoGap, prossimoPrevisto: new Date(ultimoOrdine.getTime() + mediaGiorni * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT') },
    seasonality: { mesiTipici, meseAtteso },
    productsLost,
    quantityTrend: { direction: pctChange > 10 ? 'crescita' : pctChange < -10 ? 'calo' : 'stabile', pctChange },
    score: Math.min(score, 100),
    primarySignal,
    action,
  };
}

// ─── PIPELINE ENGINE ──────────────────────────────────────────────────────────

function generaDeal(clienti: ClienteRecord[]): DealSuggerito[] {
  const totale2024 = clienti.reduce((s, c) => s + c.fatturato2024, 0);
  const totale2023 = clienti.reduce((s, c) => s + c.fatturato2023, 0);
  const crescitaMedia = totale2023 > 0 ? ((totale2024 - totale2023) / totale2023) : 0;

  const deals: DealSuggerito[] = [];

  for (const cliente of clienti) {
    const f23 = cliente.fatturato2023;
    const f24 = cliente.fatturato2024;
    if (f23 === 0 && f24 === 0) continue;

    const media = (f23 + f24) / (f23 > 0 && f24 > 0 ? 2 : 1);
    const delta = f23 > 0 ? ((f24 - f23) / f23) : 0;

    // ── Top 3 prodotti per valore (base dell'opportunità) ──
    // L'opportunità di deal riguarda specifici prodotti da riordinare,
    // NON l'intero fatturato annuale del cliente.
    const topProdottiSorted = [...cliente.prodotti]
      .sort((a, b) => (b.fatturato2024 || b.fatturato2023) - (a.fatturato2024 || a.fatturato2023))
      .slice(0, 3);

    // Somma dei top prodotti = base realistica dell'opportunità
    const topSum = topProdottiSorted.reduce(
      (s, p) => s + (p.fatturato2024 > 0 ? p.fatturato2024 : p.fatturato2023), 0
    );
    // Fallback se non ci sono prodotti: 25% del fatturato medio (stima conservativa)
    const baseOpportunita = topSum > 0 ? topSum : Math.round(media * 0.25);

    let priorita: 'alta' | 'media' | 'bassa' = 'media';
    let motivazione = '';
    let valoreStimato = 0;
    let trend: 'crescita' | 'stabile' | 'calo' = 'stabile';

    if (f24 > 0 && f23 > 0) {
      if (delta > 0.1) {
        // Cliente in crescita → stima leggermente superiore alla base
        trend = 'crescita';
        valoreStimato = Math.round(baseOpportunita * (1 + Math.min(delta, 0.3)));
        priorita = 'alta';
        motivazione = `Crescita ${Math.round(delta * 100)}% dal 2023 al 2024 — tendenza positiva`;
      } else if (delta < -0.1) {
        // Cliente in calo → target leggermente sotto la base per recupero
        trend = 'calo';
        valoreStimato = Math.round(baseOpportunita * 0.9);
        priorita = delta < -0.3 ? 'alta' : 'media';
        motivazione = `Calo ${Math.round(Math.abs(delta) * 100)}% — recuperare con visita mirata`;
      } else {
        // Cliente stabile → rinnovo sui prodotti chiave
        trend = 'stabile';
        valoreStimato = Math.round(baseOpportunita * (1 + crescitaMedia * 0.5));
        priorita = f24 > 10000 ? 'alta' : 'media';
        motivazione = `Cliente stabile — opportunità rinnovo sui prodotti top`;
      }
    } else if (f24 === 0 && f23 > 0) {
      // Dormiente
      trend = 'calo';
      valoreStimato = Math.round(baseOpportunita * 0.7);
      priorita = f23 > 5000 ? 'alta' : 'bassa';
      motivazione = `Cliente dormiente — attivo in 2023 (€${fmt(f23)}) ma assente in 2024`;
    } else if (f23 === 0 && f24 > 0) {
      // Nuovo cliente 2024
      trend = 'crescita';
      valoreStimato = Math.round(baseOpportunita * 1.2);
      priorita = 'alta';
      motivazione = `Nuovo cliente 2024 — alto potenziale di fidelizzazione`;
    }

    const topProdotti = topProdottiSorted.map(p =>
      p.nome.length > 35 ? p.nome.substring(0, 35) + '…' : p.nome
    );

    deals.push({
      clientId: cliente.clientId,
      nomeCliente: cliente.nome || `#${cliente.clientId}`,
      valoreStimato,
      motivazione,
      priorita,
      trend,
      prodottiSuggeriti: topProdotti,
      deltaPct: Math.round(delta * 100),
    });
  }

  // Sort: alta priorità prima, poi per valore
  deals.sort((a, b) => {
    const pOrder = { alta: 0, media: 1, bassa: 2 };
    if (pOrder[a.priorita] !== pOrder[b.priorita]) return pOrder[a.priorita] - pOrder[b.priorita];
    return b.valoreStimato - a.valoreStimato;
  });

  return deals.slice(0, 20); // Top 20
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtEur(n: number): string {
  return `€${fmt(n)}`;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub?: string; color: string; icon: React.ElementType }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('bg-', 'bg-').replace('-500', '-50')} dark:bg-gray-700`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, rank, onAddToPipeline }: { deal: DealSuggerito; rank: number; onAddToPipeline: (d: DealSuggerito) => void }) {
  const [open, setOpen] = useState(false);
  const colors = {
    alta: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
    media: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
    bassa: { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', dot: 'bg-gray-400' },
  };
  const c = colors[deal.priorita];
  const trendIcon = deal.trend === 'crescita' ? TrendingUp : deal.trend === 'calo' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;

  return (
    <div className={`rounded-2xl border ${c.bg} ${c.border} overflow-hidden transition-all`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${c.badge} flex-shrink-0`}>
              {rank}
            </div>
            <div className="min-w-0">
              <div className="font-black text-gray-900 dark:text-white text-sm truncate" title={deal.nomeCliente}>{deal.nomeCliente}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{deal.motivazione}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="text-lg font-black text-gray-900 dark:text-white">{fmtEur(deal.valoreStimato)}</div>
            <div className={`flex items-center gap-1 text-xs font-bold ${deal.trend === 'crescita' ? 'text-green-600' : deal.trend === 'calo' ? 'text-red-500' : 'text-gray-400'}`}>
              <TrendIcon size={12} />
              {deal.deltaPct !== 0 ? `${deal.deltaPct > 0 ? '+' : ''}${deal.deltaPct}%` : 'Stabile'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${c.badge}`}>
            {deal.priorita === 'alta' ? '🔴 Priorità Alta' : deal.priorita === 'media' ? '🟡 Priorità Media' : '⚪ Priorità Bassa'}
          </span>
          <button onClick={() => setOpen(!open)} className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
            Prodotti {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {open && deal.prodottiSuggeriti.length > 0 && (
          <div className="mt-3 space-y-1">
            {deal.prodottiSuggeriti.map((p, i) => (
              <div key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {p}
              </div>
            ))}
          </div>
        )}

        {/* ── Aggiungi a Pipeline ── */}
        <button
          onClick={() => onAddToPipeline(deal)}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wide transition-all"
        >
          <ArrowRightCircle size={14} /> Aggiungi a Pipeline
        </button>
      </div>
    </div>
  );
}

// ─── MAIN VIEW ────────────────────────────────────────────────────────────────

export function StoricoView() {
  // ── Stato persistente tra navigazioni (Zustand store in-memory) ──
  const { clienti, fileName, anni, budget, setClienti, setFileName, setAnni, setBudget, reset } = useStoricoStore();
  const { contacts, addDeal } = useStore();
  const { showToast } = useToast();

  // ── Dati dettagliati con ordini individuali (date, importi singoli) ──
  const [clientiDettagliati, setClientiDettagliati] = useState<ClienteDettagliato[]>([]);

  // ── Stato locale di UI (non serve che sopravviva alla navigazione) ──
  const [loading, setLoading] = useState(false);
  const [budgetMode, setBudgetMode] = useState<'annuale' | 'mensile'>('annuale');
  const [activeTab, setActiveTab] = useState<'storico' | 'budget' | 'pipeline'>('storico');
  const [sortField, setSortField] = useState<'id' | 'f2023' | 'f2024' | 'delta'>('f2024');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterDormienti, setFilterDormienti] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Analisi ordini dal passato ──
  const clientiSignals = clientiDettagliati.map(c => analyzeClientSignals(c, new Date())).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  // ── Pipeline modal ──
  const [pipelineModal, setPipelineModal] = useState<DealSuggerito | null>(null);
  const [pmContactId, setPmContactId] = useState('');
  const [pmValue, setPmValue] = useState(0);

  const openPipelineModal = (deal: DealSuggerito) => {
    setPipelineModal(deal);
    setPmContactId('');
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
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];

      // Detect which years are present from headers
      const anniPresenti: string[] = [];
      for (const row of rows.slice(0, 3)) {
        for (const cell of row) {
          const s = String(cell || '');
          if (s.includes('2023')) anniPresenti.push('2023');
          if (s.includes('2024')) anniPresenti.push('2024');
          if (s.includes('2025')) anniPresenti.push('2025');
          if (s.includes('2026')) anniPresenti.push('2026');
        }
      }
      setAnni([...new Set(anniPresenti)]);

      const parsedDettagliato = parseCSVData(rows);
      setClientiDettagliati(parsedDettagliato);
      const parsedRecords = parsedDettagliato.map(convertToClienteRecord);
      setClienti(parsedRecords);
    } catch (e) {
      alert('Errore nel leggere il file. Assicurati sia un file Excel o CSV valido.');
    }
    setLoading(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Computed stats
  const tot2023 = clienti.reduce((s, c) => s + c.fatturato2023, 0);
  const tot2024 = clienti.reduce((s, c) => s + c.fatturato2024, 0);
  const deltaYoY = tot2023 > 0 ? ((tot2024 - tot2023) / tot2023 * 100) : 0;
  const dormienti = clienti.filter(c => c.fatturato2023 > 0 && c.fatturato2024 === 0);
  const nuovi2024 = clienti.filter(c => c.fatturato2023 === 0 && c.fatturato2024 > 0);

  // Budget calculations
  const budgetAnnuale = budget.annuale || 0;
  const budgetMensileBase = budgetAnnuale / 12;
  const deals = clienti.length > 0 ? generaDeal(clienti) : [];
  const totalePipeline = deals.reduce((s, d) => s + d.valoreStimato, 0);
  const gapBudget = Math.max(0, budgetAnnuale - tot2024);

  // Sort clienti
  const clientiSorted = [...clienti]
    .filter(c => !filterDormienti || (c.fatturato2023 > 0 && c.fatturato2024 === 0))
    .sort((a, b) => {
      let va = 0, vb = 0;
      if (sortField === 'id') { va = a.clientId; vb = b.clientId; }
      else if (sortField === 'f2023') { va = a.fatturato2023; vb = b.fatturato2023; }
      else if (sortField === 'f2024') { va = a.fatturato2024; vb = b.fatturato2024; }
      else if (sortField === 'delta') {
        va = a.fatturato2023 > 0 ? (a.fatturato2024 - a.fatturato2023) / a.fatturato2023 : 0;
        vb = b.fatturato2023 > 0 ? (b.fatturato2024 - b.fatturato2023) / b.fatturato2023 : 0;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });

  // Chart data
  const topClientiChart = [...clienti]
    .sort((a, b) => b.fatturato2024 - a.fatturato2024)
    .slice(0, 12)
    .map(c => ({
      name: c.nome ? (c.nome.length > 15 ? c.nome.substring(0, 15) + '…' : c.nome) : `#${c.clientId}`,
      '2023': Math.round(c.fatturato2023),
      '2024': Math.round(c.fatturato2024),
    }));

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    sortField === field
      ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
      : <Minus size={12} className="text-gray-300" />
  );

  // ── EMPTY STATE ────────────────────────────────────────────────────────────
  if (clienti.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Storico Vendite & Pipeline</h1>
          <p className="text-gray-400 text-sm mt-1">Carica il file Excel dello storico per generare la pipeline intelligente</p>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-16 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group"
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.numbers" className="hidden" onChange={onFileChange} />
          {loading
            ? <RefreshCw size={40} className="mx-auto text-indigo-500 animate-spin mb-4" />
            : <Upload size={40} className="mx-auto text-gray-300 group-hover:text-indigo-400 mb-4 transition-colors" />
          }
          <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">
            {loading ? 'Elaborazione in corso…' : 'Carica Storico Vendite'}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Trascina qui il file Excel (.xlsx) o clicca per selezionarlo
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Anno 2023 ✓</span>
            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Anno 2024 ✓</span>
            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-3 py-1 rounded-full">Anno 2025 (presto)</span>
            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-3 py-1 rounded-full">Anno 2026 (presto)</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { icon: BarChart3, label: 'Analisi storico per cliente', color: 'text-indigo-500' },
            { icon: Target, label: 'Budget mensile configurabile', color: 'text-green-500' },
            { icon: Zap, label: 'Deal suggeriti automaticamente', color: 'text-amber-500' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <Icon size={28} className={`${color} mx-auto mb-3`} />
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{label}</p>
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
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Storico & Pipeline</h1>
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {fileName} · {clienti.length} clienti · Anni: {anni.join(', ')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Upload size={15} /> Cambia file
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Fatturato 2023" value={fmtEur(tot2023)} sub={`${clienti.filter(c => c.fatturato2023 > 0).length} clienti attivi`} color="bg-blue-500" icon={Euro} />
        <KPICard label="Fatturato 2024" value={fmtEur(tot2024)} sub={`${deltaYoY > 0 ? '+' : ''}${deltaYoY.toFixed(1)}% vs 2023`} color={deltaYoY >= 0 ? 'bg-green-500' : 'bg-red-500'} icon={TrendingUp} />
        <KPICard label="Clienti Dormienti" value={String(dormienti.length)} sub="attivi 2023, assenti 2024" color="bg-amber-500" icon={AlertTriangle} />
        <KPICard label="Nuovi 2024" value={String(nuovi2024.length)} sub="non presenti in 2023" color="bg-purple-500" icon={Star} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
        {(['storico', 'budget', 'pipeline'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'storico' ? '📊 Storico' : tab === 'budget' ? '🎯 Budget' : '⚡ Pipeline AI'}
          </button>
        ))}
      </div>

      {/* ── TAB: STORICO ── */}
      {activeTab === 'storico' && (
        <div className="space-y-6">
          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <h3 className="font-black text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-widest">Top 12 Clienti per Fatturato</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topClientiChart} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${Math.round(v/1000)}K`} />
                <Tooltip formatter={(v: number) => fmtEur(v)} />
                <Legend />
                <Bar dataKey="2023" fill="#93c5fd" radius={[4,4,0,0]} />
                <Bar dataKey="2024" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setFilterDormienti(!filterDormienti)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${filterDormienti ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
            >
              <AlertTriangle size={14} /> Solo dormienti ({dormienti.length})
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="w-8 px-2" />
                    {[
                      { label: 'Cliente', field: 'id' as const },
                      { label: '2023 (€)', field: 'f2023' as const },
                      { label: '2024 (€)', field: 'f2024' as const },
                      { label: 'Δ YoY', field: 'delta' as const },
                    ].map(({ label, field }) => (
                      <th key={field} onClick={() => toggleSort(field)} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                        <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">2025 (€)</th>
                    <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">2026 (€)</th>
                    <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {clientiSorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(c => {
                    const delta = c.fatturato2023 > 0 ? ((c.fatturato2024 - c.fatturato2023) / c.fatturato2023 * 100) : null;
                    const isDormiente = c.fatturato2023 > 0 && c.fatturato2024 === 0;
                    const isNuovo = c.fatturato2023 === 0 && c.fatturato2024 > 0;
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
                          className={`border-b border-gray-50 dark:border-gray-700/50 transition-colors ${hasProdotti ? 'cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} ${isExpanded ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                        >
                          <td className="w-8 px-2 py-3 text-gray-300">
                            {hasProdotti && (isExpanded ? <ChevronUp size={14} className="text-indigo-500" /> : <ChevronDown size={14} />)}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white truncate max-w-[250px]" title={c.nome || `#${c.clientId}`}>{c.nome || `#${c.clientId}`}</td>
                          <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{c.fatturato2023 > 0 ? fmtEur(c.fatturato2023) : '—'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">{c.fatturato2024 > 0 ? fmtEur(c.fatturato2024) : '—'}</td>
                          <td className="px-4 py-3">
                            {delta !== null ? (
                              <span className={`flex items-center gap-1 font-bold text-xs ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                                {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{(c.fatturato2025 || 0) > 0 ? fmtEur(c.fatturato2025!) : '—'}</td>
                          <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{(c.fatturato2026 || 0) > 0 ? fmtEur(c.fatturato2026!) : '—'}</td>
                          <td className="px-4 py-3">
                            {isDormiente && <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-lg font-bold">Dormiente</span>}
                            {isNuovo && <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-lg font-bold">Nuovo 2024</span>}
                            {!isDormiente && !isNuovo && delta !== null && delta > 20 && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-lg font-bold">In crescita</span>}
                            {!isDormiente && !isNuovo && delta !== null && delta < -20 && <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-lg font-bold">In calo</span>}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${c.clientId}-prodotti`} className="border-b border-indigo-100 dark:border-indigo-900/30">
                            <td colSpan={8} className="px-0 py-0">
                              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 px-6 py-3">
                                {allOrdini.length > 0 ? (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-gray-400 uppercase tracking-widest font-black">
                                        <th className="text-left pb-2 pr-3">Data</th>
                                        <th className="text-left pb-2 pr-3">Codice</th>
                                        <th className="text-left pb-2">Prodotto</th>
                                        <th className="text-right pb-2 pr-3">Importo</th>
                                        <th className="text-right pb-2 pr-3">Margine</th>
                                        <th className="text-right pb-2">Qtà</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-100/60 dark:divide-indigo-900/20">
                                      {allOrdini.map((o, idx) => (
                                        <tr key={`${o.itemId}-${o.date}-${idx}`} className="text-gray-600 dark:text-gray-300">
                                          <td className="py-1.5 pr-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                              o.year === 2023 ? 'bg-blue-100 text-blue-600' :
                                              o.year === 2024 ? 'bg-indigo-100 text-indigo-600' :
                                              o.year === 2025 ? 'bg-violet-100 text-violet-600' :
                                              'bg-purple-100 text-purple-600'
                                            }`}>{o.date}</span>
                                          </td>
                                          <td className="py-1.5 pr-3 font-mono text-gray-400 whitespace-nowrap">{o.itemId}</td>
                                          <td className="py-1.5 pr-3 font-medium max-w-xs truncate">{o.nome}</td>
                                          <td className="py-1.5 pr-3 text-right font-mono font-bold text-gray-800 dark:text-white">{fmtEur(o.amount)}</td>
                                          <td className="py-1.5 pr-3 text-right font-mono text-gray-500">{o.margin > 0 ? `${o.margin.toFixed(1)}%` : '—'}</td>
                                          <td className="py-1.5 text-right font-mono text-gray-500">{o.quantity > 0 ? o.quantity : '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-xs text-gray-400 py-2">Ricarica il file per vedere il dettaglio ordini con date</p>
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, clientiSorted.length)} di {clientiSorted.length} clienti
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setPage(p => p - 1); setExpandedClientId(null); }}
                      disabled={page === 0}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      ← Prec
                    </button>
                    {Array.from({ length: Math.ceil(clientiSorted.length / PAGE_SIZE) }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => { setPage(i); setExpandedClientId(null); }}
                        className={`w-8 h-8 text-xs font-black rounded-lg transition-colors ${page === i ? 'bg-indigo-600 text-white' : 'border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => { setPage(p => p + 1); setExpandedClientId(null); }}
                      disabled={page >= Math.ceil(clientiSorted.length / PAGE_SIZE) - 1}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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

      {/* ── TAB: BUDGET ── */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          {/* Budget input */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest mb-5">🎯 Imposta Budget Annuale</h3>

            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Budget Annuale (€)</label>
                <div className="relative">
                  <Euro size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={budget.annuale || ''}
                    onChange={e => setBudget(b => ({ ...b, annuale: parseFloat(e.target.value) || 0 }))}
                    placeholder="es. 500000"
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-bold bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setBudgetMode('annuale')}
                  className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${budgetMode === 'annuale' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                >
                  Annuale
                </button>
                <button
                  onClick={() => setBudgetMode('mensile')}
                  className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${budgetMode === 'mensile' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                >
                  Per Mese
                </button>
              </div>
            </div>

            {budget.annuale > 0 && (
              <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Mensile Base</div>
                    <div className="font-black text-indigo-600">{fmtEur(budgetMensileBase)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">vs 2024</div>
                    <div className={`font-black ${budget.annuale > tot2024 ? 'text-amber-600' : 'text-green-600'}`}>
                      {budget.annuale > tot2024 ? '+' : ''}{fmtEur(budget.annuale - tot2024)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Crescita %</div>
                    <div className="font-black text-gray-700 dark:text-gray-200">
                      {tot2024 > 0 ? `${((budget.annuale - tot2024) / tot2024 * 100).toFixed(1)}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Griglia mensile */}
          {budgetMode === 'mensile' && budget.annuale > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest mb-5">📅 Suddivisione Mensile</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {MESI.map(m => {
                  const val = budget.mensile[m] || budgetMensileBase;
                  const pct = budget.annuale > 0 ? (val / budget.annuale * 100) : 0;
                  return (
                    <div key={m} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{m}</div>
                      <input
                        type="number"
                        value={Math.round(val)}
                        onChange={e => setBudget(b => ({ ...b, mensile: { ...b.mensile, [m]: parseFloat(e.target.value) || 0 } }))}
                        className="w-full text-sm font-bold bg-transparent dark:text-white focus:outline-none border-b border-gray-200 dark:border-gray-600 pb-1"
                      />
                      <div className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}%</div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(pct * 12, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Totale mensile: <strong className="text-gray-900 dark:text-white">{fmtEur(Object.values(budget.mensile).reduce((s, v) => s + v, 0) || budget.annuale)}</strong>
              </div>
            </div>
          )}

          {/* Confronto storico vs budget */}
          {budget.annuale > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <h3 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest mb-4">📊 Storico vs Budget</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { anno: '2023', fatturato: Math.round(tot2023), budget: 0 },
                  { anno: '2024', fatturato: Math.round(tot2024), budget: 0 },
                  { anno: '2025 (prev)', fatturato: 0, budget: Math.round(budget.annuale) },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="anno" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${Math.round(v / 1000)}K`} />
                  <Tooltip formatter={(v: number) => fmtEur(v)} />
                  <Legend />
                  <Bar dataKey="fatturato" name="Fatturato Reale" fill="#6366f1" radius={[6,6,0,0]} />
                  <Bar dataKey="budget" name="Budget Target" fill="#f59e0b" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {budget.annuale === 0 && (
            <div className="text-center py-12 text-gray-400">
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
            <div className={`rounded-2xl p-5 border flex items-center justify-between gap-4 flex-wrap ${gapBudget > 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'}`}>
              <div className="flex items-center gap-4">
                <div className="text-3xl">{gapBudget > 0 ? '⚠️' : '✅'}</div>
                <div>
                  <div className={`font-black text-sm ${gapBudget > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                    {gapBudget > 0 ? `Gap da colmare: ${fmtEur(gapBudget)}` : 'Budget raggiunto!'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {gapBudget > 0
                      ? `Il sistema ha identificato ${deals.length} deal con potenziale totale di ${fmtEur(totalePipeline)}`
                      : `Fatturato 2024 ${fmtEur(tot2024)} supera il target`
                    }
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-gray-900 dark:text-white">{fmtEur(totalePipeline)}</div>
                <div className="text-xs text-gray-500">Potenziale pipeline</div>
              </div>
            </div>
          )}

          {budgetAnnuale === 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Imposta il budget</strong> nel tab Budget per vedere il gap da colmare. La pipeline è comunque visibile.
              </p>
              <button onClick={() => setActiveTab('budget')} className="ml-auto text-xs font-bold text-amber-600 whitespace-nowrap flex items-center gap-1">
                Vai al Budget <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Statistiche pipeline */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-2xl font-black text-red-600">{deals.filter(d => d.priorita === 'alta').length}</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Alta Priorità</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-2xl font-black text-amber-600">{deals.filter(d => d.priorita === 'media').length}</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Media Priorità</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-2xl font-black text-indigo-600">{fmtEur(totalePipeline)}</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Totale Pipeline</div>
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
                <h3 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                  🔄 Ordini dal Passato
                  <span className="text-xs bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded-lg">{clientiSignals.length}</span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {clientiSignals.slice(0, 10).map((signal) => {
                    const colorMap = {
                      ritardo: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '🔥' },
                      stagione: { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '📅' },
                      prodotto_perso: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '⚠️' },
                      crescita: { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200 dark:border-green-800', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '📈' },
                      nessuno: { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: '⭕' },
                    };
                    const c = colorMap[signal.primarySignal];

                    return (
                      <div key={signal.clientId} className={`rounded-2xl border ${c.bg} ${c.border} overflow-hidden transition-all p-4`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-black text-gray-900 dark:text-white text-sm truncate" title={signal.nomeCliente}>{signal.nomeCliente}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Score: {signal.score}/100</div>
                          </div>
                          <div className="text-2xl ml-2">{c.icon}</div>
                        </div>

                        {/* Segnali attivi */}
                        <div className="space-y-1.5 mb-3">
                          {signal.recency.status !== 'puntuale' && signal.recency.giorni > 0 && (
                            <div className="text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                              <span className="font-bold">⏱️ {signal.recency.status === 'ritardo' ? 'Ritardo' : 'Dormiente'}</span> {signal.recency.giorni}gg da ultimo ordine
                            </div>
                          )}
                          {signal.seasonality.meseAtteso && signal.frequency.mediaGiorni > 0 && (
                            <div className="text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                              <span className="font-bold">📅 Ordina ogni</span> {signal.frequency.mediaGiorni}gg
                            </div>
                          )}
                          {signal.productsLost.length > 0 && (
                            <div className="text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                              <span className="font-bold">⚠️ Perso:</span> {signal.productsLost[0].nome}
                            </div>
                          )}
                          {Math.abs(signal.quantityTrend.pctChange) > 10 && (
                            <div className="text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                              <span className="font-bold">📈 Qty</span> {signal.quantityTrend.direction === 'crescita' ? '+' : ''}{signal.quantityTrend.pctChange.toFixed(0)}%
                            </div>
                          )}
                        </div>

                        <div className="mb-3 p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{signal.action}</p>
                        </div>

                        <button
                          onClick={() => {
                            const clienteData = clientiDettagliati.find(c => c.clientId === signal.clientId);
                            const estimatedValue = Math.round(signal.frequency.mediaGiorni > 0 ? (clienteData?.fatturato2024 || 0) / (365 / signal.frequency.mediaGiorni) : (clienteData?.fatturato2024 || 0) * 0.25);
                            const newDeal: DealSuggerito = {
                              clientId: signal.clientId,
                              nomeCliente: signal.nomeCliente,
                              valoreStimato: estimatedValue,
                              motivazione: signal.action,
                              priorita: signal.score > 75 ? 'alta' : signal.score > 50 ? 'media' : 'bassa',
                              trend: signal.quantityTrend.direction as 'crescita' | 'stabile' | 'calo',
                              prodottiSuggeriti: signal.productsLost.map(p => p.nome).slice(0, 3),
                              deltaPct: Math.round(signal.quantityTrend.pctChange),
                            };
                            setPipelineModal(newDeal);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wide transition-all"
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
            <div className="text-center py-12 text-gray-400">
              <Zap size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Carica lo storico per generare i deal suggeriti</p>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: Aggiungi a Pipeline ─────────────────────────────────────── */}
      {pipelineModal && (() => {
        // Recupera il record storico del cliente per mostrare il contesto
        const clienteRecord = clienti.find(c => c.clientId === pipelineModal.clientId);
        return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-lg">Aggiungi a Pipeline</h3>
                <p className="text-xs text-gray-400 mt-0.5">{pipelineModal.nomeCliente} · {pipelineModal.motivazione}</p>
              </div>
              <button onClick={() => setPipelineModal(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Contesto storico — separato dal valore deal */}
            {clienteRecord && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">📊 Storico fatturato cliente (riferimento)</p>
                <div className="flex gap-4">
                  {clienteRecord.fatturato2023 > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400">2023 totale</p>
                      <p className="text-sm font-black text-gray-600 dark:text-gray-300">{fmtEur(clienteRecord.fatturato2023)}</p>
                    </div>
                  )}
                  {clienteRecord.fatturato2024 > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400">2024 totale</p>
                      <p className="text-sm font-black text-gray-700 dark:text-white">{fmtEur(clienteRecord.fatturato2024)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Valore opportunità — basato sui prodotti top, NON sul fatturato totale */}
            <div className="mb-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Valore Opportunità (€)</label>
              <p className="text-[10px] text-gray-400 mb-1.5">
                Stimato sui <strong>prodotti top</strong> del cliente — modifica liberamente
              </p>
              <div className="relative">
                <Euro size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={pmValue}
                  onChange={e => setPmValue(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl font-black text-lg bg-gray-50 dark:bg-gray-900 dark:text-white outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
            </div>

            {/* Selezione azienda CRM */}
            <div className="mb-5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                Collega ad Azienda CRM <span className="text-gray-300 font-normal normal-case">(opzionale)</span>
              </label>
              <select
                value={pmContactId}
                onChange={e => setPmContactId(e.target.value)}
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-colors text-sm"
              >
                <option value="">— Nessuna azienda (aggiungila dopo) —</option>
                {Object.values(contacts)
                  .filter(c => c.status === 'cliente')
                  .sort((a, b) => a.company.localeCompare(b.company))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.company}</option>
                  ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <Star size={10} /> Solo clienti attivi — puoi modificare il deal in Pipeline dopo la creazione
              </p>
            </div>

            {/* Prodotti suggeriti (read-only) */}
            {pipelineModal.prodottiSuggeriti.length > 0 && (
              <div className="mb-5 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Prodotti da proporre</p>
                <div className="space-y-1">
                  {pipelineModal.prodottiSuggeriti.map((p, i) => (
                    <div key={i} className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setPipelineModal(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-black text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Annulla
              </button>
              <button onClick={confirmAddToPipeline}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors shadow-lg">
                <Plus size={16} /> Crea Deal
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
