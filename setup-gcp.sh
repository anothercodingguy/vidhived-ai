#!/bin/bash

# Vidhived.ai GCP Setup Script
# Run this script to set up GCP integration

set -e

echo "🚀 Setting up GCP for Vidhived.ai..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
read -p "Enter your GCP Project ID (or press Enter to create new): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID="vidhived-ai-$(date +%s)"
    echo "📝 Creating new project: $PROJECT_ID"
    gcloud projects create $PROJECT_ID --name="Vidhived AI"
fi

echo "🔧 Setting project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

echo "🔌 Enabling required APIs..."
gcloud services enable vision.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable aiplatform.googleapis.com

echo "👤 Creating service account..."
gcloud iam service-accounts create vidhived-service \
    --display-name="Vidhived Service Account" \
    --description="Service account for Vidhived AI application" || true

echo "🔐 Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:vidhived-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:vidhived-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/vision.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:vidhived-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:vidhived-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountTokenCreator"

echo "🔑 Creating service account key..."
gcloud iam service-accounts keys create backend/vidhived-key.json \
    --iam-account=vidhived-service@$PROJECT_ID.iam.gserviceaccount.com

echo "🪣 Creating GCS bucket..."
BUCKET_NAME="vidhived-documents-$(date +%s)"
gsutil mb gs://$BUCKET_NAME

echo "📝 Creating .env file..."
cat > backend/.env << EOF
# GCP Configuration
GCP_PROJECT_ID=$PROJECT_ID
GCP_REGION=us-central1
GCS_BUCKET_NAME=$BUCKET_NAME
GOOGLE_APPLICATION_CREDENTIALS=./vidhived-key.json

# Flask Configuration
FLASK_ENV=development
PORT=5000
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000

# Optional - Test GCS on startup
CHECK_GCS_ON_START=true
EOF

echo "✅ Setup complete!"
echo ""
echo "📋 Summary:"
echo "   Project ID: $PROJECT_ID"
echo "   Bucket Name: $BUCKET_NAME"
echo "   Key File: backend/vidhived-key.json"
echo "   Config File: backend/.env"
echo ""
echo "🧪 Test your setup:"
echo "   cd backend && python app.py"
echo "   curl http://localhost:5000/health"
echo ""
echo "🚀 For Render deployment, upload backend/vidhived-key.json as a secret file"
echo "   and set these environment variables:"
echo "   GCP_PROJECT_ID=$PROJECT_ID"
echo "   GCS_BUCKET_NAME=$BUCKET_NAME"
echo "   GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/vidhived-key-xxxxx.json"