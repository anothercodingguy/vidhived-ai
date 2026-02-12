from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from dataclasses import dataclass

db = SQLAlchemy()

@dataclass
class Document(db.Model):
    id: str
    filename: str
    status: str
    upload_date: datetime
    message: str
    file_size: int
    page_count: int
    
    id = db.Column(db.String(36), primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='pending')  # pending, processing, completed, failed
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    message = db.Column(db.Text, default='')
    pdf_data = db.Column(db.LargeBinary)  # Store PDF bytes
    file_size = db.Column(db.Integer, default=0)  # File size in bytes
    page_count = db.Column(db.Integer, default=0)  # Number of pages
    
    # Relationships
    analysis = db.relationship('AnalysisResult', backref='document', uselist=False, cascade="all, delete-orphan")

@dataclass
class AnalysisResult(db.Model):
    id: int
    document_id: str
    full_text: str
    summary_text: str
    clauses_json: str  # Stored as JSON string
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.String(36), db.ForeignKey('document.id'), nullable=False)
    full_text = db.Column(db.Text)
    summary_text = db.Column(db.Text)
    clauses_json = db.Column(db.Text)  # JSON serialized list of clauses


@dataclass
class Notebook(db.Model):
    id: str
    title: str
    description: str
    created_at: datetime
    updated_at: datetime

    id = db.Column(db.String(36), primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    notes = db.relationship('Note', backref='notebook', lazy='dynamic', cascade='all, delete-orphan')


@dataclass
class Note(db.Model):
    id: str
    notebook_id: str
    title: str
    content: str
    note_type: str
    source_filename: str
    word_count: int
    created_at: datetime
    updated_at: datetime

    id = db.Column(db.String(36), primary_key=True)
    notebook_id = db.Column(db.String(36), db.ForeignKey('notebook.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False, default='Untitled')
    content = db.Column(db.Text, default='')
    note_type = db.Column(db.String(20), default='text')  # 'text' or 'pdf'
    source_filename = db.Column(db.String(255), default='')
    word_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
