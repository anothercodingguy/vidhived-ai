# Render Environment Variables

Copy these environment variables to your Render services:

## Backend Service Environment Variables

```
GCP_PROJECT_ID=cedar-defender-470311-r9
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS_BASE64=your-base64-encoded-service-account-key
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

- Your GCP project ID is: `cedar-defender-470311-r9`
- Replace `your-bucket-name` with your actual GCS bucket name  
- Replace `your-base64-encoded-service-account-key` with the base64 string from your service account JSON
- The frontend URL should match your actual frontend service URL
- The backend URL should match your actual backend service URL

## How to get the base64 key:

```bash
# On Linux/Mac:
base64 -w 0 vidhived-key.json

# On Windows (PowerShell):
[Convert]::ToBase64String([IO.File]::ReadAllBytes("vidhived-key.json"))
```