import { useCallback } from 'react';

const CRED_KEY = 'nm_auth_cred_id';

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function registerCredential(): Promise<string | null> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Next Move CRM', id: window.location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'nextmove-user',
          displayName: 'Next Move',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!credential) return null;
    const id = b64url(credential.rawId);
    localStorage.setItem(CRED_KEY, id);
    return id;
  } catch {
    return null;
  }
}

async function verifyCredential(credId: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          id: b64urlDecode(credId).buffer as ArrayBuffer,
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return credential !== null;
  } catch {
    return false;
  }
}

export type DeviceAuthResult = 'ok' | 'failed' | 'unavailable';

export async function deviceAuth(): Promise<DeviceAuthResult> {
  // Check WebAuthn support
  if (!window.PublicKeyCredential) return 'unavailable';

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return 'unavailable';
  } catch {
    return 'unavailable';
  }

  const storedId = localStorage.getItem(CRED_KEY);

  if (!storedId) {
    // First time: register credential (triggers biometric enrollment)
    const newId = await registerCredential();
    return newId ? 'ok' : 'failed';
  }

  // Subsequent times: verify
  const ok = await verifyCredential(storedId);
  if (ok) return 'ok';

  // Credential might have been deleted from device — re-register
  localStorage.removeItem(CRED_KEY);
  const newId = await registerCredential();
  return newId ? 'ok' : 'failed';
}

export function useDeviceAuth() {
  const verify = useCallback(async (): Promise<boolean> => {
    const result = await deviceAuth();
    if (result === 'unavailable') {
      // Device doesn't support biometrics — degrade gracefully (allow action)
      return true;
    }
    return result === 'ok';
  }, []);

  return { verify };
}
