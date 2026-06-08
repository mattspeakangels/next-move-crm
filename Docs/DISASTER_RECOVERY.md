# Disaster Recovery Plan — Next Move CRM

## FASE 1: Backup Automatico Firestore

### Setup Iniziale

#### 1. Creare Google Cloud Storage Bucket

```bash
# Set project ID
export PROJECT_ID="next-move---crm---dev"
export REGION="europe-west1"

# Create GCS bucket with versioning
gsutil mb -p $PROJECT_ID -l $REGION gs://next-move-firestore-backups

# Enable versioning
gsutil versioning set on gs://next-move-firestore-backups

# Set lifecycle policy (delete backups after 30 days)
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://next-move-firestore-backups
```

#### 2. Deploy Cloud Function

```bash
cd functions

# Create .env.yaml for Cloud Function environment
cat > .env.yaml << EOF
FIREBASE_PROJECT_ID: $PROJECT_ID
BACKUP_BUCKET_NAME: next-move-firestore-backups
CLOUD_SCHEDULER_TOKEN: $(openssl rand -hex 32)
EOF

# Deploy function
gcloud functions deploy firestoreBackup \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region $REGION \
  --entry-point firestoreBackup \
  --env-vars-file .env.yaml \
  --timeout 600 \
  --memory 2GB

# Get function URL (salva questo per Cloud Scheduler)
export BACKUP_FUNCTION_URL=$(gcloud functions describe firestoreBackup \
  --region $REGION \
  --format='value(httpsTrigger.url)')

echo "Function URL: $BACKUP_FUNCTION_URL"
```

#### 3. Configurare Cloud Scheduler

```bash
# Create Cloud Scheduler job (daily at 2am UTC)
gcloud scheduler jobs create http firestore-daily-backup \
  --location $REGION \
  --schedule "0 2 * * *" \
  --uri "$BACKUP_FUNCTION_URL" \
  --http-method POST \
  --headers "Authorization=Bearer <CLOUD_SCHEDULER_TOKEN>" \
  --oidc-service-account-email=<PROJECT_NUMBER>-compute@developer.gserviceaccount.com

# Verify job created
gcloud scheduler jobs describe firestore-daily-backup --location $REGION

# Test job manually
gcloud scheduler jobs run firestore-daily-backup --location $REGION
```

#### 4. Verificare il Backup

```bash
# List backups
gsutil ls -h gs://next-move-firestore-backups/firestore-backups/

# Check latest backup
gsutil ls -lh gs://next-move-firestore-backups/firestore-backups/ | tail -1

# Download a backup for inspection
gsutil cp gs://next-move-firestore-backups/firestore-backups/firestore-backup-2025-05-04-*.json ./backup-inspection.json
cat backup-inspection.json | jq '.contacts | length'
```

---

### Recovery Procedure

**⚠️ SCENARIO: Accidental data deletion in Firestore**

#### 1. Identify Backup to Restore

```bash
# List available backups
gsutil ls -lh gs://next-move-firestore-backups/firestore-backups/

# Choose a backup (e.g., firestore-backup-2025-05-04-020301.json)
export BACKUP_FILE="firestore-backups/firestore-backup-2025-05-04-020301.json"
```

#### 2. Restore via Cloud Function (Automated)

```bash
# Call restore function
curl -X POST "$RESTORE_FUNCTION_URL" \
  -H "Authorization: Bearer $CLOUD_SCHEDULER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"backupPath\": \"$BACKUP_FILE\"}"

# Response example:
# {
#   "success": true,
#   "message": "Restore completed successfully",
#   "backupPath": "firestore-backups/firestore-backup-2025-05-04-020301.json",
#   "restoredDocuments": 2847,
#   "timestamp": "2025-05-04T15:30:00.000Z"
# }
```

#### 3. Manual Restore (if function unavailable)

```bash
# Download backup locally
gsutil cp "gs://next-move-firestore-backups/$BACKUP_FILE" ./firestore-backup.json

# Via Firebase Console:
# 1. Go to Firebase Console → Firestore Database
# 2. Click "Import Collections"
# 3. Select the backup JSON file
# 4. Choose collections to import
# 5. Review and confirm

# Or via Firebase CLI:
firebase emulator:firestore
# (Load test data into emulator first, then export to production)
```

#### 4. Verify Restoration

```bash
# Count documents in each collection
for collection in contacts deals offers products activities assets salesTransactions; do
  count=$(curl -s "$FIREBASE_API/projects/$PROJECT_ID/databases/(default)/documents/$collection" \
    -H "Authorization: Bearer $FIREBASE_TOKEN" | jq '.documents | length')
  echo "$collection: $count documents"
done

# Compare with backup metadata
jq '._metadata' firestore-backup.json
```

---

### Monitoring & Alerts

#### Check Backup Status (Cloud Logging)

```bash
# View recent backup function logs
gcloud functions logs read firestoreBackup --limit 50 --region $REGION

# Search for errors
gcloud logging read "resource.type=cloud_function AND jsonPayload.severity=ERROR" \
  --limit 10 --format json

# Set up Monitoring alert (in Cloud Console)
# 1. Monitoring → Alerting → Create Policy
# 2. Condition: Cloud Scheduler job fails
# 3. Notification: Email / Slack
```

