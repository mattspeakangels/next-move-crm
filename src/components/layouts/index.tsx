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
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark bg-canvas' : 'bg-canvas'}`}>
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-surface dark:bg-surface border-r border-line dark:border-line hidden md:flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-action rounded-panel flex items-center justify-center text-action-foreground font-semibold italic shadow-panel shadow-panel">
              N
            </div>
            <span className="font-semibold text-xl tracking-normal dark:text-foreground uppercase">SYRIO</span>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-panel font-bold transition-all ${
                  currentView === item.id
                    ? 'bg-action text-action-foreground shadow-panel shadow-panel'
                    : 'text-muted hover:bg-canvas dark:hover:bg-raised'
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface dark:bg-surface border-t border-line p-2 flex justify-around items-center z-40">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`p-3 rounded-xl transition-colors ${
              currentView === item.id ? 'text-accent bg-accent-soft dark:bg-accent-soft/20' : 'text-muted'
            }`}
          >
            <item.icon size={20} />
          </button>
        ))}
      </nav>
    </div>
  );
};
