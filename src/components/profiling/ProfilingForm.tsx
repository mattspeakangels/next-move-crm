import React, { useState, useCallback } from 'react';
import {
  ClipboardList, ChevronDown, ChevronUp, FileText, FileSpreadsheet,
  Info, Star, AlertCircle, CheckSquare, Package, Target, Users, ArrowRight
} from 'lucide-react';
import type {
  Contact, DealerProfiling, EndUserProfiling, ProfilingData,
  QualificationCriteria, QualificationScore, BlakladerBrand
} from '../../types';
import { useStore } from '../../store/useStore';
import { exportProfilingPDF, exportProfilingXLS, calcQualBadge, calcQualTotal } from '../../utils/profilingExport';

// ─── Constants ───────────────────────────────────────────────────────────────

const BRANDS: BlakladerBrand[] = [
  'Diadora', 'U-Power', 'Snickers', 'E.Strauss', 'Cofra', 'Kapriol',
  'Sparco', 'Mascot', 'Fristads', 'Portwest', 'Clique', 'Helly Hansen', 'Altro'
];

const DEALER_PAIN_POINTS = [
  'Resi / difetti cucitura fornitore attuale',
  'Mancanza DPI Cat. III',
  'No supporto formativo ai venditori',
  'Margini insufficienti',
  'Gestione riordino macchinosa',
  'Nessun portale B2B',
  'No Brand premium riconoscibile',
  'Clienti finali chiedono qualità superiore',
  'Concorrenti zona trattano stesso brand',
];

const ENDUSER_PAIN_POINTS = [
  'Capi si rompono/logorano troppo presto',
  'Reclami RSPP su DPI non conformi',
  'Gestione taglie caotica',
  'Nessun controllo TCO/spesa reale',
  'Fornitore inaffidabile su consegne',
  'No logo / immagine coordinata',
  'Ispezione INAIL/ASL recente',
  'Cambio DVR imminente',
  'Nuovo cantiere / commessa PNRR',
];

const DEALER_PRODOTTI = [
  'Pantaloni 1990 X1900 (bestseller)',
  'Multinorma / Antifiamma (Cat. III)',
  'Alta Visibilità Cl.2-3',
  'Scarpe Elite / Striker (1970)',
  'Softshell 4491',
  'Linea Donna / Premaman',
  'Guanti tecnici',
  'B2B Webshop demo',
  'Gamma freddo (3 strati)',
  'Linea Service',
];

const ENDUSER_PRODOTTI = [
  'Pantaloni 1990 X1900',
  'Multinorma / Antifiamma (Cat. III)',
  'Alta Visibilità Cl.2-3',
  'Scarpe Elite / Striker',
  'Giacca Softshell 4491',
  'Linea Freddo (3 strati)',
  'Guanti tecnici Cat. III',
  'B2B Webshop demo',
  'Schede EN per DVR RSPP',
  'Linea Donna / Premaman',
  'Personalizzazione logo',
];

const DEALER_NEXT_STEP = [
  'Email entro 24h con scheda tecnica / campionatura',
  'Demo B2B Webshop',
  'Visita formazione venditori',
  'Proposta commerciale',
  'Co-presenza fiera / evento',
  'Archivia',
];

const ENDUSER_NEXT_STEP = [
  'Campionatura 30 giorni su cantiere',
  'Riunione RSPP + Acquisti',
  'Schede EN per DVR',
  'Demo Webshop B2B',
  'Proposta commerciale',
  'Calcolo TCO condiviso',
  'Archivia',
];

