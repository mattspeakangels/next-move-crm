# Security Review - 2026-05-25

> **Reviewer**: Claude Security Review Agent (automated, scheduled Monday 9:00 AM)
> **Scope**: `api/claude.ts`, `api/cors.ts`, `api/upstash-ratelimit.ts`, `api/geocode.ts`, `src/hooks/useClaudeAI.ts`, `src/store/useStore.ts`, `src/lib/loginRateLimiter.ts`, `Config/package.json`, git status
> **Previous Review**: SECURITY_REVIEW_2026-05-16.md (Score: 5/10)

---

## Status Summary

| | Count |
|---|---|
| **Total Issues** | 11 |
| **Critical** 🔴 | 3 |
| **High** 🟠 | 2 |
| **Medium** 🟡 | 4 |
| **Low** 🟢 | 2 |

**Security Score: 4/10** (down from 5/10 — ZERO fixes applied since last review + new critical git hygiene issue)

---

## Progress Since Previous Review (2026-05-16)

| Issue | Previous | Current |
|---|---|---|
| VITE_ADMIN_API_TOKEN in frontend bundle | 🔴 Critical | 🔴 **UNRESOLVED** |
| SECRETS_MANAGEMENT.md.save with credentials | 🔴 Critical | 🔴 **UNRESOLVED — file still present** |
| Redis credentials in frontend (VITE_UPSTASH_*) | 🟠 High | 🟠 **UNRESOLVED** |
| x-forwarded-for IP spoofing | 🟠 High | 🟠 **UNRESOLVED** |
| Unauthenticated geocode endpoint | 🟡 Medium | 🟡 **UNRESOLVED** |
| Rate limiter fails open on Redis error | 🟡 Medium | 🟡 **UNRESOLVED** |
| Localhost CORS in production | 🟡 Medium | 🟡 **UNRESOLVED** |
| Token comparison timing attack | 🟢 Low | 🟢 **UNRESOLVED** |
| Client-side login rate limiter bypass | 🟢 Low | 🟢 **UNRESOLVED** |
| **.gitignore deleted — node_modules unprotected** | — | 🔴 **NEW CRITICAL** |
| **xlsx dependency CVE (prototype pollution)** | — | 🟡 **NEW MEDIUM** |

**None of the 9 issues from 2026-05-16 have been resolved.**

---

## Critical Issues 🔴

### 1. Auth Token Exposed in Frontend JavaScript Bundle (UNRESOLVED)

**File**: `src/hooks/useClaudeAI.ts:23`
**Status**: UNRESOLVED since 2026-05-16

```typescript
const token = import.meta.env.VITE_ADMIN_API_TOKEN;
```

Vite inlines all `VITE_*` env vars into the compiled JS bundle. `VITE_ADMIN_API_TOKEN` is readable by anyone opening DevTools. The server-side Bearer token check in `api/claude.ts:278` is completely defeated — an attacker can extract the token and send unlimited direct requests to the API.

**Impact**: Full auth bypass. Attacker can exhaust Anthropic API quota and accumulate costs. Rate limits are the only remaining defense.

**Fix**:
```typescript
// Replace VITE_ADMIN_API_TOKEN with Firebase ID token
const user = auth.currentUser;
const token = await user?.getIdToken();
```
Server-side: validate Firebase ID token via `admin.auth().verifyIdToken(token)` instead of string comparison.

---

### 2. `SECRETS_MANAGEMENT.md.save` Contains Firebase Credentials (UNRESOLVED)

**File**: `SECRETS_MANAGEMENT.md.save` (project root)
**Status**: UNRESOLVED since 2026-05-16 — file still present

