import { confirmAction } from '../components/ui/Feedback';
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useStoricoStore } from '../store/storicoStore';
import { User, Target, Package, Trash2, Moon, Sun, Plus, X, ShieldCheck, Users, LogOut, Mail, KeyRound, Sparkles, Eye, EyeOff, CheckCircle2, Mic, MicOff, AlertTriangle, RefreshCw, LayoutDashboard, Radar, FileText, Calendar, Activity, Map, CheckSquare, BarChart3, TrendingUp, Shield, Settings, ChevronUp, ChevronDown, GripVertical, Crosshair, Type, CaseSensitive, Palette, Circle, Square, Triangle, Star, Diamond, Pentagon, Hexagon, Factory, type LucideIcon } from 'lucide-react';
import { ACCENT_SECTIONS, FONT_STACKS, FONT_LABELS, representativeColor, type FontFamilyKey } from '../lib/accentPalettes';
import { MARKER_SHAPE_LABELS, MARKER_CATEGORY_LABELS, MARKER_SIZE_LABELS, DEFAULT_MARKER_STYLE, type MarkerShape, type MarkerCategory, type MarkerSize } from '../lib/markerShapes';
import { DEFAULT_SECTORS, sectorLabel } from '../lib/sectors';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../lib/authContext';
import { DeviceAuthModal } from '../components/ui/DeviceAuthModal';
import { PuliziaTerritorio } from '../components/settings/PuliziaTerritorio';
import { GmailIntegration } from '../components/settings/GmailIntegration';
import { downloadBackup, restoreBackupFromFile } from '../lib/backup';
import { Download, Upload } from 'lucide-react';

type PendingAction = { title: string; description: string; execute: () => void } | null;

// ── Aggiornamento App Section ─────────────────────────────────────────────────

const AppUpdateSection: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'updating' | 'latest' | 'unavailable'>('idle');

  const checkForUpdate = async () => {
    if (!('serviceWorker' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('checking');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setStatus('unavailable');
        return;
      }
      await reg.update();
      // Se c'è una nuova versione, il nuovo SW passa a "waiting" entro pochi
      // secondi dall'update(): attendi fino a 10s prima di dichiarare "aggiornata".
      const waiting = await new Promise<ServiceWorker | null>(resolve => {
        if (reg.waiting) return resolve(reg.waiting);
        const timeout = setTimeout(() => { clearInterval(poll); resolve(null); }, 10000);
        const poll = setInterval(() => {
          if (reg.waiting) { clearInterval(poll); clearTimeout(timeout); resolve(reg.waiting); }
        }, 300);
      });
      if (!waiting) {
        setStatus('latest');
        setTimeout(() => setStatus('idle'), 5000);
        return;
      }
      setStatus('updating');
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => window.location.reload(),
        { once: true }
      );
      waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      setStatus('unavailable');
    }
  };

  const buildDate = new Date(__BUILD_DATE__);
  const busy = status === 'checking' || status === 'updating';

  return (
    <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line space-y-4">
      <h2 className="text-xs font-semibold text-secondary dark:text-muted   flex items-center gap-2">
        <RefreshCw size={14} /> Aggiornamento App
      </h2>
      <p className="text-xs text-muted">
        Versione installata: build del{' '}
        <strong>
          {buildDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}{' '}
          {buildDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </strong>
      </p>
      <button
        onClick={checkForUpdate}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-panel bg-action text-action-foreground font-semibold text-sm hover:bg-action-hover transition-all disabled:opacity-60"
      >
        <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
        {status === 'checking' && 'Controllo aggiornamenti...'}
        {status === 'updating' && 'Nuova versione trovata, aggiorno...'}
        {(status === 'idle' || status === 'latest' || status === 'unavailable') && 'Cerca aggiornamenti'}
      </button>
      {status === 'latest' && (
        <p className="text-xs font-bold text-success dark:text-success flex items-center gap-1.5">
          <CheckCircle2 size={13} /> Hai già l'ultima versione.
        </p>
      )}
      {status === 'unavailable' && (
        <p className="text-xs font-bold text-warning dark:text-warning">
          Controllo non disponibile su questo browser. Se l'app sembra vecchia, disinstalla e reinstalla la PWA.
        </p>
      )}
    </div>
  );
};

// ── Claude API Key Section ──────────────────────────────────────────────────

