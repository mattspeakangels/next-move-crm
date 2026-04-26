import { BISalesPeriod, BITopItem, SalesTransaction } from '../types';

interface StoreState {
  contacts: Record<string, any>;
  salesTransactions: Record<string, SalesTransaction>;
}

// Monthly revenue trend (from SalesTransaction)
export const selectMonthlySales = (state: StoreState, yearsBack: number = 2): BISalesPeriod[] => {
  const now = Date.now();
  const months = new Map<string, { revenue: number; count: number }>();

  Object.values(state.salesTransactions || {}).forEach(tx => {
    if ((now - tx.date) < yearsBack * 365 * 24 * 60 * 60 * 1000) {
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const m = months.get(key) || { revenue: 0, count: 0 };
      m.revenue += tx.totalAmount;
      m.count += 1;
      months.set(key, m);
    }
  });

  return Array.from(months.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, { revenue, count }]) => ({
      month: key,
      label: key.replace('-', '/'),
      revenue,
      avgDealValue: count > 0 ? revenue / count : 0
    }));
};

// Top customers by revenue
export const selectTopCustomers = (state: StoreState, limit: number = 10): BITopItem[] => {
  const customers = new Map<string, { revenue: number; count: number }>();

  Object.values(state.salesTransactions || {}).forEach(tx => {
    const contact = state.contacts[tx.contactId];
    if (contact) {
      const c = customers.get(contact.company) || { revenue: 0, count: 0 };
      c.revenue += tx.totalAmount;
      c.count += 1;
      customers.set(contact.company, c);
    }
  });

  const total = Array.from(customers.values()).reduce((s, c) => s + c.revenue, 0);

  return Array.from(customers.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, limit)
    .map(([name, { revenue, count }]) => ({
      name,
      value: revenue,
      count,
      percentage: total > 0 ? (revenue / total * 100).toFixed(1) : '0'
    }));
};

// Top products by quantity sold
export const selectTopProducts = (state: StoreState, limit: number = 10): BITopItem[] => {
  const products = new Map<string, { quantity: number; revenue: number; count: number }>();

  Object.values(state.salesTransactions || {}).forEach(tx => {
    const p = products.get(tx.productName) || { quantity: 0, revenue: 0, count: 0 };
    p.quantity += tx.quantity;
    p.revenue += tx.totalAmount;
    p.count += 1;
    products.set(tx.productName, p);
  });

  const totalQty = Array.from(products.values()).reduce((s, p) => s + p.quantity, 0);

  return Array.from(products.entries())
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, limit)
    .map(([name, { quantity, count }]) => ({
      name,
      value: quantity,
      count,
      percentage: totalQty > 0 ? (quantity / totalQty * 100).toFixed(1) : '0'
    }));
};

// Sales by stage
export const selectSalesByStage = (state: StoreState): BITopItem[] => {
  const stages = new Map<string, { count: number; revenue: number }>();

  Object.values(state.salesTransactions || {}).forEach(tx => {
    const s = stages.get(tx.stage) || { count: 0, revenue: 0 };
    s.count += 1;
    s.revenue += tx.totalAmount;
    stages.set(tx.stage, s);
  });

  const total = Array.from(stages.values()).reduce((s, v) => s + v.count, 0);

  return Array.from(stages.entries()).map(([stage, { count }]) => ({
    name: stage.replace('-', ' '),
    value: count,
    count: count,
    percentage: total > 0 ? (count / total * 100).toFixed(1) : '0'
  }));
};

// Missing selectors for existing components
export const selectDealsByPriority = (state: any) => {
  const deals = state.deals || {};
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const scaduti: any[] = [];
  const oggi: any[] = [];
  const ore48: any[] = [];
  const settimana: any[] = [];
  const resto: any[] = [];

  Object.values(deals).forEach((deal: any) => {
    if (!deal.nextActionDeadline) return;
    const deadline = new Date(deal.nextActionDeadline);
    if (deadline < today) scaduti.push(deal);
    else if (deadline < tomorrow) oggi.push(deal);
    else if (deadline < new Date(tomorrow.getTime() + 48 * 60 * 60 * 1000)) ore48.push(deal);
    else if (deadline < weekEnd) settimana.push(deal);
    else resto.push(deal);
  });

  return { scaduti, oggi, ore48, settimana, resto };
};

export const selectPipelinePesata = (state: any) => {
  const deals = state.deals || {};
  return Object.values(deals).reduce((sum: number, deal: any) => sum + (deal.value || 0), 0);
};

export const selectTargetProgress = (state: any, month: number, year: number) => {
  const targetId = `${year}-${month}`;
  const target = state.targets[targetId];
  if (!target) return 0;
  return target.closedValue > 0 ? Math.round((target.closedValue / target.targetValue) * 100) : 0;
};

export const selectWinRate = (state: any) => {
  const deals = state.deals || {};
  const closedDeals = Object.values(deals).filter((d: any) => d.stage === 'chiuso-vinto' || d.stage === 'chiuso-perso');
  const won = Object.values(deals).filter((d: any) => d.stage === 'chiuso-vinto').length;
  return closedDeals.length > 0 ? Math.round((won / closedDeals.length) * 100) : 0;
};
