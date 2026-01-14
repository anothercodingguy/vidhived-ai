from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging

from .models import db
from .routes import bp

def create_app():
    load_dotenv()
    
    app = Flask(__name__)
    
    # Config
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///vidhived.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Init DB
    db.init_app(app)
    
    # CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Logger
    logging.basicConfig(level=logging.INFO)
    
    # Register Blueprint
    app.register_blueprint(bp)
    
    # Create tables (with migration support)
    with app.app_context():
        # Check if we need to migrate (simple check: does Document have pdf_data column?)
        try:
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            if 'document' in inspector.get_table_names():
                columns = [col['name'] for col in inspector.get_columns('document')]
                if 'pdf_data' not in columns:
                    # Schema changed, drop and recreate
                    app.logger.info("Schema migration detected. Recreating tables...")
                    db.drop_all()
                    db.create_all()
                else:
                    db.create_all()
            else:
                db.create_all()
        except Exception as e:
            app.logger.warning(f"Migration check failed, creating fresh tables: {e}")
            db.create_all()
        
    return app
