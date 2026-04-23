import { useStore } from '../store/useStore';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Clock
} from 'lucide-react';

export const Dashboard = () => {
  const { contacts, deals, offers } = useStore();

  const totalDealsValue = Object.values(deals).reduce((acc, deal) => acc + deal.value, 0);
  const activeContacts = Object.values(contacts).length;
  const pendingOffers = Object.values(offers).filter(o => o.status === 'inviata').length;
  const wonDeals = Object.values(deals).filter(d => d.stage === 'chiuso-vinto').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Dashboard</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Panoramica Performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
          <Target className="text-indigo-600 mb-2" size={24} />
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Volume Pipeline</h3>
          <p className="text-2xl font-black dark:text-white tracking-tighter">€{totalDealsValue.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
          <Users className="text-blue-600 mb-2" size={24} />
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Aziende</h3>
          <p className="text-2xl font-black dark:text-white tracking-tighter">{activeContacts}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
          <Clock className="text-orange-600 mb-2" size={24} />
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Offerte Attive</h3>
          <p className="text-2xl font-black dark:text-white tracking-tighter">{pendingOffers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-50 dark:border-gray-700">
          <TrendingUp className="text-green-600 mb-2" size={24} />
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Vinte</h3>
          <p className="text-2xl font-black dark:text-white tracking-tighter">{wonDeals}</p>
        </div>
      </div>
    </div>
  );
};
