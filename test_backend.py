#!/usr/bin/env python3
"""
Simple test script to verify the backend is working
"""
import requests
import json

# Test configuration
BASE_URL = "http://localhost:5000"  # Change this to your deployed URL

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_upload():
    """Test file upload"""
    try:
        # Create a simple test file
        test_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        
        files = {'file': ('test.pdf', test_content, 'application/pdf')}
        response = requests.post(f"{BASE_URL}/upload", files=files)
        
        print(f"Upload: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Document ID: {data.get('documentId')}")
            print(f"PDF URL: {data.get('pdfUrl')}")
            return data.get('documentId')
        else:
            print(f"Upload failed: {response.text}")
            return None
    except Exception as e:
        print(f"Upload test failed: {e}")
        return None

def test_document_status(doc_id):
    """Test document status"""
    try:
        response = requests.get(f"{BASE_URL}/document/{doc_id}")
        print(f"Document status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Status: {data.get('status')}")
            print(f"Analysis: {len(data.get('analysis', []))} clauses")
        else:
            print(f"Status check failed: {response.text}")
    except Exception as e:
        print(f"Status test failed: {e}")

def test_debug():
    """Test debug endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/debug")
        print(f"Debug: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Documents: {data.get('documents')}")
            print(f"Temp files: {data.get('temp_files')}")
    except Exception as e:
        print(f"Debug test failed: {e}")

if __name__ == "__main__":
    print("Testing backend...")
    print("=" * 50)
    
    # Test health
    if not test_health():
        print("❌ Health check failed - backend not running?")
        exit(1)
    
    print("✅ Health check passed")
    
    # Test upload
    doc_id = test_upload()
    if not doc_id:
        print("❌ Upload failed")
        exit(1)
    
    print("✅ Upload passed")
    
    # Test document status
    test_document_status(doc_id)
    print("✅ Document status check completed")
    
    # Test debug
    test_debug()
    print("✅ Debug check completed")
    
    print("=" * 50)
    print("🎉 All tests completed!")