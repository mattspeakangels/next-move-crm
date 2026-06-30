import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Package, TrendingUp, ShoppingCart, CalendarDays } from 'lucide-react';
import { useStoricoStore } from '../../store/storicoStore';
import type { ClienteDettagliato, OrderRecord } from '../../store/storicoStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(d: string): Date | null {
  const parts = d.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(+year, +month - 1, +day);
  }
  return null;
}

function orderMonth(d: string): string {
  const dt = parseDate(d);
  if (!dt) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const dt = new Date(+y, +m - 1, 1);
  return dt.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(y, m - 2, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(y, m, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function currentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlatOrder extends OrderRecord {
  productId: string;
  productName: string;
  parsedDate: Date;
}

interface ClientMonth {
  cliente: ClienteDettagliato;
  orders: FlatOrder[];
  total: number;
  margin: number;
  orderCount: number;
}

// ─── Detail View ─────────────────────────────────────────────────────────────

const ClientDetail: React.FC<{ cm: ClientMonth; month: string; onBack: () => void }> = ({ cm, month, onBack }) => {
  const sorted = [...cm.orders].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  // Group by day
  const byDay = sorted.reduce<Record<string, FlatOrder[]>>((acc, o) => {
    const key = o.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  const avgOrder = cm.orderCount > 0 ? cm.total / cm.orderCount : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-indigo-600 transition-colors shadow-sm">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="font-black text-gray-900 dark:text-white text-base uppercase tracking-tight leading-tight">
            {cm.cliente.nome}
          </h2>
          <p className="text-xs font-bold text-gray-400 capitalize">{formatMonthLabel(month)}</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Totale mese', value: `€${fmt(cm.total)}`, icon: TrendingUp, color: 'indigo' },
          { label: 'N° ordini', value: String(cm.orderCount), icon: ShoppingCart, color: 'violet' },
          { label: 'Ordine medio', value: `€${fmt(avgOrder)}`, icon: Package, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-2xl p-3 text-center`}>
            <Icon size={14} className={`mx-auto mb-1 text-${color}-500`} />
            <p className="font-black text-gray-900 dark:text-white text-sm">{value}</p>
            <p className={`text-[10px] font-black text-${color}-500 uppercase tracking-widest mt-0.5`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Orders day by day */}
      <div className="space-y-3">
        {Object.entries(byDay).map(([date, orders]) => {
          const dayTotal = orders.reduce((s, o) => s + o.amount, 0);
          const dt = parseDate(date);
          const dayLabel = dt ? dt.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : date;

          return (
            <div key={date} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Day header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-indigo-400" />
                  <span className="text-xs font-black text-gray-700 dark:text-gray-200 capitalize">{dayLabel}</span>
                </div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">€{fmt(dayTotal)}</span>
              </div>

              {/* Products */}
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {orders.map((o, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                        {o.productName || o.productId}
                      </p>
                      {o.productModel && (
                        <p className="text-[10px] text-gray-400 font-bold truncate">{o.productModel}</p>
                      )}
                      {o.quantity > 0 && (
                        <p className="text-[10px] text-gray-400 font-bold">
                          {o.quantity} pz
                          {o.quantity > 0 && o.amount > 0
                            ? ` · €${fmt(o.amount / o.quantity)} cad.`
                            : ''}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-sm text-gray-900 dark:text-white flex-shrink-0">
                      €{fmt(o.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Month total */}
      <div className="bg-indigo-600 rounded-2xl p-4 flex items-center justify-between">
        <span className="text-sm font-black text-indigo-100 uppercase tracking-widest">Totale {formatMonthLabel(month)}</span>
        <span className="text-xl font-black text-white">€{fmt(cm.total)}</span>
      </div>
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────

export const MonthlyOrdersView: React.FC = () => {
  const clientiDettagliati = useStoricoStore(s => s.clientiDettagliati);
  const [selectedMonth, setSelectedMonth] = useState(currentYM);
  const [selectedClient, setSelectedClient] = useState<ClientMonth | null>(null);

  // Compute all months available in data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    clientiDettagliati.forEach(c =>
      c.prodotti.forEach(p =>
        p.ordini.forEach(o => {
          const m = orderMonth(o.date);
          if (m) set.add(m);
        })
      )
    );
    return Array.from(set).sort();
  }, [clientiDettagliati]);

  // Aggregate data for selected month
  const monthData = useMemo((): ClientMonth[] => {
    const results: ClientMonth[] = [];

    clientiDettagliati.forEach(cliente => {
      const orders: FlatOrder[] = [];

      cliente.prodotti.forEach(prod => {
        prod.ordini.forEach(o => {
          if (orderMonth(o.date) !== selectedMonth) return;
          const dt = parseDate(o.date);
          if (!dt) return;
          orders.push({
            ...o,
            productId: prod.itemId,
            productName: prod.nome,
            parsedDate: dt,
          });
        });
      });

      if (orders.length === 0) return;

      const total = orders.reduce((s, o) => s + o.amount, 0);
      const margin = orders.reduce((s, o) => s + o.margin, 0);
      results.push({ cliente, orders, total, margin, orderCount: orders.length });
    });

    return results.sort((a, b) => b.total - a.total);
  }, [clientiDettagliati, selectedMonth]);

  const monthTotal = monthData.reduce((s, c) => s + c.total, 0);
  const monthOrders = monthData.reduce((s, c) => s + c.orderCount, 0);
  const canGoPrev = availableMonths.length === 0 || selectedMonth > availableMonths[0];
  const canGoNext = selectedMonth < currentYM();

  if (selectedClient) {
    return (
      <ClientDetail
        cm={selectedClient}
        month={selectedMonth}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  if (clientiDettagliati.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShoppingCart size={44} className="text-gray-200 dark:text-gray-700 mb-4" />
        <p className="font-black text-gray-400 uppercase tracking-widest text-sm">Nessuno storico caricato</p>
        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Importa il file Excel dallo Storico per visualizzare gli ordini mensili</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Month navigator */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <button
          onClick={() => { setSelectedClient(null); setSelectedMonth(prevMonth(selectedMonth)); }}
          disabled={!canGoPrev}
          className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <p className="font-black text-gray-900 dark:text-white text-base capitalize">
            {formatMonthLabel(selectedMonth)}
          </p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {monthData.length} clienti · {monthOrders} ordini
          </p>
        </div>

        <button
          onClick={() => { setSelectedClient(null); setSelectedMonth(nextMonth(selectedMonth)); }}
          disabled={!canGoNext}
          className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Month KPI */}
      {monthData.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-indigo-600 rounded-2xl p-4">
            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Fatturato mese</p>
            <p className="text-2xl font-black text-white">€{fmt(monthTotal)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ordine medio</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              €{fmt(monthOrders > 0 ? monthTotal / monthOrders : 0)}
            </p>
          </div>
        </div>
      )}

      {/* Client list */}
      {monthData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center border border-gray-100 dark:border-gray-700">
          <p className="font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest text-sm">
            Nessun ordine in {formatMonthLabel(selectedMonth)}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {monthData.map((cm, idx) => {
            const pct = monthTotal > 0 ? (cm.total / monthTotal) * 100 : 0;
            return (
              <button
                key={cm.cliente.clientId}
                onClick={() => setSelectedClient(cm)}
                className="w-full bg-white dark:bg-gray-800 rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0
                    ${idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                      idx === 1 ? 'bg-gray-100 text-gray-500 dark:bg-gray-700' :
                      idx === 2 ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/20' :
                      'bg-gray-50 text-gray-400 dark:bg-gray-700'}`}>
                    {idx + 1}
                  </span>

                  {/* Name + orders */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 dark:text-white text-sm truncate uppercase">
                      {cm.cliente.nome}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {/* Progress bar */}
                      <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 flex-shrink-0">
                        {cm.orderCount} ordini · {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      €{fmt(cm.total)}
                    </p>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400 transition-colors ml-auto" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
