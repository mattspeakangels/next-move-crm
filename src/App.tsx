import { DialogFrame } from './components/ui/DialogFrame';
import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { useAuth } from './lib/authContext';
import { useFirestoreSync } from './lib/useFirestoreSync';
import { useInitializeProducts } from './hooks/useInitializeProducts';
import { useProspectingReminders } from './hooks/useProspectingReminders';
import { LoginView } from './views/LoginView';
import { LayoutDashboard, Users, Target, FileText, Calendar, Settings, Package, Map, Activity, X, BarChart3, TrendingUp, Shield, ChevronLeft, CheckSquare, Menu, Crosshair } from 'lucide-react';
import { SEED_SEQUENCES } from './data/prospectingSequences';
import { ToastProvider } from './components/ui/ToastContext';
import { UpdateBanner } from './components/UpdateBanner';
import { SelectionAI } from './components/ai/SelectionAI';
import { QuickLogFAB } from './components/ai/QuickLogFAB';
import { useStore } from './store/useStore';
import { NavView } from './types';
import { cssVarsForPalette, FONT_STACKS, ACCENT_SECTION_ALIAS, FontFamilyKey } from './lib/accentPalettes';
import { Wordmark } from './components/ui/Syrio';
import { FeedbackProvider } from './components/ui/Feedback';

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
const StrategyView   = lazy(() => import('./views/StrategyView').then(m => ({ default: m.StrategyView })));

const ViewLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-7 h-7 border-4 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
);

