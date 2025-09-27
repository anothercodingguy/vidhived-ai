# Render Deployment Checklist

## Pre-Deployment (GCP Setup)

- [ ] **GCP Project Created**
  ```bash
  gcloud projects create vidhived-ai-project
  ```

- [ ] **APIs Enabled**
  ```bash
  gcloud services enable vision.googleapis.com storage.googleapis.com aiplatform.googleapis.com
  ```

- [ ] **Service Account Created**
  ```bash
  gcloud iam service-accounts create vidhived-service
  ```

- [ ] **Permissions Granted**
  - [ ] Storage Object Admin
  - [ ] Vision User  
  - [ ] AI Platform User
  - [ ] Service Account Token Creator

- [ ] **Service Account Key Downloaded**
  ```bash
  gcloud iam service-accounts keys create vidhived-key.json
  ```

- [ ] **GCS Bucket Created**
  ```bash
  gsutil mb gs://vidhived-documents-$(date +%s)
  ```

## Render Deployment

- [ ] **Secret File Uploaded**
  - Go to Render → Account Settings → Secret Files
  - Upload `vidhived-key.json`
  - Note the file path (e.g., `/etc/secrets/vidhived-key-abc123.json`)

- [ ] **Repository Connected**
  - Go to Render → New → Blueprint
  - Connect GitHub repository
  - Select this repository

- [ ] **Backend Environment Variables Set**
  ```
  GCP_PROJECT_ID=your-project-id
  GCS_BUCKET_NAME=your-bucket-name
  GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/vidhived-key-xxxxx.json
  CORS_ORIGINS=https://vidhived-frontend.onrender.com
  CHECK_GCS_ON_START=true
  LOG_LEVEL=INFO
  ```

- [ ] **Frontend Environment Variables Set**
  ```
  NEXT_PUBLIC_API_URL=https://vidhived-backend.onrender.com
  ```

## Post-Deployment Verification

- [ ] **Backend Health Check**
  ```bash
  curl https://vidhived-backend.onrender.com/health
  ```
  Should return: `"gcs_connectivity": {"status": "ok"}`

- [ ] **Frontend Accessible**
  Visit: `https://vidhived-frontend.onrender.com`

- [ ] **Upload Test**
  ```bash
  curl -X POST -F "file=@test.pdf" https://vidhived-backend.onrender.com/upload
  ```

- [ ] **PDF Serving Test**
  Upload a PDF via frontend and verify it loads in the viewer

## Troubleshooting

### If GCS Connectivity Fails:
1. Check service account key path in environment variables
2. Verify bucket name is correct
3. Check service account permissions
4. Look at backend logs in Render dashboard

### If CORS Errors Occur:
1. Update `CORS_ORIGINS` with correct frontend URL
2. Ensure both services are deployed and running
3. Check frontend is using correct backend URL

### If Upload Fails:
1. Check backend logs for detailed error messages
2. Verify GCS bucket exists and is accessible
3. Test with a small PDF file first
4. Check service account has Storage Object Admin role

## Quick Commands

**Test Health:**
```bash
curl https://vidhived-backend.onrender.com/health | jq
```

**Test Upload:**
```bash
curl -v -X POST -F "file=@test.pdf" https://vidhived-backend.onrender.com/upload
```

**Check PDF Access:**
```bash
curl -I https://vidhived-backend.onrender.com/pdf/DOCUMENT_ID
```