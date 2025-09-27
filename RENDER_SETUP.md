# Simple Render Deployment Guide

## Quick Setup for cedar-defender-470311-r9

### Step 1: GCP Setup (5 minutes)

```bash
# Set your project
gcloud config set project cedar-defender-470311-r9

# Enable APIs
gcloud services enable vision.googleapis.com storage.googleapis.com aiplatform.googleapis.com

# Create service account
gcloud iam service-accounts create vidhived-service --display-name="Vidhived Service Account"

# Grant permissions
PROJECT_ID="cedar-defender-470311-r9"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:vidhived-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:vidhived-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/vision.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:vidhived-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountTokenCreator"

# Create key file
gcloud iam service-accounts keys create vidhived-key.json \
    --iam-account=vidhived-service@$PROJECT_ID.iam.gserviceaccount.com

# Create bucket
BUCKET_NAME="vidhived-docs-$(date +%s)"
gsutil mb gs://$BUCKET_NAME
echo "Your bucket: $BUCKET_NAME"
```

### Step 2: Render Deployment

1. **Deploy from GitHub**
   - Render Dashboard → New → Blueprint
   - Connect this repository
   - Render auto-detects `render.yaml`

2. **Upload Secret File**
   - Go to your **Backend Service** → Environment → Secret Files
   - Upload `vidhived-key.json`
   - Copy the file path (e.g., `/etc/secrets/vidhived-key-abc123.json`)

3. **Set Environment Variables**

   **Backend Service:**
   ```
   GCP_PROJECT_ID=cedar-defender-470311-r9
   GCS_BUCKET_NAME=your-bucket-name-from-step1
   GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/vidhived-key-abc123.json
   CORS_ORIGINS=https://vidhived-frontend.onrender.com
   ```

   **Frontend Service:**
   ```
   NEXT_PUBLIC_API_URL=https://vidhived-backend.onrender.com
   ```

### Step 3: Test

```bash
# Health check
curl https://vidhived-backend.onrender.com/health

# Upload test
curl -X POST -F "file=@test-sample.pdf" https://vidhived-backend.onrender.com/upload
```

## That's it! 🚀

Your legal document analysis platform is now live with:
- ✅ PDF upload to Google Cloud Storage
- ✅ OCR analysis with Vision API  
- ✅ AI-powered legal clause analysis
- ✅ Interactive PDF viewer
- ✅ Real-time processing updates