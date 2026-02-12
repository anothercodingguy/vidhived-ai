"""Flask API routes for notebooks – CRUD and AI Q&A."""

from flask import Blueprint, request, jsonify
import uuid
import os
import logging
from datetime import datetime

from .models import db, Notebook, Note
from .notebook_services import ask_notebook
from .services import extract_structured_text_from_pdf

logger = logging.getLogger(__name__)

notebook_bp = Blueprint('notebooks', __name__)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
PDF_MAGIC_BYTES = b'%PDF'


# ── Notebooks CRUD ───────────────────────────────────────────────────

@notebook_bp.route('/notebooks', methods=['POST'])
def create_notebook():
    data = request.get_json()
    if not data or not (data.get('title') or '').strip():
        return jsonify({"error": "Title is required", "code": "MISSING_TITLE"}), 400

    nb = Notebook(
        id=str(uuid.uuid4()),
        title=data['title'].strip(),
        description=(data.get('description') or '').strip(),
    )
    db.session.add(nb)
    db.session.commit()

    logger.info(f"Notebook created: {nb.id} ({nb.title})")
    return jsonify({
        "id": nb.id,
        "title": nb.title,
        "description": nb.description,
        "createdAt": nb.created_at.isoformat(),
        "noteCount": 0,
    }), 201


@notebook_bp.route('/notebooks', methods=['GET'])
def list_notebooks():
    notebooks = Notebook.query.order_by(Notebook.updated_at.desc()).all()
    result = []
    for nb in notebooks:
        note_count = nb.notes.count()
        result.append({
            "id": nb.id,
            "title": nb.title,
            "description": nb.description,
            "createdAt": nb.created_at.isoformat(),
            "updatedAt": nb.updated_at.isoformat(),
            "noteCount": note_count,
        })
    return jsonify(result)


@notebook_bp.route('/notebook/<notebook_id>', methods=['GET'])
def get_notebook(notebook_id: str):
    nb = Notebook.query.get(notebook_id)
    if not nb:
        return jsonify({"error": "Notebook not found", "code": "NOT_FOUND"}), 404

    notes_list = []
    for note in nb.notes.order_by(Note.updated_at.desc()).all():
        notes_list.append({
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "noteType": note.note_type,
            "sourceFilename": note.source_filename,
            "wordCount": note.word_count,
            "createdAt": note.created_at.isoformat(),
            "updatedAt": note.updated_at.isoformat(),
        })

    return jsonify({
        "id": nb.id,
        "title": nb.title,
        "description": nb.description,
        "createdAt": nb.created_at.isoformat(),
        "updatedAt": nb.updated_at.isoformat(),
        "notes": notes_list,
    })


@notebook_bp.route('/notebook/<notebook_id>', methods=['DELETE'])
def delete_notebook(notebook_id: str):
    nb = Notebook.query.get(notebook_id)
    if not nb:
        return jsonify({"error": "Notebook not found", "code": "NOT_FOUND"}), 404

    db.session.delete(nb)
    db.session.commit()
    logger.info(f"Notebook deleted: {notebook_id}")
    return jsonify({"message": "Notebook deleted"}), 200


# ── Notes CRUD ───────────────────────────────────────────────────────

