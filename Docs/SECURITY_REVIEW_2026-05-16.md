# Security Review - 2026-05-16

> **Reviewer**: Claude Security Review Agent (automated, scheduled Monday 9:00 AM)
> **Scope**: `api/claude.ts`, `api/cors.ts`, `api/upstash-ratelimit.ts`, `api/geocode.ts`, `src/hooks/useClaudeAI.ts`, `src/store/useStore.ts`, `src/lib/loginRateLimiter.ts`, `Config/package.json`
> **Previous Review**: SECURITY_REVIEW_2026-05-04.md (Score: 6/10)

---

## Status Summary

| | Count |
|---|---|
| **Total Issues** | 9 |
| **Critical** 🔴 | 2 |
| **High** 🟠 | 2 |
| **Medium** 🟡 | 3 |
| **Low** 🟢 | 2 |

**Security Score: 5/10** (down from 6/10 — new critical finding on auth token exposure)

---

## Progress Since Previous Review (2026-05-04)

| Issue | Previous | Current |
|---|---|---|
| Rate limit in-memory (Vercel cold starts) | 🔴 Critical | ✅ FIXED — Upstash Redis implemented |
| CORS wildcard | 🔴 Critical | ✅ FIXED |
| No authentication | 🔴 Critical | ✅ FIXED — Bearer token auth added |
| Zod input validation | ✅ Good | ✅ Still in place |
| Prompt injection sanitization | ✅ Good | ✅ Still in place |
| **VITE_ADMIN_API_TOKEN in bundle** | — | 🔴 NEW CRITICAL |
| **SECRETS_MANAGEMENT.md.save with secrets** | — | 🔴 NEW CRITICAL |

---

## Critical Issues 🔴

### 1. Auth Token Exposed in Frontend JavaScript Bundle

**File**: `src/hooks/useClaudeAI.ts:23`
**Severity**: CRITICAL

```typescript
const token = import.meta.env.VITE_ADMIN_API_TOKEN;
```

Vite inlines all `VITE_*` environment variables directly into the compiled JavaScript bundle at build time. Anyone who opens DevTools → Sources can read `VITE_ADMIN_API_TOKEN` in the minified JS. The server-side auth check (`token !== validToken`) is therefore trivially bypassed — anyone can copy the token and make direct POST requests to `/api/claude`.

**Impact**: Entire auth layer is defeated. An attacker can exhaust Anthropic API quota and accumulate costs uncapped (within rate limits only).

**Fix**: Do not put the auth token in VITE_ variables. Instead:
- Remove `VITE_ADMIN_API_TOKEN` from Vercel env
- Either remove the Bearer token requirement for same-origin requests (rely on CORS + Firebase Auth session cookie), or issue short-lived JWTs from a Firebase Cloud Function

```typescript
// Option A: Use Firebase ID token instead
const user = auth.currentUser;
const token = await user?.getIdToken();
// Then validate Firebase token server-side
```

---

### 2. `SECRETS_MANAGEMENT.md.save` Contains Real Firebase Credentials

**File**: `SECRETS_MANAGEMENT.md.save` (root of project, untracked)
**Severity**: CRITICAL

The file is a nano editor autosave containing the actual Firebase project config:

```
VITE_FIREBASE_API_KEY=AIzaSyDQGzNAWk5sa0V8i5Vo88W19cQDpv8_xLo
VITE_FIREBASE_PROJECT_ID=next-move---crm---dev
VITE_FIREBASE_APP_ID=1:865584119053:web:9121bd89a27d6ae1e70444
...
```

The file is NOT in `.gitignore` (only `.env` and `.env.local` patterns are excluded). A `git add .` or `git add -A` would commit these credentials to version control.

Note: Firebase web API keys are designed to be public (they identify the project, not authenticate the user). However, without proper Firestore Security Rules, a leaked Firebase API key can allow unauthenticated reads/writes. Verify that `firestore.rules` is deployed and restrictive.

**Fix**:
1. Delete the file immediately: `rm "SECRETS_MANAGEMENT.md.save"`
2. Add `*.save` to `.gitignore`
3. Verify Firestore Security Rules are deployed and only allow authenticated user access

---

## High Issues 🟠

### 3. Redis Credentials Exposed in Frontend Bundle

**File**: `src/lib/loginRateLimiter.ts:1-2`
**Severity**: HIGH

```typescript
const REDIS_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;
```

