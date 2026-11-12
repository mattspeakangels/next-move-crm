import { DialogFrame } from './components/ui/DialogFrame';
import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { useAuth } from './lib/authContext';
import { useFirestoreSync } from './lib/useFirestoreSync';
import { WorkspaceProvider, useWorkspace } from './lib/workspaceContext';
import { Button as SyrioButton } from './components/ui/Syrio';
import { useInitializeProducts } from './hooks/useInitializeProducts';
import { useProspectingReminders } from './hooks/useProspectingReminders';
import { LoginView } from './views/LoginView';
import { LayoutDashboard, Users, Target, Calendar, Settings, Map, X, BarChart3, ChevronLeft, Menu, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { getSection, sectionOf, primaryView, orderMainSections, footerSections, type SectionId } from './lib/navSections';
import { SectionTabs } from './components/layouts/SectionTabs';
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

// Icone delle voci del menu
const SECTION_ICONS: Record<SectionId, LucideIcon> = {
  oggi: LayoutDashboard, clienti: Users, opportunita: Target, agenda: Calendar,
  mappa: Map, analisi: BarChart3, impostazioni: Settings,
};

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

  // Ultima scheda aperta per ogni voce: tornando sulla voce si riapre quella
  const lastTabRef = useRef<Partial<Record<SectionId, NavView>>>({});
  lastTabRef.current[sectionOf(currentView)] = currentView === 'map-full' ? 'map' : currentView;
  const goToSection = (id: SectionId) => goTo(lastTabRef.current[id] ?? primaryView(id));

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
      case 'dashboard': return <Dashboard onNavigate={goTo} onNavigateToContact={navigateToContact} />;
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
      default: return <Dashboard onNavigate={goTo} onNavigateToContact={navigateToContact} />;
    }
  };

  // Menu a voci raggruppate (Blocco 5): ogni voce apre la sua ultima scheda
  const currentSection = sectionOf(currentView);
  const toNavItem = (id: SectionId) => ({ id, icon: SECTION_ICONS[id], label: getSection(id).label });
  const navItems = orderMainSections(sidebarOrder).map(toNavItem);
  const settingsItem = toNavItem('impostazioni');
  const mobileMain = footerSections(footerTabs).map(toNavItem);
  const currentTabLabel = getSection(currentSection).tabs.find(t => t.view === currentView)?.label;

  return (
    <div className={`min-h-screen text-foreground ${theme === 'dark' ? 'dark bg-canvas' : 'bg-canvas'}`}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="cockpit-sidebar fixed left-0 top-0 h-screen w-64 bg-surface dark:bg-surface border-r border-line dark:border-line hidden md:flex flex-col z-20">
        <div className="px-7 py-7">
          <Wordmark className="text-3xl" />
        </div>
        <div className="cockpit-nav-label">Area di lavoro</div>
        <nav aria-label="Navigazione principale" className="flex-1 min-h-0 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {historyRef.current.length > 0 && (
            <button onClick={goBack} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-normal rounded-panel transition-all text-muted hover:bg-canvas dark:hover:bg-raised dark:hover:text-foreground mb-2 border border-line dark:border-line">
              <ChevronLeft size={20} /> Indietro
            </button>
          )}
          {[...navItems, settingsItem].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => goToSection(id)} aria-current={currentSection === id ? 'page' : undefined} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${id === 'impostazioni' ? '!mt-4 ' : ''}${currentSection === id ? 'bg-accent-soft text-accent border border-accent/25' : 'border border-transparent text-muted hover:bg-raised hover:text-foreground'}`}>
              <Icon size={20} />{label}
            </button>
          ))}
        </nav>
        <div className="cockpit-profile"><span className="cockpit-profile-avatar">{(profile?.name || "S").trim().charAt(0).toUpperCase() || "S"}</span><span><strong>{profile?.name || "Il tuo spazio"}</strong><small>Area commerciale</small></span></div>
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
      <main className="cockpit-main md:pl-64 min-h-screen pb-20 pt-14 md:pt-0 md:pb-0 bg-canvas dark:bg-canvas">
        <div className="cockpit-topbar hidden md:flex">
          <div><span>Area di lavoro</span><span aria-hidden="true" className="cockpit-topbar-separator">/</span><strong>{getSection(currentSection).label}</strong>{currentTabLabel && getSection(currentSection).tabs.length > 1 && (<><span aria-hidden="true" className="cockpit-topbar-separator">/</span><span>{currentTabLabel}</span></>)}</div>
          <span className="cockpit-topbar-date">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <div style={accentStyle} className={currentView === 'map' ? 'cockpit-content cockpit-map p-2 md:p-3' : 'cockpit-content p-4 md:p-8 max-w-7xl mx-auto'}>
          {currentView !== 'map-full' && <SectionTabs currentView={currentView} onSelect={goTo} />}
          <Suspense fallback={<ViewLoader />}>{renderView()}</Suspense>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV (5 tab personalizzabili) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface dark:bg-surface border-t border-line dark:border-line flex items-center justify-around px-1 h-16 safe-area-inset-bottom">
        {mobileMain.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => goToSection(id)}
            className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2 transition-all ${currentSection === id ? 'text-accent' : 'text-muted'}`}
          >
            <Icon size={22} strokeWidth={currentSection === id ? 2.5 : 1.8} />
            <span className="text-xs font-medium leading-none max-w-full truncate">{label}</span>
          </button>
        ))}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2 transition-all ${mobileMain.some(n => n.id === currentSection) ? 'text-muted' : 'text-accent'}`}
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
          <span className="text-xs font-medium leading-none max-w-full truncate">Altro</span>
        </button>
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
              {[...navItems, settingsItem].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => goToSection(id)}
                  aria-current={currentSection === id ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${currentSection === id ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-raised hover:text-foreground'}`}
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

function FullScreenSpinner({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      {message && <p className="text-sm text-secondary">{message}</p>}
    </div>
  );
}

function WorkspaceGate() {
  const { status, error, progress, uid, workspace, retry } = useWorkspace();
  const { logout } = useAuth();
  useFirestoreSync(status === 'ready' && workspace ? { uid, wid: workspace.id } : null);

  if (status === 'loading') return <FullScreenSpinner />;
  if (status === 'migrating') {
    return <FullScreenSpinner message={progress ?? 'Preparazione dello spazio aziendale…'} />;
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base text-foreground max-w-md">{error || 'Spazio aziendale non disponibile.'}</p>
        <div className="flex gap-3">
          <SyrioButton type="button" onClick={retry}>Riprova</SyrioButton>
          <SyrioButton type="button" variant="secondary" onClick={() => { void logout(); }}>Esci</SyrioButton>
        </div>
      </div>
    );
  }
  return <AppContent />;
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <LoginView />;
  return (
    <WorkspaceProvider user={user}>
      <WorkspaceGate />
    </WorkspaceProvider>
  );
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
