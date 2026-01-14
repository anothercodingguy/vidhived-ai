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
    import fitz  # PyMuPDF
    PDF_PROCESSING_AVAILABLE = True
except ImportError:
    PDF_PROCESSING_AVAILABLE = False
    
# AI
try:
    from groq import Groq
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS for production
# Configure CORS - Allow all for easy connectivity
cors_origins = os.getenv('CORS_ORIGINS', '*')
CORS(app, resources={r"/*": {"origins": "*"}})
logger.info(f"CORS Configured. Origins: *")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for demo (use database in production)
documents = {}
job_status = {}


def get_groq_client():
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        return None
    return Groq(api_key=api_key)

# Available Groq models in order of preference
GROQ_MODELS = [
    "llama-3.3-70b-versatile", # Latest high performance
    "llama-3.1-8b-instant",    # Extremely fast
    "mixtral-8x7b-32768",      # Large context fallback
    "llama3-70b-8192"          # Legacy fallback
]

def call_groq_api(client, messages, response_format=None):
    """Try multiple models until one works"""
    last_error = None
    
    for model in GROQ_MODELS:
        try:
            logger.info(f"Attempting AI call with model: {model}")
            params = {
                "messages": messages,
                "model": model
            }
            if response_format:
                params["response_format"] = response_format
                
            completion = client.chat.completions.create(**params)
            return completion
        except Exception as e:
            logger.warning(f"Model {model} failed: {str(e)}")
            last_error = e
            continue
            
    # If all models fail
    raise last_error

