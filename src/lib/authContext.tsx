import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User, onAuthStateChanged,
  signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider,
  signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './firebase';
import { checkLoginRateLimit, recordSuccessfulLogin, recordFailedLogin } from './loginRateLimiter';

const provider = new GoogleAuthProvider();
const isMobile = () =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && (navigator as any).standalone === true);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loginError?: string;
  clearLoginError: () => void;
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
      .catch((err) => {
        // Ignora errori "no redirect pending" — registra solo errori reali di auth
        if (err?.code && err.code !== 'auth/no-current-user') {
          recordFailedLogin(undefined).catch(console.error);
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

      try {
        // Preferiamo il popup ovunque: il redirect cross-domain si rompe sui
        // browser mobili (storage partitioning / ITP) lasciando l'utente bloccato
        // sulla schermata di login pur essendo autenticato su Google.
        const result = await signInWithPopup(auth, provider);
        recordSuccessfulLogin(result.user.email).catch(console.error);
      } catch (popupError: any) {
        // Se il popup non è praticabile (bloccato o non supportato dal browser),
        // su mobile ricadiamo sul redirect come ultima risorsa.
        if (
          isMobile() &&
          (popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/operation-not-supported-in-this-environment' ||
            popupError.code === 'auth/cancelled-popup-request')
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (error: any) {
      recordFailedLogin(undefined).catch(console.error);

      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('Login cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError('Login popup was blocked. Please allow popups and try again.');
      } else {
        setLoginError(error.message || 'Login failed. Please try again.');
      }
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setLoginError(undefined);
      const result = await signInWithEmailAndPassword(auth, email, password);
      recordSuccessfulLogin(result.user.email).catch(console.error);
    } catch (error: any) {
      const msg: Record<string, string> = {
        'auth/invalid-credential': 'Email o password non corretti.',
        'auth/user-not-found': 'Nessun account con questa email.',
        'auth/wrong-password': 'Password non corretta.',
        'auth/too-many-requests': 'Troppi tentativi. Riprova più tardi.',
        'auth/invalid-email': 'Email non valida.',
      };
      setLoginError(msg[error.code] ?? 'Accesso non riuscito. Riprova.');
      recordFailedLogin(undefined).catch(console.error);
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    try {
      setLoginError(undefined);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      recordSuccessfulLogin(result.user.email).catch(console.error);
    } catch (error: any) {
      const msg: Record<string, string> = {
        'auth/email-already-in-use': 'Questa email è già registrata.',
        'auth/invalid-email': 'Email non valida.',
        'auth/weak-password': 'Password troppo debole (minimo 6 caratteri).',
      };
      setLoginError(msg[error.code] ?? 'Registrazione non riuscita. Riprova.');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoginError(undefined);
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      setLoginError('Impossibile inviare email di reset. Controlla l\'indirizzo.');
    }
  };

  const clearLoginError = () => setLoginError(undefined);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout, loginError, clearLoginError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
