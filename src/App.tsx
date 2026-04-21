import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { ContactsView } from './views/ContactsView';
import { DealsView } from './views/DealsView';
import { AgendaView } from './views/AgendaView';
import { ProductsView } from './views/ProductsView'; // <--- Nuova
import { SettingsView } from './views/SettingsView';
import { Onboarding } from './components/Onboarding';
import { useStore } from './store/useStore';
import { ToastProvider } from './components/ui/ToastContext';

function App() {
  const { profile } = useStore();
  const [currentView, setCurrentView] = useState<'dashboard' | 'contacts' | 'deals' | 'agenda' | 'products' | 'settings'>('dashboard');

  if (!profile) {
    return (
      <ToastProvider>
        <Onboarding />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Layout currentView={currentView} onNavigate={setCurrentView}>
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
