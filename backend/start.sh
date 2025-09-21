#!/bin/bash

# Install spaCy model
python -m spacy download en_core_web_sm

# Start the application with gunicorn
exec gunicorn --config gunicorn.conf.py app:app