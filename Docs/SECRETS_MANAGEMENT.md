# Secrets Management & Key Rotation Policy

## Overview

This document outlines the secrets management strategy for Next Move CRM:
- **Firebase credentials**: Managed via environment variables
- **API tokens**: Rotated every 30 days
- **Secret versioning**: Allows gradual rollover without breaking requests
- **Audit trail**: Track when secrets change

---

## Chiave Gemini (funzioni AI)

Tutte le funzioni AI (analisi resoconti, conversazioni registrate, preparazione visita,
catalogo, trascrizioni) passano da endpoint `/api/*` autenticati con il token Firebase
dell'utente e usano la variabile d'ambiente `GEMINI_API_KEY` impostata su Vercel
(Production e Preview). La chiave non è mai nel browser, nello store, su Firestore o nei backup.

- Le analisi operative (`analizza-resoconto`, `analizza-resoconti`, `analizza-conversazione`)
  hanno un limite di 60 richieste all'ora per utente; le analisi strategiche restano a 5.
- Le chiavi personali salvate dalle versioni precedenti (campo `claudeApiKey` in
  `users/{uid}/settings/app` e nei file di backup scaricati prima di questa modifica) vengono
  cancellate dal cloud al primo accesso, ma **vanno comunque rigenerate** su
  aistudio.google.com: possono essere rimaste in vecchi backup.
- Rotazione: genera una nuova chiave, aggiorna `GEMINI_API_KEY` su Vercel, ridistribuisci,
  poi elimina la vecchia.

---

## Vercel Environment Variables (Production)

### Required Variables

```bash
# Firebase configuration (public, safe in code)
VITE_FIREBASE_API_KEY=AIzaSyDQGzNAWk5sa0V8i5Vo88W19cQDpv8_xLo
VITE_FIREBASE_AUTH_DOMAIN=next-move---crm---dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=next-move---crm---dev
VITE_FIREBASE_STORAGE_BUCKET=next-move---crm---dev.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=865584119053
VITE_FIREBASE_APP_ID=1:865584119053:web:9121bd89a27d6ae1e70444

# Le API verificano l'ID token Firebase dell'utente (vedi API_AUTH_SETUP.md):
# non esiste più un token condiviso da ruotare.

# Chiave Google Gemini (solo server, mai in variabili VITE_)
GEMINI_API_KEY=[chiave_gemini]

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://[region].upstash.io
UPSTASH_REDIS_REST_TOKEN=[token]

# Sentry (for monitoring)
VITE_SENTRY_DSN=https://[key]@[domain].ingest.sentry.io/[project-id]

# Firebase Admin (for Cloud Functions)
FIREBASE_ADMIN_KEY=[base64_encoded_service_account_json]
FIREBASE_PROJECT_ID=next-move---crm---dev

# Cloud Scheduler token
CLOUD_SCHEDULER_TOKEN=[random_32_chars]
```

### Setup in Vercel

```bash
# Using Vercel CLI
vercel env add GEMINI_API_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add VITE_SENTRY_DSN
vercel env add FIREBASE_ADMIN_KEY
vercel env add CLOUD_SCHEDULER_TOKEN

# List all env vars
vercel env ls

# Pull env vars to .env.local (dev only)
vercel env pull
```

---

## Token delle API

Non c'è più un token condiviso: ogni richiesta usa l'ID token Firebase dell'utente, che
Firebase rinnova da solo ogni ora. Per bloccare un utente basta disattivarlo in Firebase
Authentication o, nello spazio aziendale, impostarlo come «disattivato».

---

## Claude API Key Rotation (Every 90 Days)

### Step 1: Generate New Key

```bash
# Log in to https://console.anthropic.com
# Navigate to: Account → API Keys
# Click "Create key"
# Copy new key
```

### Step 2: Update Vercel

```bash
vercel env add ANTHROPIC_API_KEY "sk-ant-[new_key]"

# Redeploy
vercel deploy --prod
```

### Step 3: Revoke Old Key

```bash
# In Anthropic Console:
# 1. Click the old key's menu (...)
# 2. Select "Revoke"
# 3. Confirm
```

---

## Firebase API Key Rotation (Every 180 Days)

### Step 1: Generate New Key

```bash
# Firebase Console → Project Settings → API Keys
# Click "Create key"
# Choose "Browser key"
```

### Step 2: Update Environment

```bash
vercel env add VITE_FIREBASE_API_KEY "AIzaSy[new_key]"
vercel deploy --prod
```

