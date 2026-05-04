const REDIS_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

interface LoginAttempt {
  email?: string;
  timestamp: number;
  success: boolean;
}

const FAILED_ATTEMPTS_LIMIT = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
    window.innerWidth + 'x' + window.innerHeight,
  ];

  const str = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

async function getLoginAttempts(identifier: string): Promise<LoginAttempt[]> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured, skipping login rate limiting');
    return [];
  }

  try {
    const response = await fetch(`${REDIS_URL}/get/login_attempts_${identifier}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.result ? JSON.parse(data.result) : [];
  } catch (e) {
    console.error('Failed to fetch login attempts from Redis:', e);
    return [];
  }
}

async function recordLoginAttempt(identifier: string, email: string | undefined, success: boolean) {
  if (!REDIS_URL || !REDIS_TOKEN) return;

  try {
    const attempts = await getLoginAttempts(identifier);
    const now = Date.now();

    // Filter out attempts older than lockout duration
    const recentAttempts = attempts.filter(a => now - a.timestamp < LOCKOUT_DURATION_MS);

    recentAttempts.push({ email, timestamp: now, success });

    const response = await fetch(`${REDIS_URL}/set/login_attempts_${identifier}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify({
        value: JSON.stringify(recentAttempts),
        ex: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      }),
    });

    if (!response.ok) {
      console.error('Failed to record login attempt in Redis');
    }
  } catch (e) {
    console.error('Failed to record login attempt:', e);
  }
}

export async function checkLoginRateLimit(): Promise<{ allowed: boolean; remainingAttempts: number; lockedUntil?: number }> {
  const fingerprint = await getDeviceFingerprint();
  const attempts = await getLoginAttempts(fingerprint);
  const now = Date.now();

  // Count failed attempts in last lockout window
  const recentFailed = attempts.filter(
    a => !a.success && now - a.timestamp < LOCKOUT_DURATION_MS
  );

  const failedCount = recentFailed.length;

  if (failedCount >= FAILED_ATTEMPTS_LIMIT) {
    const oldestAttempt = recentFailed[0];
    const lockedUntil = oldestAttempt.timestamp + LOCKOUT_DURATION_MS;

    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil,
    };
  }

  return {
    allowed: true,
    remainingAttempts: FAILED_ATTEMPTS_LIMIT - failedCount,
  };
}

export async function recordSuccessfulLogin(email: string | null | undefined) {
  const fingerprint = await getDeviceFingerprint();
  await recordLoginAttempt(fingerprint, email ?? undefined, true);
}

export async function recordFailedLogin(email: string | null | undefined) {
  const fingerprint = await getDeviceFingerprint();
  await recordLoginAttempt(fingerprint, email ?? undefined, false);
}
