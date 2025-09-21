# Vidhived.ai Deployment Guide

## 🚀 Production Deployment on Render.com

### Prerequisites
1. GitHub account with this repository
2. Render.com account
3. Google Cloud Platform account with billing enabled

### Step 1: GCP Setup

1. **Create GCP Project**
   ```bash
   gcloud projects create vidhived-ai-prod
   gcloud config set project vidhived-ai-prod
   ```

2. **Enable Required APIs**
   ```bash
   gcloud services enable vision.googleapis.com
   gcloud services enable storage.googleapis.com
   gcloud services enable aiplatform.googleapis.com
   ```

3. **Create Service Account**
   ```bash
   gcloud iam service-accounts create vidhived-service \
     --display-name="Vidhived Service Account"
   ```

4. **Assign Roles**
   ```bash
   PROJECT_ID="vidhived-ai-prod"
   SERVICE_ACCOUNT="vidhived-service@${PROJECT_ID}.iam.gserviceaccount.com"
   
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SERVICE_ACCOUNT}" \
     --role="roles/storage.objectAdmin"
   
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SERVICE_ACCOUNT}" \
     --role="roles/vision.user"
   
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SERVICE_ACCOUNT}" \
     --role="roles/aiplatform.user"
   ```

5. **Create Service Account Key**
   ```bash
   gcloud iam service-accounts keys create gcp-key.json \
     --iam-account=$SERVICE_ACCOUNT
   ```

6. **Create GCS Bucket**
   ```bash
   gsutil mb gs://vidhived-ai-storage
   gsutil cors set cors.json gs://vidhived-ai-storage
   ```

### Step 2: Render.com Deployment

1. **Connect Repository**
   - Go to Render.com dashboard
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select this repository

2. **Upload Service Account Key**
   - Go to Account Settings → Secret Files
   - Upload `gcp-key.json` file
   - Name it `gcp-key.json`

3. **Configure Environment Variables**
   The `render.yaml` will automatically configure most settings, but verify:
   - `GCP_PROJECT_ID`: Your GCP project ID
   - `GCS_BUCKET_NAME`: Your bucket name
   - `GOOGLE_APPLICATION_CREDENTIALS`: `/etc/secrets/gcp-key.json`

4. **Deploy**
   - Render will automatically deploy both services
   - Backend will be available at: `https://vidhived-backend.onrender.com`
   - Frontend will be available at: `https://vidhived-frontend.onrender.com`

### Step 3: Verification

1. **Test Backend**
   ```bash
   curl https://vidhived-backend.onrender.com/health
   ```

2. **Test Frontend**
   - Visit your frontend URL
   - Upload a test PDF
   - Verify analysis functionality

## 🐳 Docker Deployment (Alternative)

### Build Images
```bash
# Backend
cd backend
docker build -t vidhived-backend .

# Frontend
cd frontend
docker build -t vidhived-frontend .
```

### Run with Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - GCP_PROJECT_ID=your-project-id
      - GCS_BUCKET_NAME=your-bucket-name
    volumes:
      - ./gcp-key.json:/etc/secrets/gcp-key.json

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5000
    depends_on:
      - backend
```

## 🔧 Environment Configuration

### Backend Environment Variables
```env
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=us-central1
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/gcp-key.json
CORS_ORIGINS=https://your-frontend-url.com
LOG_LEVEL=INFO
```

### Frontend Environment Variables
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## 📊 Monitoring & Maintenance

### Health Checks
- Backend: `GET /health`
- Monitor GCP quotas and billing
- Check Render.com service logs

### Scaling
- Render.com auto-scales based on traffic
- Monitor response times and adjust instance types if needed
- Consider CDN for frontend assets

### Security
- Regularly rotate service account keys
- Monitor GCP audit logs
- Keep dependencies updated

## 🚨 Troubleshooting

### Common Issues
1. **GCP Authentication Errors**
   - Verify service account key is uploaded correctly
   - Check IAM permissions

2. **CORS Issues**
   - Ensure CORS_ORIGINS includes your frontend URL
   - Check browser developer tools for specific errors

3. **PDF Processing Failures**
   - Verify Vision API is enabled
   - Check GCS bucket permissions
   - Monitor API quotas

### Support
- Check Render.com service logs
- Review GCP Cloud Logging
- Monitor application metrics