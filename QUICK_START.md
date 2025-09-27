# Quick Start - Render Deployment

## 1. GCP Setup (5 minutes)

```bash
gcloud config set project cedar-defender-470311-r9
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

# Create key
gcloud iam service-accounts keys create vidhived-key.json \
    --iam-account=vidhived-service@$PROJECT_ID.iam.gserviceaccount.com

# Create bucket
BUCKET_NAME="vidhived-docs-$(date +%s)"
gsutil mb gs://$BUCKET_NAME
echo "Bucket: $BUCKET_NAME"
```

## 2. Render Deployment

1. **Deploy**: Render → New → Blueprint → Connect this repo
2. **Upload Key**: Backend Service → Environment → Secret Files → Upload `vidhived-key.json`
3. **Set Variables**:
   - Backend: `GCP_PROJECT_ID=cedar-defender-470311-r9`, `GCS_BUCKET_NAME=your-bucket`, `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/...`
   - Frontend: `NEXT_PUBLIC_API_URL=https://vidhived-backend.onrender.com`

## 3. Test

```bash
curl https://vidhived-backend.onrender.com/health
```

Done! 🚀