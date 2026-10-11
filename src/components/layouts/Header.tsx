import React, { useState, useRef, useEffect } from 'react';
import { Plus, FileText, UserPlus, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onBurgerClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onBurgerClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <header className="bg-surface dark:bg-canvas md:bg-transparent md:dark:bg-transparent px-4 py-4 md:px-8 md:py-6 flex justify-between items-center z-20 transition-colors">
      {/* Burger — solo mobile */}
      <button
        onClick={onBurgerClick}
        className="md:hidden p-2 -ml-1 rounded-md text-secondary dark:text-muted hover:bg-raised dark:hover:bg-surface transition-colors"
        aria-label="Apri menu"
      >
        <Menu size={24} />
      </button>

      {/* Titolo — desktop */}
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold text-foreground dark:text-foreground">SYRIO</h1>
        <p className="text-sm text-secondary dark:text-muted capitalize">{today}</p>
      </div>

      {/* Data — mobile, centrata */}
      <div className="md:hidden flex-1 text-center">
        <p className="text-xs font-bold text-muted dark:text-secondary capitalize">{today}</p>
      </div>

      {/* Azioni destra */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-action hover:bg-action-hover active:scale-95 text-action-foreground w-10 h-10 rounded-full flex justify-center items-center shadow-panel transition-all"
        >
          <Plus size={20} />
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-surface dark:bg-surface rounded-md shadow-panel border border-line dark:border-line py-1 overflow-hidden animate-fade-in z-50">
            <button onClick={() => { setIsMenuOpen(false); navigate('/pipeline'); }}
              className="w-full text-left px-4 py-3 text-sm text-foreground dark:text-muted hover:bg-accent-soft dark:hover:bg-raised flex items-center gap-2">
              <FileText size={16} /> Nuovo Deal
            </button>
            <button onClick={() => { setIsMenuOpen(false); navigate('/contacts'); }}
              className="w-full text-left px-4 py-3 text-sm text-foreground dark:text-muted hover:bg-accent-soft dark:hover:bg-raised flex items-center gap-2">
              <UserPlus size={16} /> Nuovo Contatto
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
