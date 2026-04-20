import { StoreState } from './types';
import { Deal } from '../types';

const isDealActive = (stage: string) => !['chiuso-vinto', 'chiuso-perso'].includes(stage);

export const selectPipelinePesata = (state: StoreState): number => {
  return Object.values(state.deals)
    .filter((d) => isDealActive(d.stage))
    .reduce((acc, deal) => acc + (deal.value * (deal.probability / 100)), 0);
};

export const selectWinRate = (state: StoreState): number => {
  const closedDeals = Object.values(state.deals).filter(d => d.stage === 'chiuso-vinto' || d.stage === 'chiuso-perso');
  if (closedDeals.length === 0) return 0;
  const wonDeals = closedDeals.filter(d => d.stage === 'chiuso-vinto').length;
  return Math.round((wonDeals / closedDeals.length) * 100);
};

export const selectTargetProgress = (state: StoreState, month: number, year: number) => {
  const targetId = `${year}-${month}`;
  const target = state.targets[targetId];
  if (!target || target.targetValue === 0) return 0;
  return Math.round((target.closedValue / target.targetValue) * 100);
};

export const selectDealsByPriority = (state: StoreState) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowEnd = todayStart + (2 * 24 * 60 * 60 * 1000) - 1;
  const weekEnd = todayStart + (7 * 24 * 60 * 60 * 1000) - 1;

  const priorities = {
    scaduti: [] as Deal[],
    oggi: [] as Deal[],
    ore48: [] as Deal[],
    settimana: [] as Deal[],
    resto: [] as Deal[],
  };

  Object.values(state.deals)
    .filter(d => isDealActive(d.stage) && d.nextActionDeadline)
    .forEach(deal => {
      const deadline = deal.nextActionDeadline;
      if (deadline < todayStart) priorities.scaduti.push(deal);
      else if (deadline >= todayStart && deadline < (todayStart + 86400000)) priorities.oggi.push(deal);
      else if (deadline >= todayStart && deadline <= tomorrowEnd) priorities.ore48.push(deal);
      else if (deadline > tomorrowEnd && deadline <= weekEnd) priorities.settimana.push(deal);
      else priorities.resto.push(deal);
    });

  return priorities;
};
