"""
Core functionality for managing document and vector store metadata.

This module provides functionality for:
- Normalizing security classifications
- Creating and validating metadata
- Loading and saving metadata
- Managing security information for files
"""

import os
import json
import logging
import datetime
import uuid
import re
from typing import Dict, List, Any, Optional
from pathlib import Path

# Set up logging
logger = logging.getLogger("embedding_service")

# Constants
DEFAULT_SECURITY_CLASSIFICATION = "UNCLASSIFIED"
VALID_SECURITY_CLASSIFICATIONS = ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET"]


def normalize_security_classification(classification: str) -> str:
    """
    Normalize security classification strings to standard formats.
    
    This function takes various formats of security classification strings and
    normalizes them to one of these standard values:
    - "UNCLASSIFIED"
    - "CONFIDENTIAL"
    - "SECRET"
    - "TOP SECRET"
    
    Additional caveats like //FOUO, //NOFORN are preserved.
    
    Args:
        classification: The security classification string to normalize
        
    Returns:
        Normalized security classification string
    """
    if classification is None:
        logger.warning("Null security classification provided, defaulting to UNCLASSIFIED")
        return DEFAULT_SECURITY_CLASSIFICATION
    
    # Convert to uppercase and remove extra whitespace
    normalized = str(classification).upper().strip()
    
    # Handle special cases
    if not normalized or normalized == "NONE":
        return DEFAULT_SECURITY_CLASSIFICATION
    
    # Known caveat expansions
    caveat_expansions = {
        "NF": "NOFORN",
        "FOUO": "FOUO",
        "SCI": "SCI",
        "ORCON": "ORCON",
        "NOACORN": "NOACORN",
        "NOFOR": "NOFORN",
        "NOFORN": "NOFORN",
        "EYES": "EYES ONLY",
        "REL": "REL TO"
    }
    
    # Handle caveat formats first (e.g., "U//FOUO", "S//NF")
    if "//" in normalized:
        parts = normalized.split("//", 1)
        base_class = parts[0].strip()
        caveat = parts[1].strip()
        
        # Expand abbreviated caveats
        for abbr, expansion in caveat_expansions.items():
            if caveat == abbr:
                caveat = expansion
                break
        
        # Expand abbreviated base classifications
        if base_class == "U":
            return f"UNCLASSIFIED//{caveat}"
        elif base_class == "C":
            return f"CONFIDENTIAL//{caveat}"
        elif base_class == "S":
            return f"SECRET//{caveat}"
        elif base_class == "TS" or base_class == "T/S":
            return f"TOP SECRET//{caveat}"
        elif base_class == "UNCLASSIFIED":
            return f"UNCLASSIFIED//{caveat}"
        elif base_class == "CONFIDENTIAL":
            return f"CONFIDENTIAL//{caveat}"
        elif base_class == "SECRET":
            return f"SECRET//{caveat}"
        elif base_class == "TOP SECRET":
            return f"TOP SECRET//{caveat}"
    
    # Handle abbreviated forms (without caveats)
    if normalized in ["U", "UNCLAS", "UNCLASS"]:
        return "UNCLASSIFIED"
    
    if normalized in ["C", "CONF"]:
        return "CONFIDENTIAL"
    
    if normalized in ["S"]:
        return "SECRET"
    
    if normalized in ["TS", "T/S"]:
        return "TOP SECRET"
    
    # Handle special SCI notation
    if normalized == "TS/SCI":
        return "TOP SECRET//SCI"
    
    # Handle mixed case and full words
    if normalized.startswith("UNCLASSIFIED") or normalized.startswith("UNCLAS"):
        return "UNCLASSIFIED"
    
    if normalized.startswith("CONFIDENTIAL"):
        return "CONFIDENTIAL"
    
    if normalized.startswith("SECRET") and not normalized.startswith("SECRET//"):
        return "SECRET"
    
    if normalized.startswith("TOP SECRET") or normalized.startswith("TOPSECRET"):
        return "TOP SECRET"
    
    # Check for mixed case variations
    lower_norm = normalized.lower()
    if lower_norm.startswith("unclassified") or lower_norm.startswith("unclas"):
        return "UNCLASSIFIED"
    
    if lower_norm.startswith("confidential"):
        return "CONFIDENTIAL"
    
    if lower_norm.startswith("secret") and not lower_norm.startswith("secret//"):
        return "SECRET"
    
    if lower_norm.startswith("top secret") or lower_norm.startswith("topsecret"):
        return "TOP SECRET"
    
    # If we got here, it's not a recognized classification
    logger.warning(f"Unrecognized security classification: {normalized}, defaulting to {DEFAULT_SECURITY_CLASSIFICATION}")
    return DEFAULT_SECURITY_CLASSIFICATION


