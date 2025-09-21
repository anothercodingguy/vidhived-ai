import os
import uuid
import json
import logging
import asyncio
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from google.cloud import storage, vision, aiplatform
from google.cloud.vision_v1 import types
import threading
import re
from typing import List, Dict, Any

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=cors_origins)

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(level=getattr(logging, log_level))
logger = logging.getLogger(__name__)

# GCP Configuration
GCP_PROJECT_ID = os.getenv('GCP_PROJECT_ID')
GCP_REGION = os.getenv('GCP_REGION', 'us-central1')
GCS_BUCKET_NAME = os.getenv('GCS_BUCKET_NAME')

# Initialize GCP clients
try:
    storage_client = storage.Client(project=GCP_PROJECT_ID)
    vision_client = vision.ImageAnnotatorClient()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    
    # Initialize Vertex AI
    aiplatform.init(project=GCP_PROJECT_ID, location=GCP_REGION)
    
    logger.info("GCP clients initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize GCP clients: {e}")
    storage_client = None
    vision_client = None
    bucket = None

# In-memory job status store (use Redis in production)
job_status = {}

class LegalPhraseScorer:
    """Scores legal clauses based on importance and risk"""
    
    HIGH_RISK_PATTERNS = [
        r'shall pay.*penalty',
        r'liquidated damages',
        r'termination.*breach',
        r'indemnif',
        r'liability.*limit',
        r'force majeure',
        r'governing law',
        r'dispute resolution',
        r'confidential',
        r'non-disclosure'
    ]
    
    MEDIUM_RISK_PATTERNS = [
        r'payment.*due',
        r'delivery.*date',
        r'warranty',
        r'maintenance',
        r'support',
        r'renewal',
        r'amendment'
    ]
    
    def score_clause(self, text: str) -> tuple:
        """Returns (score, category, clause_type)"""
        text_lower = text.lower()
        
        # Check high risk patterns
        for pattern in self.HIGH_RISK_PATTERNS:
            if re.search(pattern, text_lower):
                return (0.8 + (len(text) / 1000) * 0.2, "Red", self._get_clause_type(pattern))
        
        # Check medium risk patterns  
        for pattern in self.MEDIUM_RISK_PATTERNS:
            if re.search(pattern, text_lower):
                return (0.5 + (len(text) / 1000) * 0.3, "Yellow", self._get_clause_type(pattern))
        
        # Default low risk
        return (0.2 + (len(text) / 1000) * 0.3, "Green", "General Terms")
    
    def _get_clause_type(self, pattern: str) -> str:
        """Map regex pattern to clause type"""
        type_mapping = {
            r'shall pay.*penalty': 'Penalty Terms',
            r'liquidated damages': 'Damages',
            r'termination.*breach': 'Termination',
            r'indemnif': 'Indemnification',
            r'liability.*limit': 'Liability',
            r'force majeure': 'Force Majeure',
            r'governing law': 'Governing Law',
            r'dispute resolution': 'Dispute Resolution',
            r'confidential': 'Confidentiality',
            r'non-disclosure': 'Non-Disclosure',
            r'payment.*due': 'Payment Terms',
            r'delivery.*date': 'Delivery Terms',
            r'warranty': 'Warranty',
            r'maintenance': 'Maintenance',
            r'support': 'Support',
            r'renewal': 'Renewal',
            r'amendment': 'Amendment'
        }
        return type_mapping.get(pattern, 'General Terms')

def extract_clauses_from_text(full_text: str, ocr_results: List[Dict]) -> List[Dict]:
    """Extract legal clauses from OCR text with bounding boxes"""
    scorer = LegalPhraseScorer()
    clauses = []
    
    # Split text into sentences/clauses
    sentences = re.split(r'[.!?]+', full_text)
    
    clause_id = 1
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 50:  # Skip short sentences
            continue
            
        score, category, clause_type = scorer.score_clause(sentence)
        
        # Find bounding box for this clause (simplified - match first occurrence)
        bounding_box = None
        page_number = 1
        ocr_page_width = 2480
        ocr_page_height = 3508
        
        # Try to find this text in OCR results
        for page_idx, page_result in enumerate(ocr_results):
            if sentence[:50].lower() in page_result.get('text', '').lower():
                page_number = page_idx + 1
                # Use first text annotation bounding box as approximation
                if 'text_annotations' in page_result and page_result['text_annotations']:
                    vertices = page_result['text_annotations'][0].get('bounding_poly', {}).get('vertices', [])
                    if vertices:
                        bounding_box = {"vertices": vertices}
                break
        
        # Default bounding box if not found
        if not bounding_box:
            bounding_box = {
                "vertices": [
                    {"x": 100, "y": 100 + (clause_id * 50)},
                    {"x": 500, "y": 100 + (clause_id * 50)},
                    {"x": 500, "y": 150 + (clause_id * 50)},
                    {"x": 100, "y": 150 + (clause_id * 50)}
                ]
            }
        
        clause = {
            "id": f"clause-{clause_id}",
            "page_number": page_number,
            "text": sentence,
            "bounding_box": bounding_box,
            "ocr_page_width": ocr_page_width,
            "ocr_page_height": ocr_page_height,
            "score": round(score, 2),
            "category": category,
            "type": clause_type,
            "explanation": ""
        }
        
        clauses.append(clause)
        clause_id += 1
    
    return clauses

async def get_ai_explanation(clause_text: str, category: str) -> str:
    """Get AI explanation for Red/Yellow clauses"""
    if category == "Green":
        return ""
    
    try:
        # Mock explanation for development (replace with actual Vertex AI call)
        if category == "Red":
            return f"HIGH RISK: This clause contains critical terms that could result in significant financial or legal consequences. Review carefully with legal counsel."
        else:
            return f"MEDIUM RISK: This clause requires attention and may impact your obligations or rights under the contract."
    except Exception as e:
        logger.error(f"Failed to get AI explanation: {e}")
        return f"Unable to generate explanation for this {category.lower()} risk clause."

