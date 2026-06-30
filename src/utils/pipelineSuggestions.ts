import type { ClienteDettagliato } from '../store/storicoStore';

export const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function fmt(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export interface DealSuggerito {
  clientId: number;
  nomeCliente: string;
  valoreStimato: number;
  motivazione: string;
  priorita: 'alta' | 'media' | 'bassa';
  trend: 'crescita' | 'stabile' | 'calo';
  prodottiSuggeriti: string[];
  deltaPct: number;
  mensili: { year: number; amount: number }[];
  mesiWindow: number[];
}

export function getSeasonalBase(cliente: ClienteDettagliato, windowSize = 0): {
  base: number;
  byYear: { year: number; amount: number }[];
  mesiConsiderati: number[];
  topProdotti: { nome: string; avgAmount: number }[];
} {
  const currentMonth = new Date().getMonth() + 1;
  const mesiConsiderati: number[] = [];
  for (let i = -windowSize; i <= windowSize; i++) {
    let m = currentMonth + i;
    if (m < 1) m += 12;
    if (m > 12) m -= 12;
    mesiConsiderati.push(m);
  }

  const byYearMap: Record<number, number> = {};
  const prodottiMap: Record<string, Record<number, number>> = {};

  for (const prodotto of cliente.prodotti) {
    for (const ordine of prodotto.ordini) {
      const parts = ordine.date.split('-');
      if (parts.length < 3) continue;
      const month = parseInt(parts[1]);
      if (!mesiConsiderati.includes(month)) continue;
      byYearMap[ordine.year] = (byYearMap[ordine.year] || 0) + ordine.amount;
      if (!prodottiMap[prodotto.nome]) prodottiMap[prodotto.nome] = {};
      prodottiMap[prodotto.nome][ordine.year] = (prodottiMap[prodotto.nome][ordine.year] || 0) + ordine.amount;
    }
  }

  const byYear = Object.entries(byYearMap)
    .map(([y, a]) => ({ year: parseInt(y), amount: a }))
    .sort((a, b) => a.year - b.year);

  const base = byYear.length > 0
    ? byYear.reduce((s, d) => s + d.amount, 0) / byYear.length
    : 0;

  const topProdotti = Object.entries(prodottiMap)
    .map(([nome, byYr]) => {
      const vals = Object.values(byYr);
      return { nome, avgAmount: vals.reduce((s, v) => s + v, 0) / vals.length };
    })
    .sort((a, b) => b.avgAmount - a.avgAmount)
    .slice(0, 3);

  return { base, byYear, mesiConsiderati, topProdotti };
}

export function generaDeal(clienti: ClienteDettagliato[]): DealSuggerito[] {
  const tuttiAnni = [2023, 2024, 2025, 2026] as const;
  type Anno = typeof tuttiAnni[number];
  const anniConDati = tuttiAnni.filter(y =>
    clienti.some(c => (c[`fatturato${y}` as keyof ClienteDettagliato] as number) > 0)
  );
  if (anniConDati.length === 0) return [];

  let annoCorr: Anno;
  let annoPrev: Anno;
  if (anniConDati.includes(2026) && anniConDati.includes(2025)) {
    annoCorr = 2025; annoPrev = anniConDati.includes(2024) ? 2024 : 2025;
  } else {
    annoCorr = anniConDati[anniConDati.length - 1];
    annoPrev = anniConDati.length >= 2 ? anniConDati[anniConDati.length - 2] : annoCorr;
  }

  const fKey = (y: number) => `fatturato${y}` as keyof ClienteDettagliato;
  const totCorr = clienti.reduce((s, c) => s + (c[fKey(annoCorr)] as number), 0);
  const totPrev = clienti.reduce((s, c) => s + (c[fKey(annoPrev)] as number), 0);
  const crescitaMedia = totPrev > 0 ? ((totCorr - totPrev) / totPrev) : 0;

  const deals: DealSuggerito[] = [];

  for (const cliente of clienti) {
    const fCorr = cliente[fKey(annoCorr)] as number;
    const fPrev = cliente[fKey(annoPrev)] as number;
    const f2026 = cliente.fatturato2026;
    if (fCorr === 0 && fPrev === 0 && f2026 === 0) continue;

    const delta = fPrev > 0 ? ((fCorr - fPrev) / fPrev) : 0;
    const mediaAnnua = (fPrev + fCorr) / (fPrev > 0 && fCorr > 0 ? 2 : 1);
    const seasonal = getSeasonalBase(cliente);
    const baseOpportunita = seasonal.base > 0 ? seasonal.base : Math.round(mediaAnnua * 0.25);

    const topProdotti = seasonal.topProdotti.length > 0
      ? seasonal.topProdotti.map(p => p.nome.length > 35 ? p.nome.substring(0, 35) + '…' : p.nome)
      : [...cliente.prodotti]
          .sort((a, b) => b.ordini.reduce((s, o) => s + o.amount, 0) - a.ordini.reduce((s, o) => s + o.amount, 0))
          .slice(0, 3)
          .map(p => p.nome.length > 35 ? p.nome.substring(0, 35) + '…' : p.nome);

    let priorita: 'alta' | 'media' | 'bassa' = 'media';
    let motivazione = '';
    let valoreStimato = 0;
    let trend: 'crescita' | 'stabile' | 'calo' = 'stabile';
    const mesiLabel = seasonal.mesiConsiderati.map(m => MESI[m - 1]).join('/');

    if (fCorr > 0 && fPrev > 0) {
      if (delta > 0.1) {
        trend = 'crescita'; valoreStimato = Math.round(baseOpportunita * (1 + Math.min(delta, 0.3))); priorita = 'alta';
        motivazione = `Crescita ${Math.round(delta * 100)}% ${annoPrev}→${annoCorr} — stima su ordini ${mesiLabel}`;
      } else if (delta < -0.1) {
        trend = 'calo'; valoreStimato = Math.round(baseOpportunita * 0.9); priorita = delta < -0.3 ? 'alta' : 'media';
        motivazione = `Calo ${Math.round(Math.abs(delta) * 100)}% — recuperare con visita mirata (${mesiLabel})`;
      } else {
        trend = 'stabile'; valoreStimato = Math.round(baseOpportunita * (1 + crescitaMedia * 0.5)); priorita = fCorr > 10000 ? 'alta' : 'media';
        motivazione = `Cliente stabile — rinnovo stagionale (${mesiLabel})`;
      }
    } else if (fCorr === 0 && fPrev > 0) {
      trend = 'calo'; valoreStimato = Math.round(baseOpportunita * 0.7); priorita = fPrev > 5000 ? 'alta' : 'bassa';
      motivazione = `Cliente dormiente — attivo in ${annoPrev} (€${fmt(fPrev)}) ma assente in ${annoCorr}`;
    } else if (fPrev === 0 && fCorr > 0) {
      trend = 'crescita'; valoreStimato = Math.round(baseOpportunita * 1.2); priorita = 'alta';
      motivazione = `Nuovo cliente ${annoCorr} — alto potenziale di fidelizzazione`;
    } else if (f2026 > 0) {
      trend = 'crescita'; valoreStimato = Math.round(f2026 * 2); priorita = 'alta';
      motivazione = `Nuovo cliente 2026 — ${fmt(f2026)}€ YTD, alto potenziale`;
    }

    if (!motivazione) continue;

    deals.push({
      clientId: cliente.clientId,
      nomeCliente: cliente.nome || `#${cliente.clientId}`,
      valoreStimato,
      motivazione,
      priorita,
      trend,
      prodottiSuggeriti: topProdotti,
      deltaPct: Math.round(delta * 100),
      mensili: seasonal.byYear,
      mesiWindow: seasonal.mesiConsiderati,
    });
  }

  deals.sort((a, b) => {
    const pOrder = { alta: 0, media: 1, bassa: 2 };
    if (pOrder[a.priorita] !== pOrder[b.priorita]) return pOrder[a.priorita] - pOrder[b.priorita];
    return b.valoreStimato - a.valoreStimato;
  });

  return deals.slice(0, 20);
}