// Tooltips dalla Guida Intervista
const TIPS: Record<string, string> = {
  brandAttuali: 'Non nominare mai Blaklader in questa fase — lascia che parlino prima.',
  brandDominante: 'Identifica il benchmark con cui ti confronteranno. Se citano Snickers o Mascot, sai esattamente cosa battere.',
  dpiCatIII: 'Questo è il gap assoluto di TUTTI i competitor. È l\'apertura perfetta per Blaklader.',
  painPoints: 'Lascia che emergano naturalmente. Non suggerire tu i problemi: aspetta che li nomino loro.',
  fraseEsatta: 'Annota le parole esatte: serviranno nella proposta per rispecchiare il linguaggio del cliente.',
  qualificazione: '≥20/25 = HOT (priorità assoluta) · 15-19 = WARM · 10-14 = COLD · <10 = TRASH',
  rischiSpecifici: 'I rischi specifici determinano le norme EN obbligatorie. Blaklader copre multinorma dove i competitor non arrivano.',
  dvrAggiornato: 'DVR non aggiornato o ispezione recente = urgenza reale. È il trigger di cambio più potente.',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultDealer(): DealerProfiling {
  return {
    type: 'dealer', dataVisita: new Date().toISOString().split('T')[0],
    segmento: '', numDipendenti: '', fatturatoEst: '',
    canaleVendita: [], modelloOrdini: [], clienteFinale: [], percWorkwear: '',
    brandAttuali: [], brandAltro: '', brandDominante: '', dpiCatIII: '',
    dpiParziale: '', reclamiResi: '', reclamiMotivo: '', processoRiordino: [],
    painPoints: [], painAltro: '', painPrioritario: '', fraseEsatta: '',
    prodottiInteresse: [], prodottiAltro: '', campionaturaLasciata: '',
    qualificazione: { esigenzaReale: 1, decisionMaker: 1, aperturaFornitore: 1, timeline: 1, budget: 1 },
    noteQualificazione: '',
    competitor: [],
    nextStepAzioni: [], nextStepData: '', nextStepNote: '',
  };
}

function defaultEndUser(): EndUserProfiling {
  return {
    type: 'end-user', dataVisita: new Date().toISOString().split('T')[0],
    rsppNome: '', respAcquisti: '',
    segmentoEdilizia: '', segmentoIndustria: '',
    numDipendentiTotali: '', numDipendentiDPI: '', fatturatoStimato: '',
    certificazioni: [], obiettiviESG: '',
    livelloDPI: '', rischiSpecifici: [], dvrAggiornato: '', ispezioniRecenti: '',
    ispezioniEsito: '', schedeEN: '',
    fornitoreAttuale: '', canaleAcquisto: [], frequenzaRinnovo: '',
    durataMediaCapo: '', spesaDipAnno: '', lamenteleLavoratori: '',
    chiGestisceLogistica: [],
    painPoints: [], painAltro: '', painPrioritario: '', fraseEsatta: '',
    tcoCostoCapo: '', tcoDurataMesi: '', tcoNumDipendenti: '',
    tcoCostoFlotta: '', tcoNote: '',
    prodottiInteresse: [], prodottiAltro: '', campionaturaLasciata: '',
    qualificazione: { esigenzaReale: 1, decisionMaker: 1, aperturaFornitore: 1, timeline: 1, budget: 1 },
    noteQualificazione: '',
    nextStepAzioni: [], nextStepData: '', nextStepNote: '',
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const Tip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <button type="button" onClick={() => setShow(s => !s)}
        className="text-indigo-400 hover:text-indigo-600 transition-colors">
        <Info size={12} />
      </button>
      {show && (
        <div className="absolute z-50 left-0 top-5 w-64 bg-indigo-900 text-white text-[10px] font-bold p-3 rounded-xl shadow-xl leading-relaxed">
          {text}
          <button onClick={() => setShow(false)} className="block mt-2 text-indigo-300 hover:text-white">Chiudi</button>
        </div>
      )}
    </div>
  );
};

const CheckGroup: React.FC<{
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  cols?: number;
}> = ({ options, selected, onChange, cols = 2 }) => (
  <div className={`grid grid-cols-${cols} gap-1.5`}>
    {options.map(opt => {
      const active = selected.includes(opt);
      return (
        <label key={opt} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer text-[10px] font-bold border-2 transition-all
          ${active ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
            : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-200'}`}>
          <input type="checkbox" className="sr-only" checked={active}
            onChange={() => onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])} />
          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0
            ${active ? 'bg-indigo-500' : 'border-2 border-gray-300 dark:border-gray-600'}`}>
            {active && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
          </div>
          {opt}
        </label>
      );
    })}
  </div>
);

const RadioGroup: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => (
      <button key={opt.value} type="button"
        onClick={() => onChange(opt.value)}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border-2 transition-all
          ${value === opt.value
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
            : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-indigo-200'}`}>
        {opt.label}
      </button>
    ))}
  </div>
);

