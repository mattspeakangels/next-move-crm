import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchDropdownItem<T> {
  key: string;
  item: T;
  label: string;
  sublabel?: string;
  badge?: { text: string; className: string };
}

interface SearchDropdownProps<T> {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
  results: SearchDropdownItem<T>[];
  /** Mostrato nell'header del dropdown quando il campo è vuoto ma showWhenEmpty è true */
  totalCount?: number;
  placeholder: string;
  autoFocus?: boolean;
  /** Apre il dropdown anche a campo vuoto (mostra i primi risultati/tutta la lista) */
  showWhenEmpty?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  className?: string;
  /** Classi della riga input (icona+input+clear), riceve lo stato open per gestire il bordo attivo */
  inputWrapperClassName?: (open: boolean) => string;
  /** Classi extra sul contenitore del dropdown (utile per z-index custom su mappe/modali) */
  dropdownClassName?: string;
}

const defaultInputWrapperClassName = (open: boolean) =>
  `flex items-center gap-2 bg-white dark:bg-gray-800 border-2 rounded-2xl px-4 py-3 transition-colors ${
    open ? 'border-indigo-400' : 'border-gray-100 dark:border-gray-700'
  }`;

export function SearchDropdown<T>({
  value,
  onChange,
  onSelect,
  results,
  totalCount,
  placeholder,
  autoFocus,
  showWhenEmpty = false,
  emptyTitle = '🔍 Nessun risultato',
  emptySubtitle = 'Prova con un termine diverso',
  className = '',
  inputWrapperClassName = defaultInputWrapperClassName,
  dropdownClassName = '',
}: SearchDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const q = value.toLowerCase().trim();
  const isVisible = open && (q.length > 0 || showWhenEmpty);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={inputWrapperClassName(open)}>
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          autoFocus={autoFocus}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm dark:text-white placeholder-gray-400 font-bold min-w-0"
        />
        {value && (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onChange(''); setOpen(true); }}
            className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isVisible && (
        <div className={`absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-gray-600 rounded-2xl shadow-2xl overflow-hidden ${dropdownClassName}`}>
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
              {q
                ? `${results.length} risultat${results.length === 1 ? 'o' : 'i'}`
                : totalCount !== undefined ? `${totalCount} totali` : ''}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-black text-gray-300">{emptyTitle}</p>
                <p className="text-[11px] text-gray-400 mt-1">{emptySubtitle}</p>
              </div>
            ) : results.map(r => {
              const label = r.label;
              const hiIdx = q ? label.toLowerCase().indexOf(q) : -1;
              return (
                <button
                  key={r.key}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { onSelect(r.item); setOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-black dark:text-white truncate">
                      {hiIdx >= 0 ? (
                        <>
                          {label.slice(0, hiIdx)}
                          <mark className="bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200 rounded px-0.5 not-italic">{label.slice(hiIdx, hiIdx + q.length)}</mark>
                          {label.slice(hiIdx + q.length)}
                        </>
                      ) : label}
                    </p>
                    {r.sublabel && <p className="text-[11px] text-gray-400 truncate">{r.sublabel}</p>}
                  </div>
                  {r.badge && (
                    <span className={`flex-shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.badge.className}`}>
                      {r.badge.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
