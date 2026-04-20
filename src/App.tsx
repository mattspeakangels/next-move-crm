import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-indigo-600 animate-pulse">Caricamento CRM...</p>
    </div>
  </div>
);

export default function App() {
  const profile = useStore(state => state.profile);
  const hasHydrated = useStore(state => state._hasHydrated); // Controlla il semaforo

  // Se la memoria non è ancora pronta, non decidere nulla, mostra il caricamento
  if (!hasHydrated) return <LoadingSkeleton />;

  // Ora che la memoria è pronta, se il profilo manca vai all'onboarding
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

  // Se il profilo c'è, entra nell'app
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
