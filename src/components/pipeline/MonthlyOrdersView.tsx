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
          className="p-2 rounded-md bg-surface dark:bg-surface border border-line dark:border-line text-secondary hover:text-accent transition-colors shadow-sm">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="font-semibold text-foreground dark:text-foreground text-base  tracking-tight leading-tight">
            {cm.cliente.nome}
          </h2>
          <p className="text-xs font-bold text-muted capitalize">{formatMonthLabel(month)}</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Totale mese', value: `€${fmt(cm.total)}`, icon: TrendingUp },
          { label: 'N° ordini', value: String(cm.orderCount), icon: ShoppingCart },
          { label: 'Ordine medio', value: `€${fmt(avgOrder)}`, icon: Package },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-line rounded-panel p-3 text-center">
            <Icon size={14} className="mx-auto mb-1 text-accent" />
            <p className="font-semibold text-foreground dark:text-foreground text-sm">{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
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
            <div key={date} className="bg-surface dark:bg-surface rounded-panel shadow-sm border border-line dark:border-line overflow-hidden">
              {/* Day header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-canvas dark:bg-raised/50 border-b border-line dark:border-line">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-accent" />
                  <span className="text-xs font-semibold text-foreground dark:text-muted capitalize">{dayLabel}</span>
                </div>
                <span className="text-xs font-semibold text-accent dark:text-accent">€{fmt(dayTotal)}</span>
              </div>

              {/* Products */}
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {orders.map((o, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground dark:text-muted truncate">
                        {o.productName || o.productId}
                      </p>
                      {o.productModel && (
                        <p className="text-xs text-muted font-bold truncate">{o.productModel}</p>
                      )}
                      {o.quantity > 0 && (
                        <p className="text-xs text-muted font-bold">
                          {o.quantity} pz
                          {o.quantity > 0 && o.amount > 0
                            ? ` · €${fmt(o.amount / o.quantity)} cad.`
                            : ''}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-sm text-foreground dark:text-foreground flex-shrink-0">
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
      <div className="bg-action rounded-panel p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-action-foreground uppercase tracking-normal">Totale {formatMonthLabel(month)}</span>
        <span className="text-xl font-semibold text-action-foreground">€{fmt(cm.total)}</span>
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
        <ShoppingCart size={44} className="text-muted dark:text-foreground mb-4" />
        <p className="font-semibold text-muted uppercase tracking-normal text-sm">Nessuno storico caricato</p>
        <p className="text-xs text-muted dark:text-secondary mt-1">Importa il file Excel dallo Storico per visualizzare gli ordini mensili</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Month navigator */}
      <div className="flex items-center justify-between bg-surface dark:bg-surface rounded-panel px-4 py-3 shadow-sm border border-line dark:border-line">
        <button
          onClick={() => { setSelectedClient(null); setSelectedMonth(prevMonth(selectedMonth)); }}
          disabled={!canGoPrev}
          className="p-2 rounded-md text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <p className="font-semibold text-foreground dark:text-foreground text-base capitalize">
            {formatMonthLabel(selectedMonth)}
          </p>
          <p className="text-xs font-bold text-muted uppercase tracking-normal">
            {monthData.length} clienti · {monthOrders} ordini
          </p>
        </div>

        <button
          onClick={() => { setSelectedClient(null); setSelectedMonth(nextMonth(selectedMonth)); }}
          disabled={!canGoNext}
          className="p-2 rounded-md text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Month KPI */}
      {monthData.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-action rounded-panel p-4">
            <p className="text-xs font-semibold text-action-foreground uppercase tracking-normal mb-1">Fatturato mese</p>
            <p className="text-2xl font-semibold text-action-foreground">€{fmt(monthTotal)}</p>
          </div>
          <div className="bg-surface dark:bg-surface rounded-panel p-4 border border-line dark:border-line">
            <p className="text-xs font-semibold text-muted uppercase tracking-normal mb-1">Ordine medio</p>
            <p className="text-2xl font-semibold text-foreground dark:text-foreground">
              €{fmt(monthOrders > 0 ? monthTotal / monthOrders : 0)}
            </p>
          </div>
        </div>
      )}

      {/* Client list */}
      {monthData.length === 0 ? (
        <div className="bg-surface dark:bg-surface rounded-panel p-10 text-center border border-line dark:border-line">
          <p className="font-semibold text-muted dark:text-secondary uppercase tracking-normal text-sm">
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
                className="w-full bg-surface dark:bg-surface rounded-panel px-4 py-3.5 border border-line dark:border-line hover:border-accent dark:hover:border-accent hover:shadow-panel transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0
                    ${idx === 0 ? 'bg-warning-soft text-warning dark:bg-warning-soft' :
                      idx === 1 ? 'bg-raised text-secondary dark:bg-raised' :
                      idx === 2 ? 'bg-warning-soft text-warning dark:bg-warning-soft' :
                      'bg-canvas text-muted dark:bg-raised'}`}>
                    {idx + 1}
                  </span>

                  {/* Name + orders */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground dark:text-foreground text-sm truncate uppercase">
                      {cm.cliente.nome}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {/* Progress bar */}
                      <div className="flex-1 h-1 bg-raised dark:bg-raised rounded-full overflow-hidden">
                        <div
                          className="h-full bg-action rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted flex-shrink-0">
                        {cm.orderCount} ordini · {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-accent dark:text-accent text-sm">
                      €{fmt(cm.total)}
                    </p>
                    <ChevronRight size={14} className="text-muted group-hover:text-accent transition-colors ml-auto" />
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
