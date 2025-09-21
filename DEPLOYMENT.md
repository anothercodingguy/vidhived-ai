# Deployment Guide for Render

## Option 1: Deploy using render.yaml (Recommended)

1. **Connect your GitHub repository to Render:**
   - Go to [render.com](https://render.com) and sign up/login
   - Click "New" → "Blueprint"
   - Connect your GitHub account and select this repository
   - Render will automatically detect the `render.yaml` file

2. **Set Environment Variables:**
   
   **Backend Service:**
   - `GOOGLE_CLOUD_PROJECT_ID`: Your Google Cloud project ID
   - `GOOGLE_CLOUD_API_KEY`: Your Google Cloud API key
   - `GOOGLE_CLOUD_STORAGE_BUCKET`: Your GCS bucket name
   - `FLASK_ENV`: `production`
   
   **Frontend Service:**
   - `NEXT_PUBLIC_API_URL`: Will be set automatically to your backend URL

## Option 2: Deploy Services Separately

### Backend Deployment

1. **Create a new Web Service:**
   - Repository: Your GitHub repo
   - Build Command: `pip install -r backend/requirements.txt && python -m spacy download en_core_web_sm`
   - Start Command: `cd backend && gunicorn --config gunicorn.conf.py app:app`
   - Environment: `Python 3`

2. **Environment Variables:**
   ```
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_CLOUD_API_KEY=your-api-key
   GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
   FLASK_ENV=production
   PORT=10000
   ```

### Frontend Deployment

1. **Create a new Web Service:**
   - Repository: Your GitHub repo
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npm start`
   - Environment: `Node`

2. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-service.onrender.com
   NODE_ENV=production
   ```

## Required Google Cloud Setup

1. **Enable APIs:**
   - Cloud Vision API
   - Cloud Storage API
   - Vertex AI API (for Gemini)

2. **Create Service Account:**
   - Create a service account with necessary permissions
   - Download the JSON key file
   - Set `GOOGLE_CLOUD_API_KEY` to the base64 encoded content of the JSON file

3. **Create Storage Bucket:**
   - Create a GCS bucket for file storage
   - Set appropriate permissions

## Health Checks

- Backend: `https://your-backend.onrender.com/health`
- Frontend: `https://your-frontend.onrender.com`

## Troubleshooting

1. **Build Failures:**
   - Check that all dependencies are in requirements.txt
   - Ensure spaCy model downloads successfully
   - Verify Python version compatibility

2. **Runtime Errors:**
   - Check environment variables are set correctly
   - Verify Google Cloud credentials
   - Check logs in Render dashboard

3. **CORS Issues:**
   - Ensure frontend URL is added to CORS origins in backend
   - Check that API_URL environment variable is correct

## Performance Optimization

- Backend uses Gunicorn with optimized worker configuration
- Frontend is built with Next.js production optimizations
- Static assets are served efficiently
- Health checks ensure service availability