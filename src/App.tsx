import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { useAuth } from './lib/authContext';
import { useFirestoreSync } from './lib/useFirestoreSync';
import { useInitializeProducts } from './hooks/useInitializeProducts';
import { LoginView } from './views/LoginView';
import { LayoutDashboard, Users, Target, FileText, Calendar, Settings, Package, Map, Activity, X, BarChart3, TrendingUp, Shield, ChevronLeft, CheckSquare, Menu } from 'lucide-react';
import { ToastProvider } from './components/ui/ToastContext';
import { UpdateBanner } from './components/UpdateBanner';
import { SelectionAI } from './components/ai/SelectionAI';
import { useStore } from './store/useStore';
import { NavView } from './types';

const Dashboard      = lazy(() => import('./views/DashboardView').then(m => ({ default: m.Dashboard })));
const ContactsView   = lazy(() => import('./views/ContactsView').then(m => ({ default: m.ContactsView })));
const PipelineView   = lazy(() => import('./views/PipelineView').then(m => ({ default: m.PipelineView })));
const OffersView     = lazy(() => import('./views/OffersView').then(m => ({ default: m.OffersView })));
const AgendaView     = lazy(() => import('./views/AgendaView').then(m => ({ default: m.AgendaView })));
const SettingsView   = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));
const OnboardingView = lazy(() => import('./views/OnboardingView').then(m => ({ default: m.OnboardingView })));
const ProductsView   = lazy(() => import('./views/ProductsView').then(m => ({ default: m.ProductsView })));
const MapView        = lazy(() => import('./views/MapView').then(m => ({ default: m.MapView })));
const ActivityLogView = lazy(() => import('./views/ActivityLogView').then(m => ({ default: m.ActivityLogView })));
const AnalyticsView  = lazy(() => import('./views/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const StoricoView    = lazy(() => import('./views/StoricoView').then(m => ({ default: m.StoricoView })));
const TodoView       = lazy(() => import('./views/TodoView').then(m => ({ default: m.TodoView })));
const LegalView      = lazy(() => import('./views/LegalView').then(m => ({ default: m.LegalView })));

const ViewLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Analytics feature enabled
function AppContent() {
  const [currentView, setCurrentView] = useState<NavView>(
    () => (localStorage.getItem('nm_last_view') as NavView) ?? 'dashboard'
  );
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const historyRef = useRef<NavView[]>([]);
  const { theme, profile, footerTabs } = useStore();

  useInitializeProducts();

  const goTo = (view: NavView) => {
    historyRef.current = [...historyRef.current, currentView];
    setCurrentView(view);
    localStorage.setItem('nm_last_view', view);
    setMobileMenuOpen(false);
    window.history.pushState({ view }, '');
  };

  const goBack = () => {
    const prev = historyRef.current.pop();
    if (prev) {
      setCurrentView(prev);
      localStorage.setItem('nm_last_view', prev);
    }
  };

  // Android back button intercept
  useEffect(() => {
    const handlePopState = () => {
      const prev = historyRef.current.pop();
      if (prev) {
        setCurrentView(prev);
        localStorage.setItem('nm_last_view', prev);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToContact = (contactId: string) => {
    setSelectedContactId(contactId);
    goTo('contacts');
  };

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  if (!profile) return (
    <Suspense fallback={<ViewLoader />}>
      <OnboardingView />
    </Suspense>
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={goTo} />;
      case 'contacts': return <ContactsView selectedContactId={selectedContactId} onClearSelectedContact={() => setSelectedContactId(null)} />;
      case 'deals': return <PipelineView onNavigateToContact={navigateToContact} />;
      case 'offers': return <OffersView />;
      case 'agenda': return <AgendaView onNavigateToContact={navigateToContact} />;
      case 'products': return <ProductsView />;
      case 'map': return <MapView onNavigateToContact={navigateToContact} onGoFullscreen={() => goTo('map-full')} />;
      case 'map-full': return <MapView onNavigateToContact={navigateToContact} isFullscreen onExitFullscreen={() => goTo('map')} />;
      case 'attivita': return <ActivityLogView />;
      case 'analytics': return <AnalyticsView />;
      case 'storico': return <StoricoView />;
      case 'legal': return <LegalView />;
      case 'settings': return <SettingsView />;
      case 'todo': return <TodoView />;
      default: return <Dashboard onNavigate={goTo} />;
    }
  };

  const navItems = [
    { id: 'dashboard' as NavView, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'deals' as NavView, icon: Target, label: 'Pipeline' },
    { id: 'contacts' as NavView, icon: Users, label: 'Clienti' },
    { id: 'offers' as NavView, icon: FileText, label: 'Offerte' },
    { id: 'products' as NavView, icon: Package, label: 'Prodotti' },
    { id: 'agenda' as NavView, icon: Calendar, label: 'Agenda' },
    { id: 'attivita' as NavView, icon: Activity, label: 'Attività' },
    { id: 'map' as NavView, icon: Map, label: 'Mappa' },
    { id: 'todo' as NavView, icon: CheckSquare, label: 'To Do' },
    { id: 'analytics' as NavView, icon: BarChart3, label: 'Analytics' },
    { id: 'storico' as NavView, icon: TrendingUp, label: 'Storico' },
    { id: 'legal' as NavView, icon: Shield, label: 'Legal' },
    { id: 'settings' as NavView, icon: Settings, label: 'Impostazioni' },
  ];

  // Mobile bottom bar: usa footerTabs dallo store, fallback ai primi 4
  const activeTabs = (footerTabs && footerTabs.length > 0 ? footerTabs : ['dashboard', 'deals', 'agenda', 'contacts']) as NavView[];
  const mobileMain = navItems.filter(n => activeTabs.includes(n.id));

  return (
    <div className={`min-h-screen text-gray-900 dark:text-gray-100 ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 hidden md:flex flex-col z-20">
        <div className="p-8 flex items-center gap-3 text-indigo-600">
          <Target size={32} strokeWidth={2.5} />
          <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Next<br/>Move</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {historyRef.current.length > 0 && (
            <button onClick={goBack} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest rounded-2xl transition-all text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:text-white mb-2 border border-gray-100 dark:border-gray-700">
              <ChevronLeft size={20} /> Indietro
            </button>
          )}
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => goTo(id)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest rounded-2xl transition-all ${currentView === id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:text-white'}`}>
              <Icon size={20} />{label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center h-14 px-3 gap-2">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          aria-label="Apri menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex-1 min-w-0">
          {historyRef.current.length > 0 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm font-black text-indigo-600 dark:text-indigo-400"
            >
              <ChevronLeft size={16} /> Indietro
            </button>
          ) : (
            <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Next Move</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-indigo-600 flex-shrink-0">
          <Target size={20} strokeWidth={2.5} />
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="md:pl-64 min-h-screen pb-20 pt-14 md:pt-0 md:pb-0 bg-gray-50 dark:bg-gray-900">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Suspense fallback={<ViewLoader />}>{renderView()}</Suspense>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV (4 tab personalizzabili) ── */}
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
      </nav>

      {/* ── MOBILE DRAWER LATERALE (burger) ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative bg-white dark:bg-gray-900 w-72 h-full flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 text-indigo-600">
                <Target size={22} strokeWidth={2.5} />
                <span className="text-lg font-black tracking-tighter uppercase leading-none">Next Move</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Nav items */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => goTo(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest rounded-2xl transition-all ${currentView === id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:text-white'}`}
                >
                  <Icon size={18} />{label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (user) useFirestoreSync(user.uid);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginView />;
  return <AppContent />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthGate />
      <UpdateBanner />
      <SelectionAI />
    </ToastProvider>
  );
}
