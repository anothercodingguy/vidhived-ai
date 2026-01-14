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
    
    # Create tables
    with app.app_context():
        db.create_all()
        
    return app