def validate_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate metadata dictionary, adding default values as needed.
    
    Args:
        metadata: The metadata dictionary to validate, or None
        
    Returns:
        Validated metadata dictionary with defaults filled in
    """
    # Handle None or empty metadata
    if metadata is None:
        metadata = {}
    
    if not isinstance(metadata, dict):
        logger.error(f"Invalid metadata type: {type(metadata)}, should be a dictionary")
        metadata = {}
        
    # Ensure security classification is present and normalized
    if "security_classification" not in metadata:
        metadata["security_classification"] = DEFAULT_SECURITY_CLASSIFICATION
    else:
        metadata["security_classification"] = normalize_security_classification(
            metadata["security_classification"]
        )
    
    # Check for required fields in strict mode
    if getattr(validate_metadata, "strict_mode", False):
        required_fields = ["filename", "file_size", "mime_type"]
        
        for field in required_fields:
            if field not in metadata:
                logger.error(f"Required metadata field missing: {field}")
                return False
        
        # Validate types in strict mode
        if not isinstance(metadata.get("file_size"), (int, float)):
            logger.error(f"Invalid file_size in metadata: {metadata.get('file_size')}")
            return False
    
    return metadata


# Allow toggling strict mode for validation
def set_strict_validation(strict: bool):
    """Set strict validation mode for metadata validation."""
    validate_metadata.strict_mode = strict


# Default to non-strict for backward compatibility
set_strict_validation(False)


def create_file_metadata(
    file_path: str,
    original_filename: str,
    security_classification: str,
    additional_metadata: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Create metadata for a file.
    
    Args:
        file_path: Path to the file
        original_filename: Original filename (user provided)
        security_classification: Security classification string
        additional_metadata: Additional metadata to include
        
    Returns:
        Metadata dictionary
    """
    # Get file size and mime type
    file_size = os.path.getsize(file_path)
    import mimetypes
    mime_type, _ = mimetypes.guess_type(file_path)
    
    # Create base metadata
    metadata = {
        "filename": original_filename,
        "file_size": file_size,
        "mime_type": mime_type or "application/octet-stream",
        "security_classification": normalize_security_classification(security_classification),
        "upload_time": datetime.datetime.now().isoformat()
    }
    
    # Add additional metadata if provided
    if additional_metadata:
        metadata.update(additional_metadata)
    
    return metadata


def create_vectorstore_metadata(
    vs_id: str,
    name: str,
    description: str,
    embedding_model: str,
    file_infos: List[Dict[str, Any]],
    use_paragraph_chunking: bool = True,
    max_paragraph_length: int = 1500,
    min_paragraph_length: int = 50,
    chunk_size: int = 1000,
    chunk_overlap: int = 100
) -> Dict[str, Any]:
    """
    Create metadata for a vector store.
    
    Args:
        vs_id: Vector store ID
        name: Vector store name
        description: Vector store description
        embedding_model: Embedding model name
        file_infos: List of file information dictionaries
        use_paragraph_chunking: Whether to use paragraph chunking
        max_paragraph_length: Maximum paragraph length
        min_paragraph_length: Minimum paragraph length
        chunk_size: Chunk size for fixed chunking
        chunk_overlap: Chunk overlap for fixed chunking
        
    Returns:
        Vector store metadata dictionary
    """
    return {
        "id": vs_id,
        "name": name,
        "description": description,
        "embedding_model": embedding_model,
        "created_at": datetime.datetime.now().isoformat(),
        "updated_at": None,
        "files": file_infos,
        "chunking_method": "paragraph" if use_paragraph_chunking else "fixed",
        "max_paragraph_length": max_paragraph_length if use_paragraph_chunking else None,
        "min_paragraph_length": min_paragraph_length if use_paragraph_chunking else None,
        "chunk_size": chunk_size if not use_paragraph_chunking else None,
        "chunk_overlap": chunk_overlap if not use_paragraph_chunking else None
    }


def save_metadata(metadata: Dict[str, Any], file_path: str) -> None:
    """
    Save metadata to a JSON file.
    
    Args:
        metadata: Metadata dictionary
        file_path: Path to save the metadata file
    """
    with open(file_path, 'w') as f:
        json.dump(metadata, f, indent=2)


def load_metadata(file_path: str) -> Optional[Dict[str, Any]]:
    """
    Load metadata from a JSON file.
    
    Args:
        file_path: Path to the metadata file
        
    Returns:
        Metadata dictionary or None if the file doesn't exist
    """
    if not os.path.exists(file_path):
        return None
    
    with open(file_path, 'r') as f:
        return json.load(f)


def update_metadata(metadata: Dict[str, Any], file_path: str) -> None:
    """
    Update existing metadata and save it.
    
    Args:
        metadata: Metadata dictionary with updates
        file_path: Path to the metadata file
    """
    metadata["updated_at"] = datetime.datetime.now().isoformat()
    save_metadata(metadata, file_path)


