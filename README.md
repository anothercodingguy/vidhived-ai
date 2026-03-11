# Vidhived.ai

A full-stack, AI-powered platform for analyzing legal documents. Upload a PDF contract and instantly get risk assessments, clause summaries, and the ability to ask questions about the text using Groq's low-latency LLMs.

**🔗 [Live Demo](https://vidhived-frontend.onrender.com/)**

[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Groq](https://img.shields.io/badge/Powered%20by-Groq-orange)](https://groq.com/)

---

## What it does

- **Automated Risk Scoring:** Highlights clauses as High (Red), Medium (Yellow), or Low Risk (Green).
- **Entity Extraction:** Pulls out key dates, money, parties, and legal jargon.
- **Smart Q&A:** Chat directly with the document for context-specific answers.
- **Precise Highlighting:** Uses PyMuPDF's exact bounding boxes to highlight clauses right on the PDF in the browser.
- **Voice Playback:** Listen to summaries in natural speech.

## Tech Stack

- **Backend:** Python 3.11, Flask, SQLAlchemy (SQLite/PostgreSQL) 
- **Frontend:** Next.js 14, React, Tailwind CSS, PDF.js
- **AI / OCR:** Groq API (Llama 3.3 / Mixtral fallback), PyMuPDF (fitz)

---

## Local Setup

You will need a free [Groq API Key](https://console.groq.com/).

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Add your GROQ_API_KEY to .env

python wsgi.py  # Starts on port 5001
```

### 2. Frontend

```bash
cd frontend
npm install

cp .env.example .env.local
# Ensure NEXT_PUBLIC_API_URL is set to http://localhost:5001

npm run dev  # Starts on port 3000
```

Head to `http://localhost:3000` to use the app.

---

## Deployment 

We provide a `render.yaml` for one-click deployment on Render.com. 

1. Fork this repo.
2. In Render Dashboard, click **New > Blueprint**.
3. Connect your fork.
4. Set the `GROQ_API_KEY` environment variable in the dashboard for the backend service.
5. Deploy. Render will automatically build and start the Next.js frontend and Flask API.

---

## API Routes

- `POST /upload` - Multipart form upload. Returns documentID.
- `GET /document/:id` - Returns OCR coords, AI insights, and extracted text.
- `GET /pdf/:id` - Returns the base64 PDF.
- `POST /ask` - Send a query string + documentID to the LLM.

## Roadmap

- [ ] Multi-document comparison
- [ ] Authentication & Workspaces
- [ ] Export analysis to DOCX/PDF
- [ ] Custom risk model training

---

## License & Support

MIT Licensed. Open an issue on GitHub if you need help or run into bugs.
