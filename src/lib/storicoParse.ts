import { showNotice } from '../components/ui/Feedback';
import type { ClienteRecord, ClienteDettagliato } from '../store/storicoStore';

// ─── PARSER ───────────────────────────────────────────────────────────────────

/**
 * Converte un valore cella in numero.
 * Gestisce sia numeri già parsati (7529) sia stringhe italiane ("7.529" o "7.529 ").
 * I numeri italiani usano il punto come separatore migliaia e la virgola come decimale.
 */
export function parseAmount(val: string | number | null | undefined): number {
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

export function parseMargin(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Rileva le posizioni delle colonne cercando i header.
 */
export function detectColumns(rows: any[][]): {
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
export function parseCSVData(rows: any[][]): ClienteDettagliato[] {
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
    showNotice('Errore: Non riesco a trovare le colonne nel file. Controlla la struttura del file.');
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
export function convertToClienteRecord(dettagliato: ClienteDettagliato): ClienteRecord {
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

export const PIVOT_MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function isPivotFormat(rows: any[][]): boolean {
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

export function parsePivotData(rows: any[][]): ClienteDettagliato[] {
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
