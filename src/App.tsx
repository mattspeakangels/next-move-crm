import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Target, FileText, Calendar, Settings, Package, Map } from 'lucide-react';
import { Dashboard } from './views/DashboardView';
import { ContactsView } from './views/ContactsView';
import { PipelineView } from './views/PipelineView';
import { OffersView } from './views/OffersView';
import { AgendaView } from './views/AgendaView';
import { SettingsView } from './views/SettingsView';
import { OnboardingView } from './views/OnboardingView';
import { ProductsView } from './views/ProductsView';
import { MapView } from './views/MapView';
import { ToastProvider } from './components/ui/ToastContext';
import { useStore } from './store/useStore';
import { NavView } from './types';

function AppContent() {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const { theme, profile } = useStore();

  const navigateToContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setCurrentView('contacts');
  };

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  if (!profile) return <OnboardingView />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'contacts': return <ContactsView selectedContactId={selectedContactId} onClearSelectedContact={() => setSelectedContactId(null)} />;
      case 'deals': return <PipelineView />;
      case 'offers': return <OffersView />;
      case 'agenda': return <AgendaView />;
      case 'products': return <ProductsView />;
      case 'map': return <MapView onNavigateToContact={navigateToContact} />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  const navItems = [
    { id: 'dashboard' as NavView, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'contacts' as NavView, icon: Users, label: 'Aziende' },
    { id: 'map' as NavView, icon: Map, label: 'Mappa' },
    { id: 'deals' as NavView, icon: Target, label: 'Pipeline' },
    { id: 'offers' as NavView, icon: FileText, label: 'Offerte' },
    { id: 'products' as NavView, icon: Package, label: 'Prodotti' },
    { id: 'agenda' as NavView, icon: Calendar, label: 'Agenda' },
    { id: 'settings' as NavView, icon: Settings, label: 'Impostazioni' },
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 hidden md:flex flex-col z-20">
        <div className="p-8 flex items-center gap-3 text-indigo-600"><Target size={32} strokeWidth={2.5} /><h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Next<br/>Move</h1></div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setCurrentView(id)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest rounded-2xl transition-all ${currentView === id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Icon size={20} />{label}</button>
          ))}
        </nav>
      </aside>
      <main className="md:pl-64 min-h-screen"><div className="p-4 md:p-8 max-w-7xl mx-auto">{renderView()}</div></main>
    </div>
  );
}

export default function App() { return (<ToastProvider><AppContent /></ToastProvider>); }