The nano autosave file contains real Firebase project configuration including `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, and related credentials.

**This is now MORE dangerous than last week** — see Critical issue #3 below.

**Fix**:
```bash
rm "SECRETS_MANAGEMENT.md.save"
```

---

### 3. NEW: `.gitignore` Was Deleted — `node_modules` and Credentials File Unprotected

**File**: git working tree
**Severity**: CRITICAL
**Status**: NEW this week

`git status` reveals `.gitignore` has been deleted from version control. As a result:
- `SECRETS_MANAGEMENT.md.save` (with Firebase credentials) is now **untracked with no gitignore protection**
- `node_modules/` (entire tree, thousands of files) is untracked
- `dist/` build artifacts are untracked
- `LISTA CLIENTI E POTENZIALI VINK.XLSX` (customer PII) is untracked

A single `git add .` or `git add -A` would commit ALL of these to the repository, including the credentials file and all customer data.

**Additional finding**: `Config/firestore.rules`, `Config/package.json`, and all project configuration files were moved to a `Config/` subdirectory and are now untracked, meaning the production Firestore security rules and build configuration are not under version control.

**Fix**:
```bash
# Step 1: Recreate .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.*
*.save
*.xlsx
*.mov
*.pdf
.vercel/
.vite/
*.DS_Store
EOF

# Step 2: Delete credentials file
rm SECRETS_MANAGEMENT.md.save

