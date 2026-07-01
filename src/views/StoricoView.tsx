import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useStoricoStore, ClienteRecord, ClienteDettagliato as ClienteDettagliatoType } from '../store/storicoStore';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../lib/authContext';
import { saveStoricoToFirestore, loadStoricoFromFirestore, deleteStoricoFromFirestore } from '../lib/storicoFirestore';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch } from '../utils/search';
import {
  Upload, TrendingUp, TrendingDown, Target, Zap, AlertTriangle,
  ChevronDown, ChevronUp, Euro, BarChart3,
  Star, ArrowRight, RefreshCw,
  Minus, Plus, X, ArrowRightCircle, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import type { DealSuggerito } from '../utils/pipelineSuggestions';
import { MESI, generaDeal, getSeasonalBase } from '../utils/pipelineSuggestions';

// ─── TYPES ────────────────────────────────────────────────────────────────────
// ClienteRecord, ProdottoRecord, StoricoBudget are imported from storicoStore

type ClienteDettagliato = ClienteDettagliatoType;

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
  colAnno: number;
  colMese: number;
  colClass: number;
  colProductModel: number;
  yearAmountCols: number[];
  colAmount: number;
  colQuantity: number;
  isLongFormat: boolean;
} {
  const result = {
    colCustomerName: -1,
    colItemId: -1,
    colItemName: -1,
    colDate: -1,
    colAnno: -1,
    colMese: -1,
    colClass: -1,
    colProductModel: -1,
    yearAmountCols: [] as number[],
    colAmount: -1,
    colQuantity: -1,
    isLongFormat: false,
  };

  // Cerca le intestazioni nelle prime 3 righe
  for (let r = 0; r < Math.min(3, rows.length); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toLowerCase().trim();

      // Formato wide (inglese Blaklader originale)
      if (cell.includes('customer name') || cell.includes('customer')) result.colCustomerName = c;
      if (cell.includes('item id')) result.colItemId = c;
      if (cell.includes('item name')) result.colItemName = c;
      if (cell.includes('invoiced line am')) {
        if (!result.yearAmountCols.includes(c)) result.yearAmountCols.push(c);
      }

      // Formato long (italiano — una riga per transazione)
      if (cell === 'cliente' || cell.includes('ragione sociale')) result.colCustomerName = c;
      if (cell === 'qualità' || cell === 'qualita' || cell === 'item id') result.colItemId = c;
      if (cell === 'prodotto' || cell.includes('item name')) result.colItemName = c;
      if (cell === 'importo (€)' || cell === 'importo' || cell.startsWith('importo')) result.colAmount = c;
      if (cell === 'quantità' || cell === 'quantita' || cell === 'qty' || cell === 'quantity') result.colQuantity = c;
      if (cell === 'anno' || cell === 'year') result.colAnno = c;
      if (cell === 'mese' || cell === 'month') result.colMese = c;
      if (cell === 'class' || cell === 'classe') result.colClass = c;
      if (cell === 'product model' || cell === 'productmodel' || cell === 'modello') result.colProductModel = c;

      // Data — sia inglese che italiano
      if (cell.includes('data fattura') || cell === 'data') result.colDate = c;
      else if (result.colDate < 0 && cell.includes('date')) result.colDate = c;
    }
  }

  result.isLongFormat = result.yearAmountCols.length === 0 && result.colAmount >= 0;
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
  const hasWideAmount = cols.yearAmountCols.length > 0;
  const hasLongAmount = cols.isLongFormat && cols.colAmount >= 0;
  if (cols.colCustomerName < 0 || cols.colItemId < 0 || cols.colItemName < 0 || cols.colDate < 0 || (!hasWideAmount && !hasLongAmount)) {
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
    // itemName: fallback su itemId se la colonna prodotto è vuota (es. righe 2026 senza descrizione)
    const itemName = String(row[cols.colItemName] || '').trim() || itemId;
    const dateOrder = String(row[cols.colDate] || '').trim();
    // annoRiga: colonna Anno separata, usata come fallback se Data fattura è null
    const annoRiga: number | null = cols.colAnno >= 0
      ? (typeof row[cols.colAnno] === 'number' ? row[cols.colAnno] as number : parseInt(String(row[cols.colAnno] || '')) || null)
      : null;
    // Colonne descrittive aggiuntive (Mese / Class / Product Model)
    const meseRiga = cols.colMese >= 0 ? String(row[cols.colMese] || '').trim() : '';
    const classeRiga = cols.colClass >= 0 ? String(row[cols.colClass] || '').trim() : '';
    const productModelRiga = cols.colProductModel >= 0 ? String(row[cols.colProductModel] || '').trim() : '';

    // Aggiorna il nome cliente corrente se presente nella riga
    if (rawCustomerName && rawCustomerName !== 'Customer name' && !rawCustomerName.toLowerCase().includes('calendar')) {
      currentCustomerName = rawCustomerName;
    }

    // Skip header rows e righe senza dati minimi (itemId è obbligatorio; dateOrder o annoRiga devono esserci)
    if (!currentCustomerName || !itemId || (!dateOrder && !annoRiga)) {
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

    // Fallback: se la data è assente ma la colonna Anno ha un valore valido (es. righe 2026 senza Data fattura)
    if (yearFromDate === 0 && annoRiga && annoRiga >= 2023 && annoRiga <= 2026) {
      yearFromDate = annoRiga;
      normalizedDate = `01-01-${annoRiga}`;
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

    // Estrai amount, margin, quantity — formato long o wide
    let amount = 0;
    let margin = 0;
    let quantity = 0;

    if (cols.isLongFormat) {
      // Long format: importo e quantità in colonne dedicate
      const rawAmt = row[cols.colAmount];
      amount = typeof rawAmt === 'number' ? rawAmt : parseAmount(rawAmt);
      const rawQty = cols.colQuantity >= 0 ? row[cols.colQuantity] : undefined;
      quantity = rawQty !== undefined ? (typeof rawQty === 'number' ? rawQty : parseAmount(rawQty)) : 0;
    } else {
      // Wide format: colonne per anno
      let colAmountIdx = 0;
      if (yearFromDate === 2023) colAmountIdx = cols.yearAmountCols[0] || 0;
      else if (yearFromDate === 2024) colAmountIdx = cols.yearAmountCols[1] || 0;
      else if (yearFromDate === 2025) colAmountIdx = cols.yearAmountCols[2] || 0;
      else if (yearFromDate === 2026) colAmountIdx = cols.yearAmountCols[3] || 0;
      if (colAmountIdx === 0) continue;
      amount = parseAmount(row[colAmountIdx]);
      margin = parseMargin(row[colAmountIdx + 1]);
      quantity = parseAmount(row[colAmountIdx + 2]);
    }

    // Registra ordine se ha importo
    if (amount > 0) {
      prodotto.ordini.push({
        date: normalizedDate, year: yearFromDate, amount, margin, quantity,
        mese: meseRiga || undefined,
        classe: classeRiga || undefined,
        productModel: productModelRiga || undefined,
      });

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

// ─── PIVOT FORMAT PARSER ──────────────────────────────────────────────────────

const PIVOT_MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function isPivotFormat(rows: any[][]): boolean {
  if (rows.length < 6) return false;
  const r1 = rows[1] || [];
  const r4 = rows[4] || [];
  // "Somma di Invoice Amount" è il segnale più affidabile: appare molte volte in row 4
  const hasSommaInvoice = r4.some((v: any) =>
    String(v || '').toLowerCase().includes('somma di invoice amount')
  );
  // Anni 2020-2030 in row 1, accetta sia number che string
  const hasYear = r1.some((v: any) => {
    const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
    return !isNaN(n) && n >= 2020 && n <= 2030;
  });
  return hasSommaInvoice && hasYear;
}

function parsePivotData(rows: any[][]): ClienteDettagliato[] {
  const r1 = rows[1] || [], r2 = rows[2] || [], r3 = rows[3] || [], r4 = rows[4] || [];

  // Mappa colonne: (anno, mese, giorno) → {colAmt, colQty}
  const leafCols: { colAmt: number; colQty: number; year: number; month: number; day: number }[] = [];
  let curYear = 0, curMonth = 0, curDay = 0;

  for (let c = 1; c < r4.length; c++) {
    const yRaw = r1[c];
    const yNum = typeof yRaw === 'number' ? yRaw : parseInt(String(yRaw || ''), 10);
    if (!isNaN(yNum) && yNum >= 2020 && yNum <= 2030) curYear = yNum;
    const monthStr = String(r2[c] || '').toLowerCase().trim();
    if (monthStr && PIVOT_MONTH_MAP[monthStr]) curMonth = PIVOT_MONTH_MAP[monthStr];
    const dRaw = r3[c];
    const dNum = typeof dRaw === 'number' ? dRaw : parseInt(String(dRaw || ''), 10);
    if (!isNaN(dNum) && dNum >= 1 && dNum <= 31) curDay = dNum;
    const leaf = String(r4[c] || '').toLowerCase().trim();
    if (leaf === 'somma di invoice amount' && curYear >= 2023 && curMonth >= 1 && curDay >= 1) {
      leafCols.push({ colAmt: c, colQty: c + 1, year: curYear, month: curMonth, day: curDay });
    }
  }

  const clientMap = new Map<string, ClienteDettagliato>();
  let currentCliente: ClienteDettagliato | null = null;

  for (let ri = 5; ri < rows.length; ri++) {
    const row = rows[ri];
    const rawLabel = String(row[0] || '').trim();
    if (!rawLabel) continue;
    const labelLower = rawLabel.toLowerCase();
    if (labelLower.startsWith('totale') || labelLower === '(vuoto)' || labelLower.startsWith('grand')) continue;

    // Codice articolo Blåkläder: 0-4 lettere opzionali + cifre, senza spazi
    // Es: "1193", "E218", "NC3281" → articolo; "ARON SRL", "ATEA..." → cliente
    const cleanLabel = rawLabel.replace(/^\*+\s*/, '').trim();
    const isProductCode = /^[A-Za-z]{0,4}\d+$/.test(cleanLabel);

    if (!isProductCode) {
      // Nuova riga cliente
      if (!clientMap.has(cleanLabel)) {
        clientMap.set(cleanLabel, {
          clientId: clientMap.size + 1,
          nome: cleanLabel,
          prodotti: [],
          fatturato2023: 0, margine2023: 0,
          fatturato2024: 0, margine2024: 0,
          fatturato2025: 0, margine2025: 0,
          fatturato2026: 0, margine2026: 0,
        });
      }
      currentCliente = clientMap.get(cleanLabel)!;
    } else {
      // Riga prodotto — leggi gli ordini per data
      if (!currentCliente) continue;
      const itemId = cleanLabel;

      let prodotto = currentCliente.prodotti.find(p => p.itemId === itemId);
      if (!prodotto) {
        prodotto = { itemId, nome: itemId, ordini: [] };
        currentCliente.prodotti.push(prodotto);
      }

      for (const ci of leafCols) {
        const rawAmt = row[ci.colAmt];
        const amount = typeof rawAmt === 'number' ? rawAmt : parseAmount(rawAmt);
        if (amount <= 0) continue;
        const rawQty = row[ci.colQty];
        const quantity = typeof rawQty === 'number' ? rawQty : parseAmount(rawQty);
        const dd = String(ci.day).padStart(2, '0');
        const mm = String(ci.month).padStart(2, '0');
        const date = `${dd}-${mm}-${ci.year}`;
        prodotto.ordini.push({ date, year: ci.year, amount, margin: 0, quantity });
        const key = `fatturato${ci.year}` as keyof ClienteDettagliato;
        (currentCliente[key] as number) = ((currentCliente[key] as number) || 0) + amount;
      }
    }
  }

  return Array.from(clientMap.values()).filter(
    c => c.fatturato2023 > 0 || c.fatturato2024 > 0 || c.fatturato2025 > 0 || c.fatturato2026 > 0
  );
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
            Dettaglio {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {open && (
          <div className="mt-3 space-y-3">
            {/* Breakdown stagionale */}
            {deal.mensili && deal.mensili.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Ordini periodo {deal.mesiWindow?.map(m => MESI[m - 1]).join('/')}
                </p>
                <div className="space-y-1">
                  {deal.mensili.map(({ year, amount }) => (
                    <div key={year} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500 w-10">{year}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.dot}`}
                          style={{ width: `${Math.min(100, (amount / Math.max(...deal.mensili!.map(d => d.amount))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 w-16 text-right">
                        {fmtEur(Math.round(amount))}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700 mt-1">
                    <span className="text-[10px] font-black uppercase text-gray-400">Media</span>
                    <span className="text-xs font-black text-indigo-600">
                      {fmtEur(Math.round(deal.mensili.reduce((s, d) => s + d.amount, 0) / deal.mensili.length))}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Prodotti suggeriti */}
            {deal.prodottiSuggeriti.length > 0 && (
              <div className="space-y-1">
                {deal.prodottiSuggeriti.map((p, i) => (
                  <div key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                    {p}
                  </div>
                ))}
              </div>
            )}
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
    loadStoricoFromFirestore(user.uid)
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
      deleteStoricoFromFirestore(user.uid).catch(() => {});
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
        saveStoricoToFirestore(user.uid, parsedRecords, [...anniSet].sort(), file.name, budget, parsedDettagliato)
          .then(() => showToast('Storico sincronizzato sul cloud ✅', 'success'))
          .catch(() => showToast('Sync cloud fallita — dati salvati localmente', 'error'));
      }
    } catch (e) {
      alert('Errore nel leggere il file. Assicurati sia un file Excel o CSV valido.');
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
          onClick={() => !firestoreLoading && fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-8 sm:p-16 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group"
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.numbers" className="hidden" onChange={onFileChange} />
          {(loading || firestoreLoading)
            ? <RefreshCw size={40} className="mx-auto text-indigo-500 animate-spin mb-4" />
            : <Upload size={40} className="mx-auto text-gray-300 group-hover:text-indigo-400 mb-4 transition-colors" />
          }
          <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">
            {loading ? 'Elaborazione in corso…' : firestoreLoading ? 'Caricamento dati dal cloud…' : 'Carica Storico Vendite'}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Trascina qui il file Excel (.xlsx) o clicca per selezionarlo
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Formato Blaklader ✓</span>
            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Anno 2024 ✓</span>
            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Anno 2025 ✓</span>
            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Pivot Excel ✓</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
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
        inputWrapperClassName={() => 'flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-3 py-2.5 focus-within:border-indigo-400 transition-colors'}
        results={(searchQuery.trim()
          ? clienti.filter(c => matchSearch(searchQuery, [c.nome])).slice(0, 8)
          : []
        ).map(c => ({
          key: String(c.clientId),
          item: c,
          label: c.nome || `#${c.clientId}`,
          sublabel: `${fmtEur((((c as any)[`fatturato${annoCorr}`] as number) || 0))} (${annoCorr})`,
        }))}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={`Fatturato ${annoPrev}`} value={fmtEur(totPrev)} sub={`${clienti.filter(c => (((c as any)[`fatturato${annoPrev}`] as number) || 0) > 0).length} clienti attivi`} color="bg-blue-500" icon={Euro} />
        <KPICard label={`Fatturato ${annoCorr}`} value={fmtEur(totCorr)} sub={`${deltaYoY > 0 ? '+' : ''}${deltaYoY.toFixed(1)}% vs ${annoPrev}`} color={deltaYoY >= 0 ? 'bg-green-500' : 'bg-red-500'} icon={TrendingUp} />
        <KPICard label="Clienti Dormienti" value={String(dormienti.length)} sub={`attivi ${annoPrev}, assenti ${annoCorr}`} color="bg-amber-500" icon={AlertTriangle} />
        <KPICard label={`Nuovi ${annoCorr}`} value={String(nuoviCorr.length)} sub={`non presenti in ${annoPrev}`} color="bg-purple-500" icon={Star} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
        {(['storico', 'riepilogo', 'budget', 'pipeline'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'storico' ? '📊 Storico' : tab === 'riepilogo' ? '📋 Riepilogo Cliente' : tab === 'budget' ? '🎯 Budget' : '⚡ Pipeline AI'}
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
                <Bar dataKey={String(annoPrev)} fill="#93c5fd" radius={[4,4,0,0]} />
                <Bar dataKey={String(annoCorr)} fill="#6366f1" radius={[4,4,0,0]} />
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
                      { label: `${annoPrev} (€)`, field: 'f2023' as const },
                      { label: `${annoCorr} (€)`, field: 'f2024' as const },
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
                          className={`border-b border-gray-50 dark:border-gray-700/50 transition-colors ${hasProdotti ? 'cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} ${isExpanded ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                        >
                          <td className="w-8 px-2 py-3 text-gray-300">
                            {hasProdotti && (isExpanded ? <ChevronUp size={14} className="text-indigo-500" /> : <ChevronDown size={14} />)}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white truncate max-w-[250px]" title={c.nome || `#${c.clientId}`}>{c.nome || `#${c.clientId}`}</td>
                          <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{cPrev > 0 ? fmtEur(cPrev) : '—'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">{cCorr > 0 ? fmtEur(cCorr) : '—'}</td>
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
                            {isNuovo && <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-lg font-bold">Nuovo {annoCorr}</span>}
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
                                        <th className="text-left pb-2 pr-3">Mese</th>
                                        <th className="text-left pb-2 pr-3">Class</th>
                                        <th className="text-left pb-2 pr-3">Product Model</th>
                                        <th className="text-left pb-2">Prodotto</th>
                                        <th className="text-right pb-2 pr-3">Importo</th>
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
                                          <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{o.mese || '—'}</td>
                                          <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{o.classe || '—'}</td>
                                          <td className="py-1.5 pr-3 font-mono text-gray-400 whitespace-nowrap">{o.productModel || o.itemId || '—'}</td>
                                          <td className="py-1.5 pr-3 font-medium max-w-xs truncate" title={o.nome}>{o.nome}</td>
                                          <td className="py-1.5 pr-3 text-right font-mono font-bold text-gray-800 dark:text-white">{fmtEur(o.amount)}</td>
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

      {/* ── TAB: RIEPILOGO PER CLIENTE ── */}
      {activeTab === 'riepilogo' && (
        <div className="space-y-6">
          {/* Header + ricerca */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest">📋 Riepilogo per Cliente</h3>
              <p className="text-xs text-gray-400 mt-1">Fatturato e quantità per cliente · 2024 · 2025 · 2026 (YTD) · {riepilogoRows.length} clienti</p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={riepilogoSearch}
                onChange={e => setRiepilogoSearch(e.target.value)}
                placeholder="Cerca cliente…"
                className="pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-black uppercase tracking-widest text-gray-400">
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
                    <tr key={`${r.nome}-${i}`} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white max-w-[260px] truncate" title={r.nome}>{r.nome}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-300">{r.f2024 > 0 ? fmtEur(r.f2024) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-300">{r.f2025 > 0 ? fmtEur(r.f2025) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-300">{r.f2026 > 0 ? fmtEur(r.f2026) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmtEur(r.totale)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-500">{r.q2024 > 0 ? fmt(r.q2024) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-500">{r.q2025 > 0 ? fmt(r.q2025) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-500">{r.q2026 > 0 ? fmt(r.q2026) : '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.var2425 === null ? 'text-gray-400' : r.var2425 >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtPct(r.var2425)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.var2526 === null ? 'text-gray-400' : r.var2526 >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtPct(r.var2526)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 font-black text-gray-900 dark:text-white">
                    <td className="px-4 py-3 uppercase text-xs tracking-widest">Totale ({riepilogoRows.length})</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.f2024)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.f2025)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.f2026)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtEur(riepilogoTotali.totale)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(riepilogoTotali.q2024)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(riepilogoTotali.q2025)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(riepilogoTotali.q2026)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">—</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">—</td>
                  </tr>
                </tfoot>
              </table>
              {riepilogoRows.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">Nessun cliente trovato.</p>
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
                  { anno: String(annoPrev), fatturato: Math.round(totPrev), budget: 0 },
                  { anno: String(annoCorr), fatturato: Math.round(totCorr), budget: 0 },
                  { anno: `${annoCorr + 1} (prev)`, fatturato: 0, budget: Math.round(budget.annuale) },
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
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">📊 Fatturato effettivo (da storico)</p>
                  <div className="flex gap-4 flex-wrap">
                    {yearsWithData.map(y => (
                      <div key={y}>
                        <p className="text-[10px] text-gray-400">{y}{y === 2026 ? ' YTD' : ''}</p>
                        <p className="text-sm font-black text-gray-700 dark:text-white">
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
                Collega ad Azienda CRM
                {pmContactId && <span className="ml-2 text-emerald-500 font-black normal-case">✓ Collegato automaticamente</span>}
              </label>
              <select
                value={pmContactId}
                onChange={e => setPmContactId(e.target.value)}
                className={`w-full border-2 rounded-xl px-3 py-3 bg-gray-50 dark:bg-gray-900 dark:text-white font-bold outline-none focus:border-indigo-400 transition-colors text-sm ${pmContactId ? 'border-emerald-300 dark:border-emerald-700' : 'border-gray-100 dark:border-gray-700'}`}
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
              <p className="text-[10px] text-gray-400 mt-1.5">
                Il collegamento viene cercato automaticamente per nome — modifica se necessario
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
