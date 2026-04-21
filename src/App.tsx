import { useState } from 'react';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { ContactsView } from './views/ContactsView';
import { DealsView } from './views/DealsView';
import { AgendaView } from './views/AgendaView';
import { ProductsView } from './views/ProductsView';
import { SettingsView } from './views/SettingsView';
import { Onboarding } from './components/Onboarding';
import { useStore } from './store/useStore';
import { ToastProvider } from './components/ui/ToastContext';

type View = 'dashboard' | 'contacts' | 'deals' | 'agenda' | 'products' | 'settings';

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
      <Layout currentView={currentView} onNavigate={(view: View) => setCurrentView(view)}>
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'contacts' && <ContactsView />}
        {currentView === 'deals' && <DealsView />}
        {currentView === 'agenda' && <AgendaView />}
        {currentView === 'products' && <ProductsView />}
        {currentView === 'settings' && <SettingsView />}
      </Layout>
    </ToastProvider>
  );
}

export default App;
