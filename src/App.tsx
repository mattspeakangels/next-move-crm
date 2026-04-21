import { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { AppShell } from './components/layouts/AppShell';
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
  <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-[9999]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-indigo-600">Verifica profilo in corso...</p>
    </div>
  </div>
);

export default function App() {
  const profile = useStore(state => state.profile);
  const hasHydrated = useStore(state => state._hasHydrated);
  const location = useLocation();

  // Finché non ha caricato la memoria, non mostrare nulla se non lo spinner
  if (!hasHydrated) return <LoadingSkeleton />;

  // Se siamo a posto e il profilo c'è, ma siamo ancora sull'onboarding, vai in home
  if (profile && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  // Se il profilo manca, obbliga all'onboarding
  if (!profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <ToastProvider>
      <Suspense fallback={<LoadingSkeleton />}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingView />} />
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