// Analytics feature enabled
function AppContent() {
  const [currentView, setCurrentView] = useState<NavView>(
    () => (localStorage.getItem('nm_last_view') as NavView) ?? 'offers'
  );
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const historyRef = useRef<NavView[]>([]);
  const { theme, sectionColors, globalAccent, profile, footerTabs, sidebarOrder, seedSequencesIfEmpty, repairCustomerTypes } = useStore();

  useInitializeProducts();
  useProspectingReminders();

  useEffect(() => {
    seedSequencesIfEmpty(SEED_SEQUENCES);
  }, [seedSequencesIfEmpty]);

  useEffect(() => {
    repairCustomerTypes();
  }, [repairCustomerTypes]);

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

  const [pendingItineraryDate, setPendingItineraryDate] = useState<string | null>(null);
  const viewItinerary = (date: string) => {
    setPendingItineraryDate(date);
    goTo('map');
  };

  const [pendingNewOfferContactId, setPendingNewOfferContactId] = useState<string | null>(null);
  const newOfferForContact = (contactId: string) => {
    setPendingNewOfferContactId(contactId);
    goTo('offers');
  };

  const accentSectionId = ACCENT_SECTION_ALIAS[currentView] || currentView;
  // Colore della singola sezione se impostato, altrimenti il colore globale.
  const accentStyle = cssVarsForPalette(sectionColors[accentSectionId] || globalAccent, theme === 'dark') as React.CSSProperties;

  if (!profile) return (
    <Suspense fallback={<ViewLoader />}>
      <OnboardingView />
    </Suspense>
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={goTo} />;
      case 'contacts': return <ContactsView selectedContactId={selectedContactId} onClearSelectedContact={() => setSelectedContactId(null)} onNewOfferForContact={newOfferForContact} />;
      case 'deals': return <PipelineView onNavigateToContact={navigateToContact} onNavigate={goTo} />;
      case 'offers': return <OffersView initialContactId={pendingNewOfferContactId} onInitialContactConsumed={() => setPendingNewOfferContactId(null)} />;
      case 'agenda': return <AgendaView onNavigateToContact={navigateToContact} onViewItinerary={viewItinerary} />;
      case 'products': return <ProductsView />;
      case 'map': return <MapView onNavigateToContact={navigateToContact} onGoFullscreen={() => goTo('map-full')} initialItineraryDate={pendingItineraryDate} onItineraryDateConsumed={() => setPendingItineraryDate(null)} />;
      case 'map-full': return <MapView onNavigateToContact={navigateToContact} isFullscreen onExitFullscreen={() => goTo('map')} initialItineraryDate={pendingItineraryDate} onItineraryDateConsumed={() => setPendingItineraryDate(null)} />;
      case 'attivita': return <ActivityLogView />;
      case 'analytics': return <AnalyticsView />;
      case 'storico': return <StoricoView />;
      case 'legal': return <LegalView />;
      case 'strategia': return <StrategyView onNavigateToContact={navigateToContact} />;
      case 'settings': return <SettingsView />;
      case 'todo': return <TodoView />;
      case 'prospecting': return <PipelineView onNavigateToContact={navigateToContact} onNavigate={goTo} />;
      default: return <Dashboard onNavigate={goTo} />;
    }
  };

  const baseNavItems = [
    { id: 'dashboard' as NavView, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'deals' as NavView, icon: Target, label: 'Pipeline' },
    { id: 'strategia' as NavView, icon: Crosshair, label: 'Strategia' },
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

  // Ordine personalizzato dalle Impostazioni: le voci non ancora ordinate (es. aggiunte
  // dopo l'ultima volta che l'utente ha riordinato) restano in coda nell'ordine di default.
  const navItems = sidebarOrder && sidebarOrder.length > 0
    ? [
        ...sidebarOrder.map(id => baseNavItems.find(n => n.id === id)).filter((n): n is typeof baseNavItems[number] => !!n),
        ...baseNavItems.filter(n => !sidebarOrder.includes(n.id)),
      ]
    : baseNavItems;

  // Mobile bottom bar: usa footerTabs dallo store, fallback ai primi 4
  const activeTabs = (footerTabs && footerTabs.length > 0 ? footerTabs : ['dashboard', 'deals', 'agenda', 'contacts']) as NavView[];
  const mobileMain = navItems.filter(n => activeTabs.includes(n.id));

  return (
    <div className={`min-h-screen text-foreground ${theme === 'dark' ? 'dark bg-canvas' : 'bg-canvas'}`}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-surface dark:bg-surface border-r border-line dark:border-line hidden md:flex flex-col z-20">
        <div className="px-7 py-7">
          <Wordmark className="text-3xl" />
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {historyRef.current.length > 0 && (
            <button onClick={goBack} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-normal rounded-panel transition-all text-muted hover:bg-canvas dark:hover:bg-raised dark:hover:text-foreground mb-2 border border-line dark:border-line">
              <ChevronLeft size={20} /> Indietro
            </button>
          )}
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => goTo(id)} aria-current={currentView === id ? 'page' : undefined} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${currentView === id ? 'bg-accent-soft text-accent border border-accent/25' : 'border border-transparent text-muted hover:bg-raised hover:text-foreground'}`}>
              <Icon size={20} />{label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-surface dark:bg-surface border-b border-line dark:border-line flex items-center h-14 px-3 gap-2">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-md text-secondary dark:text-muted hover:bg-raised dark:hover:bg-raised transition-colors flex-shrink-0"
          aria-label="Apri menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex-1 min-w-0">
          {historyRef.current.length > 0 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm font-semibold text-accent dark:text-accent"
            >
              <ChevronLeft size={16} /> Indietro
            </button>
          ) : (
            <span className="syrio-wordmark text-xl">SYRIO</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-accent flex-shrink-0">
          <Target size={20} strokeWidth={2.5} />
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="md:pl-64 min-h-screen pb-20 pt-14 md:pt-0 md:pb-0 bg-canvas dark:bg-canvas">
        <div style={accentStyle} className={currentView === 'map' ? 'p-2 md:p-3' : 'p-4 md:p-8 max-w-7xl mx-auto'}>
          <Suspense fallback={<ViewLoader />}>{renderView()}</Suspense>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV (5 tab personalizzabili) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface dark:bg-surface border-t border-line dark:border-line flex items-center justify-around px-1 h-16 safe-area-inset-bottom">
        {mobileMain.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => goTo(id)}
            className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2 transition-all ${currentView === id ? 'text-accent' : 'text-muted'}`}
          >
            <Icon size={22} strokeWidth={currentView === id ? 2.5 : 1.8} />
            <span className="text-xs font-medium leading-none max-w-full truncate">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── MOBILE DRAWER LATERALE (burger) ── */}
      {mobileMenuOpen && (
        <DialogFrame className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative bg-surface dark:bg-canvas w-72 h-full flex flex-col shadow-panel">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-line dark:border-line">
              <Wordmark className="text-2xl" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Chiudi menu"
                className="p-2 rounded-md text-muted hover:bg-raised dark:hover:bg-surface transition-colors"
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
                  aria-current={currentView === id ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${currentView === id ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-raised hover:text-foreground'}`}
                >
                  <Icon size={18} />{label}
                </button>
              ))}
            </nav>
          </aside>
        </DialogFrame>
      )}

      <QuickLogFAB />
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  useFirestoreSync(user?.uid ?? '');

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginView />;
  return <AppContent />;
}

export default function App() {
  const { theme, textSize, fontFamily } = useStore();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.fontSize = textSize === 'small' ? '14px' : textSize === 'large' ? '19px' : '16px';
    document.documentElement.style.fontFamily = FONT_STACKS[fontFamily as FontFamilyKey] || FONT_STACKS.sans;
  }, [theme, textSize, fontFamily]);
  return (
    <ToastProvider>
      <FeedbackProvider>
      <AuthGate />
      <UpdateBanner />
      <SelectionAI />
      </FeedbackProvider>
    </ToastProvider>
  );
}
