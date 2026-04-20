import React, { useState, useRef, useEffect } from 'react';
import { Plus, Settings, FileText, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Next Move</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{today}</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')} className="hidden md:flex p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          <Settings size={20} />
        </button>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="bg-indigo-600 text-white w-10 h-10 rounded-full flex justify-center items-center shadow-lg">
            <Plus size={20} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 overflow-hidden animate-fade-in">
              <button onClick={() => { setIsMenuOpen(false); navigate('/pipeline'); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <FileText size={16} /> Nuovo Deal
              </button>
              <button onClick={() => { setIsMenuOpen(false); navigate('/contacts'); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <UserPlus size={16} /> Nuovo Contatto
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
