import re
from typing import Dict, Any, List

class LegalHTMLRenderer:
    """Render legal clauses with entity and phrase highlighting"""
    
    def __init__(self):
        self.entity_colors = {
            "MONEY": "#90EE90",   # light green
            "DATE": "#ADD8E6",    # light blue
            "PARTY": "#FFFFE0",   # light yellow
            "dates": "#ADD8E6",   # light blue (for entity extractor format)
            "money": "#90EE90",   # light green
            "parties": "#FFFFE0"  # light yellow
        }
    
    def render_clause_to_html(self, clause_data: Dict[str, Any]) -> str:
        """Render a single clause with entity and phrase highlighting
        
        Args:
            clause_data: dict like {
                "clause_number": 1,
                "text": "Party A shall pay $5000 by 12/12/2025.\nParty B agrees.",
                "phrases": {
                    "pay $5000": {"score": 0.9, "hex": "#8B0000"},
                    "12/12/2025": {"score": 0.6, "hex": "#CD5C5C"}
                },
                "entities": {
                    "dates": ["12/12/2025"],
                    "money": ["$5000"],
                    "parties": ["Party A", "Party B"]
                }
            }
        
        Returns:
            str: HTML string with highlighting
        """
        text = clause_data.get("text", "")
        clause_number = clause_data.get("clause_number", 1)
        
        # =========================
        # 1. Entity highlighting (done first, so phrases don't double-wrap)
        # =========================
        entities_data = clause_data.get("entities", {})
        
        # Handle both formats: list of dicts or dict of lists
        entities_to_highlight = []
        
        if isinstance(entities_data, dict):
            # New format: {"dates": ["12/12/2025"], "money": ["$5000"]}
            for entity_type, entity_list in entities_data.items():
                if isinstance(entity_list, list):
                    for entity_text in entity_list:
                        entities_to_highlight.append({
                            "text": entity_text,
                            "label": entity_type
                        })
        elif isinstance(entities_data, list):
            # Old format: [{"text": "$5000", "label": "MONEY"}]
            entities_to_highlight = entities_data
        
        # Sort entities by length (longest first to avoid partial overlap issues)
        entities_to_highlight.sort(key=lambda e: -len(e["text"]))
        
        for ent in entities_to_highlight:
            color = self.entity_colors.get(ent["label"], "#FFFFFF")
            pattern = re.escape(ent["text"])
            replacement = f'<span style="background-color:{color}; padding:1px 3px; border-radius:3px;" title="{ent["label"]}">{ent["text"]}</span>'
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        # =========================
        # 2. Phrase importance coloring (skip already wrapped spans)
        # =========================
        phrases_data = clause_data.get("phrases", {})
        
        # Handle both formats
        phrases_to_highlight = []
        if isinstance(phrases_data, dict):
            for phrase_text, phrase_info in phrases_data.items():
                if isinstance(phrase_info, dict) and "hex" in phrase_info:
                    phrases_to_highlight.append({
                        "text": phrase_text,
                        "hex": phrase_info["hex"],
                        "score": phrase_info.get("score", 0)
                    })
        elif isinstance(phrases_data, list):
            # Old format: [{"text": "pay $5000", "score": 0.9, "hex": "#8B0000"}]
            phrases_to_highlight = phrases_data
        
        # Sort phrases by length (longest first)
        phrases_to_highlight.sort(key=lambda p: -len(p["text"]))
        
        for phrase in phrases_to_highlight:
            phrase_text = phrase["text"]
            hex_color = phrase["hex"]
            score = phrase.get("score", 0)
            
            if hex_color == "transparent":
                continue
            
            # Regex: ensure we don't replace inside an existing <span>
            pattern = fr'(?<!>)\b{re.escape(phrase_text)}\b(?!<\/span>)'
            replacement = f'<span style="background-color:{hex_color}; padding:1px 2px; border-radius:2px;" title="Importance: {score}">{phrase_text}</span>'
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        # =========================
        # 3. Line breaks, formatting
        # =========================
        text = text.replace("\n", "<br>")
        
        return f'''
        <div class="clause" style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #fafafa;">
            <strong style="color: #333; font-size: 16px;">Clause {clause_number}:</strong><br><br>
            <div style="line-height: 1.6; color: #555;">{text}</div>
        </div>
        '''
    
    def render_multiple_clauses(self, clauses_data: Dict[str, Any]) -> str:
        """Render multiple clauses as HTML
        
        Args:
            clauses_data: dict of clause_name -> clause_data
        
        Returns:
            str: Complete HTML document with all clauses
        """
        html_parts = [
            '''
            <html>
            <head>
                <title>Legal Document Analysis</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f9f9f9; }
                    .document-container { max-width: 1000px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .clause { margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #fafafa; }
                    .legend { margin-bottom: 30px; padding: 15px; background-color: #f0f8ff; border-radius: 8px; border: 1px solid #b0d4f1; }
                    .legend-item { display: inline-block; margin-right: 20px; margin-bottom: 5px; }
                    .legend-color { display: inline-block; width: 20px; height: 15px; margin-right: 5px; border-radius: 3px; vertical-align: middle; }
                </style>
            </head>
            <body>
                <div class="document-container">
                    <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">Legal Document Analysis</h1>
                    
                    <div class="legend">
                        <h3 style="margin-top: 0; color: #34495e;">Legend:</h3>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #ADD8E6;"></span>
                            <span>Dates</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #90EE90;"></span>
                            <span>Money</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #FFFFE0;"></span>
                            <span>Parties</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #8B0000;"></span>
                            <span>High Importance</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #CD5C5C;"></span>
                            <span>Medium Importance</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #FFB6C1;"></span>
                            <span>Low Importance</span>
                        </div>
                    </div>
            '''
        ]
        
        # Render each clause
        clause_number = 1
        for clause_name, clause_data in clauses_data.items():
            # Ensure clause_data has clause_number
            if isinstance(clause_data, dict):
                clause_data = clause_data.copy()
                clause_data["clause_number"] = clause_number
            else:
                clause_data = {
                    "clause_number": clause_number,
                    "text": str(clause_data),
                    "phrases": {},
                    "entities": {}
                }
            
            html_parts.append(self.render_clause_to_html(clause_data))
            clause_number += 1
        
        html_parts.append('''
                </div>
            </body>
            </html>
        ''')
        
        return '\n'.join(html_parts)
    
    def create_analysis_summary(self, clauses_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary of the analysis results
        
        Args:
            clauses_data: Analyzed clauses data
            
        Returns:
            dict: Summary statistics
        """
        total_clauses = len(clauses_data)
        high_risk_count = 0
        medium_risk_count = 0
        low_risk_count = 0
        
        total_entities = {"dates": set(), "money": set(), "parties": set()}
        
        for clause_name, clause_data in clauses_data.items():
            if not isinstance(clause_data, dict):
                continue
                
            # Count risk levels based on phrases
            phrases = clause_data.get("phrases", {})
            max_score = 0
            
            for phrase_text, phrase_info in phrases.items():
                if isinstance(phrase_info, dict):
                    score = phrase_info.get("score", 0)
                    max_score = max(max_score, score)
            
            if max_score >= 0.7:
                high_risk_count += 1
            elif max_score >= 0.4:
                medium_risk_count += 1
            else:
                low_risk_count += 1
            
            # Collect entities
            entities = clause_data.get("entities", {})
            for entity_type, entity_list in entities.items():
                if entity_type in total_entities and isinstance(entity_list, list):
                    total_entities[entity_type].update(entity_list)
        
        return {
            "total_clauses": total_clauses,
            "high_risk_clauses": high_risk_count,
            "medium_risk_clauses": medium_risk_count,
            "low_risk_clauses": low_risk_count,
            "unique_dates": len(total_entities["dates"]),
            "unique_money_amounts": len(total_entities["money"]),
            "unique_parties": len(total_entities["parties"]),
            "all_dates": sorted(list(total_entities["dates"])),
            "all_money": sorted(list(total_entities["money"])),
            "all_parties": sorted(list(total_entities["parties"]))
        }