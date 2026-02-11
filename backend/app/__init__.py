from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging

from .models import db
from .routes import bp
from .voice_routes import voice_bp


def create_app():
    load_dotenv()

    app = Flask(__name__)

    # Config
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///vidhived.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25MB max request

    # Init DB
    db.init_app(app)

    # CORS
    cors_origins = os.getenv('CORS_ORIGINS', '*')
    CORS(app, resources={r"/*": {"origins": cors_origins}})

    # Structured logging
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )

    # Register Blueprints
    app.register_blueprint(bp)
    app.register_blueprint(voice_bp)

    # Create/migrate tables safely
    with app.app_context():
        _safe_init_db(app)

    return app


def _safe_init_db(app):
    """Initialize database tables safely without destructive migration."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()

        if 'document' in existing_tables:
            columns = {col['name'] for col in inspector.get_columns('document')}
            missing_cols = []

            # Check for new columns and add them gracefully
            if 'pdf_data' not in columns:
                missing_cols.append(('pdf_data', 'BLOB'))
            if 'file_size' not in columns:
                missing_cols.append(('file_size', 'INTEGER DEFAULT 0'))
            if 'page_count' not in columns:
                missing_cols.append(('page_count', 'INTEGER DEFAULT 0'))

            for col_name, col_type in missing_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE document ADD COLUMN {col_name} {col_type}'))
                    app.logger.info(f"Added column '{col_name}' to document table")
                except Exception as e:
                    app.logger.warning(f"Could not add column '{col_name}': {e}")

            db.session.commit()

        # Create any missing tables
        db.create_all()

    except Exception as e:
        app.logger.warning(f"DB init: {e} — creating fresh tables")
        db.create_all()
