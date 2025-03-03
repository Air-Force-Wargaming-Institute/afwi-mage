"""
Simple tests for metadata handling.

This module contains simple tests to verify that our metadata handling functions
work correctly without relying on complex imports.
"""

import os
import json
import tempfile
import pytest
from pathlib import Path

# Import directly from the modules to avoid import issues
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.metadata import normalize_security_classification, extract_metadata_from_file


def test_normalize_security_classification():
    """Test normalization of security classifications."""
    # Test standard classifications
    assert normalize_security_classification("unclassified") == "UNCLASSIFIED"
    assert normalize_security_classification("Unclassified") == "UNCLASSIFIED"
    assert normalize_security_classification("UNCLASSIFIED") == "UNCLASSIFIED"
    assert normalize_security_classification("confidential") == "CONFIDENTIAL"
    assert normalize_security_classification("secret") == "SECRET"
    assert normalize_security_classification("top secret") == "TOP SECRET"
    
    # Test with special formats
    assert normalize_security_classification("U//FOUO") == "UNCLASSIFIED//FOUO"
    assert normalize_security_classification("S//NF") == "SECRET//NOFORN"
    
    # Test with None or empty
    assert normalize_security_classification(None) == "UNCLASSIFIED"
    assert normalize_security_classification("") == "UNCLASSIFIED"


def test_extract_metadata_from_file():
    """Test extraction of metadata from a file."""
    # Create a temporary file with test content
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt') as temp_file:
        temp_file.write("This is a test file.\nAuthor: Test User\nSecurity: SECRET")
        temp_path = temp_file.name
    
    try:
        # Extract metadata from the file
        metadata = extract_metadata_from_file(temp_path)
        
        # Verify basic metadata
        assert "filename" in metadata
        assert metadata["filename"] == os.path.basename(temp_path)
        assert "file_size" in metadata
        assert metadata["file_size"] > 0
        
        # Verify extracted metadata
        if "author" in metadata:
            assert metadata["author"] == "Test User"
        
        if "security_classification" in metadata:
            assert metadata["security_classification"] == "SECRET"
    finally:
        # Clean up
        try:
            os.unlink(temp_path)
        except:
            pass


if __name__ == "__main__":
    # Run the tests directly
    test_normalize_security_classification()
    test_extract_metadata_from_file()
    print("All tests passed!") 