import { DialogFrame } from '../ui/DialogFrame';
import { useState, useMemo } from 'react';
import { MapPin, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useToast } from '../ui/ToastContext';

const REGIONI: Record<string, string[]> = {
  "Valle d'Aosta":        ['AO'],
  'Piemonte':             ['AL','AT','BI','CN','NO','TO','VB','VC'],
  'Liguria':              ['GE','IM','SP','SV'],
  'Lombardia':            ['BG','BS','CO','CR','LC','LO','MB','MI','MN','PV','SO','VA'],
  'Trentino-Alto Adige':  ['BZ','TN'],
  'Veneto':               ['BL','PD','RO','TV','VE','VI','VR'],
  'Friuli-Venezia Giulia':['GO','PN','TS','UD'],
  'Emilia-Romagna':       ['BO','FE','FC','MO','PC','PR','RA','RE','RN'],
  'Toscana':              ['AR','FI','GR','LI','LU','MS','PI','PO','PT','SI'],
  'Umbria':               ['PG','TR'],
  'Marche':               ['AN','AP','FM','MC','PU'],
  'Lazio':                ['FR','LT','RI','RM','VT'],
  'Abruzzo':              ['AQ','CH','PE','TE'],
  'Molise':               ['CB','IS'],
  'Campania':             ['AV','BN','CE','NA','SA'],
  'Puglia':               ['BA','BR','BT','FG','LE','TA'],
  'Basilicata':           ['MT','PZ'],
  'Calabria':             ['CS','CZ','KR','RC','VV'],
  'Sicilia':              ['AG','CL','CT','EN','ME','PA','RG','SR','TP'],
  'Sardegna':             ['CA','NU','OR','SS','SU'],
};

export function PuliziaTerritorio() {
  const { contacts, deleteContactsBatch } = useStore();
  const { showToast } = useToast();

  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [expanded, setExpanded]         = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm]   = useState(false);

  // Conta prospect per provincia (solo potenziali)
  const countByProv = useMemo(() => {
    const map: Record<string, number> = {};
    Object.values(contacts).forEach(c => {
      if (c.status === 'potenziale' && c.province) {
        map[c.province] = (map[c.province] || 0) + 1;
      }
    });
    return map;
  }, [contacts]);

  const toDelete = useMemo(() =>
    Object.values(contacts).filter(
      c => c.status === 'potenziale' && selected.has(c.province || '')
    ), [contacts, selected]);

  const toggleProvince = (prov: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(prov) ? s.delete(prov) : s.add(prov); return s; });

  const toggleRegione = (reg: string) => {
    const provs = REGIONI[reg];
    const allOn = provs.every(p => selected.has(p));
    setSelected(prev => {
      const s = new Set(prev);
      allOn ? provs.forEach(p => s.delete(p)) : provs.forEach(p => s.add(p));
      return s;
    });
  };

  const toggleExpanded = (reg: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(reg) ? s.delete(reg) : s.add(reg); return s; });

  const handleDelete = () => {
    const n = toDelete.length;
    deleteContactsBatch(toDelete.map(c => c.id));
    setSelected(new Set());
    setShowConfirm(false);
    showToast(`Eliminati ${n} prospect fuori zona`, 'success');
  };

  return (
    <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-danger" />
          <h3 className="text-xs font-semibold text-muted  ">Pulizia Territorio</h3>
        </div>
        {selected.size > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger">
            {toDelete.length} prospect selezionati
          </span>
        )}
      </div>

      <p className="text-xs text-secondary dark:text-muted mb-4">
        Seleziona le province da eliminare. Vengono eliminati solo i <strong>prospect</strong>, non i clienti attivi.
      </p>

      {/* Lista regioni */}
      <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
        {Object.entries(REGIONI).map(([reg, provs]) => {
          const isOpen      = expanded.has(reg);
          const allSelected = provs.every(p => selected.has(p));
          const someSelected = provs.some(p => selected.has(p));
          const regionTotal = provs.reduce((n, p) => n + (countByProv[p] || 0), 0);

          return (
            <div key={reg} className="border border-line dark:border-line rounded-xl overflow-hidden">
              {/* Riga regione */}
              <div className="flex items-center gap-2 px-3 py-2 bg-canvas dark:bg-raised/50">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={() => toggleRegione(reg)}
                  className="accent-red-500"
                />
                <button
                  onClick={() => toggleExpanded(reg)}
                  className="flex-1 flex items-center justify-between text-left"
                >
                  <span className="text-xs font-bold text-foreground dark:text-muted">{reg}</span>
                  <div className="flex items-center gap-2">
                    {regionTotal > 0 && (
                      <span className="text-xs text-muted">{regionTotal} prospect</span>
                    )}
                    <ChevronDown size={13} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              </div>

              {/* Province */}
              {isOpen && (
                <div className="grid grid-cols-3 gap-1 p-2 bg-surface dark:bg-surface">
                  {provs.map(prov => (
                    <label
                      key={prov}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                        selected.has(prov)
                          ? 'bg-danger-soft dark:bg-danger-soft text-danger dark:text-danger font-bold'
                          : 'hover:bg-canvas dark:hover:bg-raised text-secondary dark:text-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(prov)}
                        onChange={() => toggleProvince(prov)}
                        className="accent-red-500"
                      />
                      <span className="font-mono font-bold">{prov}</span>
                      {countByProv[prov] && (
                        <span className="text-xs opacity-60">({countByProv[prov]})</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottone elimina */}
      {selected.size > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-secondary">
            {selected.size} province selezionate → <strong className="text-danger">{toDelete.length} prospect</strong> da eliminare
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-danger hover:bg-danger text-status-foreground text-sm font-bold rounded-md transition-colors"
          >
            <Trash2 size={14} />
            Elimina prospect
          </button>
        </div>
      )}

      {/* Modal conferma */}
      {showConfirm && (
        <DialogFrame className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface dark:bg-surface rounded-panel p-6 shadow-panel max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={22} className="text-danger shrink-0" />
              <h4 className="font-semibold text-foreground dark:text-foreground">Conferma eliminazione</h4>
            </div>
            <p className="text-sm text-secondary dark:text-muted mb-1">
              Stai per eliminare <strong>{toDelete.length} prospect</strong> nelle province selezionate.
            </p>
            <p className="text-xs text-danger mb-5">Questa azione non è reversibile.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 border border-line dark:border-line rounded-md text-sm font-bold text-secondary dark:text-muted hover:bg-canvas dark:hover:bg-raised"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-danger hover:bg-danger text-status-foreground text-sm font-bold rounded-md"
              >
                Sì, elimina
              </button>
            </div>
          </div>
        </DialogFrame>
      )}
    </div>
  );
}
