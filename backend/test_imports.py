#!/usr/bin/env python3
"""
Test script to verify all required imports work
"""

def test_imports():
    """Test all critical imports"""
    print("Testing imports...")
    
    # Core Flask imports
    try:
        from flask import Flask, request, jsonify, send_file, Response
        from flask_cors import CORS
        print("✅ Flask imports successful")
    except ImportError as e:
        print(f"❌ Flask imports failed: {e}")
        return False
    
    # Python standard library
    try:
        import os, uuid, json, logging, asyncio, io, threading, re
        from datetime import datetime, timedelta
        from typing import List, Dict, Any
        print("✅ Standard library imports successful")
    except ImportError as e:
        print(f"❌ Standard library imports failed: {e}")
        return False
    
    # PDF processing
    try:
        import PyPDF2
        print("✅ PyPDF2 import successful")
    except ImportError as e:
        print(f"❌ PyPDF2 import failed: {e}")
        return False
    
    # Google Cloud (optional but preferred)
    try:
        from google.cloud import storage, vision, aiplatform
        import vertexai
        from vertexai.generative_models import GenerativeModel
        print("✅ Google Cloud imports successful")
        return True
    except ImportError as e:
        print(f"⚠️ Google Cloud imports failed (will use fallback): {e}")
        return True  # This is OK, we have fallback mode
    
if __name__ == "__main__":
    success = test_imports()
    if success:
        print("\n🎉 All critical imports successful!")
        exit(0)
    else:
        print("\n💥 Critical imports failed!")
        exit(1)