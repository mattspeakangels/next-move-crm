import React from 'react';
import { useStore } from '../store/useStore';
import { selectPipelinePesata, selectWinRate, selectTargetProgress } from '../store/selectors';
import { TrendingUp, Target, BarChart3, PieChart } from 'lucide-react';

export const KPIView: React.FC = () => {
  const state = useStore();
  const pipelinePesata = selectPipelinePesata(state);
  const winRate = selectWinRate(state);
  const now = new Date();
  const progress = selectTargetProgress(state, now.getMonth(), now.getFullYear());

  const stats = [
    { label: 'Pipeline Pesata', value: `€${(pipelinePesata/1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Win Rate', value: `${winRate}%`, icon: PieChart, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Raggiungimento Target', value: `${progress}%`, icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <div className={`w-12 h-12 ${stat.bg} dark:bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-600" /> Analisi Fasi Pipeline
        </h3>
        {/* Qui in futuro potremo aggiungere un grafico reale, per ora mettiamo una legenda testuale */}
        <div className="space-y-4">
          {['lead', 'qualificato', 'proposta', 'negoziazione'].map(stage => {
            const count = Object.values(state.deals).filter(d => d.stage === stage).length;
            const value = Object.values(state.deals).filter(d => d.stage === stage).reduce((a,b) => a+b.value, 0);
            return (
              <div key={stage} className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 capitalize">{stage}</span>
                <div className="flex gap-4">
                   <span className="text-sm font-bold">{count} deal</span>
                   <span className="text-sm font-bold text-indigo-600">€{(value/1000).toFixed(0)}k</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
