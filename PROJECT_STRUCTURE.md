# Vidhived.ai Project Structure

```
vidhived/
├── backend/                    # Flask API Backend
│   ├── app.py                 # Main Flask application
│   ├── wsgi.py                # WSGI entry point for production
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment variables template
│   ├── .env                  # Environment variables (local)
│   └── Dockerfile            # Docker configuration
│
├── frontend/                  # Next.js Frontend
│   ├── app/                  # Next.js 14 app directory
│   │   ├── layout.tsx        # Root layout component
│   │   ├── page.tsx          # Home page (upload)
│   │   ├── globals.css       # Global styles
│   │   └── document/         # Document analysis pages
│   │       └── [id]/
│   │           └── page.tsx  # Document viewer page
│   ├── components/           # React components
│   │   ├── PDFViewer.tsx     # PDF.js viewer with overlays
│   │   ├── AnalysisSidebar.tsx # Clause analysis sidebar
│   │   └── AskPanel.tsx      # AI chat interface
│   ├── lib/                  # Utility libraries
│   │   └── api.ts           # API client functions
│   ├── package.json         # Node.js dependencies
│   ├── next.config.js       # Next.js configuration
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── tsconfig.json        # TypeScript configuration
│   ├── .env.example         # Environment variables template
│   ├── .env.local           # Environment variables (local)
│   └── Dockerfile           # Docker configuration
│
├── .github/                  # GitHub Actions
│   └── workflows/
│       └── ci.yml           # Continuous Integration
│
├── render.yaml              # Render.com deployment config
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
└── PROJECT_STRUCTURE.md    # This file
```

## Key Components

### Backend (Flask + GCP)
- **app.py**: Main Flask application with all API endpoints
- **Legal Clause Analysis**: Regex-based scoring system with risk categorization
- **GCP Integration**: Vision API (OCR), Cloud Storage (PDFs), Vertex AI (explanations)
- **Async Processing**: Background document processing with status tracking

### Frontend (Next.js + TypeScript)
- **Interactive PDF Viewer**: PDF.js with clickable bounding box overlays
- **Real-time Updates**: Polling for document processing status
- **Responsive Design**: 50/50 split layout with professional UI
- **AI Chat**: Contextual Q&A about document content

### Deployment
- **Production Ready**: Gunicorn WSGI, Docker containers
- **Cloud Deployment**: Render.com configuration with auto-scaling
- **CI/CD**: GitHub Actions for automated validation and deployment

## Technology Stack

**Backend:**
- Python 3.11+, Flask, Gunicorn
- Google Cloud Vision API, Storage, Vertex AI
- PDF processing with PyPDF2 and Pillow

**Frontend:**
- Next.js 14, TypeScript, React
- Tailwind CSS for styling
- PDF.js for document rendering
- Axios for API communication

**Infrastructure:**
- Render.com for hosting
- GitHub Actions for CI/CD
- Docker for containerization