import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { canManage } from '../../lib/workspace';
import { useWorkspace } from '../../lib/workspaceContext';
import { useStore } from '../../store/useStore';

interface Report { generatedAt: number; generatedBy: string; activeDeals: number; overdue: number; dueSoon: number; withoutNextAction: number; sharedActivities: number }

export function OperationalReport() {
  const { workspace, role, uid } = useWorkspace();
  const { deals, activities } = useStore();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const allowed = canManage(role);
  useEffect(() => {
    setReport(null); setError('');
    if (!workspace || !allowed) return;
    return onSnapshot(doc(db, 'workspaces', workspace.id, 'operationalReports', 'current'), snapshot => setReport(snapshot.exists() ? snapshot.data() as Report : null), () => setError('Impossibile leggere il report. Controlla i permessi e la connessione.'));
  }, [workspace?.id, allowed]);
  if (!allowed || !workspace) return null;
  const refresh = async () => {
    const now = Date.now();
    const active = Object.values(deals).filter(deal => !['chiuso-vinto','chiuso-perso'].includes(deal.stage));
    const data: Report = { generatedAt: now, generatedBy: uid, activeDeals: active.length, overdue: active.filter(d => !!d.nextAction?.trim() && d.nextActionDeadline > 0 && d.nextActionDeadline < now).length, dueSoon: active.filter(d => !!d.nextAction?.trim() && d.nextActionDeadline >= now && d.nextActionDeadline <= now + 7 * 86400000).length, withoutNextAction: active.filter(d => !d.nextAction?.trim()).length, sharedActivities: Object.keys(activities).length };
    setSaving(true); setError('');
    try { await setDoc(doc(db, 'workspaces', workspace.id, 'operationalReports', 'current'), data); }
    catch { setError('Report non salvato: controlla i permessi e la connessione.'); }
    finally { setSaving(false); }
  };
  return <section className="bg-surface border border-line rounded-panel p-5 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Operatività · amministrazione</h2><p className="text-sm text-muted">Report riservato a owner e admin; il riepilogo usa opportunità e attività condivise.</p></div><button type="button" disabled={saving} onClick={refresh} className="bg-accent text-white rounded-md px-3 py-2 disabled:opacity-50">{saving ? 'Aggiornamento…' : 'Aggiorna report'}</button></div>
    <p className="text-xs text-muted">I dati commerciali di origine restano accessibili ai membri autorizzati. Le attività personali, i carichi per collega e le email non sono inclusi: il report non misura la produttività individuale.</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
    {!report ? <p className="text-sm text-muted">Nessun report salvato. Premi Aggiorna report per calcolarlo.</p> : <><p className="text-xs text-muted">Aggiornato il {new Date(report.generatedAt).toLocaleString('it-IT')}</p><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{([['Opportunità attive',report.activeDeals], ['Azioni scadute',report.overdue], ['Entro 7 giorni',report.dueSoon], ['Senza prossimo passo',report.withoutNextAction], ['Attività condivise',report.sharedActivities]] as const).map(([label,value]) => <div key={label} className="border border-line rounded-md p-3"><p className="text-xs text-muted">{label}</p><p className="font-semibold text-lg">{value}</p></div>)}</div></>}
  </section>;
}
