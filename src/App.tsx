import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  FileText, 
  Calendar, 
  Settings, 
  Package,
  Map // <-- Aggiunta Icona Mappa
} from 'lucide-react';
import { Dashboard } from './views/Dashboard';
import { ContactsView } from './views/ContactsView';
import { PipelineView } from './views/PipelineView';
import { OffersView } from './views/OffersView';
import { AgendaView } from './views/AgendaView';
import { SettingsView } from './views/SettingsView';
import { OnboardingView } from './views/OnboardingView';
import { ProductsView } from './views/ProductsView';
import { MapView } from './views/MapView'; // <-- Importazione nuova Vista
import { ToastProvider } from './components/ui/ToastContext';
import { useStore } from './store/useStore';
import { NavView } from './types';

function AppContent() {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const { theme, profile } = useStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!profile) {
    return <OnboardingView />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'contacts': return <ContactsView />;
      case 'deals': return <PipelineView />;
      case 'offers': return <OffersView />;
      case 'agenda': return <AgendaView />;
      case 'products': return <ProductsView />;
      case 'map': return <MapView />; // <-- Rendering della Vista Mappa
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  const navItems = [
    { id: 'dashboard' as NavView, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'contacts' as NavView, icon: Users, label: 'Aziende' },
    { id: 'map' as NavView, icon: Map, label: 'Mappa Clienti' }, // <-- Nuovo Tasto Menu
    { id: 'deals' as NavView, icon: Target, label: 'Pipeline' },
    { id: 'offers' as NavView, icon: FileText, label: 'Offerte' },
    { id: 'products' as NavView, icon: Package, label: 'Catalogo' },
    { id: 'agenda' as NavView, icon: Calendar, label: 'Agenda' },
    { id: 'settings' as NavView, icon: Settings, label: 'Impostazioni' },
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar Desktop */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 hidden md:flex flex-col z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 text-indigo-600">
            <Target size={32} strokeWidth={2.5} />
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Next<br/>Move</h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setCurrentView(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest rounded-2xl transition-all ${
                currentView === id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black uppercase text-xl">
              {profile.name.charAt(0)}
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-xs font-black uppercase truncate dark:text-white">{profile.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{profile.company}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:pl-64 min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-indigo-600">
            <Target size={24} strokeWidth={2.5} />
            <h1 className="text-xl font-black tracking-tighter uppercase">NextMove</h1>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black uppercase">
            {profile.name.charAt(0)}
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-2 py-3 pb-safe z-30">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {[
            { id: 'dashboard' as NavView, icon: LayoutDashboard },
            { id: 'contacts' as NavView, icon: Users },
            { id: 'map' as NavView, icon: Map }, // <-- Icona mappa visibile anche su Mobile
            { id: 'deals' as NavView, icon: Target },
            { id: 'offers' as NavView, icon: FileText }
          ].map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentView(id)}
              className={`p-3 rounded-2xl transition-all ${
                currentView === id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={24} strokeWidth={currentView === id ? 2.5 : 2} />
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
