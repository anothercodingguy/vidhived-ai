import os
import json
import time
import logging
import fitz  # PyMuPDF
from groq import Groq
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)

# ── Groq Client ──────────────────────────────────────────────────────

def get_groq_client() -> Optional[Groq]:
    """Get a configured Groq client, or None if API key is missing."""
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        logger.warning("GROQ_API_KEY not found in environment variables")
        return None
    return Groq(api_key=api_key)

# Available Groq models in order of preference
GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]

MAX_RETRIES = 3
RETRY_BACKOFF = 1.5  # seconds, multiplied each retry


def call_groq_api(client: Groq, messages: list, response_format: dict = None, max_retries: int = MAX_RETRIES):
    """Call Groq API with multi-model fallback and exponential backoff retry."""
    last_error = None

    for model in GROQ_MODELS:
        for attempt in range(max_retries):
            try:
                params = {"messages": messages, "model": model}
                if response_format:
                    params["response_format"] = response_format

                completion = client.chat.completions.create(**params)
                return completion
            except Exception as e:
                last_error = e
                wait_time = RETRY_BACKOFF * (2 ** attempt)
                logger.warning(
                    f"Groq API call failed (model={model}, attempt={attempt + 1}/{max_retries}): {e}. "
                    f"Retrying in {wait_time:.1f}s..."
                )
                if attempt < max_retries - 1:
                    time.sleep(wait_time)
        logger.warning(f"All retries exhausted for model {model}, trying next model...")

    raise RuntimeError(f"All Groq models and retries exhausted. Last error: {last_error}")


# ── PDF Extraction ───────────────────────────────────────────────────

def extract_structured_text_from_pdf(file_path: str) -> Tuple[List[Dict], int]:
    """
    Extract text with coordinates from PDF file using PyMuPDF.
    Returns: (list of text blocks with metadata, page_count)
    """
    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
        pages_data = []

        for page_num, page in enumerate(doc):
            w, h = page.rect.width, page.rect.height
            blocks = page.get_text("blocks")

            for b in blocks:
                if b[6] == 0:  # text block (not image)
                    text = b[4].strip()
                    if len(text) > 50:
                        pages_data.append({
                            "text": text,
                            "page_number": page_num + 1,
                            "bbox": {
                                "x": round(b[0], 2),
                                "y": round(b[1], 2),
                                "w": round(b[2] - b[0], 2),
                                "h": round(b[3] - b[1], 2),
                            },
                            "page_width": round(w, 2),
                            "page_height": round(h, 2),
                        })

        doc.close()
        return pages_data, page_count
    except Exception as e:
        logger.error(f"PDF structured extraction failed: {e}", exc_info=True)
        return [], 0


# ── Clause Analysis ──────────────────────────────────────────────────

