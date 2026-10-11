import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, X } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { Button, Field, Wordmark } from '../components/ui/Syrio';
import { DialogFrame } from '../components/ui/DialogFrame';
import { LegalView } from './LegalView';

type Mode = 'login' | 'register' | 'reset';

export function LoginView() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, loginError, clearLoginError } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  const switchMode = (m: Mode) => { setMode(m); clearLoginError(); setResetSent(false); };

  const handleGoogle = async () => {
    setLoading(true);
    try { await loginWithGoogle(); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      if (mode === 'reset') {
        await resetPassword(email.trim());
        setResetSent(true);
      } else if (mode === 'register') {
        await registerWithEmail(email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="syrio-login bg-canvas text-foreground">
      <section className="syrio-login-landscape">
        <Wordmark />
        <div><p className="font-serif text-3xl md:text-4xl leading-snug">Più direzione.<br />Più opportunità.<br />Più risultati.</p><p className="text-sm mt-5 text-white/80">La tua guida commerciale.</p></div>
      </section>
      <div className="syrio-login-form">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-6">
          <p className="syrio-tagline">YOUR SALES GUIDE</p>
          <h1 className="text-3xl mt-3">{mode === 'login' ? 'Benvenuto in SYRIO' : mode === 'register' ? 'Inizia il tuo percorso' : 'Recupera l’accesso'}</h1>
        </div>

        <div className="space-y-5">
          <p className="text-center text-sm text-secondary dark:text-muted font-medium">
            {mode === 'login' && 'Accedi per continuare'}
            {mode === 'register' && 'Crea un nuovo account'}
            {mode === 'reset' && 'Recupera la password'}
          </p>

          {/* Form email/password */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Field
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                aria-label="Email"
                autoComplete="email"
                required
                className="pl-9 pr-4 text-sm"
              />
            </div>

            {/* Password (nascosta in modalità reset) */}
            {mode !== 'reset' && (
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Field
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Password (min. 6 caratteri)' : 'Password'}
                  required
                  aria-label="Password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  minLength={mode === 'register' ? 6 : undefined}
                  className="pl-9 pr-12 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}

            {/* Feedback reset */}
            {resetSent && !loginError && (
              <p role="status" className="text-sm text-success text-center">
                Email inviata! Controlla la tua casella.
              </p>
            )}

            {/* Errore */}
            {loginError && (
              <p role="alert" className="text-sm text-danger text-center">{loginError}</p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading
                ? 'Attendere…'
                : mode === 'login' ? 'Accedi'
                : mode === 'register' ? 'Crea account'
                : 'Invia email di recupero'}
            </Button>
          </form>

          {/* Divider (solo login/register) */}
          {mode !== 'reset' && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-raised dark:bg-raised" />
                <span className="text-xs text-muted font-bold">oppure</span>
                <div className="flex-1 h-px bg-raised dark:bg-raised" />
              </div>

              {/* Google */}
              <Button
                onClick={handleGoogle}
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                <GoogleIcon />
                Accedi con Google
              </Button>
            </>
          )}

          {/* Link secondari */}
          <div className="flex flex-col items-center gap-2 text-xs text-muted">
            {mode === 'login' && (
              <>
                <button onClick={() => switchMode('register')} className="hover:text-accent font-bold transition">
                  Non hai un account? Registrati
                </button>
                <button onClick={() => switchMode('reset')} className="hover:text-accent transition">
                  Password dimenticata?
                </button>
              </>
            )}
            {mode === 'register' && (
              <button onClick={() => switchMode('login')} className="hover:text-accent font-bold transition">
                Hai già un account? Accedi
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => switchMode('login')} className="hover:text-accent font-bold transition">
                Torna al login
              </button>
            )}
          </div>
        </div>
        <button onClick={() => setLegalOpen(true)} className="text-sm text-muted hover:text-accent mt-6">Privacy, termini e contatti</button>
      </div>
      </div>
      {legalOpen && <DialogFrame className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="syrio-panel max-w-3xl w-full max-h-[90dvh] overflow-y-auto p-5"><button data-dialog-close onClick={() => setLegalOpen(false)} aria-label="Chiudi documenti legali" className="ml-auto flex p-2"><X size={20} /></button><LegalView /></div></DialogFrame>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  );
}
