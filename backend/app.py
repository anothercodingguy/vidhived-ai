import os
import uuid
import json
import logging
import asyncio
import io
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from dotenv import load_dotenv
import threading
import re
from typing import List, Dict, Any

# Optional imports for image processing
try:
    import numpy as np
    from PIL import Image
    IMAGE_PROCESSING_AVAILABLE = True
except ImportError:
    IMAGE_PROCESSING_AVAILABLE = False
    print("Image processing libraries not available - using basic mode")

# Optional imports for AI features
try:
    from google.cloud import storage, vision, aiplatform
    from google.cloud.vision_v1 import types
    import vertexai
    from vertexai.generative_models import GenerativeModel
    GOOGLE_CLOUD_AVAILABLE = True
    logger.info("Google Cloud libraries loaded successfully")
except ImportError as e:
    GOOGLE_CLOUD_AVAILABLE = False
    logger.warning(f"Google Cloud libraries not available: {e}")
    print("Google Cloud libraries not available - using fallback mode")

# Optional import for advanced legal analysis
try:
    from legal_analysis.advanced_analyzer import AdvancedLegalAnalyzer
    ADVANCED_ANALYSIS_AVAILABLE = True
except ImportError:
    ADVANCED_ANALYSIS_AVAILABLE = False
    print("Advanced legal analysis not available - using basic mode")

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000,https://vidhived-frontend.onrender.com').split(',')
CORS(app, origins=cors_origins, supports_credentials=True)

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(level=getattr(logging, log_level))
logger = logging.getLogger(__name__)

# GCP Configuration
GCP_PROJECT_ID = os.getenv('GCP_PROJECT_ID')
GCP_REGION = os.getenv('GCP_REGION', 'us-central1')
GCS_BUCKET_NAME = os.getenv('GCS_BUCKET_NAME')
GOOGLE_CLOUD_API_KEY = os.getenv('GOOGLE_CLOUD_API_KEY')

# Initialize GCP clients (optional)
storage_client = None
vision_client = None
bucket = None
gemini_model = None
advanced_analyzer = None

def check_gcs_connectivity():
    """Test GCS connectivity and permissions"""
    if not GOOGLE_CLOUD_AVAILABLE or not storage_client or not bucket:
        return False, "GCS not available"
    
    try:
        # Test bucket access
        bucket.reload()
        logger.info(f"GCS bucket '{GCS_BUCKET_NAME}' is accessible")
        
        # Test write permissions by creating a test blob
        test_blob = bucket.blob("test-connectivity.txt")
        test_blob.upload_from_string("connectivity test", content_type="text/plain")
        
        # Test read permissions
        content = test_blob.download_as_text()
        
        # Clean up test blob
        test_blob.delete()
        
        logger.info("GCS connectivity test passed - read/write permissions confirmed")
        return True, "GCS connectivity confirmed"
        
    except Exception as e:
        logger.error(f"GCS connectivity test failed: {e}")
        return False, f"GCS connectivity failed: {str(e)}"

# Check if GCP should be used
USE_GCP = (GOOGLE_CLOUD_AVAILABLE and 
           os.getenv('GOOGLE_APPLICATION_CREDENTIALS') and 
           GCP_PROJECT_ID and 
           GCS_BUCKET_NAME)

if USE_GCP:
    try:
        # Ensure credentials are set for all threads
        logger.info(f"Using service account from: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS')}")
        
        # Initialize GCP clients
        storage_client = storage.Client(project=GCP_PROJECT_ID)
        vision_client = vision.ImageAnnotatorClient()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        logger.info(f"Initialized GCS bucket: {GCS_BUCKET_NAME}")
        
        # Initialize Vertex AI
        vertexai.init(project=GCP_PROJECT_ID, location=GCP_REGION)
        gemini_model = GenerativeModel("gemini-1.5-flash")
        logger.info("Vertex AI and Gemini model initialized successfully")
        
        # Test connectivity if requested
        if os.getenv('CHECK_GCS_ON_START', '').lower() == 'true':
            success, message = check_gcs_connectivity()
            if success:
                logger.info(f"GCS startup check: {message}")
            else:
                logger.warning(f"GCS startup check failed: {message}")
        
        logger.info("All GCP clients initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize GCP clients: {e}")
        USE_GCP = False
        storage_client = None
        vision_client = None
        bucket = None
        gemini_model = None
