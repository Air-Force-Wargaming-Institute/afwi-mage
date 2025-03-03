"""
Tests for core metadata processing functionality.

This module contains tests focused on the core metadata processing functions to ensure
they correctly handle security classifications and original filenames, which were
key issues in the embedding service refactoring.
"""

import os
import json
import tempfile
import pytest
from pathlib import Path

from ..core.metadata import (
    normalize_security_classification,
    validate_metadata,
    create_file_metadata,
    get_file_security_info,
    extract_metadata_from_file,
    set_strict_validation
)


@pytest.fixture
def sample_metadata():
    """Return sample metadata for testing."""
    return {
        "filename": "important_document.docx",
        "file_size": 12345,
        "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "security_classification": "SECRET",
        "author": "Test User",
        "upload_time": "2023-06-01T12:00:00Z"
    }


@pytest.fixture
def metadata_file():
    """Create a temporary metadata file for testing."""
    fd, path = tempfile.mkstemp(suffix=".metadata")
    os.close(fd)  # Close file descriptor immediately
    
    metadata = {
        "filename": "original_filename.txt",
        "file_size": 1024,
        "mime_type": "text/plain",
        "security_classification": "CONFIDENTIAL",
        "upload_time": "2023-06-01T12:00:00Z"
    }
    
    with open(path, "w") as f:
        json.dump(metadata, f)
    
    yield path
    
    # Clean up
    try:
        os.unlink(path)
    except (PermissionError, OSError) as e:
        # On Windows, sometimes the file is still in use
        print(f"Warning: Could not delete temporary file {path}: {e}")


@pytest.fixture
def test_file_with_metadata():
    """Create a test file and its metadata file."""
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a test file
        file_path = os.path.join(temp_dir, "test_file.txt")
        with open(file_path, "w") as f:
            f.write("This is test content with UNCLASSIFIED//FOUO information.")
        
        # Create a metadata file
        metadata_path = f"{file_path}.metadata"
        metadata = {
            "filename": "original_name.txt",
            "file_size": len("This is test content with UNCLASSIFIED//FOUO information."),
            "mime_type": "text/plain",
            "security_classification": "UNCLASSIFIED//FOUO",
            "upload_time": "2023-06-01T12:00:00Z"
        }
        
        with open(metadata_path, "w") as f:
            json.dump(metadata, f)
        
        yield file_path


def test_normalize_security_classification():
    """Test security classification normalization."""
    # Test standard classifications
    assert normalize_security_classification("UNCLASSIFIED") == "UNCLASSIFIED"
    assert normalize_security_classification("CONFIDENTIAL") == "CONFIDENTIAL"
    assert normalize_security_classification("SECRET") == "SECRET"
    assert normalize_security_classification("TOP SECRET") == "TOP SECRET"
    
    # Test mixed case
    assert normalize_security_classification("Unclassified") == "UNCLASSIFIED"
    assert normalize_security_classification("Secret") == "SECRET"
    
    # Test with additional markings
    assert normalize_security_classification("UNCLASSIFIED//FOUO") == "UNCLASSIFIED//FOUO"
    assert normalize_security_classification("SECRET//NOFORN") == "SECRET//NOFORN"
    
    # Test with extra spaces
    assert normalize_security_classification("  CONFIDENTIAL  ") == "CONFIDENTIAL"
    
    # Test with lowercase additional markings
    assert normalize_security_classification("SECRET//noforn") == "SECRET//NOFORN"
    
    # Test with non-standard inputs
    assert normalize_security_classification("") == "UNCLASSIFIED"
    assert normalize_security_classification(None) == "UNCLASSIFIED"
    assert normalize_security_classification("CLASSIFIED") == "UNCLASSIFIED"  # Invalid classification