Same issue as #1 but worse: the Upstash Redis REST token is bundled into the JS. An attacker can use the raw Upstash REST API to:
- Enumerate all rate limit keys
- Reset their own (or others') rate limit counters
- Set arbitrary keys (potential for cache poisoning)

The Upstash REST token provides full read/write access to the Redis instance.

**Fix**: Move login rate limiting entirely to a server-side function (Vercel Serverless or Firebase Cloud Function). Remove `VITE_UPSTASH_REDIS_REST_URL` and `VITE_UPSTASH_REDIS_REST_TOKEN` from Vercel env entirely.

---

### 4. `x-forwarded-for` IP Spoofing Bypasses IP Rate Limiting

**File**: `api/claude.ts:290-293`
**Severity**: HIGH

```typescript
const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
                  (req.headers['x-real-ip'] as string) ||
                  'unknown';
```

`x-forwarded-for` can be set by the client to any value. An attacker can send:
```
X-Forwarded-For: 1.2.3.4, 5.6.7.8, 9.10.11.12
```
...cycling through thousands of fake IPs to bypass the 20 req/hour IP rate limit.

**Fix**: On Vercel, trust only Vercel's own infrastructure header. The real client IP is available via the `request.ip` property (Express) or the last hop in `x-forwarded-for` set by Vercel's proxy, not the first. Check Vercel documentation for the authoritative header.

---

## Medium Issues 🟡

### 5. Unauthenticated Geocoding Proxy Endpoint

**File**: `api/geocode.ts`
**Severity**: MEDIUM

The `/api/geocode` endpoint requires no authentication and has no rate limiting. It accepts arbitrary `address` and `city` query parameters and proxies requests to Nominatim (OpenStreetMap). This can be used for:
- Bandwidth abuse against Nominatim (which violates their ToS for bulk/automated use)
- Using your server as an anonymizing proxy

**Fix**: Add either Firebase Auth validation or the same Bearer token check used by `/api/claude`.

---

### 6. Rate Limiter Fails Open on Redis Error

**File**: `api/upstash-ratelimit.ts:100-108`, `api/upstash-ratelimit.ts:267-275`
**Severity**: MEDIUM

Both `checkRateLimit` and `checkRateLimitByIP` catch all errors and return `{ allowed: true }`. If Upstash Redis is unavailable (outage, misconfigured env vars, network error), all rate limiting is silently disabled.

Combined with issue #1 (auth token in bundle), a targeted Redis outage + auth token extraction = zero protection window.

**Fix**: Fail closed instead of open, or at minimum log a Sentry alert so the degraded state is visible:

```typescript
} catch (error) {
  console.error('Rate limit check failed — failing closed for safety:', error);
  // Sentry.captureException(error);
  return { allowed: false, remaining: 0, resetAt: Date.now() + 3600000 };
}
```

---

### 7. Localhost Origins Always Allowed in Production CORS

**File**: `api/cors.ts:3-6`
**Severity**: MEDIUM

```typescript
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
];
```

These origins are always included regardless of environment. In production, localhost should not be an allowed CORS origin. Any locally running server on an attacker's machine (that has the auth token — see issue #1) can make cross-origin requests that pass CORS checks.

**Fix**: Conditionally include localhost origins only when `process.env.NODE_ENV === 'development'`.

---

## Low Issues 🟢

### 8. Token Comparison Vulnerable to Timing Attacks

**File**: `api/claude.ts:278`
**Severity**: LOW

```typescript
if (!token || token !== validToken) {
```

Simple string comparison leaks information about the correct token length via timing. For secrets, use `crypto.timingSafeEqual()`:

```typescript
import { timingSafeEqual } from 'crypto';
const tokenBuf = Buffer.from(token.padEnd(validToken.length));
const validBuf = Buffer.from(validToken);
if (tokenBuf.length !== validBuf.length || !timingSafeEqual(tokenBuf, validBuf)) { ... }
```

---

### 9. Client-Side Login Rate Limiter Easily Bypassed

**File**: `src/lib/loginRateLimiter.ts:13-27`
**Severity**: LOW

The device fingerprint is computed from `navigator.userAgent`, language, timezone, and screen size — all trivially spoofed. The lockout is enforced only client-side (the Redis key is keyed on this fingerprint). A bot can bypass it by rotating User-Agent strings.

The Redis credentials issue (#3) also allows an attacker to directly delete lockout keys.

**Fix**: Move failed login counting to a server-side function using the real client IP (from Vercel's trusted proxy header).

---

## Checklist Fix

- [ ] **#1 CRITICAL**: Remove `VITE_ADMIN_API_TOKEN`, replace auth with Firebase ID token validation
- [ ] **#2 CRITICAL**: Delete `SECRETS_MANAGEMENT.md.save`, add `*.save` to `.gitignore`
- [ ] **#3 HIGH**: Remove `VITE_UPSTASH_REDIS_REST_URL/TOKEN` from frontend, move login rate limiting server-side
- [ ] **#4 HIGH**: Fix IP extraction to use Vercel's trusted proxy header
- [ ] **#5 MEDIUM**: Add auth to `/api/geocode` endpoint
- [ ] **#6 MEDIUM**: Change rate limiter error handling to fail closed
- [ ] **#7 MEDIUM**: Exclude localhost CORS origins in production
- [ ] **#8 LOW**: Use `crypto.timingSafeEqual` for token comparison
- [ ] **#9 LOW**: Move login rate limiting to server-side with real IP

---

## Score

**5/10** — The server-side security improvements from the previous review (Upstash Redis, CORS whitelist, Zod validation, prompt sanitization) are solid. However, the `VITE_ADMIN_API_TOKEN` exposure fundamentally undermines the auth layer, and Redis credentials in the bundle are a new high-severity finding. Priority fix is #1 and #2.

---

## Estimated Effort

| Priority | Issue | Effort |
|---|---|---|
| 🔴 CRITICAL | #1 Replace VITE token auth with Firebase ID token | 2–3h |
| 🔴 CRITICAL | #2 Delete .save file + gitignore | 5 min |
| 🟠 HIGH | #3 Move login rate limit server-side | 2h |
| 🟠 HIGH | #4 Fix x-forwarded-for trust | 30 min |
| 🟡 MEDIUM | #5 Auth geocode endpoint | 30 min |
| 🟡 MEDIUM | #6 Fail closed on rate limit error | 15 min |
| 🟡 MEDIUM | #7 Dev-only localhost CORS | 15 min |
| 🟢 LOW | #8 timingSafeEqual | 15 min |
| 🟢 LOW | #9 Server-side login tracking | 1h |

**Total estimated effort**: ~7 hours

---

## Next Steps

1. **Immediate** (today): Delete `SECRETS_MANAGEMENT.md.save` — zero risk, 5 minutes
2. **This sprint**: Replace `VITE_ADMIN_API_TOKEN` with Firebase ID token validation — this fixes issues #1, #3, and partially #9 in one architectural change
3. **Next sprint**: Fix #4, #5, #6, #7 — all mechanical and low-risk changes

**Recommendation**: Run the Fix Agent next Monday if #1 and #2 are not resolved by then.