else:
    logger.info("GCP not configured - using local storage mode")
    logger.info(f"GOOGLE_CLOUD_AVAILABLE: {GOOGLE_CLOUD_AVAILABLE}")
    logger.info(f"GOOGLE_APPLICATION_CREDENTIALS: {bool(os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))}")
    logger.info(f"GCP_PROJECT_ID: {bool(GCP_PROJECT_ID)}")
    logger.info(f"GCS_BUCKET_NAME: {bool(GCS_BUCKET_NAME)}")

# Initialize Advanced Legal Analyzer (optional)
if ADVANCED_ANALYSIS_AVAILABLE:
    try:
        advanced_analyzer = AdvancedLegalAnalyzer()
        logger.info("Advanced Legal Analyzer initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Advanced Legal Analyzer: {e}")
        advanced_analyzer = None
    # Do not overwrite advanced_analyzer or other clients if already initialized

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

def generate_document_summary_and_analysis(full_text: str) -> Dict[str, Any]:
    """Generate comprehensive document summary using Vertex AI Gemini"""
    if not gemini_model or not full_text.strip():
        return {
            "summary": "Document analysis unavailable - Vertex AI not configured",
            "key_terms": [],
            "entities": [],
            "error": "Vertex AI Gemini model not available"
        }
    
    try:
        # System instruction for legal document analysis
        system_instruction = """Primary Goals:
Read the entire legal document provided as plain text.
Produce a clear, concise summary of the overall document, capturing all major obligations, rights, parties, dates, amounts, and key terms.
Identify and extract definitions of key terms used throughout the document.
Highlight important entities (e.g., parties, amounts, dates, obligations).
Maintain the context of the document so that you can answer any follow-up questions the user might ask later about clauses, obligations, or terms.

Guidelines:
Maintain a professional, objective, and neutral legal tone.
Focus strictly on the input text. Do not invent or assume details.
For initial output, provide a document-level summary first.
Keep all context internally so you can respond accurately to subsequent user questions about the document.
Optionally, indicate which clause or section a key term or entity appears in.

Role:
You act as a legal analysis backend that first produces a document summary and then stays "aware" of the full content to answer follow-up questions interactively."""

        # Create the prompt
        prompt = f"""you will receive the full legal document as plain text below.

Task:
Provide a clear, human-readable summary of the entire document, highlighting key parties, dates, amounts, obligations, and rights.
Extract and define key terms mentioned throughout the document.
Identify important entities and obligations.
Maintain the full context of the document so you can answer any follow-up questions I may ask about specific clauses, obligations, or terms.

Output:
Start with a document-level summary.
Optionally list key terms, entities, and their definitions.
After this, be ready to answer follow-up questions interactively without needing the document text again.

Document:
{full_text}"""

        # Generate response using Vertex AI Gemini
        response = gemini_model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "top_p": 0.8,
                "max_output_tokens": 4096,
            }
        )
        
        return {
            "summary": response.text,
            "key_terms": [],  # Could be extracted from response if needed
            "entities": [],   # Could be extracted from response if needed
            "full_analysis": response.text
        }
        
    except Exception as e:
        logger.error(f"Failed to generate document summary: {e}")
        return {
            "summary": f"Error generating document analysis: {str(e)}",
            "key_terms": [],
            "entities": [],
            "error": str(e)
        }

