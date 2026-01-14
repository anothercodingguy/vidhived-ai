from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from dataclasses import dataclass
from typing import List, Optional

db = SQLAlchemy()

@dataclass
class Document(db.Model):
    id: str
    filename: str
    status: str
    upload_date: datetime
    message: str
    
    id = db.Column(db.String(36), primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='pending') # pending, processing, completed, failed
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    message = db.Column(db.Text, default='')
    
    # Relationships
    analysis = db.relationship('AnalysisResult', backref='document', uselist=False, cascade="all, delete-orphan")

@dataclass
class AnalysisResult(db.Model):
    id: int
    document_id: str
    full_text: str
    summary_text: str
    clauses_json: str # Stored as JSON string
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.String(36), db.ForeignKey('document.id'), nullable=False)
    full_text = db.Column(db.Text)
    summary_text = db.Column(db.Text)
    clauses_json = db.Column(db.Text) # JSON serialized list of clauses
