import React from 'react';
import { useStore } from '../../store/useStore';
import { selectTargetProgress, selectPipelinePesata } from '../../store/selectors';

export const TargetProgress: React.FC = () => {
  const state = useStore();
  const now = new Date(); 
  const month = now.getMonth(); 
  const year = now.getFullYear();
  const targetId = `${year}-${month}`;
  const target = state.targets[targetId];
  const progressPercentage = selectTargetProgress(state, month, year);
  const pipelinePesata = selectPipelinePesata(state);
  const daysLeft = new Date(year, month + 1, 0).getDate() - now.getDate();
  const formatEuro = (val: number) => `€${(val / 1000).toFixed(0)}k`;

  if (!target) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm mb-6 transition-colors duration-200">
      <div className="flex justify-between items-end mb-2">
        <div>
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Obiettivo {new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(now)}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{formatEuro(target.closedValue)}</span>
            <span className="text-sm font-medium text-gray-400 dark:text-gray-500">/ {formatEuro(target.targetValue)}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-0 leading-none">{progressPercentage}%</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">chiuso</p>
        </div>
      </div>
      <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full mt-4 mb-3 overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(progressPercentage, 100)}%` }}></div>
      </div>
      <div className="flex justify-between items-center text-xs mt-3">
        <p className="text-gray-500 dark:text-gray-400">Pipeline pesata <span className="font-bold text-gray-900 dark:text-white">{formatEuro(pipelinePesata)}</span></p>
        <p className="text-gray-500 dark:text-gray-400 font-medium">{daysLeft}gg al target</p>
      </div>
    </div>
  );
};
