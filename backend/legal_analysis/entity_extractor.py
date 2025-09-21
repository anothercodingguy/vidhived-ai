import re
import spacy
from typing import Dict, List, Any

class LegalEntityExtractor:
    """Advanced entity extraction for legal documents"""
    
    def __init__(self):
        try:
            # Load spaCy's English NER model
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            # Fallback if spaCy model not available
            self.nlp = None
    
    def extract_entities_for_clauses(self, clauses_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Extract entities from multiple clauses and return in HTML renderer compatible format.
        
        Args:
            clauses_dict: dict
                {"Clause 1": {"text": "...", "phrases": {...}}}
                OR simple dict:
                {"Clause 1": "text content...", "Clause 2": "more text..."}
        
        Returns:
            dict: Same structure but with entities added
                {"Clause 1": {
                    "text": "...",
                    "phrases": {...},  # preserved if existed
                    "entities": {
                        "dates": ["March 15, 2025", "2030"],
                        "parties": ["Mr. John Doe", "Acme Corporation"],
                        "money": ["$10,000"]
                    }
                }}
        """
        result = {}
        
        for clause_name, clause_data in clauses_dict.items():
            # Handle both formats: simple string or dict with text/phrases
            if isinstance(clause_data, str):
                # Simple format: clause_name -> text
                text = clause_data
                existing_phrases = {}
            else:
                # Complex format: clause_name -> {"text": ..., "phrases": ...}
                text = clause_data["text"]
                existing_phrases = clause_data.get("phrases", {})
            
            # Extract entities from the text
            entities = self._extract_entities_from_text(text)
            
            # Build result maintaining existing structure
            result[clause_name] = {
                "text": text,
                "phrases": existing_phrases,
                "entities": entities
            }
        
        return result
    
    def _extract_entities_from_text(self, text: str) -> Dict[str, List[str]]:
        """Internal function to extract entities from a single text"""
        glossary = {
            "dates": set(),
            "parties": set(),
            "money": set()
        }
        
        # --- REGEX PATTERNS ---
        date_patterns = [
            r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",  # 12/05/2024 or 12-05-2024
            r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|"
            r"May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|"
            r"Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b",  # March 15, 2025
            r"\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|"
            r"May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|"
            r"Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?),?\s+\d{4}\b",  # 15 March 2025
            r"\b\d{4}\b"  # standalone years
        ]
        
        money_pattern = r"\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+\s?(?:USD|INR|EUR|GBP|dollars|rupees|pounds|euros)"
        party_pattern = r"\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Company|Corporation|LLC|Ltd|Inc|Party\s+[A-Z])\s?[A-Z]?[a-zA-Z]*\b"
        
        # --- APPLY REGEX ---
        for pattern in date_patterns:
            for match in re.findall(pattern, text, flags=re.IGNORECASE):
                glossary["dates"].add(match)
        
        for match in re.findall(money_pattern, text, flags=re.IGNORECASE):
            glossary["money"].add(match)
        
        for match in re.findall(party_pattern, text, flags=re.IGNORECASE):
            glossary["parties"].add(match)
        
        # --- APPLY SPACY NER (failsafe) ---
        if self.nlp:
            try:
                doc = self.nlp(text)
                for ent in doc.ents:
                    if ent.label_ in ["DATE"]:
                        glossary["dates"].add(ent.text)
                    elif ent.label_ in ["ORG", "PERSON"]:
                        glossary["parties"].add(ent.text)
                    elif ent.label_ in ["MONEY"]:
                        glossary["money"].add(ent.text)
            except Exception:
                pass  # Fallback to regex only
        
        # Convert sets to sorted lists for cleaner output
        return {k: sorted(list(v)) for k, v in glossary.items()}
    
    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Original function: Extract entities from a single text string.
        Returns simple dict format for standalone use."""
        return self._extract_entities_from_text(text)