def ask_document_question(full_text: str, question: str, document_context: str = "") -> str:
    """Ask a specific question about the document using Vertex AI Gemini"""
    if not gemini_model:
        return "AI question answering unavailable - Vertex AI not configured"
    
    try:
        # System instruction for Q&A
        system_instruction = """You are a legal document analysis assistant. You have been provided with a legal document and must answer questions about it accurately and professionally.

Guidelines:
- Answer based strictly on the document content provided
- Maintain a professional, objective tone
- If information is not in the document, clearly state that
- Provide specific references to clauses or sections when possible
- Keep answers concise but comprehensive"""

        # Create the Q&A prompt
        prompt = f"""Based on the following legal document, please answer the user's question:

Document:
{full_text}

{f"Previous context: {document_context}" if document_context else ""}

Question: {question}

Please provide a clear, accurate answer based on the document content."""

        # Generate response using Vertex AI Gemini
        response = gemini_model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,
                "top_p": 0.8,
                "max_output_tokens": 2048,
            }
        )
        
        return response.text
        
    except Exception as e:
        logger.error(f"Failed to answer document question: {e}")
        return f"Error processing question: {str(e)}"

def process_document_basic(doc_id: str, file_path: str):
    """Basic document processing without Google Cloud"""
    try:
        logger.info(f"Starting basic document processing for {doc_id} at {file_path}")
        job_status[doc_id] = {"status": "processing", "message": "Processing document..."}
        
        # Basic text extraction (fallback without PyPDF2)
        full_text = "Sample legal document text for demonstration purposes."
        
        # Try to extract text with PyPDF2 if available
        try:
            import PyPDF2
            logger.info(f"Attempting to extract text from {file_path}")
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                full_text = ""
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    page_text = page.extract_text()
                    full_text += page_text + "\n"
                    logger.info(f"Extracted {len(page_text)} characters from page {page_num}")
                logger.info(f"Total extracted text length: {len(full_text)}")
        except ImportError:
            logger.warning("PyPDF2 not available, using sample text")
            full_text = "Sample legal document text for demonstration purposes. This is a fallback when PyPDF2 is not available."
        except Exception as e:
            logger.error(f"PDF text extraction failed: {e}")
            full_text = f"Unable to extract text from PDF: {str(e)}. Please ensure the PDF contains readable text."
        
        # Basic clause analysis (without AI)
        job_status[doc_id]["message"] = "Analyzing clauses..."
        clauses = extract_basic_clauses(full_text)
        
        # Generate basic summary
        job_status[doc_id]["message"] = "Generating summary..."
        document_summary = generate_basic_summary(full_text)
        
        # Save analysis result
        analysis_result = {
            "documentId": doc_id,
            "status": "completed",
            "fullText": full_text,
            "analysis": clauses,
            "documentSummary": document_summary,
            "fullAnalysis": f"Basic analysis completed for document {doc_id}",
            "keyTerms": [],
            "entities": [],
            "advancedAnalysis": {"status": "basic_mode", "message": "Advanced analysis requires full AI deployment"}
        }
        
        # Update job status
        job_status[doc_id] = {
            "status": "completed",
            "message": "Basic analysis completed successfully",
            "analysis_result": analysis_result
        }
        
        logger.info(f"Basic document processing completed for {doc_id}")
        
    except Exception as e:
        logger.error(f"Basic document processing failed for {doc_id}: {e}")
        job_status[doc_id] = {
            "status": "failed",
            "message": f"Processing failed: {str(e)}"
        }

def extract_basic_clauses(text: str) -> List[Dict[str, Any]]:
    """Extract basic clauses without AI"""
    clauses = []
    
    # Simple sentence splitting
    sentences = text.split('.')
    clause_id = 1
    
    for sentence in sentences[:10]:  # Limit to first 10 sentences
        sentence = sentence.strip()
        if len(sentence) > 20:  # Only include substantial sentences
            # Basic risk assessment based on keywords
            risk_keywords = ['penalty', 'terminate', 'breach', 'default', 'liable', 'damages']
            caution_keywords = ['may', 'should', 'recommend', 'consider', 'review']
            
            category = "Green"  # Default to low risk
            if any(keyword in sentence.lower() for keyword in risk_keywords):
                category = "Red"
            elif any(keyword in sentence.lower() for keyword in caution_keywords):
                category = "Yellow"
            
            clauses.append({
                "id": str(clause_id),
                "text": sentence,
                "category": category,
                "explanation": f"Basic analysis: {category} risk level detected",
                "page": 1,
                "confidence": 0.7
            })
            clause_id += 1
    
    return clauses

