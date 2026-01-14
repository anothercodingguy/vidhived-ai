#!/usr/bin/env python3
"""
Simple test to verify project structure
"""

import os
import json

def test_project_structure():
    """Test if all required files exist"""
    
    print("🚀 Testing Vidhived.ai Project Structure")
    print("=" * 50)
    
    # Backend files
    backend_files = [
        'backend/wsgi.py',
        'backend/requirements.txt',
        'backend/gunicorn.conf.py',
        'backend/.env.example'
    ]
    
    print("\n1. Testing Backend Files...")
    for file_path in backend_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} missing")
            return False
    
    # Frontend files
    frontend_files = [
        'frontend/package.json',
        'frontend/app/page.tsx',
        'frontend/lib/api.ts',
        'frontend/components/PDFViewer.tsx',
        'frontend/hooks/usePdfViewer.ts'
    ]
    
    print("\n2. Testing Frontend Files...")
    for file_path in frontend_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} missing")
            return False
    
    # Configuration files
    config_files = [
        'render.yaml',
        'frontend/next.config.js',
        'frontend/tsconfig.json'
    ]
    
    print("\n3. Testing Configuration Files...")
    for file_path in config_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} missing")
            return False
    
    # Check API configuration
    print("\n4. Testing API Configuration...")
    try:
        with open('frontend/lib/api.ts', 'r') as f:
            content = f.read()
            if 'API_URL' in content and 'uploadPDF' in content:
                print("✅ API configuration looks good")
            else:
                print("❌ API configuration incomplete")
                return False
    except Exception as e:
        print(f"❌ Error reading API config: {e}")
        return False
    
    # Check package.json
    print("\n5. Testing Package Configuration...")
    try:
        with open('frontend/package.json', 'r') as f:
            package_data = json.load(f)
            if 'pdfjs-dist' in package_data.get('dependencies', {}):
                print("✅ PDF.js dependency found")
            else:
                print("❌ PDF.js dependency missing")
                return False
    except Exception as e:
        print(f"❌ Error reading package.json: {e}")
        return False
    
    return True

def check_environment_setup():
    """Check environment setup"""
    
    print("\n6. Environment Setup Guide...")
    
    print("\nBackend Environment (.env):")
    print("- Copy backend/.env.example to backend/.env")
    print("- Set CORS_ORIGINS to your frontend URL")
    print("- Configure GCP credentials if using AI features")
    
    print("\nFrontend Environment (.env.local):")
    print("- Copy frontend/.env.example to frontend/.env.local")
    print("- Set NEXT_PUBLIC_API_URL to your backend URL")
    
    print("\nLocal Development:")
    print("1. Backend: cd backend && pip install -r requirements.txt && python app.py")
    print("2. Frontend: cd frontend && npm install && npm run dev")
    
    print("\nProduction Deployment:")
    print("1. Push to GitHub")
    print("2. Deploy using render.yaml configuration")
    print("3. Set environment variables in Render dashboard")

if __name__ == "__main__":
    success = test_project_structure()
    
    if success:
        print("\n🎉 All project files are present!")
        check_environment_setup()
        print("\n✅ Project is ready for deployment!")
    else:
        print("\n❌ Some files are missing. Please check the project structure.")