import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=['*'])

# Super simple in-memory storage
docs = {}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Test backend working"})

@app.route('/upload', methods=['POST'])
def upload():
    try:
        print("Upload request received")
        
        if 'file' not in request.files:
            return jsonify({"error": "No file"}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({"error": "No filename"}), 400
        
        doc_id = str(uuid.uuid4())
        print(f"Generated ID: {doc_id}")
        
        # Store immediately - no file saving
        docs[doc_id] = {
            "documentId": doc_id,
            "status": "completed",
            "analysis": [{
                "id": "1",
                "page_number": 1,
                "text": "Test clause",
                "bounding_box": {"vertices": [{"x": 0, "y": 0}]},
                "ocr_page_width": 612,
                "ocr_page_height": 792,
                "score": 0.8,
                "category": "Green",
                "type": "Test",
                "explanation": "Test explanation"
            }],
            "documentSummary": "Test summary",
            "fullAnalysis": "Test analysis"
        }
        
        print(f"Stored doc: {doc_id}")
        print(f"Total docs now: {len(docs)}")
        print(f"Doc keys: {list(docs.keys())}")
        
        return jsonify({
            "documentId": doc_id,
            "pdfUrl": f"data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsO4CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo+PgpzdHJlYW0KQNC4xOTAuNDc2IDc5Mi4wMDAgbApCVAovRjEgMTIgVGYKKFRlc3QgUERGKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgozIDAgb2JqCjw8Ci9MZW5ndGggNAo+PgpzdHJlYW0KNApzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA3NCAwMDAwMCBuIAowMDAwMDAwMTIwIDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNAovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMTQ5CiUlRU9G",
            "message": "Test upload successful"
        })
        
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/document/<doc_id>', methods=['GET'])
def get_doc(doc_id):
    try:
        print(f"Getting doc: {doc_id}")
        print(f"Available docs: {list(docs.keys())}")
        
        if doc_id not in docs:
            print(f"Doc {doc_id} not found")
            return jsonify({"error": "Not found"}), 404
        
        result = docs[doc_id]
        print(f"Returning: {result}")
        return jsonify(result)
        
    except Exception as e:
        print(f"Get doc error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/pdf/<doc_id>', methods=['GET'])
def get_pdf_url(doc_id):
    """Return JSON with PDF URL - NOT the PDF file itself"""
    try:
        print(f"=== GET PDF URL (JSON) ===")
        print(f"Doc ID: {doc_id}")
        print(f"Request URL: {request.url}")
        print(f"User-Agent: {request.headers.get('User-Agent', 'Unknown')}")
        print(f"Accept: {request.headers.get('Accept', 'Unknown')}")
        
        # Force JSON response with explicit headers
        response_data = {
            "pdfUrl": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            "message": "This is JSON, not PDF content",
            "docId": doc_id,
            "endpoint": "/pdf/ (returns JSON)"
        }
        print(f"Returning JSON response: {response_data}")
        
        response = jsonify(response_data)
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Cache-Control'] = 'no-cache'
        return response
        
    except Exception as e:
        print(f"PDF URL error: {e}")
        return jsonify({"error": str(e), "endpoint": "/pdf/ (JSON)"}), 500

@app.route('/test-json', methods=['GET'])
def test_json():
    """Simple test endpoint to verify JSON responses work"""
    print("=== TEST JSON ENDPOINT CALLED ===")
    return jsonify({"message": "JSON response working", "timestamp": str(datetime.now())})

@app.route('/debug-docs', methods=['GET'])
def debug_docs():
    """Debug endpoint to show all documents"""
    print("=== DEBUG DOCS ENDPOINT CALLED ===")
    return jsonify({
        "total_docs": len(docs),
        "doc_ids": list(docs.keys()),
        "docs": docs
    })

@app.route('/pdf-file/<doc_id>', methods=['GET'])
def serve_pdf_file(doc_id):
    """Serve actual PDF file content"""
    try:
        print(f"=== SERVE PDF FILE ===")
        print(f"Doc ID: {doc_id}")
        print(f"This endpoint serves PDF content, not JSON")
        
        # Return a simple PDF-like response
        pdf_content = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF"
        
        response = app.response_class(
            pdf_content,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'inline; filename="{doc_id}.pdf"',
                'Access-Control-Allow-Origin': '*'
            }
        )
        return response
        
    except Exception as e:
        print(f"PDF file serve error: {e}")
        return str(e), 500

@app.route('/ask', methods=['POST'])
def ask():
    try:
        data = request.get_json()
        return jsonify({
            "answer": "Test answer",
            "documentId": data.get('documentId'),
            "hasAI": False
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.before_request
def log_request():
    """Log all incoming requests"""
    print(f"=== INCOMING REQUEST ===")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Path: {request.path}")
    print(f"Headers: {dict(request.headers)}")
    print("========================")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)