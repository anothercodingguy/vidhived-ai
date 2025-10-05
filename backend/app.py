import os
import uuid
import json
import logging
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import re
from typing import List, Dict, Any

# PDF processing
try:
    import PyPDF2
    PDF_PROCESSING_AVAILABLE = True
except ImportError:
    PDF_PROCESSING_AVAILABLE = False

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS for production
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=cors_origins, supports_credentials=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for demo (use database in production)
documents = {}
job_status = {}

class LegalPhraseScorer:
    """Simple legal clause scorer"""
    
    HIGH_RISK_PATTERNS = [
        r'penalty', r'liquidated damages', r'termination', r'breach',
        r'indemnif', r'liability', r'governing law', r'dispute'
    ]
    
    MEDIUM_RISK_PATTERNS = [
        r'payment', r'delivery', r'warranty', r'maintenance', r'renewal'
    ]
    
    def score_clause(self, text: str) -> tuple:
        """Returns (score, category, clause_type)"""
        text_lower = text.lower()
        
        for pattern in self.HIGH_RISK_PATTERNS:
            if re.search(pattern, text_lower):
                return (0.8, "Red", "High Risk")
        
        for pattern in self.MEDIUM_RISK_PATTERNS:
            if re.search(pattern, text_lower):
                return (0.5, "Yellow", "Medium Risk")
        
        return (0.2, "Green", "Low Risk")

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    if not PDF_PROCESSING_AVAILABLE:
        return "PDF processing not available. Please install PyPDF2."
    
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        return f"Error extracting text: {str(e)}"

def analyze_document(doc_id: str, file_path: str):
    """Analyze document and extract clauses"""
    try:
        logger.info(f"Starting analysis for document {doc_id}")
        job_status[doc_id] = {"status": "processing", "message": "Extracting text..."}
        
        # Extract text
        full_text = extract_text_from_pdf(file_path)
        
        # Simple clause extraction
        job_status[doc_id]["message"] = "Analyzing clauses..."
        scorer = LegalPhraseScorer()
        clauses = []
        
        # Split into sentences and analyze
        sentences = re.split(r'[.!?]+', full_text)
        clause_id = 1
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 50:  # Only analyze substantial sentences
                score, category, clause_type = scorer.score_clause(sentence)
                
                clause = {
                    "id": f"clause-{clause_id}",
                    "page_number": 1,  # Simplified
                    "text": sentence,
                    "score": score,
                    "category": category,
                    "type": clause_type,
                    "explanation": f"{category} risk clause detected"
                }
                clauses.append(clause)
                clause_id += 1
                
                if clause_id > 20:  # Limit for demo
                    break
        
        # Generate summary
        job_status[doc_id]["message"] = "Generating summary..."
        word_count = len(full_text.split())
        high_risk_count = len([c for c in clauses if c["category"] == "Red"])
        medium_risk_count = len([c for c in clauses if c["category"] == "Yellow"])
        
        summary = f"""Document Analysis Summary:
- Total words: {word_count}
- Total clauses analyzed: {len(clauses)}
- High risk clauses: {high_risk_count}
- Medium risk clauses: {medium_risk_count}
- Low risk clauses: {len(clauses) - high_risk_count - medium_risk_count}

This is a basic analysis. For advanced AI-powered analysis, please configure Google Cloud services."""
        
        # Save results
        analysis_result = {
            "documentId": doc_id,
            "status": "completed",
            "fullText": full_text,
            "analysis": clauses,
            "documentSummary": summary,
            "fullAnalysis": summary,
            "keyTerms": [],
            "entities": []
        }
        
        documents[doc_id] = analysis_result
        job_status[doc_id] = {
            "status": "completed",
            "message": "Analysis completed successfully",
            "analysis_result": analysis_result
        }
        
        logger.info(f"Analysis completed for document {doc_id}")
        
    except Exception as e:
        logger.error(f"Analysis failed for document {doc_id}: {e}")
        job_status[doc_id] = {
            "status": "failed",
            "message": f"Analysis failed: {str(e)}"
        }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "pdf_processing": PDF_PROCESSING_AVAILABLE,
        "version": "1.0.0"
    })

@app.route('/upload', methods=['POST'])
def upload_pdf():
    """Upload PDF and start analysis"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Only PDF files are allowed"}), 400
        
        # Generate document ID
        doc_id = str(uuid.uuid4())
        
        # Save file temporarily
        upload_dir = os.path.join(os.getcwd(), 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{doc_id}.pdf")
        file.save(file_path)
        
        # Start analysis in background
        import threading
        analysis_thread = threading.Thread(target=analyze_document, args=(doc_id, file_path))
        analysis_thread.start()
        
        # Return response immediately
        pdf_url = f"/pdf/{doc_id}"
        
        return jsonify({
            "documentId": doc_id,
            "pdfUrl": pdf_url,
            "message": "Upload successful, analysis started"
        }), 202
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route('/pdf/<document_id>', methods=['GET'])
def get_pdf(document_id: str):
    """Serve PDF file"""
    try:
        file_path = os.path.join(os.getcwd(), 'uploads', f"{document_id}.pdf")
        if not os.path.exists(file_path):
            return jsonify({"error": "PDF not found"}), 404
        
        return send_file(file_path, mimetype='application/pdf')
        
    except Exception as e:
        logger.error(f"PDF serving failed: {e}")
        return jsonify({"error": f"Failed to serve PDF: {str(e)}"}), 500

@app.route('/document/<document_id>', methods=['GET'])
def get_document_status(document_id: str):
    """Get document analysis status"""
    try:
        if document_id in documents:
            return jsonify(documents[document_id])
        elif document_id in job_status:
            status = job_status[document_id]
            if status["status"] == "completed" and "analysis_result" in status:
                return jsonify(status["analysis_result"])
            else:
                return jsonify({
                    "documentId": document_id,
                    "status": status["status"],
                    "message": status.get("message", "Processing...")
                })
        else:
            return jsonify({"error": "Document not found"}), 404
            
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return jsonify({"error": f"Status check failed: {str(e)}"}), 500

@app.route('/ask', methods=['POST'])
def ask_question():
    """Ask question about document"""
    try:
        data = request.get_json()
        document_id = data.get('documentId')
        query = data.get('query')
        
        if not document_id or not query:
            return jsonify({"error": "Missing documentId or query"}), 400
        
        if document_id not in documents:
            return jsonify({"error": "Document not found"}), 404
        
        # Simple keyword-based search in document text
        doc = documents[document_id]
        full_text = doc.get('fullText', '')
        
        # Find relevant sentences
        sentences = re.split(r'[.!?]+', full_text)
        relevant_sentences = []
        
        query_words = query.lower().split()
        for sentence in sentences:
            sentence = sentence.strip()
            if any(word in sentence.lower() for word in query_words):
                relevant_sentences.append(sentence)
                if len(relevant_sentences) >= 3:  # Limit results
                    break
        
        if relevant_sentences:
            answer = "Based on the document, here are relevant sections:\n\n" + "\n\n".join(relevant_sentences)
        else:
            answer = "I couldn't find specific information about your query in the document. Please try rephrasing your question or check if the topic is covered in the document."
        
        return jsonify({
            "answer": answer,
            "documentId": document_id,
            "hasAI": False
        })
        
    except Exception as e:
        logger.error(f"Question answering failed: {e}")
        return jsonify({"error": f"Failed to answer question: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)