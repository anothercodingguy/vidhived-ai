# Vidhived.ai

Vidhived.ai reads a contract PDF, scores each clause for legal risk with an LLM, and shows the results as coloured highlights on the document.

**Live:** https://vidhived-ai.vercel.app (the backend is on a free tier that sleeps when idle, so the first analysis can take about a minute)

[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Groq](https://img.shields.io/badge/Powered%20by-Groq-orange)](https://groq.com/)

![Vidhived.ai](docs/preview.jpg)

## What it does

- **Clause risk scoring.** Each clause gets a 0-1 risk score, a Red / Yellow / Green category, a type (Liability, Termination, Payment, ...), a short explanation and a one-line summary.
- **Entities and legal terms.** The same LLM call returns the parties, dates, amounts and terms in each clause, plus plain-English definitions of the legal terms.
- **Highlights on the PDF.** Clause bounding boxes from PyMuPDF are drawn over the PDF.js canvas and coloured by risk. Selecting a clause in the sidebar jumps to its page.
- **Summary and Q&A.** An LLM-written summary of the document, and a chat panel that answers questions from the document text.
- **Notebooks.** At `/notebooks`: collect text notes and PDFs, then ask questions across them. Relevant chunks are picked with TF-IDF scoring and the answer lists its source notes.
- **Voice and export.** Summaries, clause explanations and chat answers can be read aloud with Sarvam AI text-to-speech. A DOCX risk report is available from the API.

## How analysis works

```
POST /upload -> PyMuPDF text blocks -> Groq Llama 3.3 (JSON mode) -> database -> PDF.js overlay
                clauses + boxes        5 clauses in parallel         results     risk highlights
```

1. **Upload.** `POST /upload` checks the extension, the 20 MB limit and the `%PDF` header, stores the file, and returns `202` with a document ID. Analysis runs in a background thread.
2. **Clause split.** PyMuPDF reads the text blocks on each page. Every block longer than 50 characters becomes a clause, kept with its page number and bounding box.
3. **Scoring.** Each clause is sent to Groq (`llama-3.3-70b-versatile`) with `response_format: json_object`. A `ThreadPoolExecutor` with 5 workers scores clauses in parallel.
4. **Failure handling.** Each model gets up to 3 attempts with exponential backoff (1.5 s, then 3 s). If all 3 fail, the next model in the list is tried (`llama-3.1-8b-instant`, then `mixtral-8x7b-32768`). Missing fields get defaults and the score is clamped to 0-1. If the response cannot be parsed, the clause is stored as a neutral Yellow result and the rest of the document continues.
5. **Storage.** Clauses, full text and summary are saved through SQLAlchemy (`Document`, `AnalysisResult`).
6. **Display.** The frontend polls `GET /document/<id>` every 3 seconds. When the status is `completed`, it renders the PDF with PDF.js and draws each clause box scaled to the canvas.

The code is in [`backend/app/services.py`](backend/app/services.py) and [`backend/app/routes.py`](backend/app/routes.py).

## API

Routes have no prefix and no authentication.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Status, and whether the Groq and Sarvam keys are set |
| POST | `/upload` | Upload a PDF (multipart `file`); returns `documentId` and starts analysis |
| GET | `/document/<id>` | Status while processing; clauses, summary and full text when complete |
| GET | `/pdf/<id>` | The original PDF |
| POST | `/ask` | Answer a question about a document (`documentId`, `query`) |
| GET | `/export/<id>/docx` | DOCX report of the Red and Yellow clauses |
| POST | `/tts` | Text to speech; returns base64 WAV |
| GET | `/tts/status` | Whether text-to-speech is configured |
| POST, GET | `/notebooks` | Create or list notebooks |
| GET, DELETE | `/notebook/<id>` | Get a notebook with its notes, or delete it |
| POST | `/notebook/<id>/notes` | Add a text note |
| POST | `/notebook/<id>/notes/upload` | Add a PDF as a note (text is extracted) |
| PUT, DELETE | `/notebook/<id>/note/<note_id>` | Update or delete a note |
| POST | `/notebook/<id>/ask` | Answer a question from the notebook's notes |

## Tech stack

- **Backend:** Python 3.11, Flask 3, Flask-SQLAlchemy (SQLite by default), PyMuPDF, Groq SDK, python-docx, Gunicorn
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, pdfjs-dist
- **External APIs:** Groq (Llama 3.3 70B), Sarvam AI (`bulbul:v3`, optional)

## Run locally

You need Python 3.11, Node.js 18+ and a free [Groq API key](https://console.groq.com/).

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
echo "GROQ_API_KEY=your_key_here" > .env
python wsgi.py                  # http://localhost:5000
```

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | for analysis | none | Without it, uploads return placeholder results and Q&A is disabled |
| `SARVAM_API_KEY` | no | none | Enables `/tts` |
| `DATABASE_URL` | no | `sqlite:///vidhived.db` | SQLAlchemy database URL |
| `CORS_ORIGINS` | no | `*` | Allowed frontend origin |
| `LOG_LEVEL` | no | `INFO` | Log level |
| `PORT` | no | `5000` | Port for `python wsgi.py` |

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env.local      # sets NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev                     # http://localhost:3000
```

If port 5000 is taken (macOS AirPlay uses it), start the backend with `PORT=5001 python wsgi.py` and set `NEXT_PUBLIC_API_URL=http://localhost:5001`.

## Tests

```bash
cd backend && pytest tests/ -v   # 20 route tests: health, upload validation, document, pdf, ask
cd frontend && npm test          # 1 Jest smoke test for the home page
```

The backend tests call `/api/...` paths, while the routes are registered without a prefix, so most of them fail until the paths are updated. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) lints and builds; it does not run either suite.

## Deployment

- **Frontend: Vercel.** Import the repo with `frontend` as the root directory and set `NEXT_PUBLIC_API_URL` to the backend URL. The value is read at build time, so redeploy after changing it.
- **Backend: Render.** [`render.yaml`](render.yaml) defines the `vidhived-backend` service: free plan, Python 3.11.9, Gunicorn with 1 worker and a 120 s timeout. Create it with **New > Blueprint**, then set `GROQ_API_KEY`, `CORS_ORIGINS` (the Vercel URL) and, if wanted, `SARVAM_API_KEY` and `DATABASE_URL` in the dashboard.
- `render.yaml` also defines a `vidhived-frontend` service. The live site uses Vercel for the frontend.

## Limits

- No OCR. Text comes from the PDF's text layer, so scanned or image-only PDFs produce no clauses.
- A clause is a PyMuPDF text block. A clause that spans several blocks is scored in pieces.
- The summary and document Q&A use the first 8,000 characters of the text.
- No accounts or access control. Anyone with a document ID can read that document.
- The DOCX export has no button in the UI yet.
- The output is an aid for reading contracts and is no substitute for legal advice.

## License

MIT. See [LICENSE](LICENSE).
