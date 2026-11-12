import { useEffect, useState } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import { colRef } from '../../lib/paths';
import { useWorkspace } from '../../lib/workspaceContext';
import { NAV_SECTIONS, getSection, type SectionId } from '../../lib/navSections';
import { usageMonth } from '../../lib/usageCounter';

interface CounterDoc { section: SectionId; tab: string; month: string; count: number }

/** Ultimi `n` mesi in formato AAAA-MM, dal più vecchio al corrente. */
function lastMonths(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => usageMonth(new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)));
}

const MONTH_LABEL = (m: string) =>
  new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });

/**
 * Uso delle sezioni (contatore anonimo delle aperture), visibile solo a titolare e
 * amministratori: righe = voci del menu con il dettaglio per scheda, colonne = ultimi 3 mesi.
 */
export function UsageTable() {
  const { role } = useWorkspace();
  const canSee = role === 'owner' || role === 'admin';
  const months = lastMonths(3);
  const [rows, setRows] = useState<CounterDoc[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canSee) return;
    let cancelled = false;
    try {
      getDocs(query(colRef('usage_counters'), where('month', 'in', months)))
        .then(snap => { if (!cancelled) setRows(snap.docs.map(d => d.data() as CounterDoc)); })
        .catch(() => { if (!cancelled) setError(true); });
    } catch {
      setError(true); // spazio di lavoro non ancora pronto
    }
    return () => { cancelled = true; };
  }, [canSee, months.join()]);

  if (!canSee) return null;

  const count = (tab: string | null, section: SectionId, month: string) =>
    (rows ?? []).filter(r => r.month === month && r.section === section && (tab === null || r.tab === tab)).reduce((s, r) => s + r.count, 0);

  return (
    <section className="bg-surface dark:bg-surface rounded-panel border border-line dark:border-line p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-foreground">Uso delle sezioni</h3>
        <p className="text-xs text-muted">Aperture per sezione dello spazio aziendale, senza dati su chi le ha aperte. Visibile solo a titolare e amministratori.</p>
      </div>
      {error ? (
        <p className="text-sm text-danger">Dati non disponibili. Riprova più tardi.</p>
      ) : rows === null ? (
        <p className="text-sm text-muted">Caricamento…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted text-left">
                <th className="py-2 pr-3 font-semibold">Sezione</th>
                {months.map(m => <th key={m} className="py-2 px-2 text-right font-semibold">{MONTH_LABEL(m)}</th>)}
              </tr>
            </thead>
            <tbody>
              {NAV_SECTIONS.map(s => (
                <SectionRows key={s.id} id={s.id} months={months} count={count} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SectionRows({ id, months, count }: { id: SectionId; months: string[]; count: (tab: string | null, s: SectionId, m: string) => number }) {
  const section = getSection(id);
  return (
    <>
      <tr className="border-t border-line">
        <td className="py-2 pr-3 font-semibold text-foreground">{section.label}</td>
        {months.map(m => <td key={m} className="py-2 px-2 text-right font-semibold tabular-nums">{count(null, id, m)}</td>)}
      </tr>
      {section.tabs.length > 1 && section.tabs.map(t => (
        <tr key={t.view}>
          <td className="py-1 pr-3 pl-4 text-xs text-muted">{t.label}</td>
          {months.map(m => <td key={m} className="py-1 px-2 text-right text-xs text-muted tabular-nums">{count(t.view, id, m)}</td>)}
        </tr>
      ))}
    </>
  );
}