def get_file_security_info(file_path: str) -> Dict[str, Any]:
    """
    Get security classification and metadata for a file by reading its metadata file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Dictionary with security classification and metadata
    """
    # Default classification if metadata file is not found or cannot be determined
    # Return None instead of defaulting to UNCLASSIFIED
    default_info = {
        "filename": os.path.basename(file_path),
        "security_classification": None, 
        "content_security_classification": None,
        "document_id": f"generated_{uuid.uuid4()}"  # Generate a fallback ID if none exists
    }
    
    try:
        # Construct the path to the metadata file
        metadata_file_path = f"{file_path}.metadata"
        
        # Check if metadata file exists
        if os.path.exists(metadata_file_path):
            # Read metadata file
            with open(metadata_file_path, 'r') as f:
                file_metadata = json.load(f)
            
            # Extract security classification from metadata
            security_classification = file_metadata.get("security_classification", "UNCLASSIFIED")
            security_classification = normalize_security_classification(security_classification)
            
            # For content_security_classification, use the same as security_classification if not present
            content_security_classification = file_metadata.get(
                "content_security_classification", 
                security_classification
            )
            
            # Extract document ID or generate one if not present (for backward compatibility)
            document_id = file_metadata.get("document_id", f"generated_{uuid.uuid4()}")
            
            # Extract filename or use the base filename if not present
            filename = file_metadata.get("filename", os.path.basename(file_path))
            
            security_info = {
                "filename": filename,
                "security_classification": security_classification,
                "content_security_classification": content_security_classification,
                "document_id": document_id
            }
            
            # Add any additional metadata 
            for key, value in file_metadata.items():
                if key not in security_info:
                    security_info[key] = value
            
            logger.info(f"Read metadata for {file_path}: {security_info}")
            return security_info
        else:
            logger.warning(f"No metadata file found for {file_path}, attempting content extraction.")
            # Try to extract classification from file content
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    # Read a larger chunk to increase chances of finding markings
                    content = f.read(5000)  
                
                # Look for classification patterns in content (more robust regex)
                # Looks for standard classifications, potentially with caveats
                classification_pattern = r'\b(UNCLASSIFIED|CONFIDENTIAL|SECRET|TOP SECRET)(//[A-Z0-9/\s,-]+)?\b'
                match = re.search(classification_pattern, content.upper())
                
                if match:
                    # Use normalize function for consistency
                    classification = normalize_security_classification(match.group(0))
                    logger.info(f"Extracted classification '{classification}' from content of {file_path}.")
                    # Update default_info if classification found in content
                    default_info["security_classification"] = classification
                    default_info["content_security_classification"] = classification
                else:
                    logger.warning(f"No classification pattern found in content for {file_path}. Classification remains unknown.")
                    
            except Exception as content_err:
                logger.warning(f"Could not read file content for classification extraction: {str(content_err)}")
            
            # Return default_info which now contains None if classification wasn't found
            return default_info
    except Exception as e:
        logger.error(f"Error reading metadata for {file_path}: {str(e)}")
        return default_info # Return info with None for classification on error


def extract_metadata_from_file(file_path: str) -> Dict[str, Any]:
    """
    Extract metadata from a file, including potential embedded metadata.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Dictionary of extracted metadata
    """
    file_stats = os.stat(file_path)
    metadata = {
        "filename": os.path.basename(file_path),
        "file_size": file_stats.st_size,
        "created_at": datetime.datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
        "modified_at": datetime.datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
        "last_modified": datetime.datetime.fromtimestamp(file_stats.st_mtime).isoformat()
    }
    
    # Get MIME type
    import mimetypes
    mime_type, _ = mimetypes.guess_type(file_path)
    metadata["mime_type"] = mime_type or "application/octet-stream"
    
    # Try to extract additional metadata from content
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(5000)  # Read first 5000 chars to check for metadata
        
        # Extract possible security classification
        classification_pattern = r'(UNCLASSIFIED|CONFIDENTIAL|SECRET|TOP SECRET)(?://[A-Z/]+)?'
        match = re.search(classification_pattern, content.upper())
        if match:
            metadata["security_classification"] = match.group(0)
        
        # Extract author information (look for common patterns)
        author_pattern = r'Author:\s*([^\n]+)'
        match = re.search(author_pattern, content)
        if match:
            metadata["author"] = match.group(1).strip()
        
        # Extract title information
        title_pattern = r'Title:\s*([^\n]+)'
        match = re.search(title_pattern, content)
        if match:
            metadata["title"] = match.group(1).strip()
            
        # Look for security information
        security_pattern = r'Security:\s*([^\n]+)'
        match = re.search(security_pattern, content)
        if match:
            security_value = match.group(1).strip()
            metadata["security_classification"] = normalize_security_classification(security_value)
            
    except Exception as e:
        logger.warning(f"Could not extract metadata from file content: {str(e)}")
    
    # Ensure security classification is present
    if "security_classification" not in metadata:
        metadata["security_classification"] = DEFAULT_SECURITY_CLASSIFICATION
        
    return metadata 