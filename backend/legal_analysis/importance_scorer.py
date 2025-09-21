import re
from typing import Dict, List, Tuple

class LegalPhraseScorer:
    """Advanced legal phrase importance scoring with pattern matching"""
    
    def __init__(self):
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile all regex patterns for efficient matching"""
        
        # 1. Legal Obligations & Rights
        self.obligation_patterns = [
            (re.compile(r'\b(?:shall|must|required to|obligated to|bound to)\b', re.IGNORECASE), 0.65),
            (re.compile(r'\b(?:has the right to|entitled to|may demand|can require)\b', re.IGNORECASE), 0.60),
            (re.compile(r'\b(?:subject to|in accordance with|notwithstanding|provided that)\b', re.IGNORECASE), 0.62),
            (re.compile(r'\b(?:hereby agrees?|undertakes? to|covenants? to)\b', re.IGNORECASE), 0.68),
            (re.compile(r'\b(?:responsible for|liable for|accountable for)\b', re.IGNORECASE), 0.66),
        ]
        
        # 2. Payment & Financial Obligations
        self.payment_patterns = [
            (re.compile(r'\b(?:payment shall be made|pay(?:ment)?|due (?:on|within))\b', re.IGNORECASE), 0.78),
            (re.compile(r'\b(?:interest (?:will be|shall be) charged|late payment penalty|overdue interest)\b', re.IGNORECASE), 0.75),
            (re.compile(r'\b(?:advance payment|security deposit|earnest money)\b', re.IGNORECASE), 0.72),
            (re.compile(r'\b(?:refund(?:able)?|reimburs(?:e|ement)|compensat(?:e|ion))\b', re.IGNORECASE), 0.70),
            (re.compile(r'\b(?:invoice|bill|receipt|payment terms)\b', re.IGNORECASE), 0.68),
        ]
        
        # 3. Consequences & Penalties
        self.consequence_patterns = [
            (re.compile(r'\b(?:in case of default|breach of contract|violation of)\b', re.IGNORECASE), 0.80),
            (re.compile(r'\b(?:liable to pay damages|legal action|court proceedings)\b', re.IGNORECASE), 0.78),
            (re.compile(r'\b(?:contract (?:may be|shall be) terminated|agreement (?:stands|is) cancelled)\b', re.IGNORECASE), 0.76),
            (re.compile(r'\b(?:forfeiture of|penalty (?:of|shall be)|fine (?:of|not exceeding))\b', re.IGNORECASE), 0.74),
            (re.compile(r'\b(?:suspension of|revocation of|cancellation of)\b', re.IGNORECASE), 0.72),
        ]
        
        # 4. Time-Sensitive Terms
        self.time_patterns = [
            (re.compile(r'\b(?:within \d+\s+days?|not later than|before the expiry)\b', re.IGNORECASE), 0.58),
            (re.compile(r'\b(?:notice period of|during the term of|upon expiry of)\b', re.IGNORECASE), 0.55),
            (re.compile(r'\b(?:effective from|commencing from|valid until)\b', re.IGNORECASE), 0.52),
            (re.compile(r'\b(?:immediate(?:ly)?|forthwith|without delay)\b', re.IGNORECASE), 0.60),
        ]
        
        # 5. Standard Legal Formalities
        self.formality_patterns = [
            (re.compile(r'\b(?:this agreement is made|whereas the parties|now therefore|in consideration of)\b', re.IGNORECASE), 0.15),
            (re.compile(r'\b(?:witnesseth that|parties hereto|in witness whereof)\b', re.IGNORECASE), 0.12),
            (re.compile(r'\b(?:unless context otherwise requires|words importing|references to statutes)\b', re.IGNORECASE), 0.10),
            (re.compile(r'\b(?:governed by (?:indian )?law|courts? of.*jurisdiction|subject to arbitration)\b', re.IGNORECASE), 0.18),
        ]
        
        # Context modifiers
        self.negation_pattern = re.compile(r'\b(?:not|never|without|except|unless|no)\s+', re.IGNORECASE)
        self.emphasis_pattern = re.compile(r'\b[A-Z]{2,}\b|"[^"]*"')
    
    def score_phrase(self, phrase: str) -> float:
        """Return the importance score for a single phrase"""
        phrase = phrase.strip()
        if not phrase:
            return 0.0
        
        matched_scores = []
        
        pattern_groups = [
            (self.obligation_patterns, "obligation"),
            (self.payment_patterns, "payment"),
            (self.consequence_patterns, "consequence"),
            (self.time_patterns, "time"),
        ]
        
        for patterns, _ in pattern_groups:
            for pattern, score in patterns:
                if pattern.search(phrase):
                    matched_scores.append(score)
        
        # Formalities override with low score
        for pattern, score in self.formality_patterns:
            if pattern.search(phrase):
                matched_scores.append(score)
        
        if not matched_scores:
            return 0.0
        
        # Base score
        base_score = max(matched_scores)
        
        # Context modifiers
        if self.negation_pattern.search(phrase):
            base_score -= 0.15
        if self.emphasis_pattern.search(phrase):
            base_score += 0.08
        
        return round(min(1.0, max(0.0, base_score)), 3)
    
    def get_color_hex(self, score: float) -> str:
        """Return hex color code for a given importance score"""
        if score >= 0.85:
            return "#8B0000"  # Dark red
        elif score >= 0.70:
            return "#B22222"  # Fire brick
        elif score >= 0.60:
            return "#CD5C5C"  # Indian red
        elif score >= 0.50:
            return "#DC143C"  # Crimson
        elif score >= 0.40:
            return "#F08080"  # Light coral
        elif score >= 0.30:
            return "#FFB6C1"  # Light pink
        else:
            return "transparent"
    
    def extract_phrases_from_text(self, text: str) -> List[str]:
        """Extract legal phrases from raw text using compiled patterns"""
        found_phrases = []
        
        # Combine all pattern groups
        all_patterns = (
            self.obligation_patterns +
            self.payment_patterns +
            self.consequence_patterns +
            self.time_patterns +
            self.formality_patterns
        )
        
        # Find all matches
        for pattern, _ in all_patterns:
            matches = pattern.finditer(text)
            for match in matches:
                # Get some context around the match (expand to sentence/phrase)
                start = max(0, match.start() - 20)
                end = min(len(text), match.end() + 20)
                phrase = text[start:end].strip()
                
                # Clean up phrase boundaries (try to get complete words/sentences)
                words = phrase.split()
                if len(words) > 1:
                    # Remove partial words at start/end
                    if start > 0 and not text[start-1].isspace():
                        words = words[1:]
                    if end < len(text) and not text[end].isspace():
                        words = words[:-1]
                    phrase = ' '.join(words)
                
                if phrase and phrase not in found_phrases:
                    found_phrases.append(phrase)
        
        return found_phrases
    
    def score_clauses_for_html_render(self, clauses_dict: Dict[str, str]) -> Dict[str, Dict]:
        """HTML Renderer Compatible Function: Process clauses for direct use with render_colored_html_with_entities()
        
        Args:
            clauses_dict: dict
                Simple format: {"Clause 1": "text content...", "Clause 2": "more text..."}
                OR existing format: {"Clause 1": {"text": "...", "entities": {...}}}
        
        Returns:
            dict: HTML renderer compatible format
                {"Clause 1": {
                    "text": "...",
                    "phrases": {"phrase": {"score": 0.65, "hex": "#color"}},
                    "entities": {...}  # preserved if existed
                }}
        """
        result = {}
        
        for clause_name, clause_data in clauses_dict.items():
            # Handle both input formats
            if isinstance(clause_data, str):
                # Simple format: clause_name -> text
                text = clause_data
                existing_entities = {}
            else:
                # Complex format: clause_name -> {"text": ..., "entities": ...}
                text = clause_data["text"]
                existing_entities = clause_data.get("entities", {})
            
            # Extract phrases from the raw text
            phrases = self.extract_phrases_from_text(text)
            
            # Score each phrase and get hex color
            phrase_results = {}
            for phrase in phrases:
                score = self.score_phrase(phrase)
                hex_color = self.get_color_hex(score)
                phrase_results[phrase] = {
                    "score": score,
                    "hex": hex_color
                }
            
            # Build HTML renderer compatible structure
            result[clause_name] = {
                "text": text,
                "phrases": phrase_results,
                "entities": existing_entities
            }
        
        return result