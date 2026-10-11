import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '../store/useStore';
import {
  selectMonthlySales, selectTopCustomers, selectTopProducts, selectSalesByStage,
  selectActivityMix, selectActivityPerWeek, selectAccountPipeline,
  selectLostReasonDistribution, selectCompetitorAnalysis,
} from '../store/selectors';
import { Upload, TrendingUp, Users, Zap, FileText, CheckCircle, XCircle, Send, Activity, Target, ShieldAlert } from 'lucide-react';
import { BarChart, PieChart, LineChart, Bar, Pie, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useToast } from '../components/ui/ToastContext';

const COLORS = Array.from({ length: 8 }, (_, i) => `var(--syrio-chart-${i + 1})`);

export const AnalyticsView: React.FC = () => {
  const state = useStore();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [yearsBack] = useState(2);

  const monthlySales = selectMonthlySales(state, yearsBack);
  const topCustomers = selectTopCustomers(state, 10);
  const topProducts = selectTopProducts(state, 10);
  const salesByStage = selectSalesByStage(state);
  const activityMix = selectActivityMix(state);
  const activityPerWeek = selectActivityPerWeek(state, 8);
  const accountPipeline = selectAccountPipeline(state, 10);
  const lostReasons = selectLostReasonDistribution(state);
  const competitors = selectCompetitorAnalysis(state);

  // ── Offerte analytics ──────────────────────────────────────────────────────
  const allOffers = Object.values(state.offers || {});
  const offersByStatus = {
    bozza:     allOffers.filter(o => o.status === 'bozza'),
    inviata:   allOffers.filter(o => o.status === 'inviata'),
    accettata: allOffers.filter(o => o.status === 'accettata'),
    rifiutata: allOffers.filter(o => o.status === 'rifiutata'),
  };
  const totalOfferte = allOffers.length;
  const valoreAccettate = offersByStatus.accettata.reduce((s, o) => s + o.totalAmount, 0);
  const valoreInviate   = offersByStatus.inviata.reduce((s, o) => s + o.totalAmount, 0);
  const chiuse = offersByStatus.accettata.length + offersByStatus.rifiutata.length;
  const tassoConversione = chiuse > 0 ? Math.round(offersByStatus.accettata.length / chiuse * 100) : 0;
  const valMedioOfferta = totalOfferte > 0 ? allOffers.reduce((s, o) => s + o.totalAmount, 0) / totalOfferte : 0;

  // Funnel per status
  const funnelData = [
    { name: 'Bozza',     count: offersByStatus.bozza.length,     valore: Math.round(offersByStatus.bozza.reduce((s,o)=>s+o.totalAmount,0)),     fill: 'var(--syrio-chart-7)' },
    { name: 'Inviate',   count: offersByStatus.inviata.length,   valore: Math.round(offersByStatus.inviata.reduce((s,o)=>s+o.totalAmount,0)),   fill: 'var(--syrio-chart-3)' },
    { name: 'Accettate', count: offersByStatus.accettata.length, valore: Math.round(offersByStatus.accettata.reduce((s,o)=>s+o.totalAmount,0)), fill: 'rgb(var(--syrio-success))' },
    { name: 'Rifiutate', count: offersByStatus.rifiutata.length, valore: Math.round(offersByStatus.rifiutata.reduce((s,o)=>s+o.totalAmount,0)), fill: 'rgb(var(--syrio-danger))' },
  ];

  // Trend mensile offerte (ultimi 12 mesi)
  const now = new Date();
  const offerTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    const inMese = (status: string) => allOffers.filter(o => {
      const od = new Date(o.date);
      return o.status === status &&
        od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
    });
    return {
      label,
      key,
      inviate:   inMese('inviata').length   + inMese('accettata').length + inMese('rifiutata').length,
      accettate: inMese('accettata').length,
      valInviate: Math.round((inMese('inviata').concat(inMese('accettata')).concat(inMese('rifiutata'))).reduce((s,o)=>s+o.totalAmount,0)),
    };
  }).filter(m => m.inviate > 0 || m.accettate > 0);

  // ── Sales transactions analytics ──────────────────────────────────────────
  const totalRevenue = Object.values(state.salesTransactions || {}).reduce((sum, tx) => sum + tx.totalAmount, 0);
  const transactionCount = Object.values(state.salesTransactions || {}).length;
  const avgDealValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
  const topCustomerName = topCustomers[0]?.name || 'N/A';

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);

    const reader = new FileReader();
    const processText = (text: string) => {
      try {
        const lines = text.split('\n').slice(1);
        let imported = 0;

        lines.forEach(line => {
          if (!line.trim()) return;
          const sep = line.includes(';') ? ';' : ',';
          const [dateStr, quantityStr, unitPriceStr, amountStr, customerName, productName, stage] = line.split(sep).map(s => s.trim());

          const date = new Date(dateStr).getTime();
          const quantity = parseFloat(quantityStr) || 1;
          const unitPrice = parseFloat(unitPriceStr) || 0;
          const totalAmount = parseFloat(amountStr);

          if (!date || !totalAmount || !customerName || isNaN(date)) return;

          const contactId =
            Object.entries(state.contacts)
              .find(([, c]) => c.company.toLowerCase().includes(customerName.toLowerCase()))?.[0]
            ?? `hist__${customerName}`;

          state.addSalesTransaction({
            id: `tx_${Date.now()}_${Math.random()}`,
            date,
            contactId,
            productName,
            quantity,
            unitPrice,
            totalAmount,
            stage: (stage || 'chiuso-vinto') as any,
            notes: `Importato da storico (${dateStr})`,
            createdAt: Date.now(),
          });

          imported++;
        });

        if (imported > 0) {
          showToast(`${imported} transazioni importate!`, 'success');
        } else {
          showToast('Nessuna transazione valida trovata', 'error');
        }
        fileInputRef.current!.value = '';
      } catch (error) {
        showToast('Errore importazione file', 'error');
      }
    };

    if (isExcel) {
      reader.onload = (ev) => {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        processText(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (ev) => processText(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl  dark:text-foreground ">Analytics</h1>
          <p className="text-muted text-sm font-bold">Business Intelligence</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-action hover:bg-action-hover text-action-foreground px-4 py-2 rounded-panel font-bold flex items-center gap-2"
        >
          <Upload size={16} /> Importa CSV / Excel
        </button>
        <input type="file" accept=".csv,.xlsx,.xls" ref={fileInputRef} onChange={handleCSVImport} className="hidden" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
          <div className="flex items-center justify-between mb-2">
            <p className="text-secondary dark:text-muted text-xs font-bold uppercase">Fatturato</p>
            <TrendingUp size={20} className="text-accent" />
          </div>
          <p className="text-2xl font-semibold text-foreground dark:text-foreground">€{(totalRevenue / 1000).toFixed(0)}k</p>
          <p className="text-xs text-muted mt-1">{transactionCount} transazioni</p>
        </div>

        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
          <div className="flex items-center justify-between mb-2">
            <p className="text-secondary dark:text-muted text-xs font-bold uppercase">Numero Deal</p>
            <Zap size={20} className="text-accent" />
          </div>
          <p className="text-2xl font-semibold text-foreground dark:text-foreground">{transactionCount}</p>
          <p className="text-xs text-muted mt-1">ultimi {yearsBack} anni</p>
        </div>

        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
          <div className="flex items-center justify-between mb-2">
            <p className="text-secondary dark:text-muted text-xs font-bold uppercase">Deal Medio</p>
            <Zap size={20} className="text-success" />
          </div>
          <p className="text-2xl font-semibold text-foreground dark:text-foreground">€{(avgDealValue / 1000).toFixed(1)}k</p>
          <p className="text-xs text-muted mt-1">per transazione</p>
        </div>

        <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
          <div className="flex items-center justify-between mb-2">
            <p className="text-secondary dark:text-muted text-xs font-bold uppercase">Top Cliente</p>
            <Users size={20} className="text-warning" />
          </div>
          <p className="text-lg font-semibold text-foreground dark:text-foreground truncate">{topCustomerName}</p>
          <p className="text-xs text-muted mt-1">{topCustomers[0]?.count || 0} ordini</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
          <h3 className="text-lg font-semibold  mb-4">Trend Mensile</h3>
          {monthlySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => `€${(value as number / 1000).toFixed(1)}k`} />
                <Line type="monotone" dataKey="revenue" stroke="var(--syrio-chart-1)" strokeWidth={2} dot={{ fill: 'var(--syrio-chart-1)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted">Nessun dato</div>
          )}
        </div>

        <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
          <h3 className="text-lg font-semibold  mb-4">Top 10 Clienti</h3>
          {topCustomers.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={topCustomers} cx="50%" cy="50%" outerRadius={80} fill="var(--syrio-chart-4)" dataKey="value" label={({ name, percentage }) => `${name} (${percentage}%)`}>
                  {topCustomers.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `€${(value as number / 1000).toFixed(1)}k`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted">Nessun dato</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
          <h3 className="text-lg font-semibold  mb-4">Top 10 Prodotti</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(value) => `${value} unità`} />
                <Bar dataKey="value" fill="var(--syrio-chart-2)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted">Nessun dato</div>
          )}
        </div>

        <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
          <h3 className="text-lg font-semibold  mb-4">Per Stage</h3>
          {salesByStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={salesByStage} cx="50%" cy="50%" outerRadius={80} fill="var(--syrio-chart-4)" dataKey="value" label={({ name, percentage }) => `${name} (${percentage}%)`}>
                  {salesByStage.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `${value} transazioni`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted">Nessun dato</div>
          )}
        </div>
      </div>

      {transactionCount > 0 && (
        <div className="bg-accent-soft dark:bg-accent-soft/20 rounded-panel p-4 border border-accent dark:border-accent/50">
          <p className="text-sm text-accent dark:text-accent">
            <strong>{transactionCount}</strong> transazioni • <strong>€{(totalRevenue / 1000).toFixed(0)}k</strong> fatturato
          </p>
        </div>
      )}

      {/* ── SEZIONE ATTIVITÀ ────────────────────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-4">
          <Activity size={20} className="text-success" />
          <h2 className="text-lg font-semibold  tracking-tight dark:text-foreground">Attività Commerciali</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mix attività */}
          <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
            <h3 className="text-sm font-semibold   mb-1 dark:text-foreground">Mix Attività</h3>
            <p className="text-xs text-muted mb-4">Distribuzione per tipo</p>
            {activityMix.length > 0 ? (
              <div className="flex gap-4 items-center">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={activityMix} cx="50%" cy="50%" outerRadius={60} dataKey="count">
                      {activityMix.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, _, props) => [`${v} (${props.payload.percentage}%)`, props.payload.label]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {activityMix.map(a => (
                    <div key={a.type} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                      <span className="text-xs font-bold text-secondary dark:text-muted flex-1">{a.label}</span>
                      <span className="text-xs font-semibold text-secondary">{a.count}</span>
                      <span className="text-xs text-muted">{a.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-muted text-sm font-bold">Nessuna attività</div>
            )}
          </div>

          {/* Attività per settimana */}
          <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
            <h3 className="text-sm font-semibold   mb-1 dark:text-foreground">Attività per Settimana</h3>
            <p className="text-xs text-muted mb-4">Ultime 8 settimane per tipo</p>
            {activityPerWeek.some(w => w.visite + w.chiamate + w.email + w.demo > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={activityPerWeek} barSize={10} barGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--syrio-line))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend formatter={v => ({ visite: 'Visite', chiamate: 'Chiamate', email: 'Email', demo: 'Demo' } as Record<string, string>)[v] ?? v} />
                  <Bar dataKey="visite" name="visite" fill="var(--syrio-chart-1)" stackId="a" radius={[0,0,0,0]} />
                  <Bar dataKey="chiamate" name="chiamate" fill="var(--syrio-chart-2)" stackId="a" />
                  <Bar dataKey="email" name="email" fill="var(--syrio-chart-3)" stackId="a" />
                  <Bar dataKey="demo" name="demo" fill="var(--syrio-chart-4)" stackId="a" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-muted text-sm font-bold">Nessuna attività</div>
            )}
          </div>
        </div>
      </div>

      {/* ── SEZIONE PIPELINE PER CLIENTE ────────────────────────────────────── */}
      {accountPipeline.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-4">
            <Target size={20} className="text-accent" />
            <h2 className="text-lg font-semibold  tracking-tight dark:text-foreground">Account Pipeline</h2>
            <span className="text-xs font-bold text-muted bg-raised dark:bg-raised px-2 py-0.5 rounded-full">Top 10</span>
          </div>
          <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
            <h3 className="text-sm font-semibold   mb-1 dark:text-foreground">Pipeline per Cliente</h3>
            <p className="text-xs text-muted mb-4">Valore deal attivi per azienda</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={accountPipeline} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--syrio-line))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip formatter={(v: number) => [`€${v.toLocaleString('it-IT')}`, 'Pipeline']} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {accountPipeline.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── SEZIONE PERDITE ─────────────────────────────────────────────────── */}
      {(lostReasons.length > 0 || competitors.length > 0) && (
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert size={20} className="text-danger" />
            <h2 className="text-lg font-semibold  tracking-tight dark:text-foreground">Analisi Perdite</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lostReasons.length > 0 && (
              <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
                <h3 className="text-sm font-semibold   mb-1 dark:text-foreground">Motivi di Perdita</h3>
                <p className="text-xs text-muted mb-4">Distribuzione deal persi per causa</p>
                <div className="flex gap-4 items-center">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={lostReasons} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                        {lostReasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, _, props) => [`${v} deal (${props.payload.percentage}%)`, props.payload.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {lostReasons.map((r, i) => (
                      <div key={r.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs font-bold text-secondary dark:text-muted flex-1">{r.name}</span>
                        <span className="text-xs font-semibold text-secondary">{r.count} deal</span>
                        <span className="text-xs text-muted">{r.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {competitors.length > 0 && (
              <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
                <h3 className="text-sm font-semibold   mb-1 dark:text-foreground">Competitor</h3>
                <p className="text-xs text-muted mb-4">Deal persi per competitor</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={competitors} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${v} deal persi`, 'Perdite']} />
                    <Bar dataKey="value" fill="rgb(var(--syrio-danger))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SEZIONE OFFERTE ─────────────────────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-4">
          <FileText size={20} className="text-accent" />
          <h2 className="text-lg font-semibold  tracking-tight dark:text-foreground">Analisi Offerte</h2>
          <span className="text-xs font-bold text-muted bg-raised dark:bg-raised px-2 py-0.5 rounded-full">{totalOfferte} totali</span>
        </div>

        {totalOfferte === 0 ? (
          <div className="bg-surface dark:bg-surface rounded-panel py-12 text-center border border-dashed border-line dark:border-line">
            <FileText size={36} className="mx-auto mb-3 text-muted dark:text-secondary" />
            <p className="text-muted font-bold text-sm">Nessuna offerta registrata</p>
            <p className="text-muted text-xs mt-1">Crea offerte nella sezione Offerte per vedere le analisi</p>
          </div>
        ) : (
          <>
            {/* KPI offerte */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                {
                  label: 'Offerte Totali', value: String(totalOfferte),
                  sub: `${offersByStatus.inviata.length} in attesa`,
                  icon: FileText, color: 'text-accent', bg: 'bg-accent-soft dark:bg-accent-soft/20',
                },
                {
                  label: 'Tasso Conversione', value: `${tassoConversione}%`,
                  sub: `${offersByStatus.accettata.length} accettate / ${chiuse} chiuse`,
                  icon: CheckCircle, color: 'text-success', bg: 'bg-success-soft dark:bg-success-soft',
                },
                {
                  label: 'Valore Accettate', value: `€${(valoreAccettate/1000).toFixed(1)}k`,
                  sub: `${offersByStatus.accettata.length} offerte vinte`,
                  icon: TrendingUp, color: 'text-success', bg: 'bg-success-soft dark:bg-success-soft',
                },
                {
                  label: 'Valore Medio', value: `€${(valMedioOfferta/1000).toFixed(1)}k`,
                  sub: `su tutte le offerte`,
                  icon: Zap, color: 'text-warning', bg: 'bg-warning-soft dark:bg-warning-soft',
                },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-secondary dark:text-muted text-xs font-bold uppercase tracking-wide">{label}</p>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bg}`}>
                      <Icon size={16} className={color} />
                    </div>
                  </div>
                  <p className="text-2xl font-semibold text-foreground dark:text-foreground">{value}</p>
                  <p className="text-xs text-muted mt-1">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Funnel per stato */}
              <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
                <h3 className="text-sm font-semibold   mb-1 dark:text-foreground">Funnel Offerte</h3>
                <p className="text-xs text-muted mb-4">Numero offerte per stato</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funnelData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--syrio-line))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'count' ? [`${value} offerte`, 'Numero'] : [`€${(value/1000).toFixed(1)}k`, 'Valore']
                      }
                    />
                    <Legend formatter={v => v === 'count' ? 'N. Offerte' : 'Valore €'} />
                    <Bar dataKey="count" name="count" radius={[6,6,0,0]}>
                      {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Mini riepilogo valori */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-accent-soft dark:bg-accent-soft/20 rounded-md px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Send size={11} className="text-accent" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent">Inv. in attesa</span>
                    </div>
                    <span className="text-sm font-semibold text-accent dark:text-accent">€{(valoreInviate/1000).toFixed(1)}k</span>
                  </div>
                  <div className="bg-success-soft dark:bg-success-soft rounded-md px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <CheckCircle size={11} className="text-success" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-success">Valore vinto</span>
                    </div>
                    <span className="text-sm font-semibold text-success dark:text-success">€{(valoreAccettate/1000).toFixed(1)}k</span>
                  </div>
                </div>
              </div>

              {/* Trend mensile */}
              <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
                <h3 className="text-sm font-semibold   mb-1 dark:text-foreground">Trend Mensile Offerte</h3>
                <p className="text-xs text-muted mb-4">Inviate vs Accettate (ultimi 12 mesi)</p>
                {offerTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={offerTrend} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--syrio-line))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number, name: string) => [v, name === 'inviate' ? 'Inviate' : 'Accettate']} />
                      <Legend formatter={v => v === 'inviate' ? 'Inviate' : 'Accettate'} />
                      <Bar dataKey="inviate" name="inviate" fill="var(--syrio-chart-2)" radius={[4,4,0,0]} />
                      <Bar dataKey="accettate" name="accettate" fill="rgb(var(--syrio-success))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center text-muted">
                    <XCircle size={32} className="mb-2" />
                    <p className="text-sm font-bold">Nessun dato mensile disponibile</p>
                    <p className="text-xs mt-1">Le offerte verranno mostrate per mese di creazione</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
