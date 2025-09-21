"""
Advanced Legal Analysis Module for Vidhived.ai

This module provides comprehensive legal document analysis including:
- Entity extraction (dates, parties, money amounts)
- Clause summarization using AI
- Importance scoring for legal phrases
- HTML rendering with visual highlighting
"""

from .entity_extractor import LegalEntityExtractor
from .clause_summarizer import ClauseSummarizer
from .importance_scorer import LegalPhraseScorer
from .html_renderer import LegalHTMLRenderer

__all__ = [
    'LegalEntityExtractor',
    'ClauseSummarizer', 
    'LegalPhraseScorer',
    'LegalHTMLRenderer'
]