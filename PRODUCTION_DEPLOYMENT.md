# Vidhived.ai - Production Deployment Guide

## 🚀 Quick Start

This guide will help you deploy Vidhived.ai to production with a clean, optimized codebase.

## 📋 Prerequisites

- GitHub account
- Render account (or similar hosting platform)
- Basic knowledge of environment variables

## 🏗️ Project Structure

```
vidhived-ai/
├── backend/                 # Flask API
│   ├── app.py              # Main application (simplified)
│   ├── requirements.txt    # Python dependencies
│   ├── gunicorn.conf.py   # Production server config
│   └── .env.example       # Environment template
├── frontend/               # Next.js application
│   ├── app/               # Next.js 13+ app directory
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks (simplified)
│   ├── lib/               # API utilities
│   ├── package.json       # Node dependencies
│   └── .env.example       # Environment template
├── render.yaml            # Deployment configuration
└── simple_test.py         # Project structure validator
```

## 🔧 Local Development Setup

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python app.py
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your backend URL
npm run dev
```

### 3. Test Connection

```bash
python3 simple_test.py
```

## 🌐 Production Deployment

### Step 1: Prepare Repository

1. **Clean up unnecessary files** (already done):
   - Removed test files and complex implementations
   - Simplified PDF viewer and backend logic
   - Optimized for production deployment

2. **Verify project structure**:
   ```bash
   python3 simple_test.py
   ```

### Step 2: Deploy to Render

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Production-ready deployment"
   git push origin main
   ```

2. **Create Render Services**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the `render.yaml` file

3. **Set Environment Variables** in Render Dashboard:

   **Backend Service:**
   ```
   FLASK_ENV=production
   PORT=10000
   LOG_LEVEL=INFO
   CORS_ORIGINS=https://your-frontend-url.onrender.com
   ```

   **Frontend Service:**
   ```
   NODE_ENV=production
   NEXT_TELEMETRY_DISABLED=1
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   ```

### Step 3: Optional - Google Cloud Integration

For advanced AI features, add these to backend environment:

```
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/service-account.json
```

## 🔍 Features

### Current Implementation (Production Ready)

✅ **Core Features:**
- PDF upload and display
- Basic legal clause analysis
- Simple risk categorization (Red/Yellow/Green)
- Document text extraction
- Basic Q&A functionality
- Responsive design with dark mode

✅ **Technical Features:**
- Clean, maintainable codebase
- Proper error handling
- CORS configuration
- Production-ready logging
- Simplified PDF.js integration
- TypeScript support

### Optional Advanced Features

🔧 **With Google Cloud Setup:**
- AI-powered clause analysis
- OCR for scanned documents
- Advanced entity extraction
- Vertex AI integration

## 🐛 Troubleshooting

### Common Issues

1. **PDF Loading Timeout**:
   - Check CORS configuration
   - Verify PDF URL accessibility
   - Check browser console for errors

2. **Backend Connection Issues**:
   - Verify `NEXT_PUBLIC_API_URL` in frontend
   - Check `CORS_ORIGINS` in backend
   - Ensure both services are running

3. **Build Failures**:
   - Check Node.js version (use Node 18+)
   - Verify all dependencies are installed
   - Check for TypeScript errors

### Debug Commands

```bash
# Test project structure
python3 simple_test.py

# Check backend health
curl https://your-backend-url.onrender.com/health

# Check frontend build
cd frontend && npm run build
```

## 📊 Performance Optimization

### Backend Optimizations
- Simplified PDF processing
- Removed unnecessary dependencies
- Optimized memory usage
- Basic caching for document analysis

### Frontend Optimizations
- Simplified PDF.js integration
- Reduced bundle size
- Optimized component rendering
- Proper error boundaries

## 🔒 Security Considerations

- Environment variables for sensitive data
- CORS properly configured
- Input validation on file uploads
- Secure file handling
- No sensitive data in client-side code

## 📈 Monitoring

### Health Checks
- Backend: `/health` endpoint
- Frontend: Automatic Next.js health monitoring
- Render provides built-in monitoring

### Logs
- Backend: Structured logging with levels
- Frontend: Console logging for debugging
- Render dashboard for deployment logs

## 🚀 Next Steps

1. **Deploy and Test**: Follow the deployment steps above
2. **Monitor Performance**: Use Render's monitoring tools
3. **Add Features**: Implement additional features as needed
4. **Scale**: Upgrade Render plans as usage grows

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Render deployment logs
3. Test locally first to isolate issues
4. Check browser console for frontend errors

---

**Ready for Production!** 🎉

This simplified, clean implementation is optimized for reliable deployment and easy maintenance.