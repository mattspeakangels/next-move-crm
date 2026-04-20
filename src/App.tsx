import { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { AppShell } from './components/layouts/AppShell'; // CORRETTO: layouts con la S
import { ToastProvider } from './components/ui/ToastContext';
import { OnboardingView } from './views/OnboardingView';

import { DashboardView } from './views/DashboardView';
import { AgendaView } from './views/AgendaView';
import { PipelineView } from './views/PipelineView';
import { ContactsView } from './views/ContactsView';
import { KPIView } from './views/KPIView';
import { SettingsView } from './views/SettingsView';
import { DealDetailView } from './views/DealDetailView';

const LoadingSkeleton = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const profile = useStore(state => state.profile);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) return <LoadingSkeleton />;

  if (!profile) {
    return (
      <ToastProvider>
        <Routes>
          <Route path="/onboarding" element={<OnboardingView />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Suspense fallback={<LoadingSkeleton />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardView />} />
            <Route path="/agenda" element={<AgendaView />} />
            <Route path="/pipeline" element={<PipelineView />} />
            <Route path="/contacts" element={<ContactsView />} />
            <Route path="/kpi" element={<KPIView />} />
            <Route path="/deal/:id" element={<DealDetailView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