def test_validate_metadata():
    """Test metadata validation."""
    # Test valid metadata
    valid_metadata = {
        "filename": "test.txt",
        "file_size": 1024,
        "mime_type": "text/plain",
        "security_classification": "CONFIDENTIAL"
    }
    result = validate_metadata(valid_metadata)
    assert isinstance(result, dict)
    assert result["security_classification"] == "CONFIDENTIAL"
    assert result["filename"] == "test.txt"
    
    # Test with invalid security classification
    invalid_sec_metadata = {
        "filename": "test.txt",
        "file_size": 1024,
        "mime_type": "text/plain",
        "security_classification": "INVALID"
    }
    # Should normalize the security classification
    result = validate_metadata(invalid_sec_metadata)
    assert result["security_classification"] == "UNCLASSIFIED"
    
    # Enable strict mode for testing required fields
    set_strict_validation(True)
    try:
        # Test missing required fields
        invalid_metadata = {
            "filename": "test.txt",
            "file_size": 1024
            # Missing mime_type field
        }
        result = validate_metadata(invalid_metadata)
        assert result is False
        
        # Test with invalid types
        invalid_type_metadata = {
            "filename": "test.txt",
            "file_size": "not a number",  # Should be an integer
            "mime_type": "text/plain",
            "security_classification": "CONFIDENTIAL"
        }
        result = validate_metadata(invalid_type_metadata)
        assert result is False
    finally:
        # Reset to non-strict mode
        set_strict_validation(False)


def test_create_file_metadata():
    """Test creation of file metadata."""
    # Create a temporary file
    fd, path = tempfile.mkstemp(suffix=".txt")
    os.write(fd, b"This is test content for creating metadata.")
    os.close(fd)
    
    try:
        # Test with basic parameters
        metadata = create_file_metadata(
            path,
            "original_name.txt",
            "CONFIDENTIAL"
        )
        
        # Verify the metadata
        assert metadata["filename"] == "original_name.txt"
        assert metadata["security_classification"] == "CONFIDENTIAL"
        assert "file_size" in metadata
        assert metadata["file_size"] > 0
        assert "mime_type" in metadata
        assert metadata["mime_type"] == "text/plain"
        assert "upload_time" in metadata
        
        # Test with additional metadata
        metadata = create_file_metadata(
            path,
            "original_name.txt",
            "SECRET",
            additional_metadata={
                "author": "Test User",
                "department": "R&D"
            }
        )
        
        # Verify the metadata
        assert metadata["filename"] == "original_name.txt"
        assert metadata["security_classification"] == "SECRET"
        assert metadata["author"] == "Test User"
        assert metadata["department"] == "R&D"
    finally:
        # Clean up
        os.unlink(path)


def test_get_file_security_info(test_file_with_metadata):
    """Test retrieving security info from a file with metadata."""
    # Get security info
    security_info = get_file_security_info(test_file_with_metadata)
    
    # Verify the security info
    assert security_info["filename"] == "original_name.txt"
    assert security_info["security_classification"] == "UNCLASSIFIED//FOUO"


def test_get_file_security_info_no_metadata():
    """Test retrieving security info from a file without metadata."""
    # Create a temporary file without metadata
    fd, path = tempfile.mkstemp(suffix=".txt")
    os.write(fd, b"This is test content without metadata.")
    os.close(fd)
    
    try:
        # Get security info - should use fallbacks
        security_info = get_file_security_info(path)
        
        # Verify the security info
        assert "filename" in security_info
        assert security_info["filename"] == os.path.basename(path)
        assert "security_classification" in security_info
        assert security_info["security_classification"] == "UNCLASSIFIED"
    finally:
        # Clean up
        os.unlink(path)


def test_get_file_security_info_embedded_classification():
    """Test retrieving security info from a file with embedded classification markers."""
    # Create a temporary file with embedded classification
    fd, path = tempfile.mkstemp(suffix=".txt")
    os.write(fd, b"TOP SECRET//NOFORN\n\nThis document contains sensitive information.")
    os.close(fd)
    
    try:
        # Get security info - should detect the embedded classification
        security_info = get_file_security_info(path)
        
        # Verify the security info
        assert "security_classification" in security_info
        assert security_info["security_classification"] == "TOP SECRET//NOFORN"
    finally:
        # Clean up
        os.unlink(path)


def test_metadata_file_loading(metadata_file):
    """Test loading metadata from a metadata file."""
    # Get the file path without the .metadata extension
    file_path = metadata_file[:-9]  # Remove .metadata
    
    # Touch the file so it exists
    Path(file_path).touch()
    
    try:
        # Get security info - should load from the metadata file
        security_info = get_file_security_info(file_path)
        
        # Verify the security info
        assert "filename" in security_info
        assert security_info["filename"] == "original_filename.txt"
        assert "security_classification" in security_info
        assert security_info["security_classification"] == "CONFIDENTIAL"
    finally:
        # Clean up
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except (PermissionError, OSError) as e:
            # On Windows, sometimes the file is still in use
            print(f"Warning: Could not delete temporary file {file_path}: {e}") 