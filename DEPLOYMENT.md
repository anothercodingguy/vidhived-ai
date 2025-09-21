# Simple Deployment Guide

## Deploy to Render (FREE)

1. **Go to [render.com](https://render.com)** - No payment required
2. **Click "New" → "Blueprint"**
3. **Connect GitHub** and select `anothercodingguy/vidhived-ai`
4. **Deploy automatically** - Render detects `render.yaml`
5. **Wait 3-5 minutes** for both services to build

## What You Get

✅ **PDF Upload & Viewing** - Upload and display legal documents  
✅ **Sample Analysis** - Demonstrates legal clause analysis UI  
✅ **Document Management** - Track uploaded documents  
✅ **Responsive Interface** - Works on desktop and mobile  
✅ **100% Free** - No payment required, ever

## Your URLs

After deployment, your app will be available at:
- **Frontend:** `https://vidhived-frontend.onrender.com`
- **Backend API:** `https://vidhived-backend.onrender.com`

## Features

- **PDF Upload:** Drag & drop or click to upload legal documents
- **PDF Viewer:** Built-in PDF viewer with navigation
- **Sample Analysis:** Demonstrates legal clause categorization
- **Document Status:** Real-time processing status
- **Responsive Design:** Works on all devices

## Troubleshooting

**If deployment fails:**
1. Check the build logs in Render dashboard
2. Ensure your GitHub repo is public
3. Try redeploying from the Render dashboard

**If the app doesn't load:**
1. Wait for both services to finish building
2. Check that both services show "Live" status
3. Visit the health check: `https://your-backend.onrender.com/health`

## Free Tier Info

- ✅ **750 hours/month** runtime (plenty for personal use)
- ✅ **Automatic HTTPS** and SSL certificates  
- ✅ **Custom domains** supported
- 🔄 **Services sleep** after 15 minutes of inactivity
- ⏱️ **10-30 second** wake-up time when accessed