def generate_basic_summary(text: str) -> str:
    """Generate basic document summary"""
    word_count = len(text.split())
    sentence_count = len(text.split('.'))
    
    return f"""Basic Document Analysis:
- Document contains approximately {word_count} words
- Contains approximately {sentence_count} sentences
- Basic clause extraction completed
- For advanced AI analysis, please use the full deployment option

Note: This is a basic analysis. For comprehensive legal analysis including AI-powered clause summarization, entity extraction, and risk assessment, please deploy using render-full-ai.yaml configuration."""

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
        
        # Generate comprehensive document summary using Gemini AI
        job_status[doc_id]["message"] = "Generating document summary..."
        document_summary = generate_document_summary_and_analysis(full_text)
        
        # Perform advanced legal analysis
        advanced_analysis = {}
        if advanced_analyzer:
            job_status[doc_id]["message"] = "Performing advanced legal analysis..."
            try:
                # Convert clauses to format expected by advanced analyzer
                clauses_dict = {}
                for i, clause in enumerate(clauses, 1):
                    clauses_dict[f"Clause {i}"] = clause["text"]
                
                advanced_analysis = advanced_analyzer.analyze_document_clauses(clauses_dict)
                logger.info("Advanced legal analysis completed")
            except Exception as e:
                logger.error(f"Advanced analysis failed: {e}")
                advanced_analysis = {"status": "error", "error": str(e)}
        
        # Save final analysis to GCS
        analysis_result = {
            "documentId": doc_id,
            "status": "completed",
            "fullText": full_text,
            "analysis": clauses,
            "documentSummary": document_summary.get("summary", ""),
            "fullAnalysis": document_summary.get("full_analysis", ""),
            "keyTerms": document_summary.get("key_terms", []),
            "entities": document_summary.get("entities", []),
            "advancedAnalysis": advanced_analysis
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
    """Health check endpoint with GCS connectivity test"""
    health_info = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "google_cloud_available": GOOGLE_CLOUD_AVAILABLE,
        "gcp_clients_initialized": USE_GCP,
        "vertex_ai_available": gemini_model is not None if USE_GCP else False,
        "vision_api_available": vision_client is not None if USE_GCP else False,
        "storage_available": storage_client is not None if USE_GCP else False,
        "advanced_analysis_available": ADVANCED_ANALYSIS_AVAILABLE,
        "image_processing_available": IMAGE_PROCESSING_AVAILABLE,
        "gcs_bucket": GCS_BUCKET_NAME,
        "gcp_project": GCP_PROJECT_ID
    }
    
    # Test GCS connectivity
    if USE_GCP and bucket:
        try:
            gcs_success, gcs_message = check_gcs_connectivity()
            health_info["gcs_connectivity"] = {
                "status": "ok" if gcs_success else "error",
                "message": gcs_message
            }
        except Exception as e:
            health_info["gcs_connectivity"] = {
                "status": "error",
                "message": f"GCS test failed: {str(e)}"
            }
    else:
        health_info["gcs_connectivity"] = {
            "status": "unavailable",
            "message": "GCS not configured"
        }
    
    return jsonify(health_info)

@app.route('/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({
        "message": "Backend is working!",
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "google_cloud": GOOGLE_CLOUD_AVAILABLE,
            "gcp_clients_initialized": USE_GCP,
            "vertex_ai": gemini_model is not None if USE_GCP else False,
            "vision_api": vision_client is not None if USE_GCP else False,
            "storage": storage_client is not None if USE_GCP else False,
            "advanced_analysis": ADVANCED_ANALYSIS_AVAILABLE,
            "image_processing": IMAGE_PROCESSING_AVAILABLE
        }
    })

