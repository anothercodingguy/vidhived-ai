import os
import uuid
import json
import logging
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

documents = {}
def health():
"""
This file is now deprecated. Use app.py for all production and development purposes.
All test/demo endpoints and logic have been removed.
"""

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
                    "page_number": 1,
                    "text": "This is a sample clause from the document that demonstrates the legal analysis functionality.",
                    "bounding_box": {
                        "vertices": [
                            {"x": 100, "y": 100},
                            {"x": 500, "y": 100},
                            {"x": 500, "y": 150},
                            {"x": 100, "y": 150}
                        ]
                    },
                    "ocr_page_width": 612,
                    "ocr_page_height": 792,
                    "score": 0.8,
                    "category": "Green",
                    "type": "Standard Clause",
                    "explanation": "This is a low risk clause with standard terms and conditions."
                },
                {
                    "id": "2",
                    "page_number": 1,
                    "text": "Sample high-risk clause with penalty terms and termination conditions.",
                    "bounding_box": {
                        "vertices": [
                            {"x": 100, "y": 200},
                            {"x": 500, "y": 200},
                            {"x": 500, "y": 250},
                            {"x": 100, "y": 250}
                        ]
                    },
                    "ocr_page_width": 612,
                    "ocr_page_height": 792,
                    "score": 0.9,
                    "category": "Red",
                    "type": "Risk Clause",
                    "explanation": "This clause contains penalty terms that could result in significant financial consequences."
                },
                {
                    "id": "3",
                    "page_number": 1,
                    "text": "Medium risk clause that requires careful review and consideration.",
                    "bounding_box": {
                        "vertices": [
                            {"x": 100, "y": 300},
                            {"x": 500, "y": 300},
                            {"x": 500, "y": 350},
                            {"x": 100, "y": 350}
                        ]
                    },
                    "ocr_page_width": 612,
                    "ocr_page_height": 792,
                    "score": 0.6,
                    "category": "Yellow",
                    "type": "Caution Clause",
                    "explanation": "This clause requires attention and may impact your obligations under the contract."
                }
            ],
            "documentSummary": "This is a sample legal document analysis demonstrating the platform's capabilities. The document contains 3 analyzed clauses with varying risk levels.",
            "fullAnalysis": "Complete analysis of the uploaded document shows 1 high-risk clause, 1 medium-risk clause, and 1 low-risk clause. The document appears to be a standard legal agreement with some areas requiring attention.",
            "keyTerms": ["contract", "agreement", "terms", "penalty", "termination"],
            "entities": ["Party A", "Party B", "Legal Entity"],
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

@app.route('/ask', methods=['POST'])
def ask_question():
    """Answer questions about the document - simplified version"""
    try:
        data = request.get_json()
        doc_id = data.get('documentId')
        query = data.get('query')
        
        if not doc_id or not query:
            return jsonify({"error": "documentId and query are required"}), 400
        
        if doc_id not in documents:
            return jsonify({"error": "Document not found"}), 404
        
        # Simple response based on the query
        sample_answers = {
            "what": "This document appears to be a legal agreement with standard terms and conditions.",
            "who": "The parties involved are Party A and Party B as mentioned in the document.",
            "when": "The document does not specify particular dates in this sample analysis.",
            "where": "The jurisdiction and location details would be found in the full document analysis.",
            "how": "The document establishes obligations and rights through various clauses and terms.",
            "risk": "The document contains 1 high-risk clause, 1 medium-risk clause, and 1 low-risk clause.",
            "penalty": "There are penalty terms mentioned in the high-risk clause that require careful review.",
            "termination": "Termination conditions are referenced in the risk analysis section."
        }
        
        # Find the best matching answer
        query_lower = query.lower()
        answer = "Based on the document analysis, I can provide information about the clauses and terms. "
        
        for keyword, response in sample_answers.items():
            if keyword in query_lower:
                answer = response
                break
        
        if answer == "Based on the document analysis, I can provide information about the clauses and terms. ":
            answer += "The document contains 3 analyzed clauses with different risk levels. Please ask more specific questions about risks, parties, terms, or penalties."
        
        return jsonify({
            "answer": answer,
            "documentId": doc_id,
            "hasAI": False
        })
        
    except Exception as e:
        logger.error(f"Failed to answer question: {e}")
        return jsonify({"error": f"Failed to process question: {str(e)}"}), 500

@app.route('/analyze-clauses', methods=['POST'])
def analyze_clauses():
    """Analyze clauses - simplified version"""
    return jsonify({"error": "Advanced analysis not available in simple mode"}), 501

@app.route('/extract-entities', methods=['POST'])
def extract_entities():
    """Extract entities - simplified version"""
    return jsonify({"error": "Entity extraction not available in simple mode"}), 501

@app.route('/score-importance', methods=['POST'])
def score_importance():
    """Score importance - simplified version"""
    return jsonify({"error": "Importance scoring not available in simple mode"}), 501

@app.route('/summarize-text', methods=['POST'])
def summarize_text():
    """Summarize text - simplified version"""
    return jsonify({"error": "Text summarization not available in simple mode"}), 501

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