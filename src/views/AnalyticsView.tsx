import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { selectMonthlySales, selectTopCustomers, selectTopProducts, selectSalesByStage } from '../store/selectors';
import { Upload, TrendingUp, Users, Zap } from 'lucide-react';
import { BarChart, PieChart, LineChart, Bar, Pie, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useToast } from '../components/ui/ToastContext';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export const AnalyticsView: React.FC = () => {
  const state = useStore();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [yearsBack] = useState(2);

  const monthlySales = selectMonthlySales(state, yearsBack);
  const topCustomers = selectTopCustomers(state, 10);
  const topProducts = selectTopProducts(state, 10);
  const salesByStage = selectSalesByStage(state);

  const totalRevenue = Object.values(state.salesTransactions || {}).reduce((sum, tx) => sum + tx.totalAmount, 0);
  const transactionCount = Object.values(state.salesTransactions || {}).length;
  const avgDealValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
  const topCustomerName = topCustomers[0]?.name || 'N/A';

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
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

          let contactId = Object.entries(state.contacts)
            .find(([, c]) => c.company.toLowerCase().includes(customerName.toLowerCase()))?.[0];

          if (!contactId) {
            contactId = `contact_${Date.now()}_${Math.random()}`;
            state.addContact({
              id: contactId,
              company: customerName,
              contactName: 'Imported',
              role: 'N/A',
              email: '',
              phone: '',
              sector: 'sconosciuto',
              region: 'N/A',
              status: 'cliente',
              createdAt: date,
              updatedAt: date,
            });
          }

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
        showToast('Errore importazione CSV', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black dark:text-white uppercase">Analytics</h1>
          <p className="text-gray-400 text-sm font-bold">Business Intelligence</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-2xl font-bold flex items-center gap-2"
        >
          <Upload size={16} /> Importa CSV
        </button>
        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVImport} className="hidden" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Fatturato</p>
            <TrendingUp size={20} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">€{(totalRevenue / 1000).toFixed(0)}k</p>
          <p className="text-xs text-gray-400 mt-1">{transactionCount} transazioni</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Numero Deal</p>
            <Zap size={20} className="text-cyan-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{transactionCount}</p>
          <p className="text-xs text-gray-400 mt-1">ultimi {yearsBack} anni</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Deal Medio</p>
            <Zap size={20} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">€{(avgDealValue / 1000).toFixed(1)}k</p>
          <p className="text-xs text-gray-400 mt-1">per transazione</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Top Cliente</p>
            <Users size={20} className="text-amber-500" />
          </div>
          <p className="text-lg font-black text-gray-900 dark:text-white truncate">{topCustomerName}</p>
          <p className="text-xs text-gray-400 mt-1">{topCustomers[0]?.count || 0} ordini</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-black uppercase mb-4">Trend Mensile</h3>
          {monthlySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => `€${(value as number / 1000).toFixed(1)}k`} />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={{ fill: '#4f46e5', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">Nessun dato</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-black uppercase mb-4">Top 10 Clienti</h3>
          {topCustomers.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={topCustomers} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percentage }) => `${name} (${percentage}%)`}>
                  {topCustomers.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `€${(value as number / 1000).toFixed(1)}k`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">Nessun dato</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-black uppercase mb-4">Top 10 Prodotti</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(value) => `${value} unità`} />
                <Bar dataKey="value" fill="#06b6d4" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">Nessun dato</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-black uppercase mb-4">Per Stage</h3>
          {salesByStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={salesByStage} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percentage }) => `${name} (${percentage}%)`}>
                  {salesByStage.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `${value} transazioni`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">Nessun dato</div>
          )}
        </div>
      </div>

      {transactionCount > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/50">
          <p className="text-sm text-indigo-900 dark:text-indigo-200">
            <strong>{transactionCount}</strong> transazioni • <strong>€{(totalRevenue / 1000).toFixed(0)}k</strong> fatturato
          </p>
        </div>
      )}
    </div>
  );
};
