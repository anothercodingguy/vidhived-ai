# Render.com Deployment Setup with GCP Integration

## Prerequisites

1. **GCP Project Setup** (complete this first)
2. **Render.com Account**
3. **GitHub Repository** (this repo)

## Step 1: GCP Setup

### 1.1 Set GCP Project
```bash
# Install gcloud CLI: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project cedar-defender-470311-r9
```

### 1.2 Enable APIs
```bash
gcloud services enable vision.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

### 1.3 Create Service Account
```bash
PROJECT_ID="cedar-defender-470311-r9"

gcloud iam service-accounts create vidhived-service \
    --display-name="Vidhived Service Account"
```

### 1.4 Grant Permissions
```bash
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
```

### 1.5 Create Service Account Key
```bash
gcloud iam service-accounts keys create vidhived-key.json \
    --iam-account=vidhived-service@$PROJECT_ID.iam.gserviceaccount.com
```

### 1.6 Create GCS Bucket
```bash
BUCKET_NAME="vidhived-documents-$(date +%s)"
gsutil mb gs://$BUCKET_NAME
echo "Your bucket name: $BUCKET_NAME"
```

## Step 2: Render.com Setup

### 2.1 Handle Service Account Key

Since Render doesn't have a "Secret Files" option, we'll use environment variables to store the service account key content:

1. **Convert your service account key to base64:**
   ```bash
   # On Linux/Mac:
   base64 -w 0 vidhived-key.json > key-base64.txt
   
   # On Windows (PowerShell):
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("vidhived-key.json")) > key-base64.txt
   ```

2. **Copy the base64 content** from `key-base64.txt` (it will be a long string)

### 2.2 Deploy from GitHub

1. **Go to Render Dashboard** → New → Blueprint
2. **Connect your GitHub repository**
3. **Select this repository**
4. **Render will automatically detect `render.yaml`**

### 2.3 Set Environment Variables

**For Backend Service:**
```
GCP_PROJECT_ID=cedar-defender-470311-r9
GCS_BUCKET_NAME=vidhived-documents-1234567890
GOOGLE_APPLICATION_CREDENTIALS_BASE64=<paste-your-base64-key-here>
CORS_ORIGINS=https://vidhived-frontend.onrender.com
CHECK_GCS_ON_START=true
LOG_LEVEL=INFO
PORT=10000
```

**Note:** Replace `<paste-your-base64-key-here>` with the actual base64 string from step 2.1

**For Frontend Service:**
```
NEXT_PUBLIC_API_URL=https://vidhived-backend.onrender.com
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## Step 3: Verification

### 3.1 Check Backend Health
```bash
curl https://vidhived-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "gcs_connectivity": {
    "status": "ok",
    "message": "GCS connectivity confirmed"
  }
}
```

### 3.2 Test Upload
```bash
curl -X POST -F "file=@test.pdf" https://vidhived-backend.onrender.com/upload
```

### 3.3 Check Frontend
Visit `https://vidhived-frontend.onrender.com` and test PDF upload.

## Troubleshooting

### Common Issues:

1. **GCS Connectivity Failed**
   - Check service account key path in environment variables
   - Verify bucket name is correct
   - Ensure service account has required permissions

2. **CORS Errors**
   - Update `CORS_ORIGINS` with correct frontend URL
   - Check both services are deployed and running

3. **Upload Fails**
   - Check backend logs in Render dashboard
   - Verify GCS bucket exists and is accessible
   - Test with small PDF file first

### Debug Commands:
```bash
# Test health endpoint
curl https://vidhived-backend.onrender.com/health | jq

# Test upload with verbose output
curl -v -X POST -F "file=@test.pdf" https://vidhived-backend.onrender.com/upload

# Check if PDF is accessible
curl -I https://vidhived-backend.onrender.com/pdf/DOCUMENT_ID
```

## Environment Variables Reference

### Required for Backend:
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCS_BUCKET_NAME`: Your GCS bucket name
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key file
- `CORS_ORIGINS`: Frontend URL for CORS

### Optional for Backend:
- `CHECK_GCS_ON_START=true`: Test GCS on startup
- `LOG_LEVEL=INFO`: Logging level
- `GOOGLE_CLOUD_API_KEY`: For Gemini AI features

### Required for Frontend:
- `NEXT_PUBLIC_API_URL`: Backend URL

## Security Checklist

- [ ] Service account key uploaded as secret file (not in code)
- [ ] Environment variables set correctly
- [ ] CORS origins configured for frontend domain
- [ ] GCS bucket has proper permissions
- [ ] Service account has minimal required permissions
- [ ] No credentials in git repository