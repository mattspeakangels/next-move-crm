import type { NavView } from '../../types';
import { getSection, sectionOf, tabsFor } from '../../lib/navSections';

/** Schede della voce di menu corrente (es. Opportunità: Pipeline · Offerte · Catalogo). */
export function SectionTabs({ currentView, role, onSelect }: { currentView: NavView; role: string | null; onSelect: (view: NavView) => void }) {
  const section = getSection(sectionOf(currentView));
  // Solo le schede permesse alla mansione
  const tabs = tabsFor(section.id, role);
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label={section.label} className="section-tabs flex gap-1 mb-4 overflow-x-auto no-scrollbar">
      {tabs.map(tab => {
        const active = tab.view === currentView;
        return (
          <button
            key={tab.view}
            role="tab"
            aria-selected={active}
            onClick={() => { if (!active) onSelect(tab.view); }}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${active ? 'bg-accent-soft text-accent' : 'text-muted hover:text-foreground hover:bg-raised'}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
