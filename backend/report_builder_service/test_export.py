"""
Test script for the Word export functionality.

Usage:
python test_export.py <report_id>

This script tries to export a report to Word format and saves it locally.
"""

import httpx
import sys
import argparse
import asyncio
from pathlib import Path

async def test_export(report_id, force_regenerate=False):
    """Test the export endpoint for a given report ID"""
    print(f"Testing export for report ID: {report_id}")
    
    # Build the query parameters
    params = {}
    if force_regenerate:
        params['force_regenerate'] = 'true'
    
    async with httpx.AsyncClient() as client:
        # Call the export endpoint
        url = f"http://localhost:8019/api/report_builder/reports/{report_id}/export/word"
        print(f"Calling endpoint: {url}")
        
        try:
            response = await client.get(url, params=params)
            
            # Check if we got an error response
            if response.status_code != 200:
                try:
                    error_data = response.json()
                    print(f"Error: {error_data.get('detail', {}).get('message', 'Unknown error')}")
                except:
                    print(f"Error: HTTP {response.status_code} - {response.text}")
                return False
            
            # Save the file locally
            filename = response.headers.get('content-disposition', '').split('filename=')[-1].strip('"')
            if not filename:
                filename = f"report_{report_id}.docx"
            
            output_path = Path(filename)
            
            print(f"Saving to {output_path}")
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            print(f"Export successful! File saved to {output_path.absolute()}")
            return True
            
        except Exception as e:
            print(f"Error testing export: {str(e)}")
            return False

def parse_args():
    parser = argparse.ArgumentParser(description='Test the Word export functionality')
    parser.add_argument('report_id', help='ID of the report to export')
    parser.add_argument('--force', action='store_true', help='Force report regeneration')
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_args()
    asyncio.run(test_export(args.report_id, args.force)) 