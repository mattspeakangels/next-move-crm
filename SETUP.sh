#!/bin/bash

# Disaster Recovery Setup Script
# Automatizza il setup di Vercel, Google Cloud, e Sentry

set -e

echo "🚀 Next Move CRM — Disaster Recovery Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ─── Step 1: Check Prerequisites ───────────────────────────────────────────

echo "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v npm &> /dev/null; then
  echo "${RED}❌ npm not found. Install Node.js first.${NC}"
  exit 1
fi

if ! command -v vercel &> /dev/null; then
  echo "${YELLOW}⚠️  vercel CLI not found. Installing...${NC}"
  npm install -g vercel
fi

if ! command -v firebase &> /dev/null; then
  echo "${YELLOW}⚠️  firebase CLI not found. Installing...${NC}"
  npm install -g firebase-tools
fi

if ! command -v gcloud &> /dev/null; then
  echo "${RED}❌ gcloud CLI not found. Install Google Cloud SDK.${NC}"
  echo "   https://cloud.google.com/sdk/docs/install"
  exit 1
fi

echo "${GREEN}✅ All prerequisites found${NC}"
echo ""

# ─── Step 2: Setup .env variables (local) ──────────────────────────────────

echo "${YELLOW}📝 Setting up local environment...${NC}"

if [ ! -f ".env.local" ]; then
  echo "Creating .env.local..."
  cat > .env.local << 'EOF'
VITE_FIREBASE_API_KEY=AIzaSyDQGzNAWk5sa0V8i5Vo88W19cQDpv8_xLo
VITE_FIREBASE_AUTH_DOMAIN=next-move---crm---dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=next-move---crm---dev
VITE_FIREBASE_STORAGE_BUCKET=next-move---crm---dev.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=865584119053
VITE_FIREBASE_APP_ID=1:865584119053:web:9121bd89a27d6ae1e70444

# Development tokens (replace with production values)
VITE_ADMIN_API_TOKEN=sk_dev_test_token
VITE_SENTRY_DSN=
EOF
  echo "${GREEN}✅ Created .env.local${NC}"
else
  echo "${YELLOW}⚠️  .env.local already exists, skipping${NC}"
fi
echo ""

# ─── Step 3: Vercel Setup ──────────────────────────────────────────────────

echo "${YELLOW}🔑 Vercel Environment Variables Setup${NC}"
echo "You need to set these in Vercel dashboard OR via CLI:"
echo ""

# Generate random token if not exists
ADMIN_TOKEN=$(openssl rand -hex 16 | sed 's/^/sk_live_/')

echo "Generated ADMIN_API_TOKEN: ${YELLOW}${ADMIN_TOKEN}${NC}"
echo ""
echo "Run these commands in your terminal:"
echo ""
echo "  ${YELLOW}vercel env add ADMIN_API_TOKEN${NC}"
echo "  # Then paste: ${ADMIN_TOKEN}"
echo ""
echo "  ${YELLOW}vercel env add VITE_ADMIN_API_TOKEN${NC}"
echo "  # Then paste: ${ADMIN_TOKEN}"
echo ""
echo "  ${YELLOW}vercel env add UPSTASH_REDIS_REST_URL${NC}"
echo "  # Get from: https://console.upstash.com/"
echo ""
echo "  ${YELLOW}vercel env add UPSTASH_REDIS_REST_TOKEN${NC}"
echo "  # Get from: https://console.upstash.com/"
echo ""
echo "  ${YELLOW}vercel env add VITE_SENTRY_DSN${NC}"
echo "  # Get from: https://sentry.io/ (create project → copy DSN)"
echo ""
echo "  ${YELLOW}vercel env add FIREBASE_ADMIN_KEY${NC}"
echo "  # Base64 encode: gcloud iam service-accounts keys create - --iam-account=[SA_EMAIL]"
echo ""
echo "  ${YELLOW}vercel env add CLOUD_SCHEDULER_TOKEN${NC}"
echo "  # Use same as ADMIN_API_TOKEN: ${ADMIN_TOKEN}"
echo ""

read -p "Press ENTER when you've added all Vercel env vars..."
echo ""

# ─── Step 4: Google Cloud Setup ────────────────────────────────────────────

echo "${YELLOW}☁️  Google Cloud Setup${NC}"

PROJECT_ID="next-move---crm---dev"
BUCKET_NAME="next-move-firestore-backups"

echo "Project: ${YELLOW}${PROJECT_ID}${NC}"
echo ""

read -p "Have you created a GCS bucket? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Create GCS bucket:"
  echo "  ${YELLOW}gsutil mb gs://${BUCKET_NAME}${NC}"
  echo "  ${YELLOW}gsutil versioning set on gs://${BUCKET_NAME}${NC}"
  read -p "Press ENTER when done..."
fi

# Deploy Cloud Function
read -p "Deploy Cloud Function? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd functions
  npm install

  echo "Deploying Cloud Function..."
  gcloud functions deploy firestoreBackup \
    --runtime nodejs20 \
    --trigger-http \
    --region europe-west1 \
    --allow-unauthenticated \
    --set-env-vars="FIREBASE_PROJECT_ID=${PROJECT_ID},BACKUP_BUCKET_NAME=${BUCKET_NAME},CLOUD_SCHEDULER_TOKEN=${ADMIN_TOKEN}" \
    --memory 2GB \
    --timeout 600

  echo "${GREEN}✅ Cloud Function deployed${NC}"
  cd ..
else
  echo "Skipping Cloud Function deployment"
fi
echo ""

# ─── Step 5: Firebase Rules ────────────────────────────────────────────────

echo "${YELLOW}🔐 Firebase Security Rules${NC}"

read -p "Deploy Firestore security rules? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  firebase login
  firebase deploy --only firestore:rules
  echo "${GREEN}✅ Security rules deployed${NC}"
else
  echo "Skipping security rules deployment"
fi
echo ""

# ─── Step 6: Final Build & Commit ─────────────────────────────────────────

echo "${YELLOW}🏗️  Building project...${NC}"
npm run build
echo "${GREEN}✅ Build successful${NC}"
echo ""

echo "${YELLOW}📦 Ready to commit${NC}"
read -p "Commit changes to git? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git add -A
  git commit -m "disaster recovery: backup, rate limiting, sentry, soft delete

- Cloud Function for Firestore backups
- Upstash Redis for persistent rate limiting
- Sentry integration for error monitoring
- Soft delete pattern for data recovery
- Firebase security rules
- Secrets management and key rotation procedures"

  echo "${GREEN}✅ Changes committed${NC}"

  read -p "Push to origin? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    echo "${GREEN}✅ Pushed to origin${NC}"
    echo ""
    echo "Vercel will automatically redeploy..."
  fi
fi

echo ""
echo "${GREEN}=========================================="
echo "✅ Disaster Recovery Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor Vercel deployment at https://vercel.com"
echo "2. Test backup: gcloud scheduler jobs run firestore-daily-backup"
echo "3. Test rate limiting: make 6 API requests (should fail on 6th)"
echo "4. Check Sentry dashboard for error tracking"
echo "5. Review DISASTER_RECOVERY.md for recovery procedures"
echo ""