def process_document_async(doc_id: str, pdf_blob_name: str):
    """Background task to process uploaded PDF"""
    try:
        logger.info(f"Starting document processing for {doc_id}")
        job_status[doc_id] = {"status": "processing", "message": "Starting OCR analysis..."}
        
        # Download PDF from GCS for processing
        blob = bucket.blob(pdf_blob_name)
        pdf_content = blob.download_as_bytes()
        
        # Perform OCR using Vision API
        job_status[doc_id]["message"] = "Performing OCR analysis..."
        
        # Convert PDF to images and process with Vision API (simplified)
        image = vision.Image(content=pdf_content)
        response = vision_client.text_detection(image=image)
        
        if response.error.message:
            raise Exception(f'Vision API error: {response.error.message}')
        
        # Extract full text
        full_text = response.full_text_annotation.text if response.full_text_annotation else ""
        
        # Prepare OCR results structure
        ocr_results = [{
            "text": full_text,
            "text_annotations": [
                {
                    "description": annotation.description,
                    "bounding_poly": {
                        "vertices": [{"x": vertex.x, "y": vertex.y} for vertex in annotation.bounding_poly.vertices]
                    }
                } for annotation in response.text_annotations
            ]
        }]
        
        # Extract and score clauses
        job_status[doc_id]["message"] = "Analyzing legal clauses..."
        clauses = extract_clauses_from_text(full_text, ocr_results)
        
        # Get AI explanations for Red/Yellow clauses
        job_status[doc_id]["message"] = "Generating explanations..."
        for clause in clauses:
            if clause["category"] in ["Red", "Yellow"]:
                explanation = asyncio.run(get_ai_explanation(clause["text"], clause["category"]))
                clause["explanation"] = explanation
        
        # Save final analysis to GCS
        analysis_result = {
            "documentId": doc_id,
            "status": "completed",
            "fullText": full_text,
            "analysis": clauses
        }
        
        analysis_blob_name = f"analysis-results/{doc_id}/final_analysis.json"
        analysis_blob = bucket.blob(analysis_blob_name)
        analysis_blob.upload_from_string(json.dumps(analysis_result), content_type='application/json')
        
        # Update job status
        job_status[doc_id] = {
            "status": "completed",
            "message": "Analysis completed successfully",
            "analysis_result": analysis_result
        }
        
        logger.info(f"Document processing completed for {doc_id}")
        
    except Exception as e:
        logger.error(f"Document processing failed for {doc_id}: {e}")
        job_status[doc_id] = {
            "status": "failed",
            "message": f"Processing failed: {str(e)}"
        }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"})

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
        
        # Upload to GCS
        blob_name = f"uploads/{doc_id}.pdf"
        blob = bucket.blob(blob_name)
        blob.upload_from_file(file, content_type='application/pdf')
        
        # Generate signed URL for frontend access
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.utcnow() + timedelta(hours=24),
            method="GET"
        )
        
        # Start background processing
        thread = threading.Thread(target=process_document_async, args=(doc_id, blob_name))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "documentId": doc_id,
            "pdfUrl": signed_url,
            "message": "File uploaded successfully. Analysis started."
        })
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return jsonify({"error": "Upload failed"}), 500

@app.route('/pdf/<doc_id>', methods=['GET'])
def serve_pdf(doc_id):
    """Serve PDF from GCS"""
    try:
        blob_name = f"uploads/{doc_id}.pdf"
        blob = bucket.blob(blob_name)
        
        if not blob.exists():
            return jsonify({"error": "PDF not found"}), 404
        
        # Generate signed URL
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.utcnow() + timedelta(hours=1),
            method="GET"
        )
        
        return jsonify({"pdfUrl": signed_url})
        
    except Exception as e:
        logger.error(f"Failed to serve PDF {doc_id}: {e}")
        return jsonify({"error": "Failed to serve PDF"}), 500

@app.route('/document/<doc_id>', methods=['GET'])
def get_document_status(doc_id):
    """Get document analysis status and results"""
    try:
        if doc_id not in job_status:
            return jsonify({"error": "Document not found"}), 404
        
        status_info = job_status[doc_id]
        
        if status_info["status"] == "completed":
            return jsonify(status_info["analysis_result"])
        else:
            return jsonify({
                "documentId": doc_id,
                "status": status_info["status"],
                "message": status_info.get("message", "")
            })
            
    except Exception as e:
        logger.error(f"Failed to get document status {doc_id}: {e}")
        return jsonify({"error": "Failed to get document status"}), 500

@app.route('/ask', methods=['POST'])
def ask_question():
    """Answer questions about the document"""
    try:
        data = request.get_json()
        doc_id = data.get('documentId')
        query = data.get('query')
        
        if not doc_id or not query:
            return jsonify({"error": "documentId and query are required"}), 400
        
        if doc_id not in job_status or job_status[doc_id]["status"] != "completed":
            return jsonify({"error": "Document analysis not completed"}), 400
        
        # Get document analysis
        analysis_result = job_status[doc_id]["analysis_result"]
        full_text = analysis_result.get("fullText", "")
        
        # Mock AI response (replace with actual Vertex AI Gemini call)
        answer = f"Based on the document analysis, regarding '{query}': This is a mock response. The document contains {len(analysis_result.get('analysis', []))} analyzed clauses. Please implement actual Vertex AI integration for production use."
        
        return jsonify({
            "answer": answer,
            "documentId": doc_id
        })
        
    except Exception as e:
        logger.error(f"Failed to answer question: {e}")
        return jsonify({"error": "Failed to process question"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))