# Step 3: Restore config files to root or update build scripts
git add .gitignore
git commit -m "Restore .gitignore and protect sensitive files"
```

---

## High Issues 🟠

### 4. Redis Credentials Exposed in Frontend Bundle (UNRESOLVED)

**File**: `src/lib/loginRateLimiter.ts:1-2`
**Status**: UNRESOLVED since 2026-05-16

```typescript
const REDIS_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;
```

The Upstash Redis REST token is bundled into the frontend JS. Any visitor can extract these credentials and directly read/write/delete Redis keys, including bypassing rate limit counters.

**Fix**: Move `loginRateLimiter.ts` logic entirely to a serverless function. Remove `VITE_UPSTASH_REDIS_REST_URL` and `VITE_UPSTASH_REDIS_REST_TOKEN` from Vercel environment variables.

---

### 5. `x-forwarded-for` IP Spoofing Bypasses IP Rate Limiting (UNRESOLVED)

**File**: `api/claude.ts:290-293`
**Status**: UNRESOLVED since 2026-05-16

```typescript
const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || ...
```

An attacker cycling through spoofed `X-Forwarded-For` headers can bypass the 20 req/hour IP rate limit entirely.

**Fix**: On Vercel, use the last IP in the `x-forwarded-for` chain (set by Vercel's own proxy, not the client), or use the Vercel-specific `request.ip` property.

---

## Medium Issues 🟡

### 6. Unauthenticated Geocoding Proxy Endpoint (UNRESOLVED)

**File**: `api/geocode.ts`
**Status**: UNRESOLVED since 2026-05-16

`/api/geocode` accepts arbitrary `address` and `city` parameters with no authentication and no rate limiting. Abusable as an anonymizing proxy and violates Nominatim ToS for automated use.

**Fix**: Add Bearer token or Firebase auth check at the top of the handler (same pattern as `api/claude.ts:274-287`).

---

### 7. Rate Limiter Fails Open on Redis Error (UNRESOLVED)

**File**: `api/upstash-ratelimit.ts:100-108`, `:267-274`
**Status**: UNRESOLVED since 2026-05-16

Both `checkRateLimit` and `checkRateLimitByIP` catch all errors and return `{ allowed: true }`. A Redis outage silently disables all rate limiting.

**Fix**:
```typescript
} catch (error) {
  console.error('Rate limit check failed — failing closed:', error);
  return { allowed: false, remaining: 0, resetAt: Date.now() + 3600000 };
}
```

---

### 8. Localhost Origins Always Allowed in Production CORS (UNRESOLVED)

**File**: `api/cors.ts:3-6`
**Status**: UNRESOLVED since 2026-05-16

```typescript
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
];
```

Localhost is always an allowed CORS origin regardless of environment. Combined with auth token in bundle (#1), any local server can send cross-origin API requests.

**Fix**:
```typescript
const defaultOrigins = process.env.NODE_ENV === 'development' ? [
  'http://localhost:5173',
  'http://localhost:3000',
] : [];
```

---

### 9. NEW: `xlsx` Dependency Has Known CVEs

**File**: `Config/package.json:18`
**Severity**: MEDIUM

```json
"xlsx": "^0.18.5"
```

SheetJS CE (`xlsx` v0.18.x) has multiple known CVEs including prototype pollution vulnerabilities that can be triggered when parsing attacker-controlled spreadsheet files. If users can upload XLSX files, this is exploitable.

**Fix**: Migrate to `exceljs` or `@xlsx-reader/node`, or upgrade to SheetJS Pro if XLSX parsing of user uploads is required. Alternatively, restrict XLSX processing to trusted input only (admin-generated files, not user uploads).

---

## Low Issues 🟢

### 10. Token Comparison Vulnerable to Timing Attacks (UNRESOLVED)

**File**: `api/claude.ts:278`
**Status**: UNRESOLVED since 2026-05-16

```typescript
if (!token || token !== validToken) {
```

Use `crypto.timingSafeEqual()` for constant-time comparison.

---

### 11. Client-Side Login Rate Limiter Bypass (UNRESOLVED)

**File**: `src/lib/loginRateLimiter.ts:13-27`
**Status**: UNRESOLVED since 2026-05-16

Device fingerprint (userAgent, language, screen size) is trivially spoofed. Rate limiting enforced client-side is not real protection. Redis credentials in bundle (#4) allow direct deletion of lockout keys.

---

## Checklist Fix

- [ ] **#3 CRITICAL (NEW)**: Recreate `.gitignore` — immediate priority to prevent accidental credential commit
- [ ] **#2 CRITICAL**: Delete `SECRETS_MANAGEMENT.md.save`
- [ ] **#1 CRITICAL**: Replace `VITE_ADMIN_API_TOKEN` with Firebase ID token validation
- [ ] **#4 HIGH**: Remove `VITE_UPSTASH_REDIS_REST_URL/TOKEN`, move login rate limiting server-side
- [ ] **#5 HIGH**: Fix IP extraction to use Vercel's trusted proxy header
- [ ] **#6 MEDIUM**: Add auth to `/api/geocode` endpoint
- [ ] **#7 MEDIUM**: Change rate limiter error handling to fail closed
- [ ] **#8 MEDIUM**: Exclude localhost CORS in production
- [ ] **#9 MEDIUM (NEW)**: Replace `xlsx` with a dependency that does not have prototype pollution CVEs
- [ ] **#10 LOW**: Use `crypto.timingSafeEqual` for token comparison
- [ ] **#11 LOW**: Move login rate limiting to server-side with real IP

---

## Score

**4/10** — Score dropped from 5/10. No fixes were applied from the 2026-05-16 review. The deletion of `.gitignore` introduced a new critical risk: one accidental `git add .` would commit Firebase credentials and thousands of `node_modules` files to the repository. The window of exposure for all issues has now been open for 9 days.

---

## Estimated Effort

| Priority | Issue | Effort |
|---|---|---|
| 🔴 CRITICAL | #3 Recreate `.gitignore` | 10 min |
| 🔴 CRITICAL | #2 Delete `.save` file | 5 min |
| 🔴 CRITICAL | #1 Replace VITE token auth with Firebase ID token | 2–3h |
| 🟠 HIGH | #4 Move login rate limit server-side | 2h |
| 🟠 HIGH | #5 Fix x-forwarded-for trust | 30 min |
| 🟡 MEDIUM | #6 Auth geocode endpoint | 30 min |
| 🟡 MEDIUM | #7 Fail closed on rate limit error | 15 min |
| 🟡 MEDIUM | #8 Dev-only localhost CORS | 15 min |
| 🟡 MEDIUM | #9 Replace xlsx dependency | 1–2h |
| 🟢 LOW | #10 timingSafeEqual | 15 min |
| 🟢 LOW | #11 Server-side login tracking | 1h |

**Total estimated effort**: ~8–9 hours

---

## Next Steps

1. **Right now (15 minutes)**: Recreate `.gitignore` and delete `SECRETS_MANAGEMENT.md.save` — prevents catastrophic credential exposure with zero development effort
2. **This sprint**: Replace `VITE_ADMIN_API_TOKEN` with Firebase ID token validation — fixes #1, #4, and #11 in one architectural change
3. **Next sprint**: Fix #5, #6, #7, #8, #9 — all mechanical, low-risk

**Recommendation**: The fix backlog from 2026-05-16 is fully unresolved. Escalate to developer. Run Fix Agent immediately on issues #2 and #3 (the two that can be done in minutes with zero risk). Do not run `git add .` until `.gitignore` is restored.
