from flask import Blueprint, request, jsonify, send_file, current_app
import os
import uuid
import json
import threading
from datetime import datetime
from .models import db, Document, AnalysisResult
from .services import process_document, get_groq_client, call_groq_api

bp = Blueprint('api', __name__)

@bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    })

@bp.route('/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF files are allowed"}), 400
    
    doc_id = str(uuid.uuid4())
    
    # Read PDF into memory
    pdf_bytes = file.read()
    
    # Save to temp file for processing
    upload_dir = os.path.join(os.getcwd(), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{doc_id}.pdf")
    with open(file_path, 'wb') as f:
        f.write(pdf_bytes)
    
    # create new document in DB with PDF data
    new_doc = Document(
        id=doc_id, 
        filename=file.filename, 
        status='processing', 
        message='Upload successful',
        pdf_data=pdf_bytes
    )
    db.session.add(new_doc)
    db.session.commit()
    
    # Start background processing
    threading.Thread(target=run_analysis_background, args=(current_app._get_current_object(), doc_id, file_path)).start()
    
    return jsonify({
        "documentId": doc_id,
        "pdfUrl": f"/pdf/{doc_id}",
        "message": "Upload successful, analysis started"
    }), 202

def run_analysis_background(app, doc_id, file_path):
    """Background worker for PDF analysis"""
    with app.app_context():
        try:
            doc = Document.query.get(doc_id)
            doc.message = "Analyzing document..."
            db.session.commit()
            
            full_text, clauses, summary_text = process_document(file_path)
            
            # Create analysis result
            word_count = len(full_text.split())
            high_risk = len([c for c in clauses if c["category"] == "Red"])
            med_risk = len([c for c in clauses if c["category"] == "Yellow"])
            
            full_summary_block = f"""Document Statistics:
- Total words: {word_count}
- High risk clauses: {high_risk}
- Medium risk clauses: {med_risk}

AI Summary:
{summary_text}"""

            result = AnalysisResult(
                document_id=doc_id,
                full_text=full_text,
                summary_text=full_summary_block,
                clauses_json=json.dumps(clauses)
            )
            
            doc.status = 'completed'
            doc.message = 'Analysis completed successfully'
            db.session.add(result)
            db.session.commit()
            
        except Exception as e:
            current_app.logger.error(f"Analysis Failed: {e}")
            doc = Document.query.get(doc_id)
            if doc:
                doc.status = 'failed'
                doc.message = f"Analysis failed: {str(e)}"
                db.session.commit()

@bp.route('/document/<document_id>', methods=['GET'])
def get_document_status(document_id: str):
    doc = Document.query.get(document_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
        
    if doc.status == 'completed' and doc.analysis:
        return jsonify({
            "documentId": doc.id,
            "status": "completed",
            "fullText": doc.analysis.full_text,
            "analysis": json.loads(doc.analysis.clauses_json),
            "documentSummary": doc.analysis.summary_text,
            "fullAnalysis": doc.analysis.summary_text
        })
    else:
        return jsonify({
            "documentId": doc.id,
            "status": doc.status,
            "message": doc.message
        })

@bp.route('/pdf/<document_id>', methods=['GET'])
def get_pdf(document_id: str):
    doc = Document.query.get(document_id)
    if not doc or not doc.pdf_data:
        return jsonify({"error": "PDF not found"}), 404
    
    from io import BytesIO
    return send_file(
        BytesIO(doc.pdf_data),
        mimetype='application/pdf',
        as_attachment=False,
        download_name=doc.filename
    )

@bp.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    document_id = data.get('documentId')
    query = data.get('query')
    
    if not document_id or not query:
        return jsonify({"error": "Missing params"}), 400
        
    doc = Document.query.get(document_id)
    if not doc or not doc.analysis: # Ensure analysis exists
         return jsonify({"error": "Document not analyzed yet"}), 404
         
    client = get_groq_client()
    if not client:
         return jsonify({"answer": "GROQ_API_KEY missing. Cannot answer.", "hasAI": False})
         
    # RAG
    context = doc.analysis.full_text[:6000]
    prompt = f"""Answer based on context:
    {context}
    
    Question: {query}"""
    
    try:
        completion = call_groq_api(
            client,
            messages=[{"role": "user", "content": prompt}]
        )
        return jsonify({
            "answer": completion.choices[0].message.content,
            "documentId": document_id,
            "hasAI": True
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
