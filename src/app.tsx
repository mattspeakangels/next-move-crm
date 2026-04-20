import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/ToastContext';
import { OnboardingView } from './views/OnboardingView';

import { DashboardView } from './views/DashboardView';
import { DealDetailView } from './views/DealDetailView';
import { ContactsView } from './views/ContactsView';
import { ContactDetailView } from './views/ContactDetailView';
import { AgendaView } from './views/AgendaView';
import { PipelineView } from './views/PipelineView';
import { KpiView } from './views/KpiView';
import { SettingsView } from './views/SettingsView';

const LoadingSkeleton = () => (
  <div className="animate-pulse p-4 space-y-4 h-screen bg-gray-50 dark:bg-gray-900">
    <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
    <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
  </div>
);

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const profile = useStore(state => state.profile);

  useEffect(() => {
    useStore.persist.onFinishHydration(() => setIsHydrated(true));
    setIsHydrated(useStore.persist.hasHydrated());
  }, []);

  if (!isHydrated) return <LoadingSkeleton />;
  if (!profile) return <OnboardingView />;

  return (
    <ToastProvider>
      <Suspense fallback={<LoadingSkeleton />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardView />} />
            <Route path="/agenda" element={<AgendaView />} />
            <Route path="/pipeline" element={<PipelineView />} />
            <Route path="/contacts" element={<ContactsView />} />
            <Route path="/contact/:id" element={<ContactDetailView />} />
            <Route path="/kpi" element={<KpiView />} />
            <Route path="/deal/:id" element={<DealDetailView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