@app.route('/test-gcp', methods=['GET'])
def test_gcp():
    """Test all GCP services connectivity"""
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "gcp_project": GCP_PROJECT_ID,
        "tests": {}
    }
    
    # Test Storage
    if storage_client and bucket:
        try:
            bucket.reload()
            results["tests"]["storage"] = {"status": "ok", "bucket": GCS_BUCKET_NAME}
        except Exception as e:
            results["tests"]["storage"] = {"status": "error", "error": str(e)}
    else:
        results["tests"]["storage"] = {"status": "not_configured"}
    
    # Test Vision API
    if vision_client:
        try:
            # Simple test - just check if client is initialized
            results["tests"]["vision"] = {"status": "ok", "message": "Vision client initialized"}
        except Exception as e:
            results["tests"]["vision"] = {"status": "error", "error": str(e)}
    else:
        results["tests"]["vision"] = {"status": "not_configured"}
    
    # Test Vertex AI
    if gemini_model:
        try:
            # Test with a simple prompt
            response = gemini_model.generate_content("Hello, respond with 'Vertex AI is working'")
            results["tests"]["vertex_ai"] = {
                "status": "ok", 
                "response": response.text[:100] if response.text else "No response"
            }
        except Exception as e:
            results["tests"]["vertex_ai"] = {"status": "error", "error": str(e)}
    else:
        results["tests"]["vertex_ai"] = {"status": "not_configured"}
    
    return jsonify(results)

@app.route('/debug/documents', methods=['GET'])
def debug_documents():
    """Debug endpoint to list all documents"""
    return jsonify({
        "documents": list(job_status.keys()),
        "job_status": job_status,
        "temp_files": []  # We'll add this if needed
    })

