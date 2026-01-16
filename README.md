# 🎯 Vidhived.ai - AI-Powered Legal Document Intelligence Platform

<div align="center">

**Transform legal documents into actionable intelligence with AI-powered analysis**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Groq](https://img.shields.io/badge/Powered%20by-Groq-orange)](https://groq.com/)

</div>

---

## 📖 Overview

Vidhived.ai is a production-grade, full-stack legal document analysis platform that leverages cutting-edge AI to help legal professionals, businesses, and individuals understand complex legal documents. Upload a PDF contract, and get instant AI-powered insights including risk scoring, entity extraction, clause summaries, and interactive Q&A.

### ✨ Key Highlights

- 🚀 **Lightning-fast AI analysis** powered by Groq's ultra-low-latency LLM API
- 📄 **Advanced PDF processing** with PyMuPDF for accurate text and coordinate extraction
- 🎨 **Interactive PDF viewer** with clickable clause highlighting and tooltips
- 💾 **Production-ready persistence** using SQLAlchemy (SQLite/PostgreSQL)
- 🔒 **Enterprise-grade architecture** with modular backend and modern frontend
- ☁️ **One-click deployment** on Render.com with automatic service provisioning

---

## 🏗️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python 3.11+** | Core runtime |
| **Flask** | Web framework with RESTful API |
| **Gunicorn** | Production WSGI server |
| **SQLAlchemy** | ORM for database persistence |
| **Groq API** | Ultra-fast LLM inference (Llama 3.3, Mixtral) |
| **PyMuPDF (fitz)** | PDF text extraction with coordinates |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 14** | React framework with TypeScript |
| **Tailwind CSS** | Utility-first styling |
| **PDF.js** | Client-side PDF rendering |
| **React Hooks** | State management and effects |

### Infrastructure
- **Render.com** - Cloud deployment platform
- **SQLite/PostgreSQL** - Database (configurable)
- **CORS-enabled API** - Secure cross-origin requests

---

## 🚀 Features

### 📊 Intelligent Document Analysis
- **AI-Powered Risk Scoring**: Automatically categorizes clauses as Red (high risk), Yellow (medium risk), or Green (low risk)
- **Entity Extraction**: Identifies parties, dates, monetary amounts, and legal terms
- **Clause Summarization**: Generates concise summaries for complex legal language
- **Document Insights**: Comprehensive analysis with key obligations, deadlines, and parties

### 🔍 Interactive PDF Experience
- **Bounding Box Highlighting**: Click on analyzed clauses to see their exact location in the PDF
- **Coordinate-Precise Overlays**: Uses PyMuPDF-extracted coordinates for pixel-perfect highlighting
- **Legal Term Tooltips**: Hover over legal jargon to see instant definitions
- **Multi-Page Navigation**: Seamlessly navigate through long documents

### 💬 AI Chat Assistant
- **Context-Aware Q&A**: Ask questions about your document and get intelligent answers
- **Multi-Model Fallback**: Automatically tries Llama 3.3 → Llama 3.1 → Mixtral for reliability
- **Document-Specific Context**: Chat understands the full content of your uploaded document

### 🏛️ Production-Grade Architecture
- **Database Persistence**: All documents and analyses stored in SQLAlchemy-managed database
- **Modular Backend**: Clean separation of models, services, and routes
- **RESTful API Design**: Standard HTTP methods and status codes
- **Health Checks**: Built-in `/health` endpoint for monitoring
- **CORS Support**: Configurable cross-origin resource sharing

---

## 📋 Prerequisites

### 1. Groq API Key (Required)
Groq provides ultra-fast LLM inference with generous free tier limits.

1. Visit [console.groq.com](https://console.groq.com/)
2. Create a free account
3. Navigate to API Keys → Create API Key
4. Copy your API key (starts with `gsk_...`)

### 2. Development Tools
- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))

---

## 🛠️ Local Development

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# 5. Initialize database (auto-created on first run)
# The SQLite database will be created at backend/instance/vidhived.db

# 6. Run the development server
python wsgi.py  # Runs on http://localhost:5001
```

**Environment Variables (backend/.env):**
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
DATABASE_URL=sqlite:///instance/vidhived.db  # Optional: use PostgreSQL in production
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000
```

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with backend URL

# 4. Run development server
npm run dev  # Runs on http://localhost:3000
```

**Environment Variables (frontend/.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 🎉 Access the Application
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5001](http://localhost:5001)
- **Health Check**: [http://localhost:5001/health](http://localhost:5001/health)

---

## ☁️ Production Deployment

### Option 1: One-Click Render Deployment (Recommended)

This repository includes a `render.yaml` blueprint for automatic deployment.

1. **Fork this repository** to your GitHub account

2. **Create Render account** at [render.com](https://render.com/)

3. **Create New Blueprint** in Render Dashboard
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the forked `vidhived-ai` repository

4. **Set Environment Variable** in Render Dashboard
   - Navigate to `vidhived-backend` service
   - Settings → Environment
   - Add: `GROQ_API_KEY` = `gsk_your_groq_api_key_here`

5. **Deploy** 🚀
   - Render will automatically:
     - Build both backend and frontend
     - Configure service URLs
     - Set up health checks
     - Deploy to production

### Option 2: Manual Deployment

**Backend (Flask + Gunicorn):**
```bash
cd backend
gunicorn --bind 0.0.0.0:$PORT --timeout 120 --workers 1 wsgi:app
```

**Frontend (Next.js):**
```bash
cd frontend
npm run build
npm start
```

### Production Environment Variables

**Backend:**
```env
GROQ_API_KEY=gsk_your_production_key
DATABASE_URL=postgresql://user:pass@host:5432/vidhived  # Or SQLite
CORS_ORIGINS=https://your-frontend-url.onrender.com
LOG_LEVEL=WARNING
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