const ScoreRow: React.FC<{
  label: string;
  value: QualificationScore;
  onChange: (v: QualificationScore) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex-1">{label}</span>
    <div className="flex gap-1">
      {([1,2,3,4,5] as QualificationScore[]).map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-7 h-7 rounded-lg text-xs font-black border-2 transition-all
            ${value >= n
              ? 'border-indigo-400 bg-indigo-500 text-white'
              : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-indigo-300'}`}>
          {n}
        </button>
      ))}
    </div>
  </div>
);

const TextField: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; tip?: string;
}> = ({ label, value, onChange, placeholder, multiline, tip }) => (
  <div>
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
      {label}{tip && <Tip text={tip} />}
    </label>
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-3 text-sm font-bold dark:text-white outline-none resize-none min-h-[72px] focus:border-indigo-400" />
      : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
    }
  </div>
);

const BADGE_STYLE: Record<string, string> = {
  HOT: 'bg-red-500 text-white',
  WARM: 'bg-amber-400 text-white',
  COLD: 'bg-green-500 text-white',
  TRASH: 'bg-gray-400 text-white',
};

// ─── Section (defined outside ProfilingForm to prevent remount on state change) ─

const Section: React.FC<{ open: boolean; onToggle: () => void; title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ open, onToggle, title, icon, children }) => (
  <div className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <span className="flex items-center gap-2 text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">
        {icon} {title}
      </span>
      {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
    </button>
    {open && <div className="p-4 space-y-4 bg-white dark:bg-gray-900">{children}</div>}
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

interface ProfilingFormProps {
  contact: Contact;
}

export const ProfilingForm: React.FC<ProfilingFormProps> = ({ contact }) => {
  const { updateContact } = useStore();
  const isDealer = contact.customerType === 'dealer' || contact.segment === 'dealer';

  const [form, setForm] = useState<ProfilingData>(() => {
    if (contact.profiling) return contact.profiling;
    return isDealer ? defaultDealer() : defaultEndUser();
  });

  const [saved, setSaved] = useState(false);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0,1,2,3,4,5,6,7,8]));

  const toggleSection = (n: number) => setOpenSections(s => {
    const ns = new Set(s);
    ns.has(n) ? ns.delete(n) : ns.add(n);
    return ns;
  });

  const upD = useCallback((patch: Partial<DealerProfiling>) => {
    setForm(f => ({ ...f, ...patch } as ProfilingData));
    setSaved(false);
  }, []);

  const upE = useCallback((patch: Partial<EndUserProfiling>) => {
    setForm(f => ({ ...f, ...patch } as ProfilingData));
    setSaved(false);
  }, []);

  const handleSave = () => {
    updateContact(contact.id, { profiling: form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const badge = calcQualBadge(form.qualificazione);
  const total = calcQualTotal(form.qualificazione);


  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-indigo-600" />
          <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Profilazione {isDealer ? 'Dealer' : 'End User'}
          </span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${BADGE_STYLE[badge]}`}>
            {badge} · {total}/25
          </span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => exportProfilingPDF(contact, form)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-[10px] font-black uppercase tracking-wide hover:bg-red-100 transition-all">
            <FileText size={12} /> PDF
          </button>
          <button type="button" onClick={() => exportProfilingXLS(contact, form)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 text-[10px] font-black uppercase tracking-wide hover:bg-green-100 transition-all">
            <FileSpreadsheet size={12} /> XLS
          </button>
          <button type="button" onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all
              ${saved ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
            {saved ? '✓ Salvato' : 'Salva'}
          </button>
        </div>
      </div>

      {/* Data visita */}
      <div className="flex items-center gap-3 px-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Visita</label>
        <input type="date" value={form.dataVisita}
          onChange={e => isDealer ? upD({ dataVisita: e.target.value }) : upE({ dataVisita: e.target.value })}
          className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-3 py-1.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
      </div>

      {/* ─── DEALER FORM ─── */}
      {isDealer && (form as DealerProfiling) && (() => {
        const d = form as DealerProfiling;
        return (
          <div className="space-y-3">
            <Section open={openSections.has(0)} onToggle={() => toggleSection(0)} title="1. Profilo Rivenditore" icon={<Users size={13} />}>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Segmento</p>
                <RadioGroup value={d.segmento} onChange={v => upD({ segmento: v as any })} options={[
                  { value: 'A1', label: 'A1 · Grossista' },
                  { value: 'A2', label: 'A2 · Safety Specialist' },
                  { value: 'A3', label: 'A3 · Ferramenta Storica' },
                  { value: 'A4', label: 'A4 · Ticino Premium' },
                ]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="N° Dipendenti" value={d.numDipendenti} onChange={v => upD({ numDipendenti: v })} placeholder="es. 12" />
                <TextField label="Fatturato est." value={d.fatturatoEst} onChange={v => upD({ fatturatoEst: v })} placeholder="es. €2M" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Canale Vendita</p>
                <CheckGroup cols={2} options={['Solo retail B2C', 'Prevalenza B2B', 'Misto', 'Grossista / cooperative']}
                  selected={d.canaleVendita} onChange={v => upD({ canaleVendita: v })} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Modello Ordini</p>
                <CheckGroup cols={2} options={['Solo negozio', 'Venditori esterni B2B', 'E-commerce', 'Portale ordini B2B']}
                  selected={d.modelloOrdini} onChange={v => upD({ modelloOrdini: v })} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cliente Finale</p>
                <CheckGroup cols={2} options={['Artigiani autonomi', 'Imprese edili', 'Industria', 'Facility management', 'Misto']}
                  selected={d.clienteFinale} onChange={v => upD({ clienteFinale: v })} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">% Workwear su Fatturato</p>
                <RadioGroup value={d.percWorkwear} onChange={v => upD({ percWorkwear: v })} options={[
                  { value: '<5%', label: '<5%' },
                  { value: '5-15%', label: '5-15%' },
                  { value: '15-30%', label: '15-30%' },
                  { value: '>30%', label: '>30%' },
                  { value: 'Non dichiarato', label: 'N.D.' },
                ]} />
              </div>
            </Section>

            <Section open={openSections.has(1)} onToggle={() => toggleSection(1)} title="2. Fornitore Attuale & Brand Trattati" icon={<AlertCircle size={13} />}>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  Brand Workwear Attuali <Tip text={TIPS.brandAttuali} />
                </p>
                <CheckGroup cols={2} options={BRANDS.filter(b => b !== 'Altro')}
                  selected={d.brandAttuali} onChange={v => upD({ brandAttuali: v as BlakladerBrand[] })} />
                {d.brandAttuali.includes('Altro') && (
                  <input type="text" placeholder="Specifica brand..." value={d.brandAltro}
                    onChange={e => upD({ brandAltro: e.target.value })}
                    className="mt-2 w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
                )}
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                  Brand Dominante (rotazione) <Tip text={TIPS.brandDominante} />
                </label>
                <select value={d.brandDominante} onChange={e => upD({ brandDominante: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400">
                  <option value="">— Seleziona —</option>
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  DPI Cat. III Trattati <Tip text={TIPS.dpiCatIII} />
                </p>
                <RadioGroup value={d.dpiCatIII} onChange={v => upD({ dpiCatIII: v as any })} options={[
                  { value: 'no', label: 'No — gap totale' },
                  { value: 'soloScarpe', label: 'Solo scarpe' },
                  { value: 'siParziale', label: 'Sì parziale' },
                  { value: 'siCompleto', label: 'Sì completo' },
                ]} />
                {d.dpiCatIII === 'siParziale' && (
                  <input type="text" placeholder="Quali prodotti..." value={d.dpiParziale}
                    onChange={e => upD({ dpiParziale: e.target.value })}
                    className="mt-2 w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reclami / Resi Frequenti</p>
                <RadioGroup value={d.reclamiResi} onChange={v => upD({ reclamiResi: v as any })} options={[
                  { value: 'no', label: 'No' }, { value: 'si', label: 'Sì' },
                ]} />
                {d.reclamiResi === 'si' && (
                  <input type="text" placeholder="Motivo principale..." value={d.reclamiMotivo}
                    onChange={e => upD({ reclamiMotivo: e.target.value })}
                    className="mt-2 w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Processo Riordino</p>
                <CheckGroup cols={2} options={['Agente fisico', 'Email / Tel', 'Portale B2B', 'EDI / ERP', 'App']}
                  selected={d.processoRiordino} onChange={v => upD({ processoRiordino: v })} />
              </div>
            </Section>

            <Section open={openSections.has(2)} onToggle={() => toggleSection(2)} title="3. Pain Points Emersi" icon={<AlertCircle size={13} />}>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  Seleziona i pain points <Tip text={TIPS.painPoints} />
                </p>
                <CheckGroup cols={1} options={DEALER_PAIN_POINTS} selected={d.painPoints} onChange={v => upD({ painPoints: v })} />
                <input type="text" placeholder="Altro pain point..." value={d.painAltro}
                  onChange={e => upD({ painAltro: e.target.value })}
                  className="mt-2 w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
              </div>
              <TextField label="Pain Prioritario #1" value={d.painPrioritario} onChange={v => upD({ painPrioritario: v })}
                placeholder="Il problema principale emerso..." />
              <TextField label={`Frase Esatta del Cliente`} value={d.fraseEsatta} onChange={v => upD({ fraseEsatta: v })}
                multiline placeholder='"Parole esatte usate dal cliente..."' tip={TIPS.fraseEsatta} />
            </Section>

            <Section open={openSections.has(3)} onToggle={() => toggleSection(3)} title="4. Prodotti Blaklader di Interesse" icon={<Package size={13} />}>
              <CheckGroup cols={1} options={DEALER_PRODOTTI} selected={d.prodottiInteresse}
                onChange={v => upD({ prodottiInteresse: v })} />
              <input type="text" placeholder="Altro prodotto..." value={d.prodottiAltro}
                onChange={e => upD({ prodottiAltro: e.target.value })}
                className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
              <TextField label="Campionatura Lasciata" value={d.campionaturaLasciata}
                onChange={v => upD({ campionaturaLasciata: v })} placeholder="Es. Pantalone 1990 tg. L/XL" />
            </Section>

            <Section open={openSections.has(4)} onToggle={() => toggleSection(4)} title="5. Qualificazione" icon={<Star size={13} />}>
              <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                Score 1→5 per ciascun criterio <Tip text={TIPS.qualificazione} />
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2">
                {([
                  ['esigenzaReale', 'Esigenza reale espressa'],
                  ['decisionMaker', 'Decisore identificato'],
                  ['aperturaFornitore', 'Apertura a nuovo fornitore'],
                  ['timeline', 'Timeline definita'],
                  ['budget', 'Budget / dimensione adeguata'],
                ] as [keyof QualificationCriteria, string][]).map(([key, label]) => (
                  <ScoreRow key={key} label={label} value={d.qualificazione[key]}
                    onChange={v => upD({ qualificazione: { ...d.qualificazione, [key]: v } })} />
                ))}
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-gray-500">Totale: <strong>{total}/25</strong></span>
                <span className={`text-sm font-black px-3 py-1 rounded-full ${BADGE_STYLE[badge]}`}>{badge}</span>
              </div>
              <TextField label="Note Qualificazione" value={d.noteQualificazione}
                onChange={v => upD({ noteQualificazione: v })} multiline placeholder="Osservazioni aggiuntive..." />
            </Section>

            <Section open={openSections.has(5)} onToggle={() => toggleSection(5)} title="6. Competitor Citati" icon={<Target size={13} />}>
              <div className="space-y-2">
                {d.competitor.map((c, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 items-center">
                    <input type="text" placeholder="Brand citato" value={c.brand}
                      onChange={e => { const nc = [...d.competitor]; nc[i] = { ...nc[i], brand: e.target.value }; upD({ competitor: nc }); }}
                      className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
                    <div className="flex gap-1">
                      <input type="text" placeholder="Parole usate / tono" value={c.tone}
                        onChange={e => { const nc = [...d.competitor]; nc[i] = { ...nc[i], tone: e.target.value }; upD({ competitor: nc }); }}
                        className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
                      <button type="button" onClick={() => upD({ competitor: d.competitor.filter((_, j) => j !== i) })}
                        className="px-2 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl transition-colors">✕</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => upD({ competitor: [...d.competitor, { brand: '', tone: '' }] })}
                  className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-wide hover:text-indigo-800 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-sm">+</span>
                  Aggiungi competitor
                </button>
              </div>
            </Section>

            <Section open={openSections.has(6)} onToggle={() => toggleSection(6)} title="7. Next Step" icon={<ArrowRight size={13} />}>
              <CheckGroup cols={1} options={DEALER_NEXT_STEP} selected={d.nextStepAzioni}
                onChange={v => upD({ nextStepAzioni: v })} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Data / Azione Precisa" value={d.nextStepData}
                  onChange={v => upD({ nextStepData: v })} placeholder="es. Mercoledì 9 luglio — email + scheda" />
                <TextField label="Note Libere" value={d.nextStepNote}
                  onChange={v => upD({ nextStepNote: v })} multiline placeholder="Qualsiasi nota utile..." />
              </div>
            </Section>
          </div>
        );
      })()}

      {/* ─── END USER FORM ─── */}
      {!isDealer && (() => {
        const e = form as EndUserProfiling;
        return (
          <div className="space-y-3">
            <Section open={openSections.has(0)} onToggle={() => toggleSection(0)} title="1. Referenti Aziendali" icon={<Users size={13} />}>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="RSPP (nome)" value={e.rsppNome} onChange={v => upE({ rsppNome: v })} placeholder="Nome RSPP" />
                <TextField label="Resp. Acquisti" value={e.respAcquisti} onChange={v => upE({ respAcquisti: v })} placeholder="Nome Responsabile Acquisti" />
              </div>
            </Section>

            <Section open={openSections.has(1)} onToggle={() => toggleSection(1)} title="2. Profilo Azienda" icon={<Users size={13} />}>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Segmento Edilizia</p>
                <RadioGroup value={e.segmentoEdilizia} onChange={v => upE({ segmentoEdilizia: v as any })} options={[
                  { value: 'B1', label: 'B1 · PNRR / GC' },
                  { value: 'B2', label: 'B2 · Impiantistica' },
                  { value: 'B3', label: 'B3 · Eccellenza' },
                  { value: 'B4', label: 'B4 · Heavy Duty' },
                ]} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Segmento Industria</p>
                <RadioGroup value={e.segmentoIndustria} onChange={v => upE({ segmentoIndustria: v as any })} options={[
                  { value: 'C1', label: 'C1 · Metal / Fonderia' },
                  { value: 'C2', label: 'C2 · Power & Utilities' },
                  { value: 'C3', label: 'C3 · Meccanica Avanzata' },
                  { value: 'C4', label: 'C4 · Logistica' },
                ]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="N° Dip. Totali" value={e.numDipendentiTotali} onChange={v => upE({ numDipendentiTotali: v })} placeholder="es. 85" />
                <TextField label="N° con DPI Workwear" value={e.numDipendentiDPI} onChange={v => upE({ numDipendentiDPI: v })} placeholder="es. 60" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fatturato Stimato</p>
                <RadioGroup value={e.fatturatoStimato} onChange={v => upE({ fatturatoStimato: v })} options={[
                  { value: '<1M€', label: '<1M€' }, { value: '1-5M€', label: '1-5M€' },
                  { value: '5-20M€', label: '5-20M€' }, { value: '20-100M€', label: '20-100M€' }, { value: '>100M€', label: '>100M€' },
                ]} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Certificazioni</p>
                <CheckGroup cols={2} options={['ISO 45001', 'ISO 14001', 'SOA', 'SUVA (Ticino)', 'Nessuna dichiarata']}
                  selected={e.certificazioni} onChange={v => upE({ certificazioni: v })} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Obiettivi ESG</p>
                <RadioGroup value={e.obiettiviESG} onChange={v => upE({ obiettiviESG: v })} options={[
                  { value: 'Sì — rendicontazione committente', label: 'Sì (rendicontazione)' },
                  { value: 'In sviluppo', label: 'In sviluppo' },
                  { value: 'Non è tema', label: 'Non è tema' },
                  { value: 'Non sa', label: 'Non sa' },
                ]} />
              </div>
            </Section>

            <Section open={openSections.has(2)} onToggle={() => toggleSection(2)} title="3. Sicurezza & Compliance" icon={<CheckSquare size={13} />}>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Livello DPI Richiesti</p>
                <RadioGroup value={e.livelloDPI} onChange={v => upE({ livelloDPI: v as any })} options={[
                  { value: 'catI', label: 'Cat. I — uso generico' },
                  { value: 'catII', label: 'Cat. II — rischi medi' },
                  { value: 'catIII', label: 'Cat. III — obbligatori' },
                  { value: 'nonSanno', label: 'Non sanno' },
                ]} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  Rischi Specifici <Tip text={TIPS.rischiSpecifici} />
                </p>
                <CheckGroup cols={2} options={['Antifiamma', 'Arco elettrico', 'Schizzi metallo fuso', 'Rischio chimico', 'Alta visibilità', 'Lavoro in quota', 'Freddo / intemperie', 'Abrasione meccanica']}
                  selected={e.rischiSpecifici} onChange={v => upE({ rischiSpecifici: v })} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  DVR Aggiornato <Tip text={TIPS.dvrAggiornato} />
                </p>
                <RadioGroup value={e.dvrAggiornato} onChange={v => upE({ dvrAggiornato: v as any })} options={[
                  { value: 'si', label: 'Sì' }, { value: 'no', label: 'No' }, { value: 'nonSa', label: 'Non sa' },
                ]} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ispezioni Recenti (INAIL/ASL)</p>
                <RadioGroup value={e.ispezioniRecenti} onChange={v => upE({ ispezioniRecenti: v as any })} options={[
                  { value: 'no', label: 'No' }, { value: 'si', label: 'Sì' },
                ]} />
                {e.ispezioniRecenti === 'si' && (
                  <input type="text" placeholder="Esito ispezione..." value={e.ispezioniEsito}
                    onChange={ev => upE({ ispezioniEsito: ev.target.value })}
                    className="mt-2 w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Conservano Schede Tecniche EN?</p>
                <RadioGroup value={e.schedeEN} onChange={v => upE({ schedeEN: v as any })} options={[
                  { value: 'siCompleto', label: 'Sì — archivio completo' },
                  { value: 'soloRziale', label: 'Solo parzialmente' },
                  { value: 'no', label: 'No (rischio legale)' },
                  { value: 'nonSa', label: 'Non sa' },
                ]} />
              </div>
            </Section>

            <Section open={openSections.has(3)} onToggle={() => toggleSection(3)} title="4. Fornitore Attuale" icon={<AlertCircle size={13} />}>
              <TextField label="Fornitore / Brand Attuale" value={e.fornitoreAttuale}
                onChange={v => upE({ fornitoreAttuale: v })} placeholder="es. U-Power tramite dealer locale" />
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Canale Acquisto</p>
                <CheckGroup cols={2} options={['Diretto produttore', 'Dealer / ferramenta', 'E-commerce', 'Grossista', 'Misto']}
                  selected={e.canaleAcquisto} onChange={v => upE({ canaleAcquisto: v })} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Frequenza Rinnovo</p>
                <RadioGroup value={e.frequenzaRinnovo} onChange={v => upE({ frequenzaRinnovo: v })} options={[
                  { value: 'Quando si rompe', label: 'Quando si rompe' },
                  { value: 'Ogni 6 mesi', label: 'Ogni 6 mesi' },
                  { value: 'Annuale', label: 'Annuale' },
                  { value: 'Contratto quadro', label: 'Contratto quadro' },
                  { value: 'Non definita', label: 'N.D.' },
                ]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Durata Media Capo" value={e.durataMediaCapo} onChange={v => upE({ durataMediaCapo: v })} placeholder="es. 8 mesi" />
                <TextField label="Spesa / Dip. Anno (est.)" value={e.spesaDipAnno} onChange={v => upE({ spesaDipAnno: v })} placeholder="es. €120" />
              </div>
              <TextField label="Lamentele Lavoratori" value={e.lamenteleLavoratori}
                onChange={v => upE({ lamenteleLavoratori: v })} multiline placeholder="Cosa si lamentano i lavoratori dei capi attuali?" />
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Chi Gestisce Logistica Taglie</p>
                <CheckGroup cols={2} options={['HR / Admin', 'Responsabile acquisti', 'Magazziniere', 'Titolare', 'Non gestito']}
                  selected={e.chiGestisceLogistica} onChange={v => upE({ chiGestisceLogistica: v })} />
              </div>
            </Section>

            <Section open={openSections.has(4)} onToggle={() => toggleSection(4)} title="5. Pain Points & Trigger di Cambio" icon={<AlertCircle size={13} />}>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  Seleziona i pain points <Tip text={TIPS.painPoints} />
                </p>
                <CheckGroup cols={1} options={ENDUSER_PAIN_POINTS} selected={e.painPoints}
                  onChange={v => upE({ painPoints: v })} />
                <input type="text" placeholder="Altro pain point..." value={e.painAltro}
                  onChange={ev => upE({ painAltro: ev.target.value })}
                  className="mt-2 w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
              </div>
              <TextField label="Pain Prioritario #1" value={e.painPrioritario}
                onChange={v => upE({ painPrioritario: v })} placeholder="Il problema principale emerso..." />
              <TextField label="Frase Esatta del Cliente" value={e.fraseEsatta}
                onChange={v => upE({ fraseEsatta: v })} multiline
                placeholder='"Parole esatte usate dal cliente..."' tip={TIPS.fraseEsatta} />
            </Section>

            <Section open={openSections.has(5)} onToggle={() => toggleSection(5)} title="6. Calcolo TCO sul Campo" icon={<Target size={13} />}>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Costo Capo attuale (€)" value={e.tcoCostoCapo} onChange={v => upE({ tcoCostoCapo: v })} placeholder="es. €45" />
                <TextField label="Durata Media (mesi)" value={e.tcoDurataMesi} onChange={v => upE({ tcoDurataMesi: v })} placeholder="es. 8" />
                <TextField label="N° Dipendenti" value={e.tcoNumDipendenti} onChange={v => upE({ tcoNumDipendenti: v })} placeholder="es. 60" />
                <TextField label="Costo Totale Flotta / Anno" value={e.tcoCostoFlotta} onChange={v => upE({ tcoCostoFlotta: v })} placeholder="es. €4.050" />
              </div>
              <TextField label="Note TCO" value={e.tcoNote} onChange={v => upE({ tcoNote: v })} multiline
                placeholder="Es. confronto con Blaklader 1990: €98 × durata 18 mesi = risparmio 40%..." />
            </Section>

            <Section open={openSections.has(6)} onToggle={() => toggleSection(6)} title="7. Prodotti Blaklader di Interesse" icon={<Package size={13} />}>
              <CheckGroup cols={1} options={ENDUSER_PRODOTTI} selected={e.prodottiInteresse}
                onChange={v => upE({ prodottiInteresse: v })} />
              <input type="text" placeholder="Altro prodotto..." value={e.prodottiAltro}
                onChange={ev => upE({ prodottiAltro: ev.target.value })}
                className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-sm font-bold dark:text-white outline-none focus:border-indigo-400" />
              <TextField label="Campionatura Lasciata" value={e.campionaturaLasciata}
                onChange={v => upE({ campionaturaLasciata: v })} placeholder="Es. Pantalone 1990 Cat. III tg. L" />
            </Section>

            <Section open={openSections.has(7)} onToggle={() => toggleSection(7)} title="8. Qualificazione (MEDDIC)" icon={<Star size={13} />}>
              <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                Score 1→5 per ciascun criterio <Tip text={TIPS.qualificazione} />
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2">
                {([
                  ['esigenzaReale', 'Esigenza reale (dolore concreto)'],
                  ['decisionMaker', 'Decision Maker identificato'],
                  ['aperturaFornitore', 'Apertura a cambio fornitore'],
                  ['timeline', 'Timeline / urgenza chiara'],
                  ['budget', 'Budget / dimensione adeguata'],
                ] as [keyof QualificationCriteria, string][]).map(([key, label]) => (
                  <ScoreRow key={key} label={label} value={e.qualificazione[key]}
                    onChange={v => upE({ qualificazione: { ...e.qualificazione, [key]: v } })} />
                ))}
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-gray-500">Totale: <strong>{total}/25</strong></span>
                <span className={`text-sm font-black px-3 py-1 rounded-full ${BADGE_STYLE[badge]}`}>{badge}</span>
              </div>
              <TextField label="Note Qualificazione" value={e.noteQualificazione}
                onChange={v => upE({ noteQualificazione: v })} multiline placeholder="Osservazioni aggiuntive..." />
            </Section>

            <Section open={openSections.has(8)} onToggle={() => toggleSection(8)} title="9. Next Step" icon={<ArrowRight size={13} />}>
              <CheckGroup cols={1} options={ENDUSER_NEXT_STEP} selected={e.nextStepAzioni}
                onChange={v => upE({ nextStepAzioni: v })} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Data / Azione Precisa" value={e.nextStepData}
                  onChange={v => upE({ nextStepData: v })} placeholder="es. Venerdì 11 luglio — campionatura" />
                <TextField label="Note Libere" value={e.nextStepNote}
                  onChange={v => upE({ nextStepNote: v })} multiline placeholder="Qualsiasi nota utile..." />
              </div>
            </Section>
          </div>
        );
      })()}

      {/* Salva bottom */}
      <div className="flex justify-end pt-2">
        <button type="button" onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-sm transition-all
            ${saved ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900'}`}>
          {saved ? '✓ Profilazione salvata' : 'Salva Profilazione'}
        </button>
      </div>
    </div>
  );
};
