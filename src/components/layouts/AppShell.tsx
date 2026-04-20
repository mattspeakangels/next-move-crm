import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Zap, Calendar, Columns, Users, LineChart, Settings as SettingsIcon } from 'lucide-react';
import { Header } from './Header';

const navItems = [
  { path: '/', label: 'Oggi', icon: Zap },
  { path: '/agenda', label: 'Agenda', icon: Calendar },
  { path: '/pipeline', label: 'Pipeline', icon: Columns },
  { path: '/contacts', label: 'Contatti', icon: Users },
  { path: '/kpi', label: 'KPI', icon: LineChart },
];

export const AppShell: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Menu laterale per Desktop */}
      <aside className="hidden md:flex w-[280px] flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 transition-colors">
        <div className="p-6">
          <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Zap className="fill-indigo-600 dark:fill-indigo-400" /> Next Move
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`}>
              <item.icon size={20} />{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`}>
            <SettingsIcon size={20} /> Impostazioni
          </NavLink>
        </div>
      </aside>

      {/* Area principale */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-24 md:pb-8">
          <div key={location.pathname} className="animate-fade-in h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Menu inferiore per Mobile */}
      <nav className="md:hidden absolute bottom-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-800 px-2 py-3 pb-safe flex justify-between items-center z-30 transition-colors">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex flex-col items-center flex-1 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
            <item.icon size={22} className="mb-1" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
