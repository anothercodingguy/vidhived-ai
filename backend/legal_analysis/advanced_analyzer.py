"""
Advanced Legal Document Analyzer

Integrates all legal analysis components for comprehensive document processing
"""

import logging
from typing import Dict, List, Any
from .entity_extractor import LegalEntityExtractor
from .clause_summarizer import ClauseSummarizer
from .importance_scorer import LegalPhraseScorer
from .html_renderer import LegalHTMLRenderer

logger = logging.getLogger(__name__)

class AdvancedLegalAnalyzer:
    """Comprehensive legal document analysis combining all components"""
    
    def __init__(self):
        """Initialize all analysis components"""
        try:
            self.entity_extractor = LegalEntityExtractor()
            self.clause_summarizer = ClauseSummarizer()
            self.phrase_scorer = LegalPhraseScorer()
            self.html_renderer = LegalHTMLRenderer()
            
            logger.info("Advanced Legal Analyzer initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Advanced Legal Analyzer: {e}")
            # Initialize with None to handle graceful degradation
            self.entity_extractor = None
            self.clause_summarizer = None
            self.phrase_scorer = None
            self.html_renderer = None
    
    def analyze_document_clauses(self, clauses_text: Dict[str, str]) -> Dict[str, Any]:
        """Perform comprehensive analysis on document clauses
        
        Args:
            clauses_text: Dict of clause_name -> clause_text
            
        Returns:
            Dict containing all analysis results
        """
        if not clauses_text:
            return {"error": "No clauses provided for analysis"}
        
        try:
            # Start with basic structure
            analysis_result = {}
            
            # Step 1: Extract entities
            if self.entity_extractor:
                logger.info("Extracting entities from clauses...")
                analysis_result = self.entity_extractor.extract_entities_for_clauses(clauses_text)
            else:
                # Fallback structure
                analysis_result = {name: {"text": text, "entities": {}} for name, text in clauses_text.items()}
            
            # Step 2: Score phrases for importance
            if self.phrase_scorer:
                logger.info("Scoring phrase importance...")
                scored_clauses = self.phrase_scorer.score_clauses_for_html_render(analysis_result)
                # Merge phrase scores into analysis result
                for clause_name, clause_data in scored_clauses.items():
                    if clause_name in analysis_result:
                        analysis_result[clause_name]["phrases"] = clause_data.get("phrases", {})
            
            # Step 3: Generate clause summaries
            if self.clause_summarizer:
                logger.info("Generating clause summaries...")
                summarized_clauses = self.clause_summarizer.summarize_multiple_clauses(analysis_result)
                # Merge summaries into analysis result
                for clause_name, clause_data in summarized_clauses.items():
                    if clause_name in analysis_result:
                        analysis_result[clause_name]["summary"] = clause_data.get("summary", "")
            
            # Step 4: Generate HTML rendering
            if self.html_renderer:
                logger.info("Generating HTML visualization...")
                html_output = self.html_renderer.render_multiple_clauses(analysis_result)
                analysis_summary = self.html_renderer.create_analysis_summary(analysis_result)
            else:
                html_output = "<p>HTML rendering unavailable</p>"
                analysis_summary = {}
            
            # Compile final result
            final_result = {
                "status": "success",
                "clauses": analysis_result,
                "html_visualization": html_output,
                "summary": analysis_summary,
                "total_clauses": len(clauses_text),
                "analysis_features": {
                    "entity_extraction": self.entity_extractor is not None,
                    "phrase_scoring": self.phrase_scorer is not None,
                    "clause_summarization": self.clause_summarizer is not None,
                    "html_rendering": self.html_renderer is not None
                }
            }
            
            logger.info(f"Advanced analysis completed for {len(clauses_text)} clauses")
            return final_result
            
        except Exception as e:
            logger.error(f"Advanced analysis failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "clauses": {},
                "html_visualization": "<p>Analysis failed</p>",
                "summary": {}
            }
    
    def analyze_single_clause(self, clause_text: str) -> Dict[str, Any]:
        """Analyze a single clause with all available features
        
        Args:
            clause_text: The clause text to analyze
            
        Returns:
            Dict containing analysis results for the single clause
        """
        return self.analyze_document_clauses({"Clause 1": clause_text})
    
    def get_entity_glossary(self, full_document_text: str) -> Dict[str, List[str]]:
        """Extract a glossary of entities from the full document
        
        Args:
            full_document_text: Complete document text
            
        Returns:
            Dict with entity types and their occurrences
        """
        if not self.entity_extractor:
            return {"dates": [], "parties": [], "money": []}
        
        try:
            return self.entity_extractor.extract_entities(full_document_text)
        except Exception as e:
            logger.error(f"Entity glossary extraction failed: {e}")
            return {"dates": [], "parties": [], "money": []}
    
    def score_text_importance(self, text: str) -> float:
        """Get importance score for any text
        
        Args:
            text: Text to score
            
        Returns:
            Importance score (0.0 to 1.0)
        """
        if not self.phrase_scorer:
            return 0.0
        
        try:
            return self.phrase_scorer.score_phrase(text)
        except Exception as e:
            logger.error(f"Text scoring failed: {e}")
            return 0.0
    
    def summarize_text(self, text: str) -> str:
        """Summarize any text using AI
        
        Args:
            text: Text to summarize
            
        Returns:
            Summary text
        """
        if not self.clause_summarizer:
            return "Summarization unavailable"
        
        try:
            return self.clause_summarizer.summarize_clause(text)
        except Exception as e:
            logger.error(f"Text summarization failed: {e}")
            return "Summarization failed"