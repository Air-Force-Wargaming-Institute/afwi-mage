#!/usr/bin/env python3
"""
Test script for the model service health endpoint
"""
import requests
import sys
import json
from datetime import datetime

def test_health(base_url="http://localhost:8008"):
    """Test the health endpoint of the model service"""
    url = f"{base_url}/health"
    
    print(f"Testing health endpoint at {url}...")
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        print("\n✅ Service is healthy!\n")
        print(f"Status: {data.get('status')}")
        print(f"Service: {data.get('service')}")
        print(f"Timestamp: {data.get('timestamp')}")
        print(f"Version: {data.get('version')}")
        
        print("\nFull response:")
        print(json.dumps(data, indent=2))
        
        return True
    except requests.RequestException as e:
        print(f"\n❌ Error connecting to service: {e}")
        return False

if __name__ == "__main__":
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8008"
    success = test_health(base_url)
    sys.exit(0 if success else 1) 