#### RTO / RPO

| Metric | Target | Actual |
|--------|--------|--------|
| **RTO** (Recovery Time Objective) | < 4 ore | ~2-3 ore (download + restore) |
| **RPO** (Recovery Point Objective) | 1 giorno | 24 ore (backup giornaliero alle 2am UTC) |
| **Backup Retention** | 30 giorni | 30 giorni (auto-delete policy) |
| **Restore Verification** | < 1 ora | 15 min (count docs + sample check) |

---

### Troubleshooting

#### Backup fails with "Permission denied"

```bash
# Grant Cloud Function service account permissions
export SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:Default compute service account" \
  --format='value(email)')

# Grant Firestore read permission
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/datastore.viewer"

# Grant Storage write permission
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectCreator"
```

#### Restore overwrites all data

✅ **This is intentional** — restore DOES overwrite. Before restoring to production:
1. Create Firestore backup of current state first
2. Test restore in staging environment
3. Communicate with team before production restore

#### Backup file is corrupted

```bash
# Validate JSON structure
jq '._metadata' gs://next-move-firestore-backups/firestore-backups/backup.json

# Try previous backup
gsutil ls gs://next-move-firestore-backups/firestore-backups/ | sort -r | head -3
```

---

## FASE 2: Rate Limiting Persistente

### Setup Upstash Redis

#### 1. Create Upstash Account & Redis Database

```bash
# 1. Go to https://console.upstash.com/
# 2. Create new Redis database (free tier)
# 3. Copy connection string and token

export UPSTASH_REDIS_REST_URL="https://..."
export UPSTASH_REDIS_REST_TOKEN="..."
```

#### 2. Add to Vercel Environment

```bash
# In Vercel dashboard or CLI:
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

#### 3. Modify `api/claude.ts`

```typescript
// Rate limiting with Upstash Redis
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const limit = 5; // 5 requests per hour
  const window = 3600; // 1 hour in seconds

  try {
    const response = await fetch(process.env.UPSTASH_REDIS_REST_URL + `/get/${key}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    });

    const count = response.ok ? parseInt(await response.json()) : 0;

    if (count >= limit) {
      return false; // Rate limit exceeded
    }

    // Increment counter
    await fetch(process.env.UPSTASH_REDIS_REST_URL + `/incr/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    });

    // Set expiration (first request only)
    if (count === 0) {
      await fetch(process.env.UPSTASH_REDIS_REST_URL + `/expire/${key}/${window}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      });
    }

    return true;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return true; // Allow on error (fail open)
  }
}
```

#### 4. Frontend Toast on Rate Limit

```typescript
// src/hooks/useClaudeAI.ts
if (response.status === 429) {
  // Show toast notification
  const message = 'Limite di richieste raggiunto. Riprova tra 1 ora.';
  // Implement with your toast library
  throw new Error(message);
}
```

---

## FASE 3: Secrets Management

### Firebase Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write their own data
    match /contacts/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /deals/{document=**} {
      allow read, write: if request.auth != null;
    }
    // ... repeat for all collections
  }
}
```

### API Token Implementation

**Backend** (`api/claude.ts`):
```typescript
const token = req.headers.authorization?.split('Bearer ')[1];
if (token !== process.env.ADMIN_API_TOKEN) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Frontend** (`src/hooks/useClaudeAI.ts`):
```typescript
const response = await fetch('/api/claude', {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_ADMIN_API_TOKEN}`,
  },
});
```

---

## FASE 4: Logging & Monitoring

### Sentry Setup

```bash
npm install @sentry/react @sentry/tracing
```

Initialize in `main.tsx`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

### Alert Rules

| Event | Severity | Action |
|-------|----------|--------|
| Error rate > 5% in 5min | 🔴 Critical | Slack notify oncall |
| Rate limit hit 10x/hour | 🟠 High | Email alert |
| Firestore write failures | 🟠 High | Slack → #incidents |
| New error type | 🟡 Medium | Daily digest |

---

## FASE 5: Data Validation

### Soft Delete Pattern

```typescript
// firestore schema
{
  id: "contact_123",
  name: "John Doe",
  deletedAt: null, // or timestamp if deleted
  _metadata: {
    createdAt: timestamp,
    updatedAt: timestamp,
    updatedBy: "user_123",
  }
}

// Query excludes deleted
db.collection('contacts')
  .where('deletedAt', '==', null)
  .get()
```

---

## FASE 6: API Authentication

Already implemented above (Fase 3 + Fase 2 sections)

---

## FASE 7: Dependency Updates

```bash
npm update xlsx --save
npm update serialize-javascript --save
npm audit fix
npm audit
```

---

## Recovery Checklist

- [ ] Backup Firestore restore test (< 4 hours recovery)
- [ ] Rate limit trigger test (429 on 6th request)
- [ ] API auth test (401 without token)
- [ ] Logging test (error in Sentry < 30sec)
- [ ] Soft delete test (deleted items filtered out)
- [ ] Dependency audit clean (0 vulns)
- [ ] Monitoring alerts configured
- [ ] Team trained on disaster procedures
