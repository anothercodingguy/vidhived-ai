import os
import uuid
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
    try:
        print(f"=== PDF URL REQUEST ===")
        print(f"Doc ID: {doc_id}")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request method: {request.method}")
        print(f"Available docs: {list(docs.keys())}")
        
        if doc_id not in docs:
            print(f"Doc {doc_id} not found in docs")
            return jsonify({"error": "Document not found"}), 404
        
        response_data = {
            "pdfUrl": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        }
        print(f"Returning JSON: {response_data}")
        
        response = jsonify(response_data)
        response.headers['Content-Type'] = 'application/json'
        return response
        
    except Exception as e:
        print(f"PDF URL error: {e}")
        return jsonify({"error": str(e)}), 500

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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)