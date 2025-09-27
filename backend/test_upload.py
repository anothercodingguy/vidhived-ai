#!/usr/bin/env python3
"""
Test script for PDF upload functionality
"""

import requests
import os
import sys
import json

def test_upload_endpoint(base_url="http://localhost:5000", pdf_path=None):
    """Test the upload endpoint with a sample PDF"""
    
    # Create a simple test PDF if none provided
    if not pdf_path:
        # Create a minimal PDF for testing
        test_pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000189 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
284
%%EOF"""
        
        pdf_path = "test_sample.pdf"
        with open(pdf_path, "wb") as f:
            f.write(test_pdf_content)
        print(f"Created test PDF: {pdf_path}")
    
    # Test health endpoint first
    print(f"Testing health endpoint: {base_url}/health")
    try:
        health_response = requests.get(f"{base_url}/health")
        print(f"Health check status: {health_response.status_code}")
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"Health data: {json.dumps(health_data, indent=2)}")
        else:
            print(f"Health check failed: {health_response.text}")
    except Exception as e:
        print(f"Health check error: {e}")
    
    # Test upload endpoint
    print(f"\nTesting upload endpoint: {base_url}/upload")
    try:
        with open(pdf_path, "rb") as f:
            files = {"file": (pdf_path, f, "application/pdf")}
            response = requests.post(f"{base_url}/upload", files=files)
        
        print(f"Upload response status: {response.status_code}")
        print(f"Upload response headers: {dict(response.headers)}")
        
        if response.status_code in [200, 202]:
            data = response.json()
            print(f"Upload response: {json.dumps(data, indent=2)}")
            
            document_id = data.get("documentId")
            pdf_url = data.get("pdfUrl")
            
            if pdf_url:
                print(f"\nTesting PDF URL: {pdf_url}")
                try:
                    pdf_response = requests.get(pdf_url)
                    print(f"PDF response status: {pdf_response.status_code}")
                    print(f"PDF response headers: {dict(pdf_response.headers)}")
                    print(f"PDF content length: {len(pdf_response.content)}")
                    
                    if pdf_response.status_code == 200:
                        # Save the downloaded PDF for verification
                        with open(f"downloaded_{document_id}.pdf", "wb") as f:
                            f.write(pdf_response.content)
                        print(f"Successfully downloaded PDF to downloaded_{document_id}.pdf")
                    else:
                        print(f"PDF download failed: {pdf_response.text}")
                        
                except Exception as e:
                    print(f"PDF download error: {e}")
            
            # Test document status endpoint
            if document_id:
                print(f"\nTesting document status: {base_url}/document/{document_id}")
                try:
                    status_response = requests.get(f"{base_url}/document/{document_id}")
                    print(f"Status response: {status_response.status_code}")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        print(f"Document status: {status_data.get('status', 'unknown')}")
                    else:
                        print(f"Status check response: {status_response.text}")
                except Exception as e:
                    print(f"Status check error: {e}")
        else:
            print(f"Upload failed: {response.text}")
            
    except Exception as e:
        print(f"Upload test error: {e}")
    
    # Clean up test file if we created it
    if pdf_path == "test_sample.pdf" and os.path.exists(pdf_path):
        os.remove(pdf_path)
        print(f"\nCleaned up test file: {pdf_path}")

if __name__ == "__main__":
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000"
    pdf_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(f"Testing PDF upload functionality against: {base_url}")
    test_upload_endpoint(base_url, pdf_path)