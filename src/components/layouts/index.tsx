import React from 'react';
import { LayoutDashboard, Users, Briefcase, Calendar, Settings, Package } from 'lucide-react';
import { useStore } from '../../store/useStore'; // Nota i due punti ../../ perché siamo in una sottocartella

type View = 'dashboard' | 'contacts' | 'deals' | 'agenda' | 'products' | 'settings';

interface Props {
  children: React.ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
}

export const Layout: React.FC<Props> = ({ children, currentView, onNavigate }) => {
  const { profile } = useStore();

  const menuItems: { id: View; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contacts', label: 'Aziende', icon: Users },
    { id: 'deals', label: 'Pipeline', icon: Briefcase },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'products', label: 'Catalogo', icon: Package },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 bg-white dark:bg-gray-900 border-r dark:border-gray-800 flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <span className="text-white font-black text-xl">{profile?.company?.[0] || 'N'}</span>
            </div>
            <span className="font-black text-2xl tracking-tighter dark:text-white">Next Move</span>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${
                  currentView === item.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none'
                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600'
                }`}
              >
                <item.icon size={22} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative">
        <div className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t dark:border-gray-800 px-6 py-4 flex justify-between items-center z-40">
          {menuItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`p-2 rounded-xl transition-all ${
                currentView === item.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400'
              }`}
            >
              <item.icon size={24} />
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
};
