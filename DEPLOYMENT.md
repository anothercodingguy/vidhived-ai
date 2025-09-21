# Deployment Guide for Render (FREE TIER)

## Option 1: Deploy using render.yaml (FREE - Recommended)

1. **Connect your GitHub repository to Render:**
   - Go to [render.com](https://render.com) and sign up/login (NO PAYMENT REQUIRED)
   - Click "New" → "Blueprint"
   - Connect your GitHub account and select this repository
   - Render will automatically detect the `render.yaml` file
   - Both services will deploy on the **FREE TIER**

2. **Set Environment Variables (Optional for basic functionality):**
   
   **Backend Service:**
   - `GOOGLE_CLOUD_PROJECT_ID`: Your Google Cloud project ID (optional)
   - `GOOGLE_CLOUD_API_KEY`: Your Google Cloud API key (optional)
   - `GOOGLE_CLOUD_STORAGE_BUCKET`: Your GCS bucket name (optional)
   - `FLASK_ENV`: `production` (already set)
   
   **Frontend Service:**
   - `NEXT_PUBLIC_API_URL`: Will be set automatically to your backend URL

## Option 1B: Fast Deployment (Recommended)

Use `render.yaml` (default) for reliable, fast builds:
- Backend: Free web service with minimal dependencies (3-5 min build)
- Frontend: Free web service
- Features: Basic PDF analysis, clause extraction, document processing
- Reliability: High (fewer dependencies = fewer build issues)

## Option 1C: Full AI Deployment (Advanced)

Use `render-full-ai.yaml` for complete AI features:
- Backend: Free web service with all AI dependencies (15-20 min build)
- Frontend: Free web service
- Features: Full AI analysis, Google Cloud integration, ML processing
- Note: Longer build times, may have dependency conflicts

## Option 2: Deploy Services Separately

### Backend Deployment (FREE)

1. **Create a new Web Service:**
   - Repository: Your GitHub repo
   - **Plan: FREE** (select this explicitly)
   - Build Command: `pip install -r backend/requirements.txt && python -m spacy download en_core_web_sm`
   - Start Command: `cd backend && gunicorn --config gunicorn.conf.py app:app`
   - Environment: `Python 3`

2. **Environment Variables (Optional):**
   ```
   FLASK_ENV=production
   PORT=10000
   ```

### Frontend Deployment (FREE)

**Option A: Web Service (FREE)**
1. **Create a new Web Service:**
   - Repository: Your GitHub repo
   - **Plan: FREE** (select this explicitly)
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npm start`
   - Environment: `Node`

**Option B: Alternative Web Service (FREE)**
1. **Create a new Web Service:**
   - Repository: Your GitHub repo
   - **Plan: FREE** (select this explicitly)
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npm start`
   - Environment: `Node`

2. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-service.onrender.com
   ```

## Deployment Options Summary

| Option | Build Time | AI Features | Dependencies | Best For |
|--------|------------|-------------|--------------|----------|
| `render.yaml` | 1-2 min | Basic | Core Flask only | **Recommended - Ultra Fast & Reliable** |
| `render-core.yaml` | 1-2 min | Basic | Core Flask only | Same as above |
| `render-fast.yaml` | 3-5 min | Basic + PDF | Minimal | PDF processing |
| `render-full-ai.yaml` | 15-20 min | Full AI | All packages | Advanced AI features |

## Google Cloud Setup (OPTIONAL)

**The app works without Google Cloud - it will use fallback analysis methods.**

If you want full AI features:

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

**Without Google Cloud:**
- Basic legal analysis still works
- Uses local NLP processing
- File upload works with temporary storage

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

## Free Tier Limitations & Optimizations

**Free Tier Includes:**
- ✅ 750 hours/month of runtime (enough for most projects)
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Git-based deployments

**Limitations:**
- 🔄 Services sleep after 15 minutes of inactivity
- ⏱️ Cold start delay (10-30 seconds) when waking up
- 💾 Limited memory and CPU
- 📊 Basic metrics only

**Optimizations Applied:**
- Backend uses optimized Gunicorn configuration for free tier
- Both services use free tier plans (no payment required)
- Health checks ensure service availability
- Efficient resource usage to stay within limits
- Dynamic routes work properly with web service deployment