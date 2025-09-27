#!/usr/bin/env python3
"""
Convert GCP service account key to base64 for Render deployment
"""

import base64
import sys
import os

def convert_key_to_base64(key_file_path):
    """Convert service account key file to base64 string"""
    try:
        if not os.path.exists(key_file_path):
            print(f"❌ Error: File '{key_file_path}' not found")
            return None
        
        with open(key_file_path, 'rb') as f:
            key_content = f.read()
        
        base64_string = base64.b64encode(key_content).decode('utf-8')
        
        print(f"✅ Successfully converted '{key_file_path}' to base64")
        print(f"📝 Base64 string length: {len(base64_string)} characters")
        print("\n" + "="*50)
        print("COPY THIS BASE64 STRING TO RENDER ENVIRONMENT VARIABLES:")
        print("="*50)
        print(base64_string)
        print("="*50)
        
        # Save to file as well
        output_file = key_file_path.replace('.json', '-base64.txt')
        with open(output_file, 'w') as f:
            f.write(base64_string)
        
        print(f"\n💾 Also saved to: {output_file}")
        print("\n🚀 Next steps:")
        print("1. Copy the base64 string above")
        print("2. Go to your Render backend service")
        print("3. Add environment variable: GOOGLE_APPLICATION_CREDENTIALS_BASE64")
        print("4. Paste the base64 string as the value")
        
        return base64_string
        
    except Exception as e:
        print(f"❌ Error converting key: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python convert-key-to-base64.py <path-to-service-account-key.json>")
        print("Example: python convert-key-to-base64.py vidhived-key.json")
        sys.exit(1)
    
    key_file = sys.argv[1]
    convert_key_to_base64(key_file)