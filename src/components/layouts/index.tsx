import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Package, 
  Settings, 
  FileText 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { NavView } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: NavView;
  onNavigate: (view: NavView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const { theme } = useStore();

  const menuItems: { id: NavView; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contacts', label: 'Aziende', icon: Users },
    { id: 'offers', label: 'Offerte', icon: FileText },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'products', label: 'Catalogo', icon: Package },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 hidden md:flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-200">
              N
            </div>
            <span className="font-black text-xl tracking-tighter dark:text-white uppercase">Next Move</span>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all ${
                  currentView === item.id
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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
      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 p-2 flex justify-around items-center z-40">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`p-3 rounded-xl transition-colors ${
              currentView === item.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-400'
            }`}
          >
            <item.icon size={20} />
          </button>
        ))}
      </nav>
    </div>
  );
};