def analyze_clause_with_llm(text: str, client) -> dict:
    """Analyze a single clause/sentence using Groq"""
    try:
        prompt = f"""Analyze this legal clause and provide a risk assessment.
        Clause: "{text}"
        
        Return JSON with:
        - score: 0.0 to 1.0 (1.0 is high risk)
        - category: "Red", "Yellow", or "Green"
        - type: specific risk type (e.g., "Liability", "Termination")
        - explanation: brief explanation (max 15 words)
        
        Only return valid JSON."""
        
        completion = call_groq_api(
            client,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        logger.error(f"LLM analysis failed: {e}")
        return {"score": 0.5, "category": "Yellow", "type": "Unknown", "explanation": "Analysis failed"}



def extract_structured_text_from_pdf(file_path: str) -> List[Dict]:
    """Extract text with coordinates from PDF file using PyMuPDF"""
    if not PDF_PROCESSING_AVAILABLE:
        return []
    
    try:
        doc = fitz.open(file_path)
        pages_data = []
        
        for page_num, page in enumerate(doc):
            w, h = page.rect.width, page.rect.height
            blocks = page.get_text("blocks")
            # blocks format: (x0, y0, x1, y1, "lines of text", block_no, block_type)
            
            for b in blocks:
                if b[6] == 0: # Check if it's text
                    text = b[4].strip()
                    if len(text) > 50: # Filter small text fragments
                        pages_data.append({
                            "text": text,
                            "page_number": page_num + 1,
                            "bbox": {
                                "x": b[0],
                                "y": b[1], 
                                "w": b[2] - b[0],
                                "h": b[3] - b[1]
                            },
                            "page_width": w,
                            "page_height": h
                        })
        return pages_data
    except Exception as e:
        logger.error(f"PDF structured extraction failed: {e}")
        return []

def analyze_document(doc_id: str, file_path: str):
    """Analyze document and extract clauses"""
    try:
        logger.info(f"Starting analysis for document {doc_id}")
        job_status[doc_id] = {"status": "processing", "message": "Extracting text..."}
        
        # Extract structured text
        structured_content = extract_structured_text_from_pdf(file_path)
        full_text = "\n\n".join([c["text"] for c in structured_content])
        
        # Groq Analysis
        job_status[doc_id]["message"] = "Analyzing with AI..."
        client = get_groq_client()
        clauses = []
        clause_id = 1
        
        if not client:
             # Fallback logic remains same but now adds dummy coordinates
             for content in structured_content[:10]:
                clauses.append({
                    "id": f"clause-{clause_id}",
                    "page_number": content["page_number"],
                    "text": content["text"],
                    "score": 0.5,
                    "category": "Yellow",
                    "type": "General",
                    "explanation": "Groq API Key missing",
                    "bounding_box": {"vertices": [{"x": content["bbox"]["x"], "y": content["bbox"]["y"]}]}, # Simplified vertex
                    "ocr_page_width": content["page_width"],
                    "ocr_page_height": content["page_height"]
                })
                clause_id += 1
        else:
            # Analyze top 15 blocks to respect rate limits
            for content in structured_content[:15]:
                text_segment = content["text"]
                
                try:
                    # Richer Prompt
                    prompt = f"""Analyze this legal clause.
                    Clause: "{text_segment}"
                    
                    Return JSON with:
                    - score: 0.0-1.0 (risk level)
                    - category: "Red", "Yellow", "Green"
                    - type: e.g. "Liability", "Termination"
                    - explanation: max 15 words
                    - summary: 1-line summary
                    - entities: list of objects {{ "text": "entity_name", "type": "Party/Date/Money" }}
                    - legal_terms: list of objects {{ "term": "term", "definition": "short definition" }}
                    """
                    
                    completion = call_groq_api(
                        client,
                        messages=[{"role": "user", "content": prompt}],
                        response_format={"type": "json_object"}
                    )
                    analysis = json.loads(completion.choices[0].message.content)
                    
                    clause = {
                        "id": f"clause-{clause_id}",
                        "page_number": content["page_number"],
                        "text": text_segment,
                        "score": analysis.get("score", 0.5),
                        "category": analysis.get("category", "Yellow"),
                        "type": analysis.get("type", "General"),
                        "explanation": analysis.get("explanation", "Analyzed by AI"),
                        # New fields
                        "summary": analysis.get("summary", ""),
                        "entities": analysis.get("entities", []),
                        "legal_terms": analysis.get("legal_terms", []),
                        # Coordinates
                        "bounding_box": {
                            "vertices": [
                                {"x": content["bbox"]["x"], "y": content["bbox"]["y"]},
                                {"x": content["bbox"]["x"] + content["bbox"]["w"], "y": content["bbox"]["y"]},
                                {"x": content["bbox"]["x"] + content["bbox"]["w"], "y": content["bbox"]["y"] + content["bbox"]["h"]},
                                {"x": content["bbox"]["x"], "y": content["bbox"]["y"] + content["bbox"]["h"]}
                            ]
                        },
                        "ocr_page_width": content["page_width"],
                        "ocr_page_height": content["page_height"]
                    }
                    clauses.append(clause)
                    clause_id += 1
                except Exception as e:
                    logger.error(f"Clause analysis failed: {e}")
                    continue
        
        # Generate summary using Groq
        job_status[doc_id]["message"] = "Generating summary..."
        
        summary_text = ""
        if client:
            try:
                summary_prompt = f"Summarize this legal document in 3 bullet points highlighting key obligations.\n\nText: {full_text[:3000]}"
                completion = call_groq_api(
                    client,
                    messages=[{"role": "user", "content": summary_prompt}]
                )
                summary_text = completion.choices[0].message.content
            except:
                summary_text = "AI Summary failed."
        else:
            summary_text = "Add GROQ_API_KEY to enable AI summaries."

        word_count = len(full_text.split())
        high_risk_count = len([c for c in clauses if c["category"] == "Red"])
        medium_risk_count = len([c for c in clauses if c["category"] == "Yellow"])
        
        summary = f"""Document Statistics:
- Total words: {word_count}
- High risk clauses: {high_risk_count}
- Medium risk clauses: {medium_risk_count}

AI Summary:
{summary_text}"""
        
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
        
        client = get_groq_client()
        if not client:
             # Fallback to simple keyword search if no key
            doc = documents[document_id]
            full_text = doc.get('fullText', '')
            query_words = query.lower().split()
            sentences = re.split(r'[.!?]+', full_text)
            relevant = [s.strip() for s in sentences if any(w in s.lower() for w in query_words) and len(s) > 20][:3]
            answer = "Groq Key missing. Basic search results:\n" + "\n".join(relevant) if relevant else "No results found."
        else:
            # AI Chat using Groq
            doc = documents[document_id]
            full_text = doc.get('fullText', '')
            
            # Simple RAG: Pass context + query
            context = full_text[:6000] # Truncate for context window
            
            prompt = f"""Answer the user question based ONLY on the following document context.
            
            Context:
            {context}
            
            Question: {query}
            
            Answer:"""
            
            completion = call_groq_api(
                client,
                messages=[
                    {"role": "system", "content": "You are a legal assistant. Answer based on the context provided."},
                    {"role": "user", "content": prompt}
                ]
            )
            answer = completion.choices[0].message.content
        
        return jsonify({
            "answer": answer,
            "documentId": document_id,
            "hasAI": True
        })
        
    except Exception as e:
        logger.error(f"Question answering failed: {e}")
        return jsonify({"error": f"Failed to answer question: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    # Create uploads dir on startup
    os.makedirs(os.path.join(os.getcwd(), 'uploads'), exist_ok=True)
    app.run(host='0.0.0.0', port=port, debug=False)