---

## 📡 API Reference

### Core Endpoints

#### 📤 Upload Document
```http
POST /upload
Content-Type: multipart/form-data

file: <PDF file>

Response:
{
  "documentId": "uuid-v4",
  "filename": "contract.pdf",
  "status": "processing",
  "message": "Document uploaded successfully"
}
```

#### 📊 Get Document Analysis
```http
GET /document/:documentId

Response:
{
  "documentId": "uuid-v4",
  "status": "completed",
  "fullText": "Full extracted text...",
  "documentSummary": "AI-generated summary...",
  "analysis": [
    {
      "id": "clause-1",
      "text": "Party A agrees to...",
      "category": "Red",
      "score": 0.85,
      "type": "Liability",
      "explanation": "High financial risk...",
      "summary": "Unlimited liability clause",
      "entities": [
        {"text": "Party A", "type": "Party"},
        {"text": "$100,000", "type": "Money"}
      ],
      "legal_terms": [
        {"term": "indemnify", "definition": "To compensate for harm or loss"}
      ],
      "bounding_box": {
        "vertices": [{"x": 72, "y": 120}, ...]
      },
      "page_number": 1,
      "ocr_page_width": 612,
      "ocr_page_height": 792
    }
  ]
}
```

#### 📄 Get PDF File
```http
GET /pdf/:documentId

Response:
{
  "pdfUrl": "data:application/pdf;base64,..."
}
```

#### 💬 Ask Question
```http
POST /ask
Content-Type: application/json

{
  "documentId": "uuid-v4",
  "query": "What are the termination conditions?"
}

Response:
{
  "answer": "The contract can be terminated...",
  "documentId": "uuid-v4",
  "hasAI": true
}
```

#### 🏥 Health Check
```http
GET /health

Response:
{
  "status": "healthy",
  "database": "connected",
  "groq_api": "configured"
}
```

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                     (Next.js Frontend)                       │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Upload UI  │  │  PDF Viewer  │  │  Chat Interface  │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP/REST
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                      FLASK BACKEND API                       │
│                       (Python 3.11)                          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Routes Layer (app.py)                                │  │
│  │  /upload, /document/:id, /ask, /pdf/:id              │  │
│  └────────────┬──────────────────────────────────────────┘  │
│               ▼                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Services Layer (app/services.py)                     │  │
│  │  - extract_structured_text_from_pdf()                 │  │
│  │  - analyze_clause_worker()                            │  │
│  │  - process_document()                                 │  │
│  │  - call_groq_api()                                    │  │
│  └────────────┬──────────────────────────────────────────┘  │
│               ▼                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Models Layer (app/models.py)                         │  │
│  │  - Document (SQLAlchemy model)                        │  │
│  │  - AnalysisResult (SQLAlchemy model)                  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────┬───────────────────────────────────┬───────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────┐         ┌─────────────────────────────┐
│  GROQ CLOUD API      │         │  SQLAlchemy Database        │
│  - Llama 3.3 70B     │         │  - SQLite (dev)             │
│  - Llama 3.1 8B      │         │  - PostgreSQL (prod)        │
│  - Mixtral 8x7B      │         │                             │
└──────────────────────┘         └─────────────────────────────┘
```

### Data Flow

1. **Upload**: User uploads PDF → Backend saves to DB + disk → Returns document ID
2. **Processing**: Background analysis extracts text → Sends to Groq API → Stores results
3. **Viewing**: Frontend fetches PDF + analysis → Renders with PDF.js → Displays interactive overlays
4. **Chat**: User asks question → Backend sends document context + query to Groq → Returns answer

---

## 🔍 How It Works

### 1. PDF Text Extraction (PyMuPDF)
```python
# Extract text blocks with precise coordinates
doc = fitz.open("contract.pdf")
for page in doc:
    blocks = page.get_text("blocks")  # Returns (x0, y0, x1, y1, text, ...)
    # Each block includes exact pixel coordinates for highlighting
```

### 2. AI Analysis (Groq API)
```python
# Multi-model fallback for reliability
GROQ_MODELS = [
    "llama-3.3-70b-versatile",  # Latest, most accurate
    "llama-3.1-8b-instant",     # Extremely fast
    "mixtral-8x7b-32768",       # Large context fallback
]