### Step 3: Restrict Old Key (Firebase Console)

```
Project Settings → API Keys → [old key]
→ Restrict to Firestore only (or disable)
```

---

## Secret Versioning (In-Database)

Firestore documents include version metadata:

```json
{
  "id": "contact_123",
  "name": "John Doe",
  "_metadata": {
    "createdAt": "2025-05-04T10:00:00Z",
    "updatedAt": "2025-05-04T15:30:00Z",
    "updatedBy": "user_auth_id",
    "secretVersion": 1
  }
}
```

**Purpose**: If a secret is compromised and rotated, old API calls with the old secret can be rejected or logged.

### Implementation

```typescript
// api/claude.ts - validate secret version
const secretVersion = process.env.SECRET_VERSION || "1";
const tokenVersion = request.headers.get('X-Secret-Version') || "1";

if (tokenVersion < secretVersion - 1) {
  // Token is too old (more than 1 version behind)
  return res.status(401).json({
    error: 'Token expired',
    currentVersion: secretVersion,
    tokenVersion,
  });
}
```

---

## Audit Trail

Log all secret-related events:

```bash
# Check secret rotation history
gcloud logging read "resource.type=cloud_function AND jsonPayload.action=token_rotation" \
  --limit 20 \
  --format json

# Set up alerts for unauthorized token attempts
gcloud logging read "resource.type=api AND severity=ERROR AND jsonPayload.error~'Unauthorized'" \
  --limit 50
```

---

## Security Checklist

- [ ] All secrets stored in Vercel (not in code)
- [ ] `.env.local` in `.gitignore` (verify with `git status`)
- [ ] Firebase Security Rules deployed (`firestore.rules`)
- [ ] API token rotated every 30 days (set calendar reminder)
- [ ] Claude API key rotated every 90 days
- [ ] Firebase API key rotated every 180 days
- [ ] Grace period configured for token rollover
- [ ] Audit logging enabled
- [ ] Team informed of rotation schedule
- [ ] Monitoring set up for unauthorized access attempts

---

## Emergency Key Revocation

If a secret is compromised:

### Immediate Actions (Within 5 minutes)

1. **Revoke the compromised secret**:
   ```bash
   # Utente compromesso: disattivalo in Firebase Authentication
   # e revoca le sessioni (firebase auth: revokeRefreshTokens)
   
   # For Claude API: Revoke in Anthropic Console
   
   # For Firebase: Restrict in Firebase Console
   ```

2. **Redeploy**:
   ```bash
   vercel deploy --prod
   ```

3. **Verify new key is working**:
   ```bash
   curl -X POST https://[your-domain]/api/claude \
     -H "Authorization: Bearer sk_live_[emergency_new_token]" \
     -H "Content-Type: application/json" \
     -d '{"type": "prepara-visita", "data": {...}}'
   ```

4. **Alert the team**:
   - Slack: `#security-incidents`
   - Email to team
   - Update incident log

### Follow-up (Within 1 hour)

5. **Investigate**:
   - Check logs for unauthorized access
   - Identify how secret was exposed
   - Block suspicious IP addresses

6. **Document**:
   ```
   Incident: [name]
   Time discovered: [timestamp]
   Exposure vector: [how]
   Impact: [scope]
   Action taken: [token revoked at timestamp]
   Prevention: [what to do differently]
   ```

7. **Review and prevent**:
   - Audit code repository (was secret committed?)
   - Check Git history
   - Enable branch protection + secret scanning
   - Enable Dependabot alerts

---

## Monitoring & Alerts

### Sentry Alerts for Authentication Failures

```typescript
// Log auth failures
Sentry.captureMessage('Unauthorized API access attempt', {
  level: 'warning',
  tags: {
    endpoint: '/api/claude',
    status: 401,
    timestamp: new Date().toISOString(),
  },
});
```

### Cloud Logging Queries

```bash
# Find all 401 errors in last 24h
gcloud logging read "resource.type=api AND httpRequest.status=401 AND timestamp>='2025-05-03T00:00:00Z'" \
  --limit 100 --format=json

# Find rate limit hits (429)
gcloud logging read "resource.type=api AND httpRequest.status=429" \
  --limit 50 --format=json
```

---

## References

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Anthropic API Keys](https://console.anthropic.com/)
- [Google Cloud Secrets Manager](https://cloud.google.com/secret-manager/docs) (optional, for additional security)
