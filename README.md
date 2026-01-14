# Vidhived.ai - Legal Co-pilot Application

A fullstack AI-powered legal document analysis platform that helps users upload PDFs, analyze legal clauses, and get intelligent insights through an interactive interface.

## 🏗 Tech Stack

**Backend:**
- Python 3.11+, Flask, gunicorn
- Groq Cloud API (Llama 3, Mixtral)
- PyMuPDF (fitz) for PDF text extraction & analysis
- SQLAlchemy (SQLite/PostgreSQL) for persistence

**Frontend:**
- Next.js 14 (TypeScript, React)
- Tailwind CSS for styling
- PDF.js for document rendering
- Interactive PDF overlay system

**Infrastructure:**
- Render.com deployment
- Docker containerization

## 🚀 Features

- **PDF Upload & Storage**: Secure local/cloud storage
- **OCR Analysis**: Extract text and bounding boxes using PyMuPDF
- **Legal Clause Scoring**: AI-powered risk assessment (Red/Yellow/Green)
- **Interactive PDF Viewer**: Click clauses to highlight in PDF
- **🤖 Enhanced AI Chat**: Powered by Groq (Llama 3 / Mixtral) for intelligent document Q&A
- **📋 AI Document Summaries**: Comprehensive analysis with key parties, dates, and obligations
- **Real-time Processing**: Live status updates during analysis

## 📋 Prerequisites

### 1. Groq API Key
1. Sign up at [https://console.groq.com/](https://console.groq.com/)
2. Create a new API Key
3. Save it as `GROQ_API_KEY`

### 2. Python & Node.js
- Python 3.11+
- Node.js 18+

## 🛠 Local Development

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your GCP configuration
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Render.com Deployment

1. **Fork this repository**

2. **Create Render account** and connect your GitHub

4. **Deploy using render.yaml**
   - Create new Blueprint in Render
   - Connect your forked repository
   - Render will automatically deploy both services

5. **Set Environment Variables**
   ```
   GROQ_API_KEY=your-api-key
   ```

### Manual Docker Deployment

**Backend:**
```bash
cd backend
docker build -t vidhived-backend .
docker run -p 5000:5000 \
  -e GCP_PROJECT_ID=your-project-id \
  -e GCS_BUCKET_NAME=your-bucket-name \
  -v /path/to/gcp-key.json:/etc/secrets/gcp-key.json \
  vidhived-backend
```

**Frontend:**
```bash
cd frontend
docker build -t vidhived-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:5000 \
  vidhived-frontend
```

## 🧪 Testing & Validation

### PDF Upload Testing

**Test Upload Locally:**
```bash
cd backend
python test_upload.py http://localhost:5000
```

**Test Upload on Production:**
```bash
python backend/test_upload.py https://vidhived-backend.onrender.com
```

**Manual Upload Test:**
```bash
curl -X POST -F "file=@sample.pdf" https://vidhived-backend.onrender.com/upload
```

### Backend Validation
```bash
cd backend
python -m py_compile app.py
# Test health endpoint
curl http://localhost:5000/health
```

### Frontend Validation
```bash
cd frontend
npm run lint
npm run build
```

### Troubleshooting

See the [deployment section](#-deployment) for setup instructions.

## 📡 API Endpoints

### Backend API

- `GET /health` - Health check
- `POST /upload` - Upload PDF file
- `GET /pdf/<docId>` - Get PDF signed URL
- `GET /document/<docId>` - Get analysis status/results
- `POST /ask` - Ask questions about document

### Example API Usage

**Upload Document:**
```bash
curl -X POST -F "file=@document.pdf" http://localhost:5000/upload
```

**Check Status:**
```bash
curl http://localhost:5000/document/{documentId}
```

**Ask Question:**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"documentId":"123","query":"What are the payment terms?"}' \
  http://localhost:5000/ask
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=us-central1
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/gcp-key.json
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key
CORS_ORIGINS=https://your-frontend-url.com
LOG_LEVEL=INFO
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## 🏛 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Google Cloud  │
│   (Next.js)     │◄──►│    (Flask)      │◄──►│   (Vision API)  │
│                 │    │                 │    │   (Storage)     │
│ • PDF Viewer    │    │ • OCR Pipeline  │    │   (Vertex AI)   │
│ • Clause UI     │    │ • Clause Scorer │    │                 │
│ • Chat Interface│    │ • API Endpoints │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔍 Legal Clause Analysis

The system analyzes legal documents using:

1. **OCR Extraction**: Vision API extracts text and bounding boxes
2. **Clause Identification**: Regex patterns identify legal clauses
3. **Risk Scoring**: ML-based scoring (Red/Yellow/Green categories)
4. **AI Explanations**: Vertex AI generates plain-English explanations

### Risk Categories

- **Red (High Risk)**: Penalty clauses, liability terms, termination conditions
- **Yellow (Medium Risk)**: Payment terms, delivery dates, warranties
- **Green (Low Risk)**: General terms, standard clauses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the [documentation](docs/)
- Review the [API documentation](docs/api.md)

## 📁 Project Structure

```
vidhived/
├── backend/           # Flask API with GCP integration
├── frontend/          # Next.js application
├── .github/          # CI/CD workflows
├── render.yaml       # Production deployment config
```

## 🚀 Quick Deploy to Production

1. **Clone this repository**
   ```bash
   git clone https://github.com/anothercodingguy/vidhived-ai.git
   cd vidhived-ai
   ```
2. **Deploy to Render** using the `render.yaml` file.
3. **Your legal co-pilot is live!**

## 🔮 Roadmap

- [ ] Multi-language document support
- [ ] Advanced AI models for clause analysis
- [ ] Document comparison features
- [ ] Team collaboration tools
- [ ] API rate limiting and authentication
- [ ] Advanced search and filtering
- [ ] Export analysis reports

## 🔗 Repository

**GitHub**: https://github.com/anothercodingguy/vidhived-ai
