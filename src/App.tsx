import { useState } from 'react';
import { Layout } from './components/layouts'; 
import { DashboardView } from './views/DashboardView';
import { ContactsView } from './views/ContactsView';
import { AgendaView } from './views/AgendaView';
import { ProductsView } from './views/ProductsView';
import { SettingsView } from './views/SettingsView';
import { OffersView } from './views/OffersView'; // <--- VERIFICATO: Import aggiunto
import { Onboarding } from './components/Onboarding'; 
import { useStore } from './store/useStore';
import { ToastProvider } from './components/ui/ToastContext';

// Tipo aggiornato con 'offers'
type View = 'dashboard' | 'contacts' | 'agenda' | 'products' | 'settings' | 'offers';

function App() {
  const { profile } = useStore();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  if (!profile) {
    return (
      <ToastProvider>
        <Onboarding />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Layout currentView={currentView} onNavigate={(view: any) => setCurrentView(view as View)}>
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'contacts' && <ContactsView />}
        {currentView === 'agenda' && <AgendaView />}
        {currentView === 'products' && <ProductsView />}
        {currentView === 'settings' && <SettingsView />}
        {currentView === 'offers' && <OffersView />} {/* <--- VERIFICATO: Rotta aggiunta */}
      </Layout>
    </ToastProvider>
  );
}

export default App;
