import React from 'react';
import { useStore } from '../store/useStore';
import {
  selectPipelinePesata, selectWinRate, selectTargetProgress,
  selectVitality, selectProgression, selectAccountPipeline,
  selectSilentContacts, selectLostReasonDistribution, selectCompetitorAnalysis,
} from '../store/selectors';
import { TrendingUp, Target, BarChart3, Users, AlertTriangle, Activity, Flame, Zap, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from 'recharts';

// ─── Circular progress ────────────────────────────────────────────────────────

interface CircleKPI {
  label: string;
  value: number;
  target: number;
  color: string;
  trackColor: string;
  description: string;
}

const CircleMetric: React.FC<CircleKPI> = ({ label, value, target, color, trackColor, description }) => {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / 100, 1);
  const dash = circ * pct;
  const onTarget = value >= target;

  return (
    <div className="bg-surface dark:bg-surface rounded-panel p-5 border border-line dark:border-line flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" strokeWidth="8" stroke={trackColor} />
          <circle
            cx="48" cy="48" r={r} fill="none" strokeWidth="8" stroke={color}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold dark:text-foreground leading-none">{value}%</span>
          <span className={`text-xs font-semibold uppercase ${onTarget ? 'text-success' : 'text-muted'}`}>
            {onTarget ? '✓ OK' : `T.${target}%`}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-xs uppercase tracking-normal dark:text-foreground">{label}</p>
        <p className="text-xs text-muted mt-0.5 leading-tight">{description}</p>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const COLORS = Array.from({ length: 8 }, (_, i) => `var(--syrio-chart-${i + 1})`);

export const KPIView: React.FC = () => {
  const state = useStore();
  const pipelinePesata = selectPipelinePesata(state);
  const winRate = selectWinRate(state);
  const vitality = selectVitality(state);
  const progression = selectProgression(state);
  const now = new Date();
  const progress = selectTargetProgress(state, now.getMonth(), now.getFullYear());
  const accountPipeline = selectAccountPipeline(state, 8);
  const silentContacts = selectSilentContacts(state);
  const lostReasons = selectLostReasonDistribution(state);
  const competitors = selectCompetitorAnalysis(state);

  const circles: CircleKPI[] = [
    {
      label: 'Vitality',
      value: vitality,
      target: 10,
      color: 'var(--syrio-chart-1)',
      trackColor: 'rgb(var(--syrio-accent-soft))',
      description: '% deal nuovi aperti negli ultimi 30gg',
    },
    {
      label: 'Progression',
      value: progression,
      target: 20,
      color: 'rgb(var(--syrio-success))',
      trackColor: 'rgb(var(--syrio-success-soft))',
      description: '% deal avanzati di stage negli ultimi 30gg',
    },
    {
      label: 'Win Rate',
      value: winRate,
      target: 30,
      color: 'rgb(var(--syrio-warning))',
      trackColor: 'rgb(var(--syrio-warning-soft))',
      description: '% deal vinti su totale chiusi',
    },
    {
      label: 'Target',
      value: progress,
      target: 100,
      color: 'var(--syrio-chart-4)',
      trackColor: 'rgb(var(--syrio-accent-soft))',
      description: 'Raggiungimento target mese corrente',
    },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl  dark:text-foreground  ">KPI & Metriche</h1>
        <p className="text-muted text-sm font-bold uppercase tracking-normal">Salute del processo commerciale</p>
      </div>

      {/* Cerchi metriche — stile Salesforce Italy SURG */}
      <div>
        <h2 className="text-xs font-semibold   text-muted mb-3 flex items-center gap-2">
          <Activity size={13} className="text-accent" /> Metriche Processo
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {circles.map(c => <CircleMetric key={c.label} {...c} />)}
        </div>
      </div>

      {/* Pipeline & fase */}
      <div>
        <h2 className="text-xs font-semibold   text-muted mb-3 flex items-center gap-2">
          <BarChart3 size={13} className="text-accent" /> Analisi Fasi Pipeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pipeline per stage */}
          <div className="bg-surface dark:bg-surface p-5 rounded-panel border border-line dark:border-line">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted mb-4">Deal per fase</p>
            <div className="space-y-3">
              {(['lead', 'qualificato', 'proposta', 'negoziazione'] as const).map((stage, idx) => {
                const stageDeals = Object.values(state.deals).filter(d => d.stage === stage);
                const count = stageDeals.length;
                const value = stageDeals.reduce((a, b) => a + b.value, 0);
                const stageColors = ['bg-accent', 'bg-accent', 'bg-warning', 'bg-accent'];
                const stageLabels = ['Lead', 'Qualificato', 'Proposta', 'Trattativa'];
                return (
                  <div key={stage}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-secondary dark:text-muted">{stageLabels[idx]}</span>
                      <span className="text-xs font-semibold text-accent">
                        {count} deal · €{(value / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <div className="h-2 bg-raised dark:bg-raised rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stageColors[idx]}`}
                        style={{ width: `${Math.min((count / Math.max(Object.values(state.deals).length, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-line dark:border-line">
              <div className="flex justify-between">
                <span className="text-xs text-muted font-bold">Pipeline totale</span>
                <span className="text-sm font-semibold text-accent">€{(pipelinePesata / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>

          {/* Account Pipeline — top clienti */}
          <div className="bg-surface dark:bg-surface p-5 rounded-panel border border-line dark:border-line">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted mb-4">Account Pipeline</p>
            {accountPipeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={accountPipeline} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fontWeight: 700 }} />
                  <Tooltip formatter={(v: number) => [`€${v.toLocaleString('it-IT')}`, 'Pipeline']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {accountPipeline.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted text-sm font-bold">Nessun deal attivo</div>
            )}
          </div>
        </div>
      </div>

      {/* Lost reasons + Competitor */}
      {(lostReasons.length > 0 || competitors.length > 0) && (
        <div>
          <h2 className="text-xs font-semibold   text-muted mb-3 flex items-center gap-2">
            <ShieldAlert size={13} className="text-danger" /> Analisi Perdite
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lost reasons */}
            {lostReasons.length > 0 && (
              <div className="bg-surface dark:bg-surface p-5 rounded-panel border border-line dark:border-line">
                <p className="text-xs font-semibold uppercase tracking-normal text-muted mb-4">Motivi di perdita</p>
                <div className="flex gap-4 items-center">
                  <ResponsiveContainer width="50%" height={140}>
                    <PieChart>
                      <Pie data={lostReasons} cx="50%" cy="50%" outerRadius={55} dataKey="value">
                        {lostReasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, _, props) => [`${v} deal (${props.payload.percentage}%)`, props.payload.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {lostReasons.map((r, i) => (
                      <div key={r.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs font-bold text-secondary dark:text-muted flex-1 truncate">{r.name}</span>
                        <span className="text-xs font-semibold text-muted">{r.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Competitors */}
            {competitors.length > 0 && (
              <div className="bg-surface dark:bg-surface p-5 rounded-panel border border-line dark:border-line">
                <p className="text-xs font-semibold uppercase tracking-normal text-muted mb-4">Competitor (deal persi)</p>
                <div className="space-y-2">
                  {competitors.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-foreground text-xs font-semibold"
                        style={{ background: COLORS[i % COLORS.length] }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs font-semibold dark:text-foreground truncate">{c.name}</span>
                          <span className="text-xs font-semibold text-danger">{c.value} persi</span>
                        </div>
                        <div className="h-1.5 bg-raised dark:bg-raised rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-danger"
                            style={{ width: `${parseFloat(c.percentage)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clienti silenti */}
      {silentContacts.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold   text-muted mb-3 flex items-center gap-2">
            <AlertTriangle size={13} className="text-warning" /> Clienti Silenti (no attività 90gg)
          </h2>
          <div className="bg-surface dark:bg-surface rounded-panel border border-line dark:border-line overflow-hidden">
            {silentContacts.map((c, i) => (
              <div key={c.id} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? 'border-t border-line dark:border-line' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-warning-soft dark:bg-warning-soft rounded-md flex items-center justify-center">
                    <Users size={14} className="text-warning" />
                  </div>
                  <span className="font-bold text-sm dark:text-foreground">{c.company}</span>
                </div>
                <span className="text-xs font-semibold text-muted">
                  {c.lastActivity
                    ? `Ultima: ${Math.floor((Date.now() - c.lastActivity) / (24 * 60 * 60 * 1000))}gg fa`
                    : 'Mai contattato'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicatori rapidi */}
      <div>
        <h2 className="text-xs font-semibold   text-muted mb-3 flex items-center gap-2">
          <Flame size={13} className="text-warning" /> Indicatori Rapidi
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface dark:bg-surface p-5 rounded-panel border border-line dark:border-line text-center">
            <TrendingUp className="text-accent mx-auto mb-2" size={22} />
            <p className="text-2xl font-semibold dark:text-foreground">€{(pipelinePesata / 1000).toFixed(0)}k</p>
            <p className="text-xs text-muted font-bold uppercase tracking-normal mt-1">Pipeline totale</p>
          </div>
          <div className="bg-surface dark:bg-surface p-5 rounded-panel border border-line dark:border-line text-center">
            <Zap className="text-success mx-auto mb-2" size={22} />
            <p className="text-2xl font-semibold dark:text-foreground">{winRate}%</p>
            <p className="text-xs text-muted font-bold uppercase tracking-normal mt-1">Win Rate storico</p>
          </div>
          <div className="bg-surface dark:bg-surface p-5 rounded-panel border border-line dark:border-line text-center">
            <Target className="text-accent mx-auto mb-2" size={22} />
            <p className="text-2xl font-semibold dark:text-foreground">{progress}%</p>
            <p className="text-xs text-muted font-bold uppercase tracking-normal mt-1">Target {now.toLocaleString('it-IT', { month: 'long' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
