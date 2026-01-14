import os
import json
import logging
import fitz  # PyMuPDF
from groq import Groq
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def get_groq_client():
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        logger.warning("GROQ_API_KEY not found in environment variables")
        return None
    return Groq(api_key=api_key)

# Available Groq models in order of preference
GROQ_MODELS = [
    "llama-3.3-70b-versatile", # Latest high performance
    "llama-3.1-8b-instant",    # Extremely fast
    "mixtral-8x7b-32768",      # Large context fallback
]

def call_groq_api(client, messages, response_format=None):
    """Try multiple models until one works"""
    last_error = None
    
    for model in GROQ_MODELS:
        try:
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

def extract_structured_text_from_pdf(file_path: str) -> List[Dict]:
    """Extract text with coordinates from PDF file using PyMuPDF"""
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

def analyze_clause_worker(text_segment: str, client: Groq) -> Dict:
    """Analyze a single text segment"""
    try:
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
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        logger.error(f"Clause analysis failed: {e}")
        return {
            "score": 0.5, "category": "Yellow", "type": "General", "explanation": "Analysis failed"
        }

def process_document(file_path: str):
    """
    Main orchestration logic for document analysis.
    Returns: (full_text, clauses_list, summary_text)
    """
    structured_content = extract_structured_text_from_pdf(file_path)
    full_text = "\n\n".join([c["text"] for c in structured_content])
    
    client = get_groq_client()
    clauses = []
    summary_text = ""
    
    if not client:
        # Fallback if no API Key
        summary_text = "GROQ_API_KEY missing. AI analysis skipped."
        # Create dummy clauses
        for i, content in enumerate(structured_content[:10]):
             clauses.append({
                "id": f"clause-{i+1}",
                "page_number": content["page_number"],
                "text": content["text"],
                "score": 0.5,
                "category": "Yellow",
                "type": "No AI",
                "explanation": "No API Key",
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
            })
        return full_text, clauses, summary_text

    # Analyzes ALL content now (removed the [:15] limit)
    # We might want to batch this in production, but linear is safer for now.
    clause_id = 1
    for content in structured_content:
        analysis = analyze_clause_worker(content["text"], client)
        
        clause = {
            "id": f"clause-{clause_id}",
            "page_number": content["page_number"],
            "text": content["text"],
            "score": analysis.get("score", 0.5),
            "category": analysis.get("category", "Yellow"),
            "type": analysis.get("type", "General"),
            "explanation": analysis.get("explanation", "Analyzed by AI"),
            "summary": analysis.get("summary", ""),
            "entities": analysis.get("entities", []),
            "legal_terms": analysis.get("legal_terms", []),
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
        
    # Generate overall summary
    try:
        summary_prompt = f"Summarize this legal document in 3 bullet points highlighting key obligations.\n\nText: {full_text[:6000]}"
        completion = call_groq_api(
            client,
            messages=[{"role": "user", "content": summary_prompt}]
        )
        summary_text = completion.choices[0].message.content
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        summary_text = "Analysis complete, but summary generation failed."
        
    return full_text, clauses, summary_text
