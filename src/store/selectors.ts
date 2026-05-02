import { BISalesPeriod, BITopItem, SalesTransaction, ActivityType } from '../types';

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

// Vitality: % deals opened in the last 30 days vs total active deals
export const selectVitality = (state: any): number => {
  const deals = Object.values(state.deals || {}) as any[];
  const activeDeals = deals.filter(d => !['chiuso-vinto', 'chiuso-perso'].includes(d.stage));
  if (activeDeals.length === 0) return 0;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newDeals = activeDeals.filter(d => d.createdAt >= cutoff).length;
  return Math.round((newDeals / activeDeals.length) * 100);
};

// Progression: % active deals that changed stage in the last 30 days
export const selectProgression = (state: any): number => {
  const deals = Object.values(state.deals || {}) as any[];
  const activeDeals = deals.filter(d => !['chiuso-vinto', 'chiuso-perso'].includes(d.stage));
  if (activeDeals.length === 0) return 0;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const progressed = activeDeals.filter(d => d.updatedAt && d.updatedAt >= cutoff && d.updatedAt !== d.createdAt).length;
  return Math.round((progressed / activeDeals.length) * 100);
};

// Silent contacts: contacts with no activities in the last 90 days
export const selectSilentContacts = (state: any): Array<{ id: string; company: string; lastActivity: number | null }> => {
  const contacts = state.contacts || {};
  const activities = Object.values(state.activities || {}) as any[];
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;

  return Object.values(contacts)
    .filter((c: any) => c.status === 'cliente')
    .map((c: any) => {
      const contactActivities = activities.filter(a => a.contactId === c.id);
      const lastActivity = contactActivities.length > 0
        ? Math.max(...contactActivities.map((a: any) => a.date || a.createdAt || 0))
        : null;
      return { id: c.id, company: c.company, lastActivity };
    })
    .filter(c => c.lastActivity === null || c.lastActivity < cutoff)
    .sort((a, b) => (a.lastActivity ?? 0) - (b.lastActivity ?? 0))
    .slice(0, 10);
};

// Lost reason distribution
export const selectLostReasonDistribution = (state: any): BITopItem[] => {
  const deals = Object.values(state.deals || {}) as any[];
  const lost = deals.filter(d => d.stage === 'chiuso-perso' && d.lostReason);
  if (lost.length === 0) return [];
  const map = new Map<string, number>();
  lost.forEach(d => map.set(d.lostReason, (map.get(d.lostReason) || 0) + 1));
  const total = lost.length;
  const labels: Record<string, string> = {
    prezzo: 'Prezzo',
    competitor: 'Competitor',
    'progetto-annullato': 'Progetto annullato',
    'cliente-finale-negativo': 'Cliente finale',
    altro: 'Altro',
  };
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({
      name: labels[reason] || reason,
      value: count,
      count,
      percentage: ((count / total) * 100).toFixed(1),
    }));
};

// Competitor analysis from lost deals
export const selectCompetitorAnalysis = (state: any): BITopItem[] => {
  const deals = Object.values(state.deals || {}) as any[];
  const withCompetitor = deals.filter(d => d.competitor);
  if (withCompetitor.length === 0) return [];
  const map = new Map<string, { total: number; lost: number }>();
  withCompetitor.forEach(d => {
    const c = map.get(d.competitor) || { total: 0, lost: 0 };
    c.total++;
    if (d.stage === 'chiuso-perso') c.lost++;
    map.set(d.competitor, c);
  });
  return Array.from(map.entries())
    .sort((a, b) => b[1].lost - a[1].lost)
    .slice(0, 8)
    .map(([name, { total, lost }]) => ({
      name,
      value: lost,
      count: total,
      percentage: total > 0 ? ((lost / total) * 100).toFixed(0) : '0',
    }));
};

// Account pipeline: top contacts by active pipeline value
export const selectAccountPipeline = (state: any, limit = 10): BITopItem[] => {
  const deals = Object.values(state.deals || {}) as any[];
  const contacts = state.contacts || {};
  const activeDeals = deals.filter(d => !['chiuso-vinto', 'chiuso-perso'].includes(d.stage));
  const map = new Map<string, { value: number; count: number }>();
  activeDeals.forEach(d => {
    const company = contacts[d.contactId]?.company || 'Sconosciuto';
    const entry = map.get(company) || { value: 0, count: 0 };
    entry.value += d.value;
    entry.count++;
    map.set(company, entry);
  });
  const total = Array.from(map.values()).reduce((s, v) => s + v.value, 0);
  return Array.from(map.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, limit)
    .map(([name, { value, count }]) => ({
      name,
      value,
      count,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
    }));
};

// Activity mix: breakdown by type
export const selectActivityMix = (state: any): Array<{ type: ActivityType; label: string; count: number; percentage: string; color: string }> => {
  const activities = Object.values(state.activities || {}) as any[];
  if (activities.length === 0) return [];
  const map = new Map<string, number>();
  activities.forEach(a => map.set(a.type, (map.get(a.type) || 0) + 1));
  const total = activities.length;
  const labels: Record<string, string> = {
    visita: 'Visita', chiamata: 'Chiamata', email: 'Email', nota: 'Nota',
    demo: 'Demo', 'call-remota': 'Call Remota', sopralluogo: 'Sopralluogo', formazione: 'Formazione',
  };
  const colors: Record<string, string> = {
    visita: '#4f46e5', chiamata: '#10b981', email: '#3b82f6', nota: '#f59e0b',
    demo: '#8b5cf6', 'call-remota': '#06b6d4', sopralluogo: '#f97316', formazione: '#ec4899',
  };
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type: type as ActivityType,
      label: labels[type] || type,
      count,
      percentage: ((count / total) * 100).toFixed(1),
      color: colors[type] || '#94a3b8',
    }));
};

// Activity mix for last N weeks (activities per week by type)
export const selectActivityPerWeek = (state: any, weeks = 8) => {
  const activities = Object.values(state.activities || {}) as any[];
  const result = Array.from({ length: weeks }, (_, i) => {
    const weekEnd = new Date();
    weekEnd.setHours(23, 59, 59, 999);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
    const weekActs = activities.filter(a => a.date >= weekStart.getTime() && a.date <= weekEnd.getTime());
    return {
      label,
      visite: weekActs.filter(a => a.type === 'visita' || a.type === 'sopralluogo').length,
      chiamate: weekActs.filter(a => a.type === 'chiamata' || a.type === 'call-remota').length,
      email: weekActs.filter(a => a.type === 'email').length,
      demo: weekActs.filter(a => a.type === 'demo' || a.type === 'formazione').length,
    };
  }).reverse();
  return result;
};
