# Security Review - 2026-05-04

> **Reviewer**: Claude Security Review Agent (automated, scheduled Monday 9:00 AM)  
> **Scope**: `api/claude.ts`, `src/hooks/useClaudeAI.ts`, `src/store/useStore.ts`, `package.json`  
> **Previous Review**: SECURITY_FINDINGS.md (2026-04-26)

---

## Status Summary

| | Count |
|---|---|
| **Total Issues** | 10 |
| **Critical** 🔴 | 2 |
| **High** 🟠 | 3 |
| **Medium** 🟡 | 3 |
| **Low** 🟢 | 2 |

**Security Score: 6/10** (up from 3/10 — significant progress since last review)

---

## Progress Since Previous Review

| Issue | Previous | Status |
|---|---|---|
| Prompt Injection | 🔴 Critical | ✅ FIXED |
| CORS * wildcard | 🔴 Critical | ✅ FIXED |
| No authentication | 🔴 Critical | ✅ FIXED |
| Input validation (Zod) | 🟠 High | ✅ FIXED |
| Error messages generic | 🟠 High | ⚠️ Partial |
| Rate limiting | 🟠 High | ⚠️ Partial (broken in serverless) |
| @anthropic-ai/sdk outdated | 🟡 Medium | ❌ NOT FIXED |
| Structured logging | 🟡 Medium | ❌ NOT FIXED |

---

## Critical Issues 🔴

### 1. Rate Limit Ineffective in Vercel Serverless

**File**: `api/claude.ts` lines 258–281  
**Severity**: CRITICAL  
**CVSS estimate**: 7.5

**Problem**: The rate limit is implemented using a JavaScript `Map` in module scope. On Vercel's serverless runtime, each invocation may run in a fresh container — the `rateLimitMap` is reset on every cold start. In practice, the limit of 5 requests/day is **never enforced** in production.

```typescript
// This Map resets to empty on every cold start
const rateLimitMap = new Map<string, RateLimitEntry>();
```

**Impact**: An attacker with the bearer token can make unlimited API calls, draining Anthropic quota and incurring unbounded costs.

**Fix**: Replace with a persistent store. Upstash Redis is the standard solution for Vercel serverless:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(50, '1 d'),
});
```

**Effort**: 2–3 hours + Upstash free tier setup

---

### 2. Frontend Never Sends Authorization Header — API Always Returns 401

**File**: `src/hooks/useClaudeAI.ts` lines 23–27 / `api/claude.ts` lines 310–316  
**Severity**: CRITICAL (functional + security)

**Problem**: The API requires `Authorization: Bearer <token>` but the React hook never sends it:

```typescript
// useClaudeAI.ts — no Authorization header
const res = await fetch('/api/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },  // ← missing auth
  body: JSON.stringify({ type, data }),
});
```

Since no token is sent, `token` is `undefined` and the check `!token` is always `true` → **every AI call from the app returns 401**. Either the AI features are completely broken in production, or `ADMIN_API_TOKEN` is intentionally left unset (which removes authentication entirely).

**Fix**:

```typescript
// Option A: env var exposed to frontend (only if this is a single-user deployment)
const res = await fetch('/api/claude', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_API_TOKEN}`,
  },
  body: JSON.stringify({ type, data }),
});
```

```typescript
// Option B (better): remove token auth for same-origin calls, rely on CORS + session
// or implement a login flow that returns a short-lived session token
```

**Note**: Exposing a token via `VITE_*` makes it visible in browser JS — acceptable for a single-user internal tool, not for a multi-tenant app.

**Effort**: 1 hour

---

## High Issues 🟠

### 3. `xlsx` Package — Prototype Pollution (CVSS 7.8)

**File**: `package.json` — `"xlsx": "^0.18.5"`  
**Advisory**: GHSA-4r6h-8v6p-xvw6  
**CVSS**: 7.8 (HIGH)

The `xlsx` (SheetJS community edition) package `< 0.19.3` has a **prototype pollution** vulnerability when parsing untrusted Excel files. If users can upload `.xlsx` files (the app imports `LISTA CLIENTI VINK.XLSX`), a crafted file could pollute `Object.prototype` and affect all objects in the process.

**Fix**:

```bash
# Option A: Update (note: 0.19.x has breaking API changes)
npm install xlsx@0.19.3

# Option B: Use the maintained fork
npm install exceljs
```

**Effort**: 2–3 hours (API migration if switching to exceljs)

---

### 4. `serialize-javascript` — RCE via RegExp / Date (CVSS 8.1)

**Dependency chain**: `workbox-build → @rollup/plugin-terser → serialize-javascript ≤ 7.0.2`  
**Advisory**: GHSA-5c6j-r48x-rmvq

This is a **build-time** vulnerability: running `npm run build` with a maliciously crafted input could trigger RCE. Risk is lower if the build environment is trusted (CI/CD with controlled inputs), but still requires fixing.

**Fix**:

```bash
npm update workbox-build
# or override the transitive dep:
# Add to package.json:
"overrides": { "serialize-javascript": "^7.0.3" }
```

**Effort**: 1 hour

---

### 5. Sensitive CRM Data Stored Unencrypted in `localStorage`

