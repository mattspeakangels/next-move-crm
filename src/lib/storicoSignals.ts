import type { ClienteDettagliato } from '../store/storicoStore';

// ─── SIGNAL ANALYSIS (Ordini dal Passato) ─────────────────────────────────────

export interface ClientSignals {
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

export function analyzeClientSignals(cliente: ClienteDettagliato, oggi: Date): ClientSignals {
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
