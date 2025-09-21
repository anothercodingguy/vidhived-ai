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
from google import genai
from google.genai import types as genai_types
import threading
import re
from typing import List, Dict, Any

# Import advanced legal analysis components
from legal_analysis.advanced_analyzer import AdvancedLegalAnalyzer

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
GOOGLE_CLOUD_API_KEY = os.getenv('GOOGLE_CLOUD_API_KEY')

# Initialize GCP clients
try:
    storage_client = storage.Client(project=GCP_PROJECT_ID)
    vision_client = vision.ImageAnnotatorClient()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    
    # Initialize Vertex AI
    aiplatform.init(project=GCP_PROJECT_ID, location=GCP_REGION)
    
    # Initialize Gemini AI client
    if GOOGLE_CLOUD_API_KEY:
        gemini_client = genai.Client(
            vertexai=True,
            api_key=GOOGLE_CLOUD_API_KEY
        )
        logger.info("Gemini AI client initialized successfully")
    else:
        gemini_client = None
        logger.warning("GOOGLE_CLOUD_API_KEY not provided, Gemini AI features disabled")
    
    # Initialize Advanced Legal Analyzer
    advanced_analyzer = AdvancedLegalAnalyzer()
    
    logger.info("GCP clients initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize GCP clients: {e}")
    storage_client = None
    vision_client = None
    bucket = None
    gemini_client = None
    advanced_analyzer = None

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
    """Generate comprehensive document summary using Gemini AI"""
    if not gemini_client or not full_text.strip():
        return {
            "summary": "Document analysis unavailable - Gemini AI not configured",
            "key_terms": [],
            "entities": [],
            "error": "Gemini AI client not available"
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

        # Create message content
        msg_content = genai_types.Part.from_text(text=prompt)
        contents = [genai_types.Content(role="user", parts=[msg_content])]
        
        # Configure generation settings
        generate_config = genai_types.GenerateContentConfig(
            temperature=0.3,  # Lower temperature for more consistent legal analysis
            top_p=0.8,
            max_output_tokens=4096,
            safety_settings=[
                genai_types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                genai_types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                genai_types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                genai_types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
            ],
            system_instruction=[genai_types.Part.from_text(text=system_instruction)]
        )
        
        # Generate response
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=contents,
            config=generate_config
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
    """Ask a specific question about the document using Gemini AI"""
    if not gemini_client:
        return "AI question answering unavailable - Gemini AI not configured"
    
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

        # Create message content
        msg_content = genai_types.Part.from_text(text=prompt)
        contents = [genai_types.Content(role="user", parts=[msg_content])]
        
        # Configure generation settings
        generate_config = genai_types.GenerateContentConfig(
            temperature=0.2,  # Very low temperature for factual Q&A
            top_p=0.8,
            max_output_tokens=2048,
            safety_settings=[
                genai_types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                genai_types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                genai_types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                genai_types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
            ],
            system_instruction=[genai_types.Part.from_text(text=system_instruction)]
        )
        
        # Generate response
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=contents,
            config=generate_config
        )
        
        return response.text
        
    except Exception as e:
        logger.error(f"Failed to answer document question: {e}")
        return f"Error processing question: {str(e)}"

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
        
        # Use enhanced Gemini AI for question answering
        if gemini_client and full_text:
            answer = ask_document_question(full_text, query, document_summary)
        else:
            # Fallback response
            answer = f"Based on the document analysis, regarding '{query}': The document contains {len(analysis_result.get('analysis', []))} analyzed clauses. Enhanced AI analysis is not available - please configure GOOGLE_CLOUD_API_KEY."
        
        return jsonify({
            "answer": answer,
            "documentId": doc_id,
            "hasAI": gemini_client is not None
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