**File**: `src/store/useStore.ts` line 174  
**Severity**: HIGH (data privacy)

```typescript
persist({ name: 'next-move-storage' })
```

All business-critical data — contacts, deals, offers, sales transactions — is serialized to `localStorage` without any encryption. Consequences:
- Any JavaScript on the same origin (including injected scripts via XSS) can read/dump everything
- Browser sync features may expose data
- Third-party browser extensions have access

**Fix**: For an internal single-user tool this is acceptable risk if the user understands it. For a multi-user deployment, migrate to server-side storage or use an encrypted persistence adapter:

```typescript
import { encryptedLocalStorage } from 'zustand-encrypted-persist'; // or similar
persist({ name: 'next-move-storage', storage: encryptedLocalStorage(process.env.STORAGE_KEY) })
```

**Effort**: 4–8 hours to migrate to server-side; 1–2 hours to add client-side encryption

---

## Medium Issues 🟡

### 6. Residual Information Disclosure in Error Responses

**File**: `api/claude.ts` lines 394, 400

Two error responses still leak internal details:

```typescript
// Line 394: reveals model names and HTTP status codes
res.status(500).json({ error: `Nessun modello disponibile (${lastError})` });
// e.g.: "claude-haiku-4-5: 429, claude-sonnet-4-6: 500"

// Line 400: exposes Zod schema field paths to client
res.status(400).json({ error: 'Invalid request data', details: issues });
// e.g.: "data.company: String must contain at least 1 character(s)"
```

**Fix**:

```typescript
// Line 394
console.error('[API] All models failed:', lastError);
res.status(503).json({ error: 'Servizio temporaneamente non disponibile' });

// Line 400
console.error('[API] Validation error:', issues);
res.status(400).json({ error: 'Dati non validi' });
```

**Effort**: 30 minutes

---

### 7. `@anthropic-ai/sdk` Still Outdated

**File**: `package.json` — `"@anthropic-ai/sdk": "^0.91.1"`

This was flagged in the previous review (2026-04-26) and has **not been fixed**. The package is ~2 years out of date. While the code uses raw `fetch` to the Anthropic API (not the SDK), this outdated package is still installed and could contain vulnerabilities.

**Fix**:

```bash
npm install @anthropic-ai/sdk@latest
# or remove it entirely since api/claude.ts uses raw fetch
```

**Effort**: 30 minutes

---

### 8. Vite Path Traversal in Dev Server (MODERATE)

**Dependency**: `vite ^5.1.5`  
**Advisory**: GHSA-4w7w-66w2-5vf9

Affects the **development server only** — not production builds. An attacker on the local network during development could read arbitrary files via crafted `.map` requests.

**Fix**:

```bash
npm install vite@latest
```

**Effort**: 30 minutes

---

## Low Issues 🟢

### 9. `targets: Record<string, any>` — Missing Type Safety

**File**: `src/store/useStore.ts` line 15

`any` bypasses TypeScript safety. Low security impact but enables accidental data corruption.

**Fix**: Define a proper `Target` type.

---

### 10. No Structured Audit Logging

**File**: `api/claude.ts`

Only `console.error` calls exist. No audit trail of: who called the API, what type of request, when, and whether it succeeded. This makes incident investigation difficult.

**Fix**: Add structured JSON logging (e.g. `console.log(JSON.stringify({ ts, type, ip, status }))`).

---

## Full Checklist

- [ ] **TODAY**: Fix Authorization header in `useClaudeAI.ts` (#2) — 1 hour
- [ ] **TODAY**: Fix error messages in api/claude.ts (#6) — 30 min
- [ ] **THIS WEEK**: Replace in-memory rate limit with Upstash Redis (#1) — 2–3 hours
- [ ] **THIS WEEK**: Update or replace `xlsx` package (#3) — 2–3 hours
- [ ] **THIS WEEK**: Fix `serialize-javascript` via overrides or update (#4) — 1 hour
- [ ] **THIS WEEK**: Update `@anthropic-ai/sdk` or remove it (#7) — 30 min
- [ ] **THIS WEEK**: Update Vite (#8) — 30 min
- [ ] **NEXT SPRINT**: Evaluate localStorage encryption or server-side storage (#5)
- [ ] **BACKLOG**: Add structured logging (#10)
- [ ] **BACKLOG**: Type `targets` properly (#9)

**Total estimated effort**: 8–12 hours

---

## Score

**6/10** — Significant improvement from 3/10. The three critical blockers from the previous review (auth, CORS, prompt injection) are resolved. Remaining work focuses on making the auth actually functional (#2), hardening rate limiting for serverless (#1), and updating vulnerable dependencies (#3, #4).

---

## Next Steps

1. **Verify if AI features work at all** — the auth header bug (#2) may mean the entire AI integration is currently broken. Fix this immediately.
2. **Set up Upstash Redis** for persistent rate limiting before any public exposure.
3. **Run `npm audit fix`** to resolve the four `HIGH`/`MODERATE` npm vulnerabilities.

---

**Report Created**: 2026-05-04  
**Reviewer**: Claude Security Review Agent (automated)  
**Next Review**: 2026-05-11 (Monday)
