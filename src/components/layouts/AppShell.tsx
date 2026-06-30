import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Zap, Calendar, Columns, Users, LineChart, Settings as SettingsIcon, X } from 'lucide-react';
import { Header } from './Header';

const navItems = [
  { path: '/', label: 'Oggi', icon: Zap },
  { path: '/agenda', label: 'Agenda', icon: Calendar },
  { path: '/pipeline', label: 'Pipeline', icon: Columns },
  { path: '/contacts', label: 'Aziende', icon: Users },
  { path: '/kpi', label: 'KPI', icon: LineChart },
];

export const AppShell: React.FC = () => {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Chiudi drawer a ogni cambio pagina
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Blocca scroll body quando drawer aperto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all
     ${isActive
       ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900'
       : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-200">

      {/* ── Sidebar desktop (md+) ── */}
      <aside className="hidden md:flex w-[260px] flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 transition-colors flex-shrink-0">
        <div className="p-6 pb-4">
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-md">
              <Zap size={18} className="fill-white" />
            </span>
            Next Move
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={navLinkClass}>
              <item.icon size={19} />{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <NavLink to="/settings" className={navLinkClass}>
            <SettingsIcon size={19} /> Impostazioni
          </NavLink>
        </div>
      </aside>

      {/* ── Burger drawer mobile ── */}

      {/* Overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 z-50 bg-white dark:bg-gray-900 flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-md">
              <Zap size={18} className="fill-white" />
            </span>
            Next Move
          </h2>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={navLinkClass}>
              <item.icon size={20} />{item.label}
            </NavLink>
          ))}
        </nav>

        {/* Impostazioni in fondo */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 mb-safe">
          <NavLink to="/settings" className={navLinkClass}>
            <SettingsIcon size={20} /> Impostazioni
          </NavLink>
        </div>
      </aside>

      {/* ── Area principale ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onBurgerClick={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
          <div key={location.pathname} className="animate-fade-in h-full">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
};
