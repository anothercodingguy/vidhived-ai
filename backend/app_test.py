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
        
        # Store immediately with comprehensive sample data
        docs[doc_id] = {
            "documentId": doc_id,
            "status": "completed",
            "analysis": [
                {
                    "id": "1",
                    "page_number": 1,
                    "text": "The Client shall pay all fees within thirty (30) days of invoice date. Late payments will incur a penalty of 1.5% per month on the outstanding balance.",
                    "bounding_box": {"vertices": [{"x": 50, "y": 100}, {"x": 550, "y": 100}, {"x": 550, "y": 150}, {"x": 50, "y": 150}]},
                    "ocr_page_width": 612,
                    "ocr_page_height": 792,
                    "score": 0.9,
                    "category": "Red",
                    "type": "Payment Terms",
                    "explanation": "HIGH RISK: This clause imposes strict payment deadlines with significant penalties for late payment. The 1.5% monthly penalty rate is quite high and could result in substantial additional costs."
                },
                {
                    "id": "2", 
                    "page_number": 1,
                    "text": "Either party may terminate this agreement with sixty (60) days written notice. Upon termination, all work product shall be delivered within fifteen (15) days.",
                    "bounding_box": {"vertices": [{"x": 50, "y": 200}, {"x": 550, "y": 200}, {"x": 550, "y": 250}, {"x": 50, "y": 250}]},
                    "ocr_page_width": 612,
                    "ocr_page_height": 792,
                    "score": 0.6,
                    "category": "Yellow",
                    "type": "Termination Clause",
                    "explanation": "MEDIUM RISK: The 60-day notice period is reasonable, but the 15-day delivery requirement after termination may be challenging to meet depending on project complexity."
                },
                {
                    "id": "3",
                    "page_number": 2,
                    "text": "This agreement shall be governed by the laws of the State of California. Any disputes shall be resolved through binding arbitration.",
                    "bounding_box": {"vertices": [{"x": 50, "y": 300}, {"x": 550, "y": 300}, {"x": 550, "y": 350}, {"x": 50, "y": 350}]},
                    "ocr_page_width": 612,
                    "ocr_page_height": 792,
                    "score": 0.3,
                    "category": "Green",
                    "type": "Governing Law",
                    "explanation": "LOW RISK: Standard governing law and arbitration clause. California law is well-established for business contracts, and arbitration can be cost-effective for dispute resolution."
                },
                {
                    "id": "4",
                    "page_number": 2,
                    "text": "The Contractor shall maintain confidentiality of all proprietary information and shall not disclose such information to third parties without prior written consent.",
                    "bounding_box": {"vertices": [{"x": 50, "y": 400}, {"x": 550, "y": 400}, {"x": 550, "y": 450}, {"x": 50, "y": 450}]},
                    "ocr_page_width": 612,
                    "ocr_page_height": 792,
                    "score": 0.4,
                    "category": "Green",
                    "type": "Confidentiality",
                    "explanation": "LOW RISK: Standard confidentiality clause that protects sensitive business information. The terms are reasonable and commonly accepted in professional agreements."
                },
                {
                    "id": "5",
                    "page_number": 3,
                    "text": "In the event of breach of contract, the breaching party shall be liable for all damages including attorney fees and costs, with liability not to exceed $50,000.",
                    "bounding_box": {"vertices": [{"x": 50, "y": 500}, {"x": 550, "y": 500}, {"x": 550, "y": 550}, {"x": 50, "y": 550}]},
                    "ocr_page_width": 612,
                    "ocr_page_height": 792,
                    "score": 0.7,
                    "category": "Yellow",
                    "type": "Liability Clause",
                    "explanation": "MEDIUM RISK: While the liability cap of $50,000 provides some protection, the inclusion of attorney fees could significantly increase costs in case of disputes. Consider negotiating the attorney fees provision."
                }
            ],
            "documentSummary": "This is a comprehensive service agreement containing standard business terms with some areas requiring attention. The document includes payment terms, termination conditions, confidentiality requirements, and liability provisions.",
            "fullAnalysis": "EXECUTIVE SUMMARY: This 3-page service agreement has been analyzed and contains 5 key clauses with varying risk levels. The contract includes 1 high-risk clause (payment penalties), 2 medium-risk clauses (termination and liability), and 2 low-risk clauses (governing law and confidentiality). RECOMMENDATIONS: Review the payment penalty terms for potential negotiation, ensure termination delivery timelines are feasible, and consider attorney fees provisions in the liability clause."
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