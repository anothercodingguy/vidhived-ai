# PDF Upload Troubleshooting Guide

## Quick Validation Steps

### 1. Test Upload Locally
```bash
cd backend
python test_upload.py http://localhost:5000
```

### 2. Test Upload on Render
```bash
python backend/test_upload.py https://vidhived-backend.onrender.com
```

### 3. Check Health Endpoint
```bash
curl https://vidhived-backend.onrender.com/health
```

## Common Issues and Solutions

### Issue: "Failed to load PDF" in Frontend

**Symptoms:**
- Upload returns 202 status
- Frontend PDF viewer shows "Failed to load PDF"
- Console shows network errors

**Debugging Steps:**

1. **Check Upload Response:**
   ```bash
   curl -X POST -F "file=@test.pdf" https://vidhived-backend.onrender.com/upload
   ```
   Should return JSON with `documentId` and `pdfUrl`.

2. **Test PDF URL Directly:**
   Copy the `pdfUrl` from upload response and open in browser.
   Should display the PDF or download it.

3. **Check Backend Logs:**
   Look for these log messages in Render dashboard:
   - "Uploaded PDF to GCS at uploads/<docId>.pdf, size N bytes"
   - "Generated signed URL for document <docId>" OR "Signed URL generation failed"

**Solutions:**

- **If signed URL generation fails:** Backend will automatically fallback to proxy endpoint
- **If proxy fails:** Check GCS bucket permissions and service account credentials
- **If CORS errors:** Ensure frontend origin is in CORS_ORIGINS environment variable

### Issue: GCS Upload Failures

**Symptoms:**
- Upload endpoint returns 500 error
- Logs show "GCS upload failed"

**Required Environment Variables:**
```
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/service-account.json
```

**Required GCS Permissions:**
- Storage Object Admin (for bucket)
- Service Account Token Creator (for signed URLs)

**Validation:**
```bash
# Test GCS connectivity
curl https://vidhived-backend.onrender.com/health
```

Look for `gcs_connectivity` status in response.

### Issue: Service Account Permissions

**Symptoms:**
- Upload works but signed URL generation fails
- Logs show "Signed URL generation failed: 403"

**Required IAM Roles:**
1. Storage Object Admin
2. Service Account Token Creator

**Grant Permissions:**
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
    --role="roles/iam.serviceAccountTokenCreator"
```

### Issue: Local Development Setup

**For Local Testing Without GCS:**

1. Set environment variables:
   ```bash
   export GOOGLE_CLOUD_AVAILABLE=false
   ```

2. Backend will use local file storage in `temp_uploads/` directory

3. PDF URLs will use proxy endpoint: `http://localhost:5000/pdf/<docId>`

## Environment Variables Reference

### Required for Production (Render):
```
GCP_PROJECT_ID=your-gcp-project
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/service-account.json
CORS_ORIGINS=https://your-frontend-domain.com
PORT=10000
```

### Optional:
```
CHECK_GCS_ON_START=true  # Test GCS connectivity at startup
LOG_LEVEL=INFO           # Logging level
GOOGLE_CLOUD_API_KEY=... # For Gemini AI features
```

## Testing Checklist

- [ ] Health endpoint returns 200 with GCS connectivity status
- [ ] Upload endpoint accepts PDF and returns 202 with documentId and pdfUrl
- [ ] PDF URL (signed or proxy) serves the uploaded PDF correctly
- [ ] Frontend can load the PDF in the viewer
- [ ] Document status endpoint shows processing/completed status
- [ ] CORS headers allow frontend domain

## Manual Test Commands

### Test Upload:
```bash
curl -X POST -F "file=@sample.pdf" \
  https://vidhived-backend.onrender.com/upload
```

### Test PDF Serving:
```bash
curl -I https://vidhived-backend.onrender.com/pdf/DOCUMENT_ID
```

### Test Health:
```bash
curl https://vidhived-backend.onrender.com/health | jq
```

## Render Deployment Checklist

- [ ] Service account JSON uploaded as secret file
- [ ] GOOGLE_APPLICATION_CREDENTIALS points to secret file path
- [ ] GCS bucket exists and is accessible
- [ ] Service account has required IAM roles
- [ ] CORS_ORIGINS includes frontend domain
- [ ] Build command installs all dependencies including PyPDF2
- [ ] Start command uses gunicorn for production

## Log Analysis

**Successful Upload Logs:**
```
INFO: Starting upload for document abc-123, filename: test.pdf
INFO: Read PDF file content: 12345 bytes
INFO: Uploaded PDF to GCS at uploads/abc-123.pdf, size 12345 bytes
INFO: Generated signed URL for document abc-123
```

**Fallback to Proxy Logs:**
```
ERROR: Signed URL generation failed for abc-123: 403 Forbidden
INFO: Using proxy URL for document abc-123: https://backend.com/pdf/abc-123
```

**GCS Connectivity Issues:**
```
ERROR: GCS upload failed for abc-123: 403 Forbidden
INFO: Using local storage fallback for document abc-123
```