@notebook_bp.route('/notebook/<notebook_id>/notes', methods=['POST'])
def add_note(notebook_id: str):
    nb = Notebook.query.get(notebook_id)
    if not nb:
        return jsonify({"error": "Notebook not found", "code": "NOT_FOUND"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required", "code": "BAD_REQUEST"}), 400

    title = (data.get('title') or 'Untitled').strip()
    content = (data.get('content') or '').strip()
    word_count = len(content.split()) if content else 0

    note = Note(
        id=str(uuid.uuid4()),
        notebook_id=notebook_id,
        title=title,
        content=content,
        note_type='text',
        word_count=word_count,
    )
    db.session.add(note)

    # Touch notebook updated_at
    nb.updated_at = datetime.utcnow()
    db.session.commit()

    logger.info(f"Note added to {notebook_id}: {note.id} ({title})")
    return jsonify({
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "noteType": note.note_type,
        "wordCount": note.word_count,
        "createdAt": note.created_at.isoformat(),
        "updatedAt": note.updated_at.isoformat(),
    }), 201


@notebook_bp.route('/notebook/<notebook_id>/notes/upload', methods=['POST'])
def upload_note_pdf(notebook_id: str):
    nb = Notebook.query.get(notebook_id)
    if not nb:
        return jsonify({"error": "Notebook not found", "code": "NOT_FOUND"}), 404

    if 'file' not in request.files:
        return jsonify({"error": "No file provided", "code": "NO_FILE"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected", "code": "NO_FILE"}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF files are allowed", "code": "INVALID_TYPE"}), 400

    pdf_bytes = file.read()

    if len(pdf_bytes) > MAX_FILE_SIZE:
        return jsonify({"error": "File too large (max 20 MB)", "code": "FILE_TOO_LARGE"}), 400

    if not pdf_bytes[:4].startswith(PDF_MAGIC_BYTES):
        return jsonify({"error": "Invalid PDF file", "code": "INVALID_PDF"}), 400

    # Save temp file for extraction
    upload_dir = os.path.join(os.getcwd(), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    tmp_path = os.path.join(upload_dir, f"note_{uuid.uuid4().hex}.pdf")

    try:
        with open(tmp_path, 'wb') as f:
            f.write(pdf_bytes)

        # Extract text using existing service
        structured_content, page_count = extract_structured_text_from_pdf(tmp_path)
        extracted_text = "\n\n".join([c["text"] for c in structured_content])

        if not extracted_text.strip():
            return jsonify({"error": "Could not extract text from PDF", "code": "EXTRACT_FAILED"}), 400

        word_count = len(extracted_text.split())
        title = file.filename.rsplit('.', 1)[0]  # filename without .pdf

        note = Note(
            id=str(uuid.uuid4()),
            notebook_id=notebook_id,
            title=title,
            content=extracted_text,
            note_type='pdf',
            source_filename=file.filename,
            word_count=word_count,
        )
        db.session.add(note)
        nb.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"PDF note added to {notebook_id}: {note.id} ({file.filename}, {word_count} words)")
        return jsonify({
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "noteType": note.note_type,
            "sourceFilename": note.source_filename,
            "wordCount": note.word_count,
            "createdAt": note.created_at.isoformat(),
            "updatedAt": note.updated_at.isoformat(),
        }), 201
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


@notebook_bp.route('/notebook/<notebook_id>/note/<note_id>', methods=['PUT'])
def update_note(notebook_id: str, note_id: str):
    note = Note.query.filter_by(id=note_id, notebook_id=notebook_id).first()
    if not note:
        return jsonify({"error": "Note not found", "code": "NOT_FOUND"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required", "code": "BAD_REQUEST"}), 400

    if 'title' in data:
        note.title = (data['title'] or 'Untitled').strip()
    if 'content' in data:
        note.content = (data['content'] or '').strip()
        note.word_count = len(note.content.split()) if note.content else 0

    note.updated_at = datetime.utcnow()

    # Touch notebook
    nb = Notebook.query.get(notebook_id)
    if nb:
        nb.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "noteType": note.note_type,
        "wordCount": note.word_count,
        "updatedAt": note.updated_at.isoformat(),
    })


@notebook_bp.route('/notebook/<notebook_id>/note/<note_id>', methods=['DELETE'])
def delete_note(notebook_id: str, note_id: str):
    note = Note.query.filter_by(id=note_id, notebook_id=notebook_id).first()
    if not note:
        return jsonify({"error": "Note not found", "code": "NOT_FOUND"}), 404

    db.session.delete(note)

    nb = Notebook.query.get(notebook_id)
    if nb:
        nb.updated_at = datetime.utcnow()

    db.session.commit()
    logger.info(f"Note deleted: {note_id} from notebook {notebook_id}")
    return jsonify({"message": "Note deleted"}), 200


# ── AI Q&A ───────────────────────────────────────────────────────────

@notebook_bp.route('/notebook/<notebook_id>/ask', methods=['POST'])
def ask_notebook_question(notebook_id: str):
    nb = Notebook.query.get(notebook_id)
    if not nb:
        return jsonify({"error": "Notebook not found", "code": "NOT_FOUND"}), 404

    data = request.get_json()
    if not data or not (data.get('query') or '').strip():
        return jsonify({"error": "Query is required", "code": "MISSING_QUERY"}), 400

    query = data['query'].strip()
    if len(query) > 2000:
        return jsonify({"error": "Query too long (max 2000 chars)", "code": "QUERY_TOO_LONG"}), 400

    # Gather all notes
    notes = []
    for note in nb.notes.all():
        if note.content:
            notes.append({
                'id': note.id,
                'title': note.title,
                'content': note.content,
            })

    if not notes:
        return jsonify({
            "answer": "This notebook has no notes yet. Add some notes first, then ask questions!",
            "sources": [],
            "hasAI": False,
            "notebookId": notebook_id,
        })

    result = ask_notebook(notebook_id, query, notes)
    result['notebookId'] = notebook_id
    return jsonify(result)