def analyze_clause_worker(text_segment: str, client: Groq) -> Dict:
    """Analyze a single text segment for legal risk."""
    try:
        prompt = f"""Analyze this legal clause and return a JSON object.

Clause: "{text_segment}"

Return JSON with these exact keys:
- "score": float 0.0-1.0 (risk level, higher = more risky)
- "category": one of "Red", "Yellow", "Green"
- "type": string, e.g. "Liability", "Termination", "Payment", "Confidentiality", "Indemnification", "General"
- "explanation": string, max 20 words plain-English explanation of the risk
- "summary": string, one-line summary of what this clause does
- "entities": array of objects with "text" and "type" keys (type is "Party", "Date", "Money", or "Term")
- "legal_terms": array of objects with "term" and "definition" keys (short plain-English definitions)

Respond ONLY with valid JSON. No markdown, no extra text."""

        completion = call_groq_api(
            client,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        result = json.loads(completion.choices[0].message.content)

        # Validate required fields
        result.setdefault("score", 0.5)
        result.setdefault("category", "Yellow")
        result.setdefault("type", "General")
        result.setdefault("explanation", "Analyzed by AI")
        result.setdefault("summary", "")
        result.setdefault("entities", [])
        result.setdefault("legal_terms", [])

        # Clamp score
        result["score"] = max(0.0, min(1.0, float(result["score"])))

        # Validate category
        if result["category"] not in ("Red", "Yellow", "Green"):
            result["category"] = "Yellow"

        return result
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse clause analysis JSON: {e}")
        return _fallback_clause_result("JSON parse error")
    except Exception as e:
        logger.error(f"Clause analysis failed: {e}", exc_info=True)
        return _fallback_clause_result(str(e))


def _fallback_clause_result(reason: str) -> Dict:
    return {
        "score": 0.5,
        "category": "Yellow",
        "type": "General",
        "explanation": f"Analysis unavailable: {reason[:50]}",
        "summary": "",
        "entities": [],
        "legal_terms": [],
    }


def _build_clause_dict(clause_id: int, content: Dict, analysis: Dict) -> Dict:
    """Build a standardized clause dictionary."""
    return {
        "id": f"clause-{clause_id}",
        "page_number": content["page_number"],
        "text": content["text"],
        "score": analysis.get("score", 0.5),
        "category": analysis.get("category", "Yellow"),
        "type": analysis.get("type", "General"),
        "explanation": analysis.get("explanation", ""),
        "summary": analysis.get("summary", ""),
        "entities": analysis.get("entities", []),
        "legal_terms": analysis.get("legal_terms", []),
        "bounding_box": {
            "vertices": [
                {"x": content["bbox"]["x"], "y": content["bbox"]["y"]},
                {"x": content["bbox"]["x"] + content["bbox"]["w"], "y": content["bbox"]["y"]},
                {"x": content["bbox"]["x"] + content["bbox"]["w"], "y": content["bbox"]["y"] + content["bbox"]["h"]},
                {"x": content["bbox"]["x"], "y": content["bbox"]["y"] + content["bbox"]["h"]},
            ]
        },
        "ocr_page_width": content["page_width"],
        "ocr_page_height": content["page_height"],
    }


# ── Document Processing ──────────────────────────────────────────────

def process_document(file_path: str) -> Tuple[str, List[Dict], str, int]:
    """
    Main orchestration for document analysis.
    Returns: (full_text, clauses_list, summary_text, page_count)
    """
    structured_content, page_count = extract_structured_text_from_pdf(file_path)
    full_text = "\n\n".join([c["text"] for c in structured_content])

    client = get_groq_client()

    if not client:
        logger.warning("No Groq API key — returning dummy analysis")
        clauses = []
        for i, content in enumerate(structured_content[:10]):
            dummy = _fallback_clause_result("No API Key")
            dummy["type"] = "No AI"
            clauses.append(_build_clause_dict(i + 1, content, dummy))
        return full_text, clauses, "GROQ_API_KEY missing. AI analysis skipped.", page_count

    # Analyze all clauses
    clauses = []
    for i, content in enumerate(structured_content):
        logger.info(f"Analyzing clause {i + 1}/{len(structured_content)}...")
        analysis = analyze_clause_worker(content["text"], client)
        clauses.append(_build_clause_dict(i + 1, content, analysis))

    # Generate overall summary
    summary_text = _generate_summary(client, full_text)

    return full_text, clauses, summary_text, page_count


def _generate_summary(client: Groq, full_text: str) -> str:
    """Generate an executive summary of the document."""
    try:
        summary_prompt = (
            "You are a senior legal analyst. Summarize this legal document concisely.\n\n"
            "Provide:\n"
            "1. A one-paragraph executive summary\n"
            "2. 3-5 bullet points highlighting key obligations, risks, and deadlines\n"
            "3. A brief recommendation\n\n"
            f"Document text (excerpt):\n{full_text[:8000]}"
        )
        completion = call_groq_api(
            client,
            messages=[{"role": "user", "content": summary_prompt}],
        )
        return completion.choices[0].message.content
    except Exception as e:
        logger.error(f"Summary generation failed: {e}", exc_info=True)
        return "Analysis complete, but summary generation failed."
