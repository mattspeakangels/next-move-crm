import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { checkLoginRateLimit, recordSuccessfulLogin, recordFailedLogin } from './loginRateLimiter';

const provider = new GoogleAuthProvider();
const isMobileOrStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && (navigator as any).standalone === true) ||
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loginError?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string>();

  useEffect(() => {
    // Handle redirect result after returning from Google login on mobile
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setLoginError(undefined);
          recordSuccessfulLogin(result.user.email).catch(console.error);
        }
      })
      .catch((error: any) => {
        recordFailedLogin(undefined).catch(console.error);
        if (error?.code === 'auth/unauthorized-domain') {
          setLoginError('Dominio non autorizzato. Contatta il supporto.');
        } else if (error?.code && error.code !== 'auth/no-auth-event') {
          setLoginError(error.message || 'Login fallito. Riprova.');
        }
      });

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      // Check rate limiting
      const rateLimitCheck = await checkLoginRateLimit();
      if (!rateLimitCheck.allowed) {
        const minutesRemaining = Math.ceil((rateLimitCheck.lockedUntil! - Date.now()) / 60000);
        setLoginError(`Too many login attempts. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`);
        recordFailedLogin(undefined).catch(console.error);
        return;
      }

      setLoginError(undefined);

      if (isMobileOrStandalone()) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        recordSuccessfulLogin(result.user.email).catch(console.error);
      }
    } catch (error: any) {
      recordFailedLogin(undefined).catch(console.error);

      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('Login annullato.');
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError('Il popup è stato bloccato. Abilita i popup e riprova.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError('Dominio non autorizzato. Contatta il supporto.');
      } else {
        setLoginError(error.message || 'Login fallito. Riprova.');
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, loginError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
