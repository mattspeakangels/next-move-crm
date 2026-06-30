import * as XLSX from 'xlsx';
import type { Contact, DealerProfiling, EndUserProfiling, ProfilingData, QualificationCriteria, QualificationBadge } from '../types';

export function calcQualBadge(q: QualificationCriteria): QualificationBadge {
  const total = q.esigenzaReale + q.decisionMaker + q.aperturaFornitore + q.timeline + q.budget;
  if (total >= 20) return 'HOT';
  if (total >= 15) return 'WARM';
  if (total >= 10) return 'COLD';
  return 'TRASH';
}

export function calcQualTotal(q: QualificationCriteria): number {
  return q.esigenzaReale + q.decisionMaker + q.aperturaFornitore + q.timeline + q.budget;
}

const BADGE_COLORS: Record<QualificationBadge, string> = {
  HOT: '#ef4444',
  WARM: '#f59e0b',
  COLD: '#22c55e',
  TRASH: '#6b7280',
};

// ─── PDF (print window) ──────────────────────────────────────────────────────

export function exportProfilingPDF(contact: Contact, profiling: ProfilingData) {
  const badge = calcQualBadge(profiling.qualificazione);
  const total = calcQualTotal(profiling.qualificazione);
  const color = BADGE_COLORS[badge];
  const isDealer = profiling.type === 'dealer';
  const p = profiling as any;

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"/>
<title>Scheda ${isDealer ? 'Dealer' : 'End User'} — ${contact.company}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; color: #111; background: #fff; }
  @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
  .header-left h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .header-left p { font-size: 9px; color: #555; margin-top: 2px; }
  .badge { padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 900; color: #fff; background: ${color}; letter-spacing: 2px; }

  .section { margin-bottom: 12px; }
  .section-title { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #666; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 6px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; }
  .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 14px; }
  .field { margin-bottom: 4px; }
  .field label { font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: #888; display: block; margin-bottom: 2px; }
  .field .value { font-size: 10px; font-weight: 700; min-height: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
  .chips { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 2px; }
  .chip { background: #f3f4f6; border-radius: 3px; padding: 2px 5px; font-size: 8px; font-weight: 700; }
  .chip-red { background: #fee2e2; color: #b91c1c; }
  .chip-blue { background: #dbeafe; color: #1d4ed8; }

  .qual-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .qual-table th { font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: #888; text-align: left; padding: 3px 4px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .qual-table td { font-size: 9px; font-weight: 700; padding: 3px 4px; border-bottom: 1px solid #f3f4f6; }
  .score-dots { display: flex; gap: 2px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #e5e7eb; }
  .dot.filled { background: ${color}; }

  .qual-total { text-align: right; margin-top: 6px; font-size: 10px; font-weight: 900; }
  .badge-inline { display: inline-block; padding: 2px 8px; border-radius: 4px; color: #fff; background: ${color}; font-size: 10px; font-weight: 900; letter-spacing: 1px; }

  .comp-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .comp-table th { font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: #888; padding: 3px 4px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; text-align: left; }
  .comp-table td { font-size: 9px; padding: 3px 4px; border-bottom: 1px solid #f3f4f6; }

  .footer { margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 6px; display: flex; justify-content: space-between; color: #aaa; font-size: 7px; }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>Blaklader Workwear — Scheda ${isDealer ? 'Dealer' : 'End User'}</h1>
    <p>${contact.company} · ${contact.city || ''}${contact.province ? ' (' + contact.province + ')' : ''} · Visita: ${p.dataVisita || '—'} · Matt Parlangeli · Lombardia &amp; Ticino 2026</p>
  </div>
  <div class="badge">${badge}</div>
</div>

<div class="section">
  <div class="section-title">1 · Anagrafica</div>
  <div class="row-3">
    <div class="field"><label>Ragione Sociale</label><div class="value">${contact.company}</div></div>
    <div class="field"><label>Città / Zona</label><div class="value">${contact.city || ''}</div></div>
    <div class="field"><label>CAP / Prov.</label><div class="value">${contact.zipCode || ''} ${contact.province ? '(' + contact.province + ')' : ''}</div></div>
    <div class="field"><label>Interlocutore</label><div class="value">${contact.contactName}</div></div>
    <div class="field"><label>Ruolo</label><div class="value">${contact.role}</div></div>
    ${isDealer ? '' : `<div class="field"><label>RSPP</label><div class="value">${p.rsppNome || ''}</div></div>`}
    <div class="field"><label>Tel.</label><div class="value">${contact.phone || ''}</div></div>
    <div class="field"><label>Email</label><div class="value">${contact.email || ''}</div></div>
    <div class="field"><label>Sito</label><div class="value">${contact.website || ''}</div></div>
  </div>
</div>

${isDealer ? renderDealerSections(p as DealerProfiling, badge, total, color) : renderEndUserSections(p as EndUserProfiling, badge, total, color)}

<div class="footer">
  <span>Blaklader · Scheda ${isDealer ? 'Dealer' : 'End User'} · Matt Parlangeli · Lombardia &amp; Ticino 2026</span>
  <span>Generato il ${new Date().toLocaleDateString('it-IT')} · NextMove CRM</span>
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

function dots(val: number, _color: string): string {
  return `<div class="score-dots">${[1,2,3,4,5].map(i => `<div class="dot${i <= val ? ' filled' : ''}"></div>`).join('')}</div>`;
}

function chipsFromArray(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return '<span style="color:#aaa">—</span>';
  return `<div class="chips">${arr.map(s => `<div class="chip">${s}</div>`).join('')}</div>`;
}

function qualTable(q: QualificationCriteria, labels: string[], badge: QualificationBadge, total: number, badgeColor: string): string {
  const rows = Object.values(q).map((v, i) => `
    <tr>
      <td>${labels[i]}</td>
      <td>${dots(v as number, badgeColor)}</td>
      <td style="font-weight:900;color:${badgeColor}">${v}/5</td>
    </tr>`).join('');
  return `
    <table class="qual-table">
      <tr><th>Criterio</th><th>Score</th><th>Valore</th></tr>
      ${rows}
    </table>
    <div class="qual-total">Totale: <strong>${total}/25</strong> &nbsp; <span class="badge-inline">${badge}</span></div>`;
}

function renderDealerSections(p: DealerProfiling, badge: QualificationBadge, total: number, color: string): string {
  return `
<div class="section">
  <div class="section-title">2 · Profilo Rivenditore</div>
  <div class="row">
    <div class="field"><label>Segmento</label><div class="value">${p.segmento ? segmentoLabel(p.segmento) : '—'}</div></div>
    <div class="field"><label>N° Dipendenti</label><div class="value">${p.numDipendenti || '—'}</div></div>
    <div class="field"><label>Fatturato est.</label><div class="value">${p.fatturatoEst || '—'}</div></div>
    <div class="field"><label>% Workwear su fatturato</label><div class="value">${p.percWorkwear || '—'}</div></div>
  </div>
  <div class="row" style="margin-top:4px">
    <div class="field"><label>Canale Vendita</label>${chipsFromArray(p.canaleVendita)}</div>
    <div class="field"><label>Modello Ordini</label>${chipsFromArray(p.modelloOrdini)}</div>
    <div class="field"><label>Cliente Finale</label>${chipsFromArray(p.clienteFinale)}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">3 · Fornitore Attuale &amp; Brand Trattati</div>
  <div class="row">
    <div class="field"><label>Brand Attuali</label>${chipsFromArray(p.brandAttuali)}</div>
    <div class="field"><label>Brand Dominante</label><div class="value">${p.brandDominante || '—'}</div></div>
    <div class="field"><label>DPI Cat. III</label><div class="value">${dpiLabel(p.dpiCatIII)}${p.dpiParziale ? ' — ' + p.dpiParziale : ''}</div></div>
    <div class="field"><label>Reclami / Resi</label><div class="value">${p.reclamiResi === 'si' ? 'Sì — ' + (p.reclamiMotivo || '') : p.reclamiResi === 'no' ? 'No' : '—'}</div></div>
    <div class="field"><label>Processo Riordino</label>${chipsFromArray(p.processoRiordino)}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">4 · Pain Points Emersi</div>
  <div class="field">${chipsFromArray(p.painPoints)}</div>
  <div class="row" style="margin-top:6px">
    <div class="field"><label>Pain Prioritario #1</label><div class="value">${p.painPrioritario || '—'}</div></div>
    <div class="field"><label>Frase Esatta del Cliente</label><div class="value" style="font-style:italic">"${p.fraseEsatta || '—'}"</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">5 · Prodotti Blaklader di Interesse</div>
  <div class="field">${chipsFromArray(p.prodottiInteresse)}</div>
  ${p.campionaturaLasciata ? `<div class="field" style="margin-top:4px"><label>Campionatura Lasciata</label><div class="value">${p.campionaturaLasciata}</div></div>` : ''}
</div>

<div class="section">
  <div class="section-title">6 · Qualificazione</div>
  ${qualTable(p.qualificazione, ['Esigenza reale espressa','Decisore identificato','Apertura a nuovo fornitore','Timeline definita','Budget / dimensione adeguata'], badge, total, color)}
  ${p.noteQualificazione ? `<div class="field" style="margin-top:6px"><label>Note</label><div class="value">${p.noteQualificazione}</div></div>` : ''}
</div>

${p.competitor && p.competitor.length > 0 ? `
<div class="section">
  <div class="section-title">7 · Competitor Citati</div>
  <table class="comp-table">
    <tr><th>Brand Citato</th><th>Parole Usate / Tono</th></tr>
    ${p.competitor.map((c: any) => `<tr><td><strong>${c.brand}</strong></td><td>${c.tone}</td></tr>`).join('')}
  </table>
</div>` : ''}

<div class="section">
  <div class="section-title">8 · Next Step</div>
  <div class="field">${chipsFromArray(p.nextStepAzioni)}</div>
  <div class="row" style="margin-top:4px">
    <div class="field"><label>Data / Azione Precisa</label><div class="value">${p.nextStepData || '—'}</div></div>
    <div class="field"><label>Note Libere</label><div class="value">${p.nextStepNote || '—'}</div></div>
  </div>
</div>`;
}

function renderEndUserSections(p: EndUserProfiling, badge: QualificationBadge, total: number, color: string): string {
  return `
<div class="section">
  <div class="section-title">2 · Profilo Azienda</div>
  <div class="row">
    <div class="field"><label>Segmento Edilizia</label><div class="value">${p.segmentoEdilizia ? segmentoLabel(p.segmentoEdilizia) : '—'}</div></div>
    <div class="field"><label>Segmento Industria</label><div class="value">${p.segmentoIndustria ? segmentoLabel(p.segmentoIndustria) : '—'}</div></div>
    <div class="field"><label>N° Dip. Totali</label><div class="value">${p.numDipendentiTotali || '—'}</div></div>
    <div class="field"><label>N° Dip. con DPI</label><div class="value">${p.numDipendentiDPI || '—'}</div></div>
    <div class="field"><label>Fatturato Stimato</label><div class="value">${p.fatturatoStimato || '—'}</div></div>
    <div class="field"><label>Obiettivi ESG</label><div class="value">${p.obiettiviESG || '—'}</div></div>
  </div>
  <div class="field" style="margin-top:4px"><label>Certificazioni</label>${chipsFromArray(p.certificazioni)}</div>
</div>

<div class="section">
  <div class="section-title">3 · Sicurezza &amp; Compliance</div>
  <div class="row">
    <div class="field"><label>Livello DPI Richiesti</label><div class="value">${livelloDPILabel(p.livelloDPI)}</div></div>
    <div class="field"><label>DVR Aggiornato</label><div class="value">${p.dvrAggiornato === 'si' ? 'Sì' : p.dvrAggiornato === 'no' ? 'No' : p.dvrAggiornato === 'nonSa' ? 'Non sa' : '—'}</div></div>
    <div class="field"><label>Ispezioni Recenti</label><div class="value">${p.ispezioniRecenti === 'si' ? 'Sì — ' + (p.ispezioniEsito || '') : p.ispezioniRecenti === 'no' ? 'No' : '—'}</div></div>
    <div class="field"><label>Schede Tecniche EN</label><div class="value">${schedeENLabel(p.schedeEN)}</div></div>
  </div>
  <div class="field" style="margin-top:4px"><label>Rischi Specifici</label>${chipsFromArray(p.rischiSpecifici)}</div>
</div>

<div class="section">
  <div class="section-title">4 · Fornitore Attuale &amp; Comportamento d'Acquisto</div>
  <div class="row">
    <div class="field"><label>Fornitore / Brand Attuale</label><div class="value">${p.fornitoreAttuale || '—'}</div></div>
    <div class="field"><label>Frequenza Rinnovo</label><div class="value">${p.frequenzaRinnovo || '—'}</div></div>
    <div class="field"><label>Durata Media Capo</label><div class="value">${p.durataMediaCapo || '—'}</div></div>
    <div class="field"><label>Spesa / Dip. Anno</label><div class="value">${p.spesaDipAnno || '—'}</div></div>
  </div>
  <div class="row" style="margin-top:4px">
    <div class="field"><label>Canale Acquisto</label>${chipsFromArray(p.canaleAcquisto)}</div>
    <div class="field"><label>Chi Gestisce Logistica</label>${chipsFromArray(p.chiGestisceLogistica)}</div>
  </div>
  ${p.lamenteleLavoratori ? `<div class="field" style="margin-top:4px"><label>Lamentele Lavoratori</label><div class="value">${p.lamenteleLavoratori}</div></div>` : ''}
</div>

<div class="section">
  <div class="section-title">5 · Pain Points &amp; Trigger di Cambio</div>
  <div class="field">${chipsFromArray(p.painPoints)}</div>
  <div class="row" style="margin-top:6px">
    <div class="field"><label>Pain Prioritario #1</label><div class="value">${p.painPrioritario || '—'}</div></div>
    <div class="field"><label>Frase Esatta del Cliente</label><div class="value" style="font-style:italic">"${p.fraseEsatta || '—'}"</div></div>
  </div>
</div>

${(p.tcoCostoCapo || p.tcoDurataMesi || p.tcoNumDipendenti || p.tcoCostoFlotta || p.tcoNote) ? `
<div class="section">
  <div class="section-title">6 · Calcolo TCO sul Campo</div>
  <div class="row-3">
    <div class="field"><label>Costo Capo (€)</label><div class="value">${p.tcoCostoCapo || '—'}</div></div>
    <div class="field"><label>Durata Media (mesi)</label><div class="value">${p.tcoDurataMesi || '—'}</div></div>
    <div class="field"><label>N° Dipendenti</label><div class="value">${p.tcoNumDipendenti || '—'}</div></div>
  </div>
  <div class="row" style="margin-top:4px">
    <div class="field"><label>Costo Totale Flotta / Anno</label><div class="value">${p.tcoCostoFlotta || '—'}</div></div>
    ${p.tcoNote ? `<div class="field"><label>Note</label><div class="value">${p.tcoNote}</div></div>` : ''}
  </div>
</div>` : ''}

<div class="section">
  <div class="section-title">7 · Prodotti Blaklader di Interesse</div>
  <div class="field">${chipsFromArray(p.prodottiInteresse)}</div>
  ${p.campionaturaLasciata ? `<div class="field" style="margin-top:4px"><label>Campionatura Lasciata</label><div class="value">${p.campionaturaLasciata}</div></div>` : ''}
</div>

<div class="section">
  <div class="section-title">8 · Qualificazione (MEDDIC)</div>
  ${qualTable(p.qualificazione, ['Esigenza reale (dolore concreto)','Decision Maker identificato','Apertura a cambio fornitore','Timeline / urgenza chiara','Budget / dimensione adeguata'], badge, total, color)}
  ${p.noteQualificazione ? `<div class="field" style="margin-top:6px"><label>Note</label><div class="value">${p.noteQualificazione}</div></div>` : ''}
</div>

<div class="section">
  <div class="section-title">9 · Next Step</div>
  <div class="field">${chipsFromArray(p.nextStepAzioni)}</div>
  <div class="row" style="margin-top:4px">
    <div class="field"><label>Data / Azione Precisa</label><div class="value">${p.nextStepData || '—'}</div></div>
    <div class="field"><label>Note Libere</label><div class="value">${p.nextStepNote || '—'}</div></div>
  </div>
</div>`;
}

function segmentoLabel(s: string): string {
  const map: Record<string, string> = {
    A1: 'A1 · Grossista', A2: 'A2 · Safety Specialist', A3: 'A3 · Ferramenta Storica', A4: 'A4 · Ticino Premium',
    B1: 'B1 · PNRR / General Contractor', B2: 'B2 · Impiantistica', B3: 'B3 · Eccellenza / Restauro', B4: 'B4 · Heavy Duty',
    C1: 'C1 · Metal / Fonderia', C2: 'C2 · Power & Utilities', C3: 'C3 · Meccanica Avanzata', C4: 'C4 · Logistica',
  };
  return map[s] || s;
}
function dpiLabel(s: string): string {
  const map: Record<string, string> = { no: 'No — gap totale', soloScarpe: 'Solo scarpe (Cofra/Diadora)', siParziale: 'Sì parziale', siCompleto: 'Sì completo' };
  return map[s] || '—';
}
function livelloDPILabel(s: string): string {
  const map: Record<string, string> = { catI: 'Cat. I — uso generico', catII: 'Cat. II — rischi medi', catIII: 'Cat. III — obbligatori', nonSanno: 'Non sanno' };
  return map[s] || '—';
}
function schedeENLabel(s: string): string {
  const map: Record<string, string> = { siCompleto: 'Sì — archivio completo', soloRziale: 'Solo parzialmente', no: 'No (rischio legale)', nonSa: 'Non sa' };
  return map[s] || '—';
}

// ─── XLS export ─────────────────────────────────────────────────────────────

export function exportProfilingXLS(contact: Contact, profiling: ProfilingData) {
  const isDealer = profiling.type === 'dealer';
  const badge = calcQualBadge(profiling.qualificazione);
  const total = calcQualTotal(profiling.qualificazione);
  const p = profiling as any;

  const wb = XLSX.utils.book_new();
  const sheetName = isDealer ? '📋 DEALER' : '🏗️ END USER';

  const rows: (string | number)[][] = [];

  const h = (label: string) => [label];
  const r = (label: string, value: string | number) => [label, typeof value === 'string' ? value : String(value)];
  const sep = () => [''];

  rows.push(['BLAKLADER WORKWEAR — Scheda ' + (isDealer ? 'Dealer / Rivenditore' : 'End User — Impresa Edile / Industria')]);
  rows.push(['Matt Parlangeli · Lombardia & Ticino 2026']);
  rows.push(sep());

  // 1 - Anagrafica
  rows.push(h('1 · ANAGRAFICA'));
  rows.push(r('Ragione Sociale', contact.company));
  rows.push(r('Città / Zona', contact.city || ''));
  rows.push(r('CAP / Prov.', (contact.zipCode || '') + ' ' + (contact.province ? '(' + contact.province + ')' : '')));
  rows.push(r('Sito / Email', (contact.website || '') + (contact.email ? ' — ' + contact.email : '')));
  rows.push(r('Tel.', contact.phone || ''));
  rows.push(r('Interlocutore', contact.contactName));
  rows.push(r('Ruolo', contact.role));
  if (!isDealer) {
    rows.push(r('RSPP', p.rsppNome || ''));
    rows.push(r('Resp. Acquisti', p.respAcquisti || ''));
  }
  rows.push(r('Data visita', p.dataVisita || ''));
  rows.push(sep());

  if (isDealer) {
    const dp = profiling as DealerProfiling;
    // 2
    rows.push(h('2 · PROFILO RIVENDITORE'));
    rows.push(r('Segmento', dp.segmento ? segmentoLabel(dp.segmento) : ''));
    rows.push(r('N° Dipendenti', dp.numDipendenti || ''));
    rows.push(r('Fatturato est.', dp.fatturatoEst || ''));
    rows.push(r('Canale vendita', dp.canaleVendita.join(' | ')));
    rows.push(r('Modello ordini', dp.modelloOrdini.join(' | ')));
    rows.push(r('Cliente finale', dp.clienteFinale.join(' | ')));
    rows.push(r('% workwear su fatturato', dp.percWorkwear || ''));
    rows.push(sep());
    // 3
    rows.push(h('3 · FORNITORE ATTUALE & BRAND TRATTATI'));
    rows.push(r('Brand workwear attuali', dp.brandAttuali.join(' | ') + (dp.brandAltro ? ' | ' + dp.brandAltro : '')));
    rows.push(r('Brand dominante', dp.brandDominante || ''));
    rows.push(r('DPI Cat. III trattati', dpiLabel(dp.dpiCatIII) + (dp.dpiParziale ? ' — ' + dp.dpiParziale : '')));
    rows.push(r('Reclami / resi', dp.reclamiResi === 'si' ? 'Sì — ' + (dp.reclamiMotivo || '') : dp.reclamiResi === 'no' ? 'No' : ''));
    rows.push(r('Processo riordino', dp.processoRiordino.join(' | ')));
    rows.push(sep());
    // 4
    rows.push(h('4 · PAIN POINTS EMERSI'));
    rows.push(r('Pain points', dp.painPoints.join(' | ') + (dp.painAltro ? ' | ' + dp.painAltro : '')));
    rows.push(r('Pain prioritario #1', dp.painPrioritario || ''));
    rows.push(r('Frase esatta del cliente', dp.fraseEsatta || ''));
    rows.push(sep());
    // 5
    rows.push(h('5 · PRODOTTI BLAKLADER DI INTERESSE'));
    rows.push(r('Prodotti', dp.prodottiInteresse.join(' | ') + (dp.prodottiAltro ? ' | ' + dp.prodottiAltro : '')));
    rows.push(r('Campionatura lasciata', dp.campionaturaLasciata || ''));
    rows.push(sep());
    // 6
    rows.push(h('6 · QUALIFICAZIONE'));
    rows.push(['Criterio', 'Score (1-5)']);
    rows.push(['Esigenza reale espressa', dp.qualificazione.esigenzaReale]);
    rows.push(['Decisore identificato', dp.qualificazione.decisionMaker]);
    rows.push(['Apertura a nuovo fornitore', dp.qualificazione.aperturaFornitore]);
    rows.push(['Timeline definita', dp.qualificazione.timeline]);
    rows.push(['Budget / dimensione adeguata', dp.qualificazione.budget]);
    rows.push(['TOTALE', total]);
    rows.push(['QUALIFICAZIONE FINALE', badge]);
    rows.push(r('Note qualificazione', dp.noteQualificazione || ''));
    rows.push(sep());
    // 7
    if (dp.competitor.length > 0) {
      rows.push(h('7 · COMPETITOR CITATI'));
      rows.push(['Brand citato', 'Parole usate / tono']);
      dp.competitor.forEach(c => rows.push([c.brand, c.tone]));
      rows.push(sep());
    }
    // 8
    rows.push(h('8 · NEXT STEP'));
    rows.push(r('Azioni', dp.nextStepAzioni.join(' | ')));
    rows.push(r('Data / Azione precisa', dp.nextStepData || ''));
    rows.push(r('Note libere', dp.nextStepNote || ''));
  } else {
    const eu = profiling as EndUserProfiling;
    // 2
    rows.push(h('2 · PROFILO AZIENDA'));
    rows.push(r('Segmento Edilizia', eu.segmentoEdilizia ? segmentoLabel(eu.segmentoEdilizia) : ''));
    rows.push(r('Segmento Industria', eu.segmentoIndustria ? segmentoLabel(eu.segmentoIndustria) : ''));
    rows.push(r('N° Dipendenti totali', eu.numDipendentiTotali || ''));
    rows.push(r('N° con DPI workwear', eu.numDipendentiDPI || ''));
    rows.push(r('Fatturato stimato', eu.fatturatoStimato || ''));
    rows.push(r('Certificazioni', eu.certificazioni.join(' | ')));
    rows.push(r('Obiettivi ESG', eu.obiettiviESG || ''));
    rows.push(sep());
    // 3
    rows.push(h('3 · SICUREZZA & COMPLIANCE'));
    rows.push(r('Livello DPI richiesti', livelloDPILabel(eu.livelloDPI)));
    rows.push(r('Rischi specifici', eu.rischiSpecifici.join(' | ')));
    rows.push(r('DVR aggiornato', eu.dvrAggiornato === 'si' ? 'Sì' : eu.dvrAggiornato === 'no' ? 'No' : 'Non sa'));
    rows.push(r('Ispezioni recenti', eu.ispezioniRecenti === 'si' ? 'Sì — ' + (eu.ispezioniEsito || '') : 'No'));
    rows.push(r('Schede tecniche EN', schedeENLabel(eu.schedeEN)));
    rows.push(sep());
    // 4
    rows.push(h('4 · FORNITORE ATTUALE'));
    rows.push(r('Fornitore / brand attuale', eu.fornitoreAttuale || ''));
    rows.push(r('Canale acquisto', eu.canaleAcquisto.join(' | ')));
    rows.push(r('Frequenza rinnovo', eu.frequenzaRinnovo || ''));
    rows.push(r('Durata media capo', eu.durataMediaCapo || ''));
    rows.push(r('Spesa / dip. anno est.', eu.spesaDipAnno || ''));
    rows.push(r('Lamentele lavoratori', eu.lamenteleLavoratori || ''));
    rows.push(r('Chi gestisce logistica', eu.chiGestisceLogistica.join(' | ')));
    rows.push(sep());
    // 5
    rows.push(h('5 · PAIN POINTS & TRIGGER DI CAMBIO'));
    rows.push(r('Pain points', eu.painPoints.join(' | ') + (eu.painAltro ? ' | ' + eu.painAltro : '')));
    rows.push(r('Pain prioritario #1', eu.painPrioritario || ''));
    rows.push(r('Frase esatta del cliente', eu.fraseEsatta || ''));
    rows.push(sep());
    // 6 - TCO
    rows.push(h('6 · CALCOLO TCO SUL CAMPO'));
    rows.push(['Voce', 'Note']);
    rows.push(['Costo capo (€)', eu.tcoCostoCapo || '']);
    rows.push(['Durata media (mesi)', eu.tcoDurataMesi || '']);
    rows.push(['N° dipendenti', eu.tcoNumDipendenti || '']);
    rows.push(['Costo totale flotta / anno (€)', eu.tcoCostoFlotta || '']);
    rows.push(['Note TCO', eu.tcoNote || '']);
    rows.push(sep());
    // 7
    rows.push(h('7 · PRODOTTI BLAKLADER DI INTERESSE'));
    rows.push(r('Prodotti', eu.prodottiInteresse.join(' | ') + (eu.prodottiAltro ? ' | ' + eu.prodottiAltro : '')));
    rows.push(r('Campionatura lasciata', eu.campionaturaLasciata || ''));
    rows.push(sep());
    // 8
    rows.push(h('8 · QUALIFICAZIONE (MEDDIC)'));
    rows.push(['Criterio', 'Score (1-5)']);
    rows.push(['Esigenza reale (dolore concreto)', eu.qualificazione.esigenzaReale]);
    rows.push(['Decision Maker identificato', eu.qualificazione.decisionMaker]);
    rows.push(['Apertura a cambio fornitore', eu.qualificazione.aperturaFornitore]);
    rows.push(['Timeline / urgenza chiara', eu.qualificazione.timeline]);
    rows.push(['Budget / dimensione adeguata', eu.qualificazione.budget]);
    rows.push(['TOTALE', total]);
    rows.push(['QUALIFICAZIONE FINALE', badge]);
    rows.push(r('Note qualificazione', eu.noteQualificazione || ''));
    rows.push(sep());
    // 9
    rows.push(h('9 · NEXT STEP'));
    rows.push(r('Azioni', eu.nextStepAzioni.join(' | ')));
    rows.push(r('Data / Azione precisa', eu.nextStepData || ''));
    rows.push(r('Note libere', eu.nextStepNote || ''));
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [{ wch: 36 }, { wch: 60 }];

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const filename = `Scheda_${isDealer ? 'Dealer' : 'EndUser'}_${contact.company.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}
