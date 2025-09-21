import os
import uuid
import json
import logging
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS
CORS(app, origins=['*'])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simple in-memory storage
documents = {}

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Simple backend is working"})

@app.route('/upload', methods=['POST'])
def upload_pdf():
    """Upload PDF - simplified version"""
    try:
        logger.info("Upload request received")
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Only PDF files are allowed"}), 400
        
        # Generate document ID
        doc_id = str(uuid.uuid4())
        logger.info(f"Generated document ID: {doc_id}")
        
        # Create temp directory
        temp_dir = os.path.join(os.getcwd(), 'temp_uploads')
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save file locally
        file_path = os.path.join(temp_dir, f"{doc_id}.pdf")
        file.save(file_path)
        logger.info(f"Saved PDF to {file_path}")
        
        # Store document info
        base_url = request.host_url.rstrip('/')
        pdf_url = f"{base_url}/pdf-file/{doc_id}"
        
        documents[doc_id] = {
            "documentId": doc_id,
            "status": "completed",
            "fullText": "Sample legal document text extracted from PDF.",
            "analysis": [
                {
                    "id": "1",
                    "text": "This is a sample clause from the document.",
                    "category": "Green",
                    "explanation": "Low risk clause",
                    "page": 1,
                    "confidence": 0.8
                }
            ],
            "documentSummary": "This is a sample legal document analysis.",
            "fullAnalysis": "Complete analysis of the uploaded document.",
            "keyTerms": ["contract", "agreement", "terms"],
            "entities": ["Party A", "Party B"],
            "message": "Analysis completed successfully"
        }
        
        logger.info(f"Document {doc_id} processed successfully")
        
        return jsonify({
            "documentId": doc_id,
            "pdfUrl": pdf_url,
            "message": "File uploaded successfully. Analysis completed."
        })
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route('/pdf-file/<doc_id>', methods=['GET'])
def serve_pdf_file(doc_id):
    """Serve the actual PDF file"""
    try:
        logger.info(f"Serving PDF for document {doc_id}")
        
        temp_dir = os.path.join(os.getcwd(), 'temp_uploads')
        file_path = os.path.join(temp_dir, f"{doc_id}.pdf")
        
        if not os.path.exists(file_path):
            logger.error(f"PDF file not found: {file_path}")
            return jsonify({"error": "PDF not found"}), 404
        
        response = send_file(file_path, mimetype='application/pdf')
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
        
    except Exception as e:
        logger.error(f"Failed to serve PDF file {doc_id}: {e}")
        return jsonify({"error": f"Failed to serve PDF file: {str(e)}"}), 500

@app.route('/pdf/<doc_id>', methods=['GET'])
def get_pdf_url(doc_id):
    """Get PDF URL"""
    try:
        logger.info(f"Getting PDF URL for document {doc_id}")
        
        if doc_id not in documents:
            return jsonify({"error": "Document not found"}), 404
        
        base_url = request.host_url.rstrip('/')
        pdf_url = f"{base_url}/pdf-file/{doc_id}"
        
        return jsonify({"pdfUrl": pdf_url})
        
    except Exception as e:
        logger.error(f"Failed to get PDF URL {doc_id}: {e}")
        return jsonify({"error": f"Failed to get PDF URL: {str(e)}"}), 500

@app.route('/document/<doc_id>', methods=['GET'])
def get_document_status(doc_id):
    """Get document analysis status and results"""
    try:
        logger.info(f"Getting status for document {doc_id}")
        
        if doc_id not in documents:
            logger.error(f"Document {doc_id} not found")
            return jsonify({"error": "Document not found"}), 404
        
        return jsonify(documents[doc_id])
        
    except Exception as e:
        logger.error(f"Failed to get document status {doc_id}: {e}")
        return jsonify({"error": f"Failed to get document status: {str(e)}"}), 500

@app.route('/debug', methods=['GET'])
def debug():
    """Debug endpoint"""
    return jsonify({
        "documents": list(documents.keys()),
        "document_details": documents,
        "temp_dir": os.path.join(os.getcwd(), 'temp_uploads'),
        "temp_files": os.listdir(os.path.join(os.getcwd(), 'temp_uploads')) if os.path.exists(os.path.join(os.getcwd(), 'temp_uploads')) else []
    })

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)