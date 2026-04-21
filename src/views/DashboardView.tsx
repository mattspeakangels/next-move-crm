import React from 'react';
import { useStore } from '../store/useStore';
import { Percent, CircleDollarSign, Calendar, TrendingUp, ArrowRight } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { profile, deals, activities, contacts } = useStore();

  // 1. CALCOLO DEI DATI PER I 3 CERCHI (Pipeline)
  const dealsList = Object.values(deals);
  
  const openDeals = dealsList.filter(d => d.stage !== 'chiuso-vinto' && d.stage !== 'chiuso-perso');
  const wonDeals = dealsList.filter(d => d.stage === 'chiuso-vinto');
  const lostDeals = dealsList.filter(d => d.stage === 'chiuso-perso');

  const openValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const lostValue = lostDeals.reduce((sum, d) => sum + d.value, 0);

  // 2. CALCOLO DEI KPI (Tasso di conversione e Valore medio)
  const totalClosed = wonDeals.length + lostDeals.length;
  const conversionRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;
  const avgDealValue = wonDeals.length > 0 ? Math.round(wonValue / wonDeals.length) : 0;

  // 3. CALCOLO ATTIVITÀ DI OGGI
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const todayActivities = Object.values(activities)
    .filter(a => a.date >= now.getTime() && a.date <= endOfDay.getTime())
    .sort((a, b) => a.date - b.date);

  return (
    <div className="space-y-8 pb-20">
      {/* INTESTAZIONE */}
      <div>
        <h1 className="text-2xl font-black dark:text-white">
          Ciao, {profile?.name || 'Venditore'} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Ecco il riepilogo della tua pipeline.
        </p>
      </div>

      {/* SEZIONE 1: I 3 CERCHI DELLA PIPELINE */}
      <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-sm border border-gray-50 dark:border-gray-700">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-8 text-center">Pipeline delle Opportunità</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cerchio 1: Nuove (Arancione) */}
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-gray-500 font-bold mb-4">Nuove</h3>
            <div className="w-40 h-40 rounded-full bg-[#f39c12] flex flex-col items-center justify-center text-white shadow-lg shadow-orange-200 dark:shadow-none hover:scale-105 transition-transform">
              <span className="text-2xl font-black">€ {openValue.toLocaleString('it-IT')}</span>
              <span className="text-sm font-medium mt-1">{openDeals.length} opp.</span>
            </div>
          </div>

          {/* Cerchio 2: Vinte (Verde) */}
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-gray-500 font-bold mb-4">Vinte</h3>
            <div className="w-40 h-40 rounded-full bg-[#7cb342] flex flex-col items-center justify-center text-white shadow-lg shadow-green-200 dark:shadow-none hover:scale-105 transition-transform">
              <span className="text-2xl font-black">€ {wonValue.toLocaleString('it-IT')}</span>
              <span className="text-sm font-medium mt-1">{wonDeals.length} opp.</span>
            </div>
          </div>

          {/* Cerchio 3: Perse (Rosso) */}
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-gray-500 font-bold mb-4">Perse</h3>
            <div className="w-40 h-40 rounded-full bg-[#e74c3c] flex flex-col items-center justify-center text-white shadow-lg shadow-red-200 dark:shadow-none hover:scale-105 transition-transform">
              <span className="text-2xl font-black">€ {lostValue.toLocaleString('it-IT')}</span>
              <span className="text-sm font-medium mt-1">{lostDeals.length} opp.</span>
            </div>
          </div>
        </div>
      </section>

      {/* SEZIONE 2: I KPI DA VENDITORE PRO */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-indigo-600 rounded-[2rem] p-6 shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Tasso di Conversione</p>
            <h3 className="text-3xl font-black text-white">{conversionRate}%</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Percent size={24} className="text-white" />
          </div>
        </div>

        <div className="bg-gray-900 dark:bg-gray-800 rounded-[2rem] p-6 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Valore Medio Operazioni</p>
            <h3 className="text-3xl font-black text-white">€ {avgDealValue.toLocaleString('it-IT')}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <CircleDollarSign size={24} className="text-white" />
          </div>
        </div>
      </section>

      {/* SEZIONE 3: ATTIVITÀ DI OGGI */}
      <section className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 shadow-sm border border-gray-50 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="text-indigo-600" size={20} />
            <h3 className="font-black dark:text-white text-lg">In programma oggi</h3>
          </div>
          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">
            {todayActivities.length} impegni
          </span>
        </div>

        <div className="space-y-3">
          todayActivities.map(activity => {
              const deal = deals[activity.dealId];
              const contact = deal ? contacts[deal.contactId] : null;
              const actDate = new Date(activity.date);
              
              return (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                  <div>
                    <p className="font-bold dark:text-white text-sm">{contact?.company || 'Trattativa'}</p>
                    <p className="text-xs text-gray-500 capitalize">{activity.type} • {actDate.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300" />
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">
              <TrendingUp size={32} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
              Nessuna attività programmata per oggi.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
