from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline
import logging

logger = logging.getLogger(__name__)

class ClauseSummarizer:
    """AI-powered legal clause summarization using DistilBART"""
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.pipe = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the summarization model"""
        try:
            model_name = "sshleifer/distilbart-cnn-12-6"
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            
            # Create pipeline
            self.pipe = pipeline(
                "summarization",
                model=self.model,
                tokenizer=self.tokenizer,
                max_length=50,      # Concise summaries
                min_length=10,      # Minimum meaningful length
                do_sample=True,
                temperature=0.3,
                length_penalty=2.0,  # Penalty for long outputs
                no_repeat_ngram_size=2
            )
            
            logger.info("Clause summarization model initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize summarization model: {e}")
            self.pipe = None
    
    def summarize_clause(self, clause_text: str) -> str:
        """Summarize a legal clause.
        
        Args:
            clause_text: The legal clause text to summarize
            
        Returns:
            str: Summary of the clause
        """
        if not self.pipe or not clause_text.strip():
            return "Summary unavailable"
        
        try:
            # Clean and prepare text
            text = clause_text.strip()
            if len(text) < 50:  # Too short to summarize meaningfully
                return text
            
            # Generate summary
            result = self.pipe(text)[0]["summary_text"]
            return result.strip()
            
        except Exception as e:
            logger.error(f"Failed to summarize clause: {e}")
            return "Summary generation failed"
    
    def summarize_multiple_clauses(self, clauses_dict: dict) -> dict:
        """Summarize multiple clauses
        
        Args:
            clauses_dict: Dictionary of clause_name -> clause_text or clause_data
            
        Returns:
            dict: Same structure with summaries added
        """
        result = {}
        
        for clause_name, clause_data in clauses_dict.items():
            # Handle both formats
            if isinstance(clause_data, str):
                text = clause_data
                existing_data = {}
            else:
                text = clause_data.get("text", "")
                existing_data = clause_data.copy()
            
            # Generate summary
            summary = self.summarize_clause(text)
            
            # Add summary to existing data
            result[clause_name] = existing_data.copy()
            result[clause_name]["text"] = text
            result[clause_name]["summary"] = summary
        
        return result