import type { ClienteDettagliato } from '../store/storicoStore';
import { parseAmount } from './storicoParse';

// Lettura del formato pivot dello Storico (export tabella pivot con anni e mesi in colonna).
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
