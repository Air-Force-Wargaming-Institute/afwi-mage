"""
Minimal metadata pipeline test.

This module tests the metadata preservation in a minimal way, directly creating 
and manipulating metadata files without relying on existing implementations.
"""

import os
import json
import tempfile
import shutil
import time
from pathlib import Path

# Import directly from the modules we want to test
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.metadata import normalize_security_classification, extract_metadata_from_file


def test_metadata_extraction_and_normalization():
    """Test metadata extraction and security classification normalization."""
    # Create a test file with embedded security classification
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt') as temp_file:
        temp_file.write("TOP SECRET//NOFORN\n\n"
                        "This document contains highly sensitive information.\n"
                        "Author: Security Officer\n"
                        "It should be handled according to proper security procedures.")
        test_file = temp_file.name
    
    try:
        # Extract metadata from the file
        metadata = extract_metadata_from_file(test_file)
        
        # Verify basic metadata
        assert metadata["filename"] == os.path.basename(test_file)
        assert metadata["file_size"] > 0
        
        # Verify extracted classification
        assert "security_classification" in metadata
        security_class = metadata["security_classification"]
        assert security_class == "TOP SECRET//NOFORN"
        
        # Test normalization of various classification formats
        test_classifications = [
            ("U", "UNCLASSIFIED"),
            ("UNCLAS", "UNCLASSIFIED"),
            ("Confidential", "CONFIDENTIAL"),
            ("S", "SECRET"),
            ("TS", "TOP SECRET"),
            ("S//NF", "SECRET//NOFORN"),
            ("U//FOUO", "UNCLASSIFIED//FOUO"),
            ("TS/SCI", "TOP SECRET//SCI"),
            ("", "UNCLASSIFIED"),  # Default for empty string
            ("None", "UNCLASSIFIED")  # Use string "None" instead of None
        ]
        
        print("Testing security classification normalization:")
        for input_class, expected_output in test_classifications:
            result = normalize_security_classification(input_class)
            assert result == expected_output, f"Expected {input_class} to normalize to {expected_output}, but got {result}"
            print(f"  {input_class:12} -> {result}")
            
        # Test with None separately to avoid formatting issues
        result = normalize_security_classification(None)
        assert result == "UNCLASSIFIED", f"Expected None to normalize to UNCLASSIFIED, but got {result}"
        print("  None        -> " + result)
        
    finally:
        # Clean up
        try:
            os.unlink(test_file)
        except:
            pass


def test_metadata_file_creation_and_loading():
    """Test creating and loading metadata files."""
    # Create a temporary directory
    test_dir = tempfile.mkdtemp()
    
    try:
        # Create a document file
        doc_path = os.path.join(test_dir, "test_document.txt")
        with open(doc_path, "w") as f:
            f.write("This is a test document for metadata handling.")
        
        # Create metadata for the document
        original_metadata = {
            "filename": "original_secret_file.txt",
            "security_classification": "SECRET",
            "author": "Test User",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "document_id": "doc-001"
        }
        
        # Save metadata to a file
        metadata_path = f"{doc_path}.metadata"
        with open(metadata_path, "w") as f:
            json.dump(original_metadata, f)
        
        # Now load the metadata
        with open(metadata_path, "r") as f:
            loaded_metadata = json.load(f)
        
        # Verify that the loaded metadata matches the original
        for key, value in original_metadata.items():
            assert key in loaded_metadata, f"Metadata key {key} was lost"
            assert loaded_metadata[key] == value, f"Metadata value for {key} changed, expected {value}, got {loaded_metadata[key]}"
        
        # Ensure security classification is preserved
        assert loaded_metadata["security_classification"] == "SECRET"
        
        # Test extracting metadata from the file with a metadata file present
        document_metadata = extract_metadata_from_file(doc_path)
        
        # Verify original filename is maintained
        assert "filename" in document_metadata
        assert document_metadata["filename"] == os.path.basename(doc_path)
        
        print("Successfully created and loaded metadata file with security classification")
        
    finally:
        # Clean up
        shutil.rmtree(test_dir)


if __name__ == "__main__":
    # Run the tests
    print("\nTesting metadata extraction and normalization...")
    test_metadata_extraction_and_normalization()
    
    print("\nTesting metadata file creation and loading...")
    test_metadata_file_creation_and_loading()
    
    print("\nAll tests passed successfully!") 