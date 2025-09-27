# Render Environment Variables

Copy these environment variables to your Render services:

## Backend Service Environment Variables

```
GCP_PROJECT_ID=your-gcp-project-id
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/vidhived-key-xxxxx.json
CORS_ORIGINS=https://vidhived-frontend.onrender.com
CHECK_GCS_ON_START=true
LOG_LEVEL=INFO
PORT=10000
FLASK_ENV=production
```

## Frontend Service Environment Variables

```
NEXT_PUBLIC_API_URL=https://vidhived-backend.onrender.com
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## How to Set Environment Variables in Render:

1. Go to your service in Render Dashboard
2. Click on "Environment" tab
3. Add each variable with its key and value
4. Click "Save Changes"
5. Service will automatically redeploy

## Important Notes:

- Replace `your-gcp-project-id` with your actual GCP project ID
- Replace `your-bucket-name` with your actual GCS bucket name  
- Replace `/etc/secrets/vidhived-key-xxxxx.json` with the actual path from your uploaded secret file
- The frontend URL should match your actual frontend service URL
- The backend URL should match your actual backend service URL