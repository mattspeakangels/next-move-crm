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
    <header className="bg-white dark:bg-gray-900 md:bg-transparent md:dark:bg-transparent px-4 py-4 md:px-8 md:py-6 flex justify-between items-center z-20 transition-colors">
      {/* Burger — solo mobile */}
      <button
        onClick={onBurgerClick}
        className="md:hidden p-2 -ml-1 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Apri menu"
      >
        <Menu size={24} />
      </button>

      {/* Titolo — desktop */}
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Next Move</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{today}</p>
      </div>

      {/* Data — mobile, centrata */}
      <div className="md:hidden flex-1 text-center">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 capitalize">{today}</p>
      </div>

      {/* Azioni destra */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white w-10 h-10 rounded-full flex justify-center items-center shadow-lg transition-all"
        >
          <Plus size={20} />
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 overflow-hidden animate-fade-in z-50">
            <button onClick={() => { setIsMenuOpen(false); navigate('/pipeline'); }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <FileText size={16} /> Nuovo Deal
            </button>
            <button onClick={() => { setIsMenuOpen(false); navigate('/contacts'); }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <UserPlus size={16} /> Nuovo Contatto
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
