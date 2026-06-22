import { useState } from 'react';
import { Target, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../lib/authContext';

type Mode = 'login' | 'register' | 'reset';

export function LoginView() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, loginError, clearLoginError } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 text-indigo-600 mb-10 justify-center">
          <Target size={36} strokeWidth={2.5} />
          <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Next<br/>Move</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 space-y-5">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
            {mode === 'login' && 'Accedi per continuare'}
            {mode === 'register' && 'Crea un nuovo account'}
            {mode === 'reset' && 'Recupera la password'}
          </p>

          {/* Form email/password */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full pl-9 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Password (nascosta in modalità reset) */}
            {mode !== 'reset' && (
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Password (min. 6 caratteri)' : 'Password'}
                  required
                  className="w-full pl-9 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}

            {/* Feedback reset */}
            {resetSent && (
              <p className="text-xs text-green-600 font-bold text-center">
                Email inviata! Controlla la tua casella.
              </p>
            )}

            {/* Errore */}
            {loginError && (
              <p className="text-xs text-red-500 font-bold text-center">{loginError}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition disabled:opacity-50"
            >
              {loading
                ? 'Attendere…'
                : mode === 'login' ? 'Accedi'
                : mode === 'register' ? 'Crea account'
                : 'Invia email di recupero'}
            </button>
          </form>

          {/* Divider (solo login/register) */}
          {mode !== 'reset' && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 font-bold">oppure</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
              </div>

              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-sm py-3 rounded-2xl transition disabled:opacity-50"
              >
                <GoogleIcon />
                Accedi con Google
              </button>
            </>
          )}

          {/* Link secondari */}
          <div className="flex flex-col items-center gap-2 text-xs text-gray-400">
            {mode === 'login' && (
              <>
                <button onClick={() => switchMode('register')} className="hover:text-indigo-600 font-bold transition">
                  Non hai un account? Registrati
                </button>
                <button onClick={() => switchMode('reset')} className="hover:text-indigo-600 transition">
                  Password dimenticata?
                </button>
              </>
            )}
            {mode === 'register' && (
              <button onClick={() => switchMode('login')} className="hover:text-indigo-600 font-bold transition">
                Hai già un account? Accedi
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => switchMode('login')} className="hover:text-indigo-600 font-bold transition">
                Torna al login
              </button>
            )}
          </div>
        </div>
      </div>
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
