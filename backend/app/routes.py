"""Flask API routes for document upload, analysis, and Q&A."""

from flask import Blueprint, request, jsonify, send_file, current_app
import os
import uuid
import json
import threading
import logging
from datetime import datetime
from .models import db, Document, AnalysisResult
from .services import process_document, get_groq_client, call_groq_api

logger = logging.getLogger(__name__)

bp = Blueprint('api', __name__)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
PDF_MAGIC_BYTES = b'%PDF'


# ── Health ───────────────────────────────────────────────────────────

@bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "3.0.0",
        "services": {
            "database": "connected",
            "groq": "configured" if os.getenv("GROQ_API_KEY") else "not configured",
            "voice": "configured" if os.getenv("SARVAM_API_KEY") else "not configured",
        }
    })


# ── Upload ───────────────────────────────────────────────────────────

@bp.route('/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided", "code": "NO_FILE"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected", "code": "NO_FILE"}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF files are allowed", "code": "INVALID_TYPE"}), 400

    # Read file bytes
    pdf_bytes = file.read()

    # Validate file size
    if len(pdf_bytes) > MAX_FILE_SIZE:
        size_mb = len(pdf_bytes) / (1024 * 1024)
        return jsonify({
            "error": f"File too large ({size_mb:.1f} MB). Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB.",
            "code": "FILE_TOO_LARGE"
        }), 400

    # Validate PDF magic bytes
    if not pdf_bytes[:4].startswith(PDF_MAGIC_BYTES):
        return jsonify({
            "error": "File does not appear to be a valid PDF",
            "code": "INVALID_PDF"
        }), 400

    doc_id = str(uuid.uuid4())

    # Save to temp file for processing
    upload_dir = os.path.join(os.getcwd(), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{doc_id}.pdf")
    with open(file_path, 'wb') as f:
        f.write(pdf_bytes)

    # Create document record
    new_doc = Document(
        id=doc_id,
        filename=file.filename,
        status='processing',
        message='Upload successful — analysis starting',
        pdf_data=pdf_bytes,
        file_size=len(pdf_bytes),
    )
    db.session.add(new_doc)
    db.session.commit()

    logger.info(f"Document uploaded: {doc_id} ({file.filename}, {len(pdf_bytes)} bytes)")

    # Start background processing
    threading.Thread(
        target=_run_analysis_background,
        args=(current_app._get_current_object(), doc_id, file_path),
        daemon=True,
    ).start()

    return jsonify({
        "documentId": doc_id,
        "pdfUrl": f"/pdf/{doc_id}",
        "message": "Upload successful, analysis started",
    }), 202


def _run_analysis_background(app, doc_id: str, file_path: str):
    """Background worker for PDF analysis."""
    with app.app_context():
        try:
            doc = Document.query.get(doc_id)
            if not doc:
                logger.error(f"Document {doc_id} not found for analysis")
                return

            doc.message = "Extracting text and analyzing document..."
            db.session.commit()

            full_text, clauses, summary_text, page_count = process_document(file_path)

            # Build summary block
            word_count = len(full_text.split())
            high_risk = len([c for c in clauses if c["category"] == "Red"])
            med_risk = len([c for c in clauses if c["category"] == "Yellow"])
            low_risk = len([c for c in clauses if c["category"] == "Green"])

            full_summary_block = (
                f"**Document Statistics**\n"
                f"- Pages: {page_count}\n"
                f"- Words: {word_count:,}\n"
                f"- Clauses analyzed: {len(clauses)}\n"
                f"- High risk: {high_risk} | Medium risk: {med_risk} | Low risk: {low_risk}\n\n"
                f"**AI Summary**\n{summary_text}"
            )

            result = AnalysisResult(
                document_id=doc_id,
                full_text=full_text,
                summary_text=full_summary_block,
                clauses_json=json.dumps(clauses),
            )

            doc.status = 'completed'
            doc.message = 'Analysis completed successfully'
            doc.page_count = page_count
            db.session.add(result)
            db.session.commit()

            logger.info(f"Analysis complete for {doc_id}: {len(clauses)} clauses, {page_count} pages")

        except Exception as e:
            logger.error(f"Analysis failed for {doc_id}: {e}", exc_info=True)
            doc = Document.query.get(doc_id)
            if doc:
                doc.status = 'failed'
                doc.message = f"Analysis failed: {str(e)[:200]}"
                db.session.commit()
        finally:
            # Clean up temp file
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception:
                pass


# ── Document Status ──────────────────────────────────────────────────

@bp.route('/document/<document_id>', methods=['GET'])
def get_document_status(document_id: str):
    doc = Document.query.get(document_id)
    if not doc:
        return jsonify({"error": "Document not found", "code": "NOT_FOUND"}), 404

    if doc.status == 'completed' and doc.analysis:
        return jsonify({
            "documentId": doc.id,
            "status": "completed",
            "fullText": doc.analysis.full_text,
            "analysis": json.loads(doc.analysis.clauses_json),
            "documentSummary": doc.analysis.summary_text,
            "fullAnalysis": doc.analysis.summary_text,
            "pageCount": doc.page_count,
            "fileSize": doc.file_size,
            "filename": doc.filename,
        })
    else:
        return jsonify({
            "documentId": doc.id,
            "status": doc.status,
            "message": doc.message,
            "filename": doc.filename,
        })


# ── PDF Serving ──────────────────────────────────────────────────────

@bp.route('/pdf/<document_id>', methods=['GET'])
def get_pdf(document_id: str):
    doc = Document.query.get(document_id)
    if not doc or not doc.pdf_data:
        return jsonify({"error": "PDF not found", "code": "NOT_FOUND"}), 404

    from io import BytesIO
    return send_file(
        BytesIO(doc.pdf_data),
        mimetype='application/pdf',
        as_attachment=False,
        download_name=doc.filename,
    )


# ── Q&A ──────────────────────────────────────────────────────────────

@bp.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required", "code": "BAD_REQUEST"}), 400

    document_id = (data.get('documentId') or '').strip()
    query = (data.get('query') or '').strip()

    if not document_id or not query:
        return jsonify({"error": "documentId and query are required", "code": "MISSING_PARAMS"}), 400

    if len(query) > 2000:
        return jsonify({"error": "Query too long (max 2000 characters)", "code": "QUERY_TOO_LONG"}), 400

    doc = Document.query.get(document_id)
    if not doc or not doc.analysis:
        return jsonify({"error": "Document not found or not yet analyzed", "code": "NOT_FOUND"}), 404

    client = get_groq_client()
    if not client:
        return jsonify({
            "answer": "AI service is not configured. Please set GROQ_API_KEY.",
            "documentId": document_id,
            "hasAI": False,
        })

    # Build context from document
    context = doc.analysis.full_text[:8000]
    prompt = (
        "You are a helpful legal assistant. Answer the user's question based ONLY on the document context provided.\n"
        "If the answer is not in the document, say so clearly.\n\n"
        f"Document context:\n{context}\n\n"
        f"User question: {query}"
    )

    try:
        completion = call_groq_api(
            client,
            messages=[{"role": "user", "content": prompt}],
        )
        return jsonify({
            "answer": completion.choices[0].message.content,
            "documentId": document_id,
            "hasAI": True,
        })
    except Exception as e:
        logger.error(f"Q&A failed: {e}", exc_info=True)
        return jsonify({
            "error": "Failed to generate answer. Please try again.",
            "code": "AI_ERROR",
        }), 500