@app.route('/upload', methods=['POST'])
def upload_pdf():
    """Upload PDF and start analysis with robust GCS integration"""
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
        logger.info(f"Starting upload for document {doc_id}, filename: {file.filename}")
        
        if USE_GCP and bucket:
            try:
                # Read file content to avoid file pointer issues
                file_content = file.read()
                file_size = len(file_content)
                logger.info(f"Read PDF file content: {file_size} bytes")
                
                # Upload to GCS with proper content type
                blob_name = f"uploads/{doc_id}.pdf"
                blob = bucket.blob(blob_name)
                
                # Upload using string content to avoid file pointer issues
                blob.upload_from_string(
                    file_content, 
                    content_type='application/pdf'
                )
                
                logger.info(f"Uploaded PDF to GCS at {blob_name}, size {file_size} bytes")
                
                # Verify upload was successful
                if not blob.exists():
                    raise Exception("Blob upload verification failed - blob does not exist")
                
                # Try to generate signed URL
                signed_url = None
                try:
                    signed_url = blob.generate_signed_url(
                        version="v4",
                        expiration=datetime.utcnow() + timedelta(hours=1),
                        method="GET"
                    )
                    logger.info(f"Generated signed URL for document {doc_id}")
                except Exception as signed_url_error:
                    logger.error(f"Signed URL generation failed for {doc_id}: {signed_url_error}")
                    signed_url = None
                
                # Determine PDF URL - prefer signed URL, fallback to proxy
                if signed_url:
                    pdf_url = signed_url
                    logger.info(f"Using signed URL for document {doc_id}")
                else:
                    base_url = request.host_url.rstrip('/')
                    pdf_url = f"{base_url}/pdf/{doc_id}"
                    logger.info(f"Using proxy URL for document {doc_id}: {pdf_url}")
                
                # Start background processing
                thread = threading.Thread(target=process_document_async, args=(doc_id, blob_name))
                thread.daemon = True
                thread.start()
                
                return jsonify({
                    "documentId": doc_id,
                    "pdfUrl": pdf_url,
                    "message": "File uploaded successfully. Analysis started."
                }), 202
                
            except Exception as gcs_error:
                logger.error(f"GCS upload failed for {doc_id}: {gcs_error}")
                # Fall through to local storage fallback
                
        # Fallback: Local storage and basic processing
        logger.info(f"Using local storage fallback for document {doc_id}")
        import os
        
        # Create temp directory if it doesn't exist
        temp_dir = os.path.join(os.getcwd(), 'temp_uploads')
        os.makedirs(temp_dir, exist_ok=True)
        
        # Reset file pointer if needed
        file.seek(0)
        
        # Save file locally
        file_path = os.path.join(temp_dir, f"{doc_id}.pdf")
        file.save(file_path)
        
        # Verify file was saved
        if not os.path.exists(file_path):
            raise Exception(f"Failed to save file to {file_path}")
        
        file_size = os.path.getsize(file_path)
        logger.info(f"Saved PDF to local storage: {file_path}, size {file_size} bytes")
        
        # Initialize job status immediately
        job_status[doc_id] = {"status": "processing", "message": "Starting document processing..."}
        logger.info(f"Initialized job status for {doc_id}")
        
        # Start basic processing
        thread = threading.Thread(target=process_document_basic, args=(doc_id, file_path))
        thread.daemon = True
        thread.start()
        logger.info(f"Started processing thread for {doc_id}")
        
        # Return proxy URL for local files
        base_url = request.host_url.rstrip('/')
        pdf_url = f"{base_url}/pdf/{doc_id}"
        
        return jsonify({
            "documentId": doc_id,
            "pdfUrl": pdf_url,
            "message": "File uploaded successfully. Basic analysis started."
        }), 202
        
    except Exception as e:
        logger.error(f"Upload failed for document: {e}", exc_info=True)
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route('/pdf/<doc_id>', methods=['GET'])
def serve_pdf(doc_id):
    """Serve PDF directly from GCS or local storage with proper headers"""
    try:
        logger.info(f"Serving PDF for document {doc_id}")
        
        if USE_GCP and bucket:
            # Serve from GCS
            blob_name = f"uploads/{doc_id}.pdf"
            blob = bucket.blob(blob_name)
            
            logger.info(f"Checking GCS blob: {blob_name}")
            if not blob.exists():
                logger.error(f"GCS blob not found: {blob_name}")
                return jsonify({"error": "PDF not found in GCS"}), 404
            
            try:
                # Download PDF content from GCS
                pdf_content = blob.download_as_bytes()
                logger.info(f"Downloaded PDF from GCS: {len(pdf_content)} bytes")
                
                # Create response with proper headers
                from flask import Response
                import io
                
                response = Response(
                    pdf_content,
                    mimetype='application/pdf',
                    headers={
                        'Content-Disposition': f'inline; filename="{doc_id}.pdf"',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET',
                        'Access-Control-Allow-Headers': 'Content-Type, Range',
                        'Accept-Ranges': 'bytes',
                        'Content-Length': str(len(pdf_content))
                    }
                )
                
                logger.info(f"Successfully serving PDF from GCS for {doc_id}")
                return response
                
            except Exception as download_error:
                logger.error(f"Failed to download PDF from GCS for {doc_id}: {download_error}")
                return jsonify({"error": "Failed to download PDF from GCS"}), 500
        else:
            # Serve from local storage
            import os
            temp_dir = os.path.join(os.getcwd(), 'temp_uploads')
            file_path = os.path.join(temp_dir, f"{doc_id}.pdf")
            
            logger.info(f"Checking local file: {file_path}")
            if not os.path.exists(file_path):
                logger.error(f"Local PDF file not found: {file_path}")
                return jsonify({"error": "PDF not found in local storage"}), 404
            
            try:
                # Serve file with proper headers
                response = send_file(
                    file_path, 
                    mimetype='application/pdf',
                    as_attachment=False,
                    download_name=f"{doc_id}.pdf"
                )
                
                # Add CORS headers
                response.headers['Access-Control-Allow-Origin'] = '*'
                response.headers['Access-Control-Allow-Methods'] = 'GET'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Range'
                response.headers['Accept-Ranges'] = 'bytes'
                
                logger.info(f"Successfully serving PDF from local storage for {doc_id}")
                return response
                
            except Exception as serve_error:
                logger.error(f"Failed to serve local PDF for {doc_id}: {serve_error}")
                return jsonify({"error": "Failed to serve PDF from local storage"}), 500
        
    except Exception as e:
        logger.error(f"Failed to serve PDF {doc_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to serve PDF"}), 500

