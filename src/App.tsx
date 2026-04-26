import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Target, FileText, Calendar, Settings, Package, Map, Activity, MoreHorizontal, X, BarChart3 } from 'lucide-react';
import { Dashboard } from './views/DashboardView';
import { ContactsView } from './views/ContactsView';
import { PipelineView } from './views/PipelineView';
import { OffersView } from './views/OffersView';
import { AgendaView } from './views/AgendaView';
import { SettingsView } from './views/SettingsView';
import { OnboardingView } from './views/OnboardingView';
import { ProductsView } from './views/ProductsView';
import { MapView } from './views/MapView';
import { ActivityLogView } from './views/ActivityLogView';
import { AnalyticsView } from './views/AnalyticsView';
import { ToastProvider } from './components/ui/ToastContext';
import { useStore } from './store/useStore';
import { NavView } from './types';

// Analytics feature enabled
function AppContent() {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, profile } = useStore();

  const navigateToContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setCurrentView('contacts');
  };

  const goTo = (view: NavView) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  if (!profile) return <OnboardingView />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={goTo} />;
      case 'contacts': return <ContactsView selectedContactId={selectedContactId} onClearSelectedContact={() => setSelectedContactId(null)} />;
      case 'deals': return <PipelineView onNavigateToContact={navigateToContact} />;
      case 'offers': return <OffersView />;
      case 'agenda': return <AgendaView />;
      case 'products': return <ProductsView />;
      case 'map': return <MapView onNavigateToContact={navigateToContact} />;
      case 'attivita': return <ActivityLogView />;
      case 'analytics': return <AnalyticsView />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard onNavigate={goTo} />;
    }
  };

  const navItems = [
    { id: 'dashboard' as NavView, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'deals' as NavView, icon: Target, label: 'Pipeline' },
    { id: 'contacts' as NavView, icon: Users, label: 'Aziende' },
    { id: 'offers' as NavView, icon: FileText, label: 'Offerte' },
    { id: 'products' as NavView, icon: Package, label: 'Prodotti' },
    { id: 'agenda' as NavView, icon: Calendar, label: 'Agenda' },
    { id: 'attivita' as NavView, icon: Activity, label: 'Attività' },
    { id: 'map' as NavView, icon: Map, label: 'Mappa' },
    { id: 'analytics' as NavView, icon: BarChart3, label: 'Analytics' },
    { id: 'settings' as NavView, icon: Settings, label: 'Impostazioni' },
  ];

  // Mobile bottom bar: 5 main items + "Altro"
  const mobileMain = navItems.slice(0, 4);
  const mobileExtra = navItems.slice(4);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 hidden md:flex flex-col z-20">
        <div className="p-8 flex items-center gap-3 text-indigo-600">
          <Target size={32} strokeWidth={2.5} />
          <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Next<br/>Move</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => goTo(id)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest rounded-2xl transition-all ${currentView === id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <Icon size={20} />{label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="md:pl-64 min-h-screen pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{renderView()}</div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around px-1 h-16 safe-area-inset-bottom">
        {mobileMain.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => goTo(id)}
            className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-all ${currentView === id ? 'text-indigo-600' : 'text-gray-400'}`}
          >
            <Icon size={22} strokeWidth={currentView === id ? 2.5 : 1.8} />
            <span className="text-[10px] font-bold uppercase tracking-wide leading-none">{label}</span>
          </button>
        ))}
        {/* "Altro" button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-all ${mobileExtra.some(i => i.id === currentView) ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
          <span className="text-[10px] font-bold uppercase tracking-wide leading-none">Altro</span>
        </button>
      </nav>

      {/* ── MOBILE "ALTRO" DRAWER ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          {/* sheet */}
          <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {mobileExtra.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => goTo(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${currentView === id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                >
                  <Icon size={26} strokeWidth={currentView === id ? 2.5 : 1.8} />
                  <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() { return (<ToastProvider><AppContent /></ToastProvider>); }