# Structured JSON output for reliable parsing
completion = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": prompt}],
    response_format={"type": "json_object"}
)
```

### 3. Risk Categorization
- **Red (0.7-1.0)**: Liability, penalties, termination without cause, unlimited obligations
- **Yellow (0.4-0.69)**: Payment terms, delivery deadlines, standard warranties
- **Green (0.0-0.39)**: Definitions, general provisions, standard clauses

### 4. Interactive Overlays
```typescript
// Frontend uses OCR coordinates to position highlights
const overlay = {
  left: (bbox.x / ocr_page_width) * 100 + '%',
  top: (bbox.y / ocr_page_height) * 100 + '%',
  width: (bbox.w / ocr_page_width) * 100 + '%',
  height: (bbox.h / ocr_page_height) * 100 + '%'
}
```

---

## 🧪 Testing

### Backend API Tests
```bash
cd backend

# Test health endpoint
curl http://localhost:5001/health

# Test PDF upload
curl -X POST -F "file=@sample_contract.pdf" http://localhost:5001/upload

# Test document status
curl http://localhost:5001/document/{documentId}

# Test Q&A
curl -X POST -H "Content-Type: application/json" \
  -d '{"documentId":"123","query":"What is the payment term?"}' \
  http://localhost:5001/ask
```

### Frontend Tests
```bash
cd frontend

# Run linter
npm run lint

# Build production bundle (validates TypeScript)
npm run build
```

### End-to-End Test Script
```python
# Use the provided test script
python simple_test.py http://localhost:5001
```

---

## 📁 Project Structure

```
vidhived-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── models.py            # SQLAlchemy models (Document, AnalysisResult)
│   │   ├── routes.py            # API endpoints
│   │   └── services.py          # Business logic (PDF processing, Groq calls)
│   ├── instance/                # SQLite database (auto-created)
│   ├── uploads/                 # Uploaded PDF storage
│   ├── logs/                    # Application logs
│   ├── requirements.txt         # Python dependencies
│   ├── wsgi.py                  # Production entry point
│   ├── gunicorn.conf.py         # Gunicorn configuration
│   └── .env                     # Environment variables (not in git)
├── frontend/
│   ├── app/                     # Next.js app router
│   ├── components/              # React components
│   ├── lib/
│   │   └── api.ts               # Backend API client
│   ├── public/                  # Static assets
│   ├── package.json             # Node dependencies
│   └── .env.local               # Environment variables (not in git)
├── render.yaml                  # Render.com deployment blueprint
├── LICENSE                      # MIT License
├── README.md                    # This file
└── simple_test.py               # E2E test script
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes with clear commit messages
4. **Test** your changes locally
5. **Push** to your fork (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request with a detailed description

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for frontend code
- Write clear commit messages
- Add tests for new features
- Update documentation as needed

---

## 🐛 Troubleshooting

### Backend Issues

**"GROQ_API_KEY not found"**
- Ensure `.env` file exists in `backend/` directory
- Verify the API key starts with `gsk_`
- Check the key is valid at [console.groq.com](https://console.groq.com/)

**"Database connection failed"**
- Check `DATABASE_URL` in `.env`
- Ensure `instance/` directory exists and is writable
- For PostgreSQL, verify connection string format

**"Module not found" errors**
- Activate virtual environment: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend Issues

**"Failed to connect to backend"**
- Verify backend is running on port 5001
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Test backend health: `curl http://localhost:5001/health`

**Build errors**
- Delete `.next` folder and `node_modules`
- Reinstall: `npm install`
- Rebuild: `npm run build`

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🔮 Roadmap

- [ ] **Multi-document comparison** - Compare contracts side-by-side
- [ ] **Advanced search** - Full-text search across all documents
- [ ] **Export reports** - Generate PDF/DOCX analysis reports
- [ ] **User authentication** - JWT-based user accounts
- [ ] **Team workspaces** - Collaborative document review
- [ ] **API rate limiting** - Redis-based request throttling
- [ ] **Webhook notifications** - Real-time analysis updates
- [ ] **Multi-language support** - Analyze documents in Spanish, French, etc.
- [ ] **Custom risk models** - Train domain-specific risk scorers

---

## 🔗 Links

- **GitHub Repository**: [anothercodingguy/vidhived-ai](https://github.com/anothercodingguy/vidhived-ai)
- **Groq Documentation**: [console.groq.com/docs](https://console.groq.com/docs)
- **PyMuPDF Docs**: [pymupdf.readthedocs.io](https://pymupdf.readthedocs.io/)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

---

## 📧 Support

Need help? Here's how to get in touch:

- **Issues**: [Create an issue](https://github.com/anothercodingguy/vidhived-ai/issues)
- **Discussions**: [Join the discussion](https://github.com/anothercodingguy/vidhived-ai/discussions)
- **Email**: Open an issue for the best response

---

<div align="center">

**Made with ❤️ by the Vidhived.ai Team**

[⭐ Star this repo](https://github.com/anothercodingguy/vidhived-ai) if you find it helpful!

</div>