@app.route('/document/<doc_id>', methods=['GET'])
def get_document_status(doc_id):
    """Get document analysis status and results"""
    try:
        logger.info(f"Getting status for document {doc_id}")
        logger.info(f"Available documents in job_status: {list(job_status.keys())}")
        
        if doc_id not in job_status:
            logger.error(f"Document {doc_id} not found in job_status")
            return jsonify({"error": "Document not found", "documentId": doc_id}), 404
        
        status_info = job_status[doc_id]
        logger.info(f"Status for {doc_id}: {status_info.get('status', 'unknown')}")
        
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
        return jsonify({"error": f"Failed to get document status: {str(e)}"}), 500

@app.route('/ask', methods=['POST'])
def ask_question():
    """Answer questions about the document using enhanced Gemini AI"""
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
        document_summary = analysis_result.get("documentSummary", "")
        
        # Use Vertex AI Gemini for question answering
        if gemini_model and full_text:
            answer = ask_document_question(full_text, query, document_summary)
        else:
            # Fallback response
            answer = f"Based on the document analysis, regarding '{query}': The document contains {len(analysis_result.get('analysis', []))} analyzed clauses. Enhanced AI analysis is not available - please configure Vertex AI."
        
        return jsonify({
            "answer": answer,
            "documentId": doc_id,
            "hasAI": gemini_model is not None
        })
        
    except Exception as e:
        logger.error(f"Failed to answer question: {e}")
        return jsonify({"error": "Failed to process question"}), 500

@app.route('/analyze-clauses', methods=['POST'])
def analyze_clauses():
    """Perform advanced analysis on provided clauses"""
    try:
        data = request.get_json()
        clauses_text = data.get('clauses', {})
        
        if not clauses_text:
            return jsonify({"error": "No clauses provided"}), 400
        
        if not advanced_analyzer:
            return jsonify({"error": "Advanced analysis not available"}), 503
        
        # Perform analysis
        result = advanced_analyzer.analyze_document_clauses(clauses_text)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Clause analysis failed: {e}")
        return jsonify({"error": "Analysis failed"}), 500

@app.route('/extract-entities', methods=['POST'])
def extract_entities():
    """Extract entities from provided text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        if not advanced_analyzer:
            return jsonify({"error": "Entity extraction not available"}), 503
        
        # Extract entities
        entities = advanced_analyzer.get_entity_glossary(text)
        
        return jsonify({
            "entities": entities,
            "text": text
        })
        
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}")
        return jsonify({"error": "Entity extraction failed"}), 500

@app.route('/score-importance', methods=['POST'])
def score_importance():
    """Score text importance"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        if not advanced_analyzer:
            return jsonify({"error": "Importance scoring not available"}), 503
        
        # Score importance
        score = advanced_analyzer.score_text_importance(text)
        
        return jsonify({
            "text": text,
            "importance_score": score,
            "risk_level": "High" if score >= 0.7 else "Medium" if score >= 0.4 else "Low"
        })
        
    except Exception as e:
        logger.error(f"Importance scoring failed: {e}")
        return jsonify({"error": "Importance scoring failed"}), 500

@app.route('/summarize-text', methods=['POST'])
def summarize_text():
    """Summarize provided text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        if not advanced_analyzer:
            return jsonify({"error": "Text summarization not available"}), 503
        
        # Summarize text
        summary = advanced_analyzer.summarize_text(text)
        
        return jsonify({
            "original_text": text,
            "summary": summary
        })
        
    except Exception as e:
        logger.error(f"Text summarization failed: {e}")
        return jsonify({"error": "Text summarization failed"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))