const ClaudeApiKeySection: React.FC = () => {
  const storedKey = useStore(s => s.claudeApiKey);
  const setClaudeApiKey = useStore(s => s.setClaudeApiKey);
  const [key, setKey] = useState(storedKey);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testError, setTestError] = useState('');

  const storedPreview = storedKey.length > 10
    ? `${storedKey.slice(0, 14)}...${storedKey.slice(-4)}`
    : '';

  const handleSave = () => {
    setClaudeApiKey(key.trim());
    setSaved(true);
    setTestStatus('idle');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClear = () => {
    setClaudeApiKey('');
    setKey('');
    setSaved(false);
    setTestStatus('idle');
  };

  const handleTest = async () => {
    const k = storedKey.trim();
    if (!k) { setTestStatus('fail'); setTestError('Nessuna chiave salvata'); return; }
    setTestStatus('testing');
    setTestError('');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${k}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 5 } }),
        },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${res.status} ${body}`);
      }
      setTestStatus('ok');
    } catch (e: any) {
      setTestStatus('fail');
      const msg: string = e.message || '';
      if (msg.includes('400') || msg.includes('401') || msg.includes('403') || msg.includes('API_KEY_INVALID')) {
        setTestError('Chiave non valida. Genera una nuova key su aistudio.google.com');
      } else if (msg.includes('Failed to fetch') || msg.includes('network')) {
        setTestError('Errore di rete. Verifica la connessione internet.');
      } else {
        setTestError(msg || 'Errore sconosciuto');
      }
    }
  };

  const hasKey = !!storedKey;

  return (
    <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h2 className="text-xs font-semibold text-secondary dark:text-muted  ">Gemini AI — API Key</h2>
        {hasKey && testStatus === 'idle' && (
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-success-soft text-success dark:bg-success-soft dark:text-success flex items-center gap-1">
            <CheckCircle2 size={10} /> Salvata
          </span>
        )}
        {testStatus === 'ok' && (
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-success-soft text-success dark:bg-success-soft dark:text-success flex items-center gap-1">
            <CheckCircle2 size={10} /> Valida ✓
          </span>
        )}
        {testStatus === 'fail' && (
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger">
            ✗ Non valida
          </span>
        )}
      </div>

      {storedPreview && (
        <p className="text-xs text-muted font-mono bg-canvas dark:bg-raised/50 rounded-lg px-3 py-1.5">
          Salvata: <span className="text-secondary dark:text-muted">{storedPreview}</span>
        </p>
      )}

      <p className="text-xs text-muted dark:text-secondary">
        Necessaria per registrazione conversazioni, analisi resoconto e funzionalità AI.
        Ottienila gratis su <span className="font-mono text-accent">aistudio.google.com</span>.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={e => { setKey(e.target.value); setSaved(false); setTestStatus('idle'); }}
            placeholder="sk-ant-api03-..."
            className="w-full text-sm border border-line dark:border-line rounded-md px-3 py-2.5 pr-10 bg-canvas dark:bg-raised dark:text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary dark:hover:text-muted"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md bg-action hover:bg-action-hover disabled:opacity-40 disabled:cursor-not-allowed text-action-foreground text-sm font-semibold transition-colors"
        >
          {saved ? <><CheckCircle2 size={15} /> Salvata!</> : 'Salva'}
        </button>
        <button
          onClick={handleTest}
          disabled={!hasKey || testStatus === 'testing'}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md border border-accent dark:border-accent text-accent dark:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
        >
          {testStatus === 'testing' ? '...' : 'Testa'}
        </button>
        {hasKey && (
          <button
            onClick={handleClear}
            className="px-4 py-2.5 rounded-md border border-danger dark:border-danger text-danger hover:bg-danger-soft dark:hover:bg-danger-soft text-sm font-semibold transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {testStatus === 'fail' && testError && (
        <p className="text-xs text-danger dark:text-danger bg-danger-soft dark:bg-danger-soft rounded-lg px-3 py-2">{testError}</p>
      )}

    </div>
  );
};

// ── Microphone Permission Section ───────────────────────────────────────────

type MicPermState = 'unknown' | 'granted' | 'denied' | 'unsupported';

const MicrophonePermissionSection: React.FC = () => {
  const [status, setStatus] = useState<MicPermState>('unknown');
  const [checking, setChecking] = useState(false);

  const refreshStatus = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    if (navigator.permissions?.query) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'unknown');
        return;
      } catch {
        // Safari non supporta la query 'microphone': resta 'unknown' finché l'utente non testa
      }
    }
  };

  React.useEffect(() => { refreshStatus(); }, []);

  const handleEnable = async () => {
    setChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setStatus('granted');
    } catch {
      setStatus('denied');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line space-y-4">
      <div className="flex items-center gap-2">
        <Mic size={16} className="text-accent" />
        <h2 className="text-xs font-semibold text-secondary dark:text-muted  ">Microfono</h2>
        {status === 'granted' && (
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-success-soft text-success dark:bg-success-soft dark:text-success flex items-center gap-1">
            <CheckCircle2 size={10} /> Abilitato
          </span>
        )}
        {status === 'denied' && (
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger flex items-center gap-1">
            <MicOff size={10} /> Bloccato
          </span>
        )}
      </div>

      <p className="text-xs text-secondary dark:text-muted">
        Serve per registrare e trascrivere le conversazioni con l'AI (Agenda, resoconto visita). Il permesso è legato al browser/dispositivo: va abilitato su ogni device.
      </p>

      {status === 'unsupported' && (
        <p className="text-xs text-warning dark:text-warning bg-warning-soft dark:bg-warning-soft rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={13} /> Questo browser non supporta la registrazione audio.
        </p>
      )}

      {status === 'denied' && (
        <p className="text-xs text-danger dark:text-danger bg-danger-soft dark:bg-danger-soft rounded-lg px-3 py-2">
          Il microfono è bloccato per questo sito. Abilitalo dalle impostazioni del browser (icona lucchetto/informazioni nella barra indirizzi, oppure Impostazioni → Siti web → Microfono) e poi premi di nuovo il pulsante.
        </p>
      )}

      {status !== 'unsupported' && (
        <button
          onClick={handleEnable}
          disabled={checking}
          className="w-full px-4 py-2.5 rounded-md bg-action hover:bg-action-hover disabled:opacity-50 text-action-foreground text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Mic size={15} />
          {checking ? 'Verifica in corso…' : status === 'granted' ? 'Testa di nuovo' : 'Abilita microfono'}
        </button>
      )}
    </div>
  );
};

const SIDEBAR_ITEMS: { id: import('../types').NavView; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'prospecting', label: 'Prospecting', icon: Radar },
  { id: 'strategia', label: 'Strategia', icon: Crosshair },
  { id: 'deals', label: 'Pipeline', icon: Target },
  { id: 'contacts', label: 'Clienti', icon: Users },
  { id: 'offers', label: 'Offerte', icon: FileText },
  { id: 'products', label: 'Prodotti', icon: Package },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'attivita', label: 'Attività', icon: Activity },
  { id: 'map', label: 'Mappa', icon: Map },
  { id: 'todo', label: 'To Do', icon: CheckSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'storico', label: 'Storico', icon: TrendingUp },
  { id: 'legal', label: 'Legal', icon: Shield },
  { id: 'settings', label: 'Impostazioni', icon: Settings },
];

const SHAPE_ICONS: Record<MarkerShape, LucideIcon> = {
  circle: Circle,
  square: Square,
  triangle: Triangle,
  diamond: Diamond,
  star: Star,
  pentagon: Pentagon,
  hexagon: Hexagon,
};

const SidebarOrderSection: React.FC = () => {
  const { sidebarOrder, setSidebarOrder } = useStore();

  const ordered = (sidebarOrder && sidebarOrder.length > 0)
    ? [
        ...sidebarOrder.map(id => SIDEBAR_ITEMS.find(n => n.id === id)).filter((n): n is typeof SIDEBAR_ITEMS[number] => !!n),
        ...SIDEBAR_ITEMS.filter(n => !sidebarOrder.includes(n.id)),
      ]
    : SIDEBAR_ITEMS;

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    const next = ordered.map(n => n.id);
    [next[index], next[target]] = [next[target], next[index]];
    setSidebarOrder(next);
  };

  return (
    <div className="bg-surface dark:bg-surface rounded-panel p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground dark:text-foreground flex items-center gap-2"><GripVertical size={16} />Ordine menu laterale</h3>
        {sidebarOrder && sidebarOrder.length > 0 && (
          <button onClick={() => setSidebarOrder([])} className="text-xs font-semibold text-muted hover:text-accent uppercase">Ripristina</button>
        )}
      </div>
      <p className="text-xs text-muted">Riordina le voci come preferisci con le frecce.</p>
      <div className="space-y-1.5">
        {ordered.map(({ id, label, icon: Icon }, index) => (
          <div key={id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-canvas dark:bg-raised/50">
            <Icon size={15} className="text-muted flex-shrink-0" />
            <span className="flex-1 text-sm font-bold text-foreground dark:text-muted">{label}</span>
            <button
              onClick={() => move(index, -1)}
              disabled={index === 0}
              className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface dark:hover:bg-surface disabled:opacity-25 disabled:pointer-events-none"
            >
              <ChevronUp size={15} />
            </button>
            <button
              onClick={() => move(index, 1)}
              disabled={index === ordered.length - 1}
              className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface dark:hover:bg-surface disabled:opacity-25 disabled:pointer-events-none"
            >
              <ChevronDown size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const { profile, theme, textSize, setTextSize, fontFamily, setFontFamily, sectionColors, setSectionColor, globalAccent, setGlobalAccent, mapMarkerStyles, setMapMarkerStyle, mapMarkerSize, setMapMarkerSize, customSectors, addCustomSector, removeCustomSector, contacts, products, salesTransactions, updateProfile, toggleTheme, deleteAllContacts, clearSalesTransactions, clearProducts, discountApprovalThreshold, setDiscountApprovalThreshold, footerTabs, setFooterTabs } = useStore();
  const [newSector, setNewSector] = useState('');
  const storicoClienti = useStoricoStore(s => s.clienti);
  const resetStorico = useStoricoStore(s => s.reset);
  const { showToast } = useToast();
  const { user, logout, resetPassword } = useAuth();
  const [newProduct, setNewProduct] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const backupFileInputRef = React.useRef<HTMLInputElement>(null);

  const requireAuth = (title: string, description: string, execute: () => void) => {
    setPendingAction({ title, description, execute });
  };

  const handleBackupFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    requireAuth(
      'Ripristinare il backup?',
      `Tutti i dati attuali dell'app verranno sostituiti con quelli del file "${file.name}". L'operazione non è reversibile.`,
      async () => {
        setRestoringBackup(true);
        try {
          await restoreBackupFromFile(file);
          showToast('Backup ripristinato con successo', 'success');
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Errore nel ripristino del backup', 'error');
        } finally {
          setRestoringBackup(false);
        }
      }
    );
  };

  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com') ?? false;

  const handleResetPassword = async () => {
    if (!user?.email) return;
    await resetPassword(user.email);
    setResetSent(true);
    setTimeout(() => setResetSent(false), 5000);
  };

  const handleLogout = async () => {
    if (!await confirmAction('Vuoi uscire dal tuo account?')) return;
    setLoggingOut(true);
    await logout();
  };

  if (!profile) return null;

  const handleAddProduct = () => {
    if (newProduct.trim() && !profile.customProducts.includes(newProduct.trim())) {
      updateProfile({ customProducts: [...profile.customProducts, newProduct.trim()] });
      setNewProduct('');
      showToast('Prodotto aggiunto');
    }
  };

  const removeProduct = (p: string) => {
    updateProfile({ customProducts: profile.customProducts.filter(item => item !== p) });
    showToast('Prodotto rimosso');
  };

  const GroupLabel: React.FC<{ children: React.ReactNode; first?: boolean }> = ({ children, first }) => (
    <p className={`text-xs font-semibold text-muted dark:text-secondary uppercase tracking-[0.2em] px-1 ${first ? '' : 'pt-2'}`}>{children}</p>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      <GroupLabel first>Account & Profilo</GroupLabel>

      {/* Account */}
      {user && (
        <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm space-y-4">
          <h3 className="font-bold flex items-center gap-2"><ShieldCheck size={18} className="text-accent"/> Account</h3>

          {/* Avatar + nome */}
          <div className="flex items-center gap-4">
            {user.photoURL
              ? <img src={user.photoURL} alt="avatar" className="w-14 h-14 rounded-full object-cover ring-2 ring-accent" />
              : <div className="w-14 h-14 rounded-full bg-accent-soft dark:bg-accent-soft/40 flex items-center justify-center">
                  <User size={24} className="text-accent" />
                </div>
            }
            <div>
              <p className="font-semibold text-foreground dark:text-foreground text-sm">{user.displayName || 'Utente'}</p>
              <p className="text-xs text-muted mt-0.5">Accesso tramite {isGoogleUser ? 'Google' : 'Email'}</p>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-canvas dark:bg-canvas/50 rounded-md px-4 py-3">
              <Mail size={15} className="text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted uppercase tracking-normal">Email</p>
                <p className="text-sm font-bold text-foreground dark:text-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-canvas dark:bg-canvas/50 rounded-md px-4 py-3">
              <KeyRound size={15} className="text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted uppercase tracking-normal">Password</p>
                {isGoogleUser
                  ? <p className="text-sm text-secondary">Gestita da Google — modifica su myaccount.google.com</p>
                  : <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-sm font-bold text-foreground dark:text-foreground tracking-normal">••••••••</p>
                      <button
                        onClick={handleResetPassword}
                        className="text-xs font-bold text-accent hover:underline"
                      >
                        {resetSent ? 'Email inviata ✓' : 'Cambia password'}
                      </button>
                    </div>
                }
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md border-2 border-danger dark:border-danger text-danger dark:text-danger font-semibold text-sm hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors disabled:opacity-50"
          >
            <LogOut size={16} />
            {loggingOut ? 'Uscita in corso…' : 'Esci dal profilo'}
          </button>
        </div>
      )}

      {/* Profilo */}
      <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><User size={18} className="text-accent"/> Profilo Personale</h3>
        <div className="space-y-4">
          <input
            type="text"
            value={profile.name}
            onChange={e => updateProfile({ name: e.target.value })}
            placeholder="Tuo Nome"
            className="w-full border border-line dark:border-line rounded-md px-4 py-2 bg-transparent"
          />
          <input
            type="text"
            value={profile.company}
            onChange={e => updateProfile({ company: e.target.value })}
            placeholder="Azienda"
            className="w-full border border-line dark:border-line rounded-md px-4 py-2 bg-transparent"
          />
        </div>
      </div>

      {/* Target */}
      <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Target size={18} className="text-accent"/> Obiettivo Mensile</h3>
        <input
          type="number"
          value={profile.defaultMonthlyTarget}
          onChange={e => updateProfile({ defaultMonthlyTarget: parseInt(e.target.value) })}
          className="w-full border border-line dark:border-line rounded-md px-4 py-2 bg-transparent font-bold text-accent"
        />
      </div>

      <GroupLabel>Aspetto & Personalizzazione</GroupLabel>

      {/* Preferenze */}
      <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Tema Scuro
          </div>
          <button
            onClick={toggleTheme}
            role="switch" aria-checked={theme === 'dark'} aria-label="Tema scuro"
            className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-action' : 'bg-raised'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-surface rounded-full transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex justify-between items-center mt-5 pt-5 border-t border-line dark:border-line">
          <div className="flex items-center gap-2 font-bold">
            <Type size={18} /> Dimensione testo
          </div>
          <div className="flex gap-1 bg-raised dark:bg-canvas rounded-md p-1">
            {([{ key: 'small', label: 'A' }, { key: 'medium', label: 'A' }, { key: 'large', label: 'A' }] as const).map(({ key, label }, i) => (
              <button
                key={key}
                onClick={() => setTextSize(key)}
                title={key === 'small' ? 'Piccolo' : key === 'medium' ? 'Medio' : 'Grande'}
                style={{ fontSize: 12 + i * 3 }}
                className={`w-9 h-9 rounded-lg font-semibold transition-colors flex items-center justify-center ${textSize === key ? 'bg-action text-action-foreground' : 'text-secondary dark:text-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center mt-5 pt-5 border-t border-line dark:border-line">
          <div className="flex items-center gap-2 font-bold">
            <CaseSensitive size={18} /> Stile carattere
          </div>
          <div className="flex gap-1 bg-raised dark:bg-canvas rounded-md p-1 flex-wrap justify-end">
            {(Object.keys(FONT_LABELS) as FontFamilyKey[]).map(key => (
              <button
                key={key}
                onClick={() => setFontFamily(key)}
                style={{ fontFamily: FONT_STACKS[key] }}
                className={`px-3 h-9 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center ${fontFamily === key ? 'bg-action text-action-foreground' : 'text-secondary dark:text-muted'}`}
              >
                {FONT_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Colori per sezione */}
      <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Palette size={18} /> Colore delle sezioni
        </div>
        <p className="text-xs text-muted mb-4">Scegli un colore d'accento per tutta l'app (bottoni, evidenziazioni, badge) oppure personalizza ciascuna sezione; il colore della sezione ha la precedenza su quello globale.</p>
        <div className="flex justify-between items-center gap-3 pb-4 mb-4 border-b border-line dark:border-line">
          <span className="text-sm font-semibold text-foreground dark:text-muted">Colore globale</span>
          <div className="flex items-center gap-2">
            {globalAccent && (
              <button
                onClick={() => setGlobalAccent('')}
                title="Ripristina colore predefinito"
                className="text-xs font-bold uppercase text-muted hover:text-secondary dark:hover:text-muted"
              >
                Reset
              </button>
            )}
            <label
              className="relative w-8 h-8 rounded-full ring-1 ring-black/10 dark:ring-line/20 overflow-hidden cursor-pointer shadow-sm"
              style={{ background: representativeColor(globalAccent) }}
              title="Scegli il colore globale"
            >
              <input
                type="color"
                value={representativeColor(globalAccent)}
                onChange={e => setGlobalAccent(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
        <div className="space-y-3">
          {ACCENT_SECTIONS.map(section => {
            const current = representativeColor(sectionColors[section.id]);
            return (
              <div key={section.id} className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-secondary dark:text-muted">{section.label}</span>
                <div className="flex items-center gap-2">
                  {sectionColors[section.id] && (
                    <button
                      onClick={() => setSectionColor(section.id, '')}
                      title="Ripristina colore predefinito"
                      className="text-xs font-bold uppercase text-muted hover:text-secondary dark:hover:text-muted"
                    >
                      Reset
                    </button>
                  )}
                  <label
                    className="relative w-8 h-8 rounded-full ring-1 ring-black/10 dark:ring-line/20 overflow-hidden cursor-pointer shadow-sm"
                    style={{ background: current }}
                    title="Scegli un colore"
                  >
                    <input
                      type="color"
                      value={current}
                      onChange={e => setSectionColor(section.id, e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Icone e colori dei marker sulla mappa */}
      <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Map size={18} /> Icone clienti sulla mappa
        </div>
        <p className="text-xs text-muted mb-4">Scegli forma e colore del marker per ogni categoria di cliente/prospect nella sezione Mappa (i prioritari restano sempre una stellina oro/fucsia).</p>

        <div className="flex justify-between items-center mb-5 pb-5 border-b border-line dark:border-line">
          <span className="text-sm font-bold text-secondary dark:text-muted">Dimensione icone</span>
          <div className="flex gap-1 bg-raised dark:bg-canvas rounded-md p-1">
            {(Object.keys(MARKER_SIZE_LABELS) as MarkerSize[]).map(size => (
              <button
                key={size}
                onClick={() => setMapMarkerSize(size)}
                className={`px-3 h-9 rounded-lg font-semibold text-xs transition-colors ${mapMarkerSize === size ? 'bg-action text-action-foreground' : 'text-secondary dark:text-muted'}`}
              >
                {MARKER_SIZE_LABELS[size]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {(Object.keys(MARKER_CATEGORY_LABELS) as MarkerCategory[]).map(category => {
            const base = DEFAULT_MARKER_STYLE[category];
            const current = mapMarkerStyles[category] || base;
            const currentShape = (current.shape as MarkerShape) || base.shape;
            const currentColor = current.color || base.color;
            return (
              <div key={category} className="flex flex-col gap-2 pb-3 border-b border-line dark:border-line/50 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-secondary dark:text-muted">{MARKER_CATEGORY_LABELS[category]}</span>
                  <label
                    className="relative w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-line/20 overflow-hidden cursor-pointer shadow-sm flex-shrink-0"
                    style={{ background: currentColor }}
                    title="Scegli un colore"
                  >
                    <input
                      type="color"
                      value={currentColor}
                      onChange={e => setMapMarkerStyle(category, { color: e.target.value })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </label>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(MARKER_SHAPE_LABELS) as MarkerShape[]).map(shape => {
                    const ShapeIcon = SHAPE_ICONS[shape];
                    const active = currentShape === shape;
                    return (
                      <button
                        key={shape}
                        onClick={() => setMapMarkerStyle(category, { shape })}
                        title={MARKER_SHAPE_LABELS[shape]}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${active ? 'text-foreground shadow-panel' : 'bg-raised dark:bg-canvas text-muted hover:text-secondary dark:hover:text-muted'}`}
                        style={active ? { background: currentColor } : undefined}
                      >
                        <ShapeIcon size={16} fill={active ? 'currentColor' : 'none'} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer personalizzabile ── */}
      <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line space-y-4">
        <h2 className="text-xs font-semibold text-secondary dark:text-muted   flex items-center gap-2">
          <span>📱</span> Barra navigazione mobile
        </h2>
        <p className="text-xs text-muted">Seleziona fino a 5 sezioni da mostrare nella barra in basso.</p>
        {(() => {
          const ALL_TABS: { id: import('../types').NavView; label: string }[] = [
            { id: 'dashboard',  label: 'Dashboard'    },
            { id: 'deals',      label: 'Pipeline'     },
            { id: 'contacts',   label: 'Clienti'      },
            { id: 'offers',     label: 'Offerte'      },
            { id: 'agenda',     label: 'Agenda'       },
            { id: 'todo',       label: 'To Do'        },
            { id: 'attivita',   label: 'Attività'     },
            { id: 'products',   label: 'Prodotti'     },
            { id: 'analytics',  label: 'Analytics'    },
            { id: 'map',        label: 'Mappa'        },
            { id: 'storico',    label: 'Storico'      },
            { id: 'assets',     label: 'Asset'        },
          ];
          const current: import('../types').NavView[] = footerTabs && footerTabs.length > 0 ? footerTabs : ['dashboard', 'deals', 'agenda', 'contacts'];
          const toggle = (id: import('../types').NavView) => {
            if (current.includes(id)) {
              if (current.length > 1) setFooterTabs(current.filter(t => t !== id));
            } else {
              if (current.length < 5) setFooterTabs([...current, id]);
            }
          };
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_TABS.map(({ id, label }) => {
                const active = current.includes(id);
                const idx = current.indexOf(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
                    disabled={!active && current.length >= 5}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-bold border-2 transition-all ${
                      active
                        ? 'border-accent bg-accent-soft dark:bg-accent-soft/30 text-accent dark:text-accent'
                        : current.length >= 5
                          ? 'border-line dark:border-line text-muted dark:text-secondary cursor-not-allowed'
                          : 'border-line dark:border-line text-secondary dark:text-muted hover:border-accent'
                    }`}
                  >
                    <span>{label}</span>
                    {active && (
                      <span className="w-4 h-4 rounded-full bg-action text-action-foreground text-xs font-semibold flex items-center justify-center ml-1 flex-shrink-0">
                        {idx + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })()}
        <p className="text-xs text-muted text-center">
          {(footerTabs ?? []).length}/5 sezioni selezionate
        </p>
      </div>

      {/* ── Ordine menu laterale ── */}
      <SidebarOrderSection />

      <GroupLabel>Dati di Vendita</GroupLabel>

      {/* Prodotti Custom */}
      <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Package size={18} className="text-accent"/> Gestione Prodotti</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newProduct}
            onChange={e => setNewProduct(e.target.value)}
            placeholder="Aggiungi nuovo prodotto..."
            className="flex-1 border border-line dark:border-line rounded-md px-4 py-2 bg-transparent text-sm"
          />
          <button onClick={handleAddProduct} className="p-2 bg-action text-action-foreground rounded-md"><Plus size={20}/></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.customProducts.map(p => (
            <span key={p} className="flex items-center gap-1 bg-raised dark:bg-raised px-3 py-1.5 rounded-full text-xs font-bold">
              {p} <X size={14} className="cursor-pointer text-danger" onClick={() => removeProduct(p)}/>
            </span>
          ))}
        </div>
      </div>

      {/* Settori personalizzati */}
      <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Factory size={18} /> Settori di riferimento
        </div>
        <p className="text-xs text-muted mb-4">Aggiungi qui i settori mancanti dall'elenco predefinito: saranno disponibili nella scheda cliente e come filtro nella sezione Mappa.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {DEFAULT_SECTORS.map(s => (
            <span key={s} className="px-3 py-1.5 rounded-md text-xs font-bold bg-raised dark:bg-canvas text-secondary dark:text-muted">
              {sectorLabel(s)}
            </span>
          ))}
          {customSectors.map(s => (
            <span key={s} className="px-3 py-1.5 rounded-md text-xs font-bold bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent flex items-center gap-1.5">
              {s}
              <button onClick={() => removeCustomSector(s)} className="hover:text-danger">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <input
            type="text"
            value={newSector}
            onChange={e => setNewSector(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newSector.trim()) { addCustomSector(newSector); setNewSector(''); } }}
            placeholder="Nuovo settore (es. Nautica)"
            className="min-w-0 flex-1 border-2 border-line dark:border-line rounded-md p-2.5 bg-canvas dark:bg-canvas dark:text-foreground text-sm font-bold outline-none"
          />
          <button
            onClick={() => { if (newSector.trim()) { addCustomSector(newSector); setNewSector(''); } }}
            className="px-4 rounded-md bg-action text-action-foreground font-semibold text-sm flex items-center gap-1.5"
          >
            <Plus size={16} /> Aggiungi
          </button>
        </div>
      </div>

      {/* Approvazione Sconti */}
      <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-accent"/> Soglia Approvazione Sconti</h3>
        <p className="text-xs text-secondary dark:text-muted mb-3">
          Le offerte con sconto medio superiore a questa soglia vengono marcate come "Richiede approvazione".
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={discountApprovalThreshold}
            onChange={e => setDiscountApprovalThreshold(parseInt(e.target.value))}
            className="flex-1 accent-indigo-600"
          />
          <span className="text-xl font-semibold text-accent min-w-[50px] text-right">{discountApprovalThreshold}%</span>
        </div>
        <div className="flex justify-between text-xs text-muted font-bold mt-1">
          <span>0%</span><span>10%</span><span>20%</span><span>30%</span><span>40%</span><span>50%</span><span>60%</span>
        </div>
      </div>

      <GroupLabel>Integrazioni & Strumenti</GroupLabel>

      <ClaudeApiKeySection />
      <MicrophonePermissionSection />
      <GmailIntegration />
      <PuliziaTerritorio />
      <AppUpdateSection />

      <GroupLabel>Backup Dati</GroupLabel>

      {/* Backup dati */}
      <div className="bg-surface dark:bg-surface p-6 rounded-panel border border-line dark:border-line shadow-sm">
        <h3 className="font-bold mb-1 flex items-center gap-2"><ShieldCheck size={18} className="text-accent"/> Backup dati</h3>
        <p className="text-xs text-muted mb-4">Scarica un file con tutti i dati dell'app (clienti, deal, offerte, prodotti, storico...) o ripristinali da un backup precedente.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadBackup}
            className="flex items-center gap-2 text-accent text-sm font-bold border border-accent dark:border-accent px-4 py-2 rounded-md hover:bg-accent-soft dark:hover:bg-accent-soft/20 transition-colors"
          >
            <Download size={15} /> Scarica backup
          </button>
          <button
            onClick={() => backupFileInputRef.current?.click()}
            disabled={restoringBackup}
            className="flex items-center gap-2 text-secondary dark:text-muted text-sm font-bold border border-line dark:border-line px-4 py-2 rounded-md hover:bg-canvas dark:hover:bg-raised transition-colors disabled:opacity-50"
          >
            <Upload size={15} /> {restoringBackup ? 'Ripristino in corso...' : 'Carica backup'}
          </button>
          <input
            ref={backupFileInputRef}
            type="file"
            accept="application/json"
            onChange={handleBackupFileSelected}
            className="hidden"
          />
        </div>
      </div>

      <GroupLabel>Zona Pericolosa</GroupLabel>

      <div className="bg-surface dark:bg-surface rounded-panel border border-danger dark:border-danger shadow-sm divide-y divide-red-100 dark:divide-red-900/30 overflow-hidden">

        {/* Gestione Rubrica */}
        <div className="p-6">
          <h3 className="font-bold mb-1 flex items-center gap-2 text-danger dark:text-danger"><AlertTriangle size={18}/> Svuota Rubrica</h3>
          <p className="text-xs text-muted mb-4">
            Attualmente hai <span className="font-semibold text-accent">{Object.keys(contacts).length}</span> contatti in rubrica
            {' '}(<span className="text-success font-bold">{Object.values(contacts).filter(c => c.status === 'cliente').length} clienti</span>
            {' '}· <span className="text-accent font-bold">{Object.values(contacts).filter(c => c.status === 'potenziale').length} prospect</span>)
          </p>
          <button
            onClick={() => requireAuth(
              'Svuota tutti i contatti',
              `Stai per eliminare ${Object.keys(contacts).length} contatti. Questa azione non è reversibile e cancellerà anche deal, offerte e attività associate.`,
              () => { deleteAllContacts(); showToast('Rubrica svuotata', 'success'); }
            )}
            className="flex items-center gap-2 text-danger text-sm font-bold border border-danger dark:border-danger px-4 py-2 rounded-md hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors"
          >
            <Trash2 size={15} /> Svuota tutti i contatti
          </button>
        </div>

        {/* Svuota Catalogo Prodotti */}
        <div className="p-6">
          <h3 className="font-bold mb-1 flex items-center gap-2 text-danger dark:text-danger"><AlertTriangle size={18}/> Svuota Catalogo Prodotti</h3>
          <p className="text-xs text-muted mb-4">
            Attualmente hai <span className="font-semibold text-accent">{Object.keys(products).length}</span> articoli nel catalogo
          </p>
          <button
            onClick={() => requireAuth(
              'Svuota catalogo prodotti',
              `Stai per eliminare ${Object.keys(products).length} articoli dal catalogo. Questa azione non è reversibile.`,
              () => { clearProducts(); showToast('Catalogo prodotti svuotato', 'success'); }
            )}
            className="flex items-center gap-2 text-danger text-sm font-bold border border-danger dark:border-danger px-4 py-2 rounded-md hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors"
          >
            <Trash2 size={15} /> Svuota catalogo prodotti
          </button>
        </div>

        {/* Reset Storico Vendite */}
        <div className="p-6">
          <h3 className="font-bold mb-1 flex items-center gap-2 text-danger dark:text-danger"><AlertTriangle size={18}/> Svuota Storico Vendite</h3>
          <button
            onClick={() => {
              const nTransazioni = Object.keys(salesTransactions).length;
              const nStorico = storicoClienti.length;
              requireAuth(
                'Svuota storico vendite',
                `Stai per eliminare ${nStorico} clienti da Excel e ${nTransazioni} transazioni. I clienti CRM e i deal non verranno toccati.`,
                () => { clearSalesTransactions(); resetStorico(); showToast('Storico vendite svuotato', 'success'); }
              );
            }}
            className="flex items-center gap-2 text-danger text-sm font-bold border border-danger dark:border-danger px-4 py-2 rounded-md hover:bg-danger-soft dark:hover:bg-danger-soft transition-colors"
          >
            <Trash2 size={15} /> Svuota storico vendite
          </button>
        </div>

        {/* Reset Totale */}
        <div className="p-6 bg-danger-soft dark:bg-danger-soft">
          <h3 className="font-semibold mb-1 flex items-center gap-2 text-danger dark:text-danger"><AlertTriangle size={18}/> Resetta tutti i dati dell'App</h3>
          <p className="text-xs text-danger dark:text-danger mb-4">
            Verranno eliminati TUTTI i dati: clienti, deal, offerte, attività, prodotti, storico. Il tuo account rimarrà attivo ma il database sarà completamente azzerato.
          </p>
          <button
            onClick={() => requireAuth(
              'Resetta tutti i dati',
              'Verranno eliminati TUTTI i dati: clienti, deal, offerte, attività, prodotti, storico. Il tuo account rimarrà attivo ma il database sarà completamente azzerato.',
              () => { localStorage.removeItem('next-move-storage'); window.location.reload(); }
            )}
            className="flex items-center gap-2 text-status-foreground text-sm font-semibold bg-danger px-4 py-2 rounded-md hover:bg-danger transition-colors"
          >
            <Trash2 size={16} /> Resetta tutti i dati dell'App
          </button>
        </div>

      </div>

      {pendingAction && (
        <DeviceAuthModal
          title={pendingAction.title}
          description={pendingAction.description}
          onConfirm={() => { pendingAction.execute(); setPendingAction(null); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
};
