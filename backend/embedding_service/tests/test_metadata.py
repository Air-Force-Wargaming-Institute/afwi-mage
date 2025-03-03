"""
Tests for metadata utilities.

This module tests the metadata handling functions, especially
the normalization of security classifications.
"""

import pytest
from ..core.metadata import (
    normalize_security_classification,
    validate_metadata,
    extract_metadata_from_file,
    DEFAULT_SECURITY_CLASSIFICATION
)


def test_normalize_security_classification():
    """Test normalization of various security classification formats."""
    # Test standard classifications
    assert normalize_security_classification("unclassified") == "UNCLASSIFIED"
    assert normalize_security_classification("Unclassified") == "UNCLASSIFIED"
    assert normalize_security_classification("UNCLASSIFIED") == "UNCLASSIFIED"
    assert normalize_security_classification("confidential") == "CONFIDENTIAL"
    assert normalize_security_classification("secret") == "SECRET"
    assert normalize_security_classification("top secret") == "TOP SECRET"
    assert normalize_security_classification("TOP SECRET") == "TOP SECRET"
    
    # Test with leading/trailing whitespace
    assert normalize_security_classification(" unclassified ") == "UNCLASSIFIED"
    assert normalize_security_classification(" SECRET ") == "SECRET"
    
    # Test abbreviated forms
    assert normalize_security_classification("U") == "UNCLASSIFIED"
    assert normalize_security_classification("C") == "CONFIDENTIAL"
    assert normalize_security_classification("S") == "SECRET"
    assert normalize_security_classification("TS") == "TOP SECRET"
    
    # Test with special formats
    assert normalize_security_classification("U//FOUO") == "UNCLASSIFIED//FOUO"
    assert normalize_security_classification("S//NF") == "SECRET//NOFORN"
    assert normalize_security_classification("ts/sci") == "TOP SECRET//SCI"
    
    # Test non-standard inputs
    assert normalize_security_classification("") == DEFAULT_SECURITY_CLASSIFICATION
    assert normalize_security_classification(None) == DEFAULT_SECURITY_CLASSIFICATION
    assert normalize_security_classification("unknown") == DEFAULT_SECURITY_CLASSIFICATION


def test_validate_metadata():
    """Test metadata validation function."""
    # Valid metadata
    valid_metadata = {
        "security_classification": "unclassified",
        "filename": "test.txt",
        "author": "test_user"
    }
    validated = validate_metadata(valid_metadata)
    assert validated["security_classification"] == "UNCLASSIFIED"
    assert validated["filename"] == "test.txt"
    
    # Missing security classification should get default
    missing_classification = {
        "filename": "test.txt",
        "author": "test_user"
    }
    validated = validate_metadata(missing_classification)
    assert validated["security_classification"] == DEFAULT_SECURITY_CLASSIFICATION
    
    # Empty metadata should get default classification
    validated = validate_metadata({})
    assert validated["security_classification"] == DEFAULT_SECURITY_CLASSIFICATION
    
    # None metadata should return default dict with classification
    validated = validate_metadata(None)
    assert validated["security_classification"] == DEFAULT_SECURITY_CLASSIFICATION
    
    # Invalid security classification should be normalized
    invalid_classification = {
        "security_classification": "not_a_real_classification",
        "filename": "test.txt"
    }
    validated = validate_metadata(invalid_classification)
    assert validated["security_classification"] == DEFAULT_SECURITY_CLASSIFICATION


def test_extract_metadata_from_file(tmp_path):
    """Test extraction of metadata from file."""
    # Create a text file with some content
    text_file = tmp_path / "test.txt"
    text_file.write_text("This is a test file.\nIt has multiple lines.\nSecurity: SECRET")
    
    # Extract metadata from text file
    metadata = extract_metadata_from_file(str(text_file))
    
    # Basic metadata should be extracted
    assert "filename" in metadata
    assert metadata["filename"] == "test.txt"
    assert "file_size" in metadata
    assert metadata["file_size"] > 0
    assert "created_at" in metadata
    assert "modified_at" in metadata
    
    # Advanced metadata extraction (this would depend on your implementation)
    # If your implementation extracts security classifications from content:
    if "security_classification" in metadata:
        assert metadata["security_classification"] in [
            DEFAULT_SECURITY_CLASSIFICATION, "SECRET"
        ] 