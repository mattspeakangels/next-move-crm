import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/ToastContext';
import { OnboardingView } from './views/OnboardingView';

// Importazione delle viste
import { DashboardView } from './views/DashboardView';
import { AgendaView } from './views/AgendaView';
import { PipelineView } from './views/PipelineView';
import { ContactsView } from './views/ContactsView';
import { KPIView } from './views/KPIView';
import { SettingsView } from './views/SettingsView';
import { DealDetailView } from './views/DealDetailView';

const LoadingSkeleton = () => (
  <div className="animate-pulse p-4 space-y-4 h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center">
    <div className="h-12 w-12 bg-indigo-200 dark:bg-indigo-900 rounded-full mb-4"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
  </div>
);

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const profile = useStore(state => state.profile);

  useEffect(() => {
    // Forza il caricamento dei dati dal localStorage
    const hydrate = async () => {
      setIsHydrated(true);
    };
    hydrate();
  }, []);

  if (!isHydrated) return <LoadingSkeleton />;

  // Se non c'è il profilo, mostra l'onboarding
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
            {/* Fallback per rotte non esistenti */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
