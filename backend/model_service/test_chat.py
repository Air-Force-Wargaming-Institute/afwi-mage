#!/usr/bin/env python3
"""
Test script for the model service chat endpoint
"""
import requests
import sys
import json
import time
from datetime import datetime
import traceback
import argparse

def test_chat(base_url="http://localhost:8008", message="Write a short story about a robot", max_tokens=4000):
    """Test the chat endpoint of the model service with support for extremely long responses"""
    url = f"{base_url}/chat"
    
    print(f"Testing chat endpoint at {url}...")
    print(f"Message length: {len(message)} characters")
    print(f"Max tokens requested: {max_tokens}")
    
    # Truncate message display if too long
    display_message = message if len(message) < 100 else f"{message[:100]}..."
    print(f"Sending message: '{display_message}'")
    
    payload = {
        "message": message,
        "model": "/models/Llama-3.2-1B-Instruct-abliterated",
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "system_prompt": "You are a creative storyteller. Please provide detailed and comprehensive responses."
    }
    
    try:
        # First check if the service is healthy
        try:
            health_check = requests.get(f"{base_url}/health", timeout=10)
            health_check.raise_for_status()
            health_data = health_check.json()
            print(f"✅ Service health check passed: {health_data.get('status', 'unknown')}")
            print(f"Service: {health_data.get('service', 'unknown')}")
            print(f"Version: {health_data.get('version', 'unknown')}")
        except Exception as health_err:
            print(f"⚠️ Health check failed: {str(health_err)}")
            print("Attempting to proceed with request anyway...")
        
        print(f"\nSending chat request...")
        print(f"This may take several minutes for a response of up to {max_tokens} tokens...")
        
        # Set a reasonable timeout for the expected response size
        timeout = max(300, max_tokens // 3)  # Minimum 5 minutes, scales with token count
        print(f"Timeout set to {timeout} seconds")
        
        start_time = time.time()
        
        response = requests.post(url, json=payload, timeout=timeout)
        response.raise_for_status()
        
        elapsed_time = time.time() - start_time
        print(f"\n✅ Received response in {elapsed_time:.2f} seconds")
        
        data = response.json()
        response_text = data.get('response', '')
        char_count = len(response_text)
        word_count = len(response_text.split())
        token_estimate = int(word_count * 1.3)
        
        print(f"\nResponse stats:")
        print(f"- Characters: {char_count:,}")
        print(f"- Words: {word_count:,}")
        print(f"- Estimated tokens: ~{token_estimate:,}")
        print(f"- Generation speed: ~{token_estimate / elapsed_time:.1f} tokens/sec")
        
        # For extremely long responses, show just beginning and end with summary
        if len(response_text) > 1000:
            print("\nResponse preview (first 500 chars):")
            print(f"{response_text[:500]}...")
            print("\n[... content truncated for display ...]")
            print(f"\nResponse end (last 500 chars):")
            print(f"...{response_text[-500:]}")
        else:
            print(f"\nFull response: {response_text}")
            
        print(f"\nModel: {data.get('model')}")
        print(f"Timestamp: {data.get('timestamp')}")
        
        # Save the full response to a file for inspection
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chat_response_{timestamp}.txt"
        try:
            with open(filename, "w", encoding="utf-8") as f:
                # Write prompt
                f.write(f"PROMPT: {message}\n\n")
                
                # Clean up formatting issues in the response
                clean_response = response_text
                if clean_response.startswith(" "):
                    print("\nℹ️ Response had leading whitespace that was cleaned up for the saved file")
                    clean_response = clean_response.lstrip()
                
                # Remove trailing whitespace
                clean_response = clean_response.rstrip()
                
                # Write the response header
                f.write("RESPONSE:\n")
                
                # Write the actual response with proper line handling
                # Split lines to handle them individually
                lines = clean_response.split("\n")
                for i, line in enumerate(lines):
                    # Remove any non-printable control characters that might cause display issues
                    clean_line = ''.join(c for c in line if c.isprintable() or c == '\n')
                    # Write each line with proper indentation
                    f.write(clean_line)
                    # Add line break except for the last line
                    if i < len(lines) - 1:
                        f.write("\n")
                
                # Add spacing after response
                f.write("\n\n")
                
                # Write metadata
                f.write(f"MODEL: {data.get('model')}\n")
                f.write(f"TIMESTAMP: {data.get('timestamp')}\n")
                f.write(f"STATS:\n")
                f.write(f"- Characters: {char_count:,}\n")
                f.write(f"- Words: {word_count:,}\n")
                f.write(f"- Estimated tokens: ~{token_estimate:,}\n")
                f.write(f"- Response time: {elapsed_time:.2f} seconds\n")
            
            print(f"\nFull response saved to {filename}")
        except Exception as e:
            print(f"\n⚠️ Error saving response to file: {str(e)}")
        
        return True
    except requests.Timeout:
        print(f"\n❌ Request timed out after {timeout} seconds")
        print("The request may be too large or the server is overloaded.")
        print("Try reducing the max_tokens parameter or simplifying your request.")
        return False
    except requests.RequestException as e:
        print(f"\n❌ Error connecting to service: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error status code: {e.response.status_code}")
                print(f"Error text: {e.response.text}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    try:
        # Use argparse to handle command line arguments properly
        parser = argparse.ArgumentParser(description="Test the model service chat endpoint")
        parser.add_argument("--url", default="http://localhost:8008", help="Base URL of the model service")
        parser.add_argument("--message", default="Write a short story about a robot", help="Message to send to the chat endpoint")
        parser.add_argument("--max-tokens", type=int, default=4000, help="Maximum number of tokens to generate")
        
        # If no arguments provided, use defaults
        if len(sys.argv) == 1:
            args = parser.parse_args([])
        else:
            args = parser.parse_args()
            
        print(f"Starting chat test with {args.max_tokens} max tokens")
        success = test_chat(args.url, args.message, args.max_tokens)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        sys.exit(2)
    except Exception as e:
        print(f"\nError running test script: {str(e)}")
        print(traceback.format_exc())
        sys.exit(3) 