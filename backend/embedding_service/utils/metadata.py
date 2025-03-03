"""
Utility functions for managing vector store metadata.
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


def normalize_security_classification(classification: str) -> str:
    """
    Normalize security classification strings to standard formats.
    
    This function takes various formats of security classification strings and
    normalizes them to one of these standard values:
    - "UNCLASSIFIED"
    - "CONFIDENTIAL"
    - "SECRET"
    - "TOP SECRET"
    
    Args:
        classification: The security classification string to normalize
        
    Returns:
        Normalized security classification string
    """
    if classification is None:
        logger.warning("Null security classification provided, defaulting to UNCLASSIFIED")
        return "UNCLASSIFIED"
    
    # Convert to uppercase and remove extra whitespace
    normalized = str(classification).upper().strip()
    logger.info(f"Normalizing security classification: '{classification}' -> '{normalized}'")
    
    # Handle special cases
    if not normalized or normalized == "NONE":
        return "UNCLASSIFIED"
    
    # Handle common abbreviations and variations
    if normalized in ["U", "UNCLAS", "UNCLASS"]:
        return "UNCLASSIFIED"
    
    if normalized in ["C", "CONF"]:
        return "CONFIDENTIAL"
    
    if normalized in ["S", "SEC"]:
        return "SECRET"
    
    if re.search(r"TOP\s*SECRET|TS", normalized):
        return "TOP SECRET"
    
    # Already in standard format
    if normalized in ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET"]:
        return normalized
    
    # Default case - if we don't recognize it, log a warning and default to UNCLASSIFIED
    logger.warning(f"Unrecognized security classification format: '{classification}', defaulting to UNCLASSIFIED")
    return "UNCLASSIFIED"


def create_vectorstore_metadata(
    name: str,
    description: str,
    embedding_model: str,
    files: List[Dict[str, Any]],
    chunk_size: int,
    chunk_overlap: int
) -> Dict[str, Any]:
    """
    Create metadata for a vector store.
    
    Args:
        name: Name of the vector store
        description: Description of the vector store
        embedding_model: Name of the embedding model used
        files: List of file information dictionaries
        chunk_size: Size of chunks used for text splitting
        chunk_overlap: Overlap between chunks
        
    Returns:
        Dict containing metadata
    """
    logger.info(f"DEBUGGING: Creating vectorstore metadata with name: {name}")
    logger.info(f"DEBUGGING: Files info count: {len(files)}")
    
    now = datetime.datetime.now()
    
    metadata = {
        "name": name,
        "description": description,
        "embedding_model": embedding_model,
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "file_count": len(files),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "files": files
    }
    
    # Log a sample file entry if available
    if files:
        logger.info(f"DEBUGGING: Sample file info in metadata: {json.dumps(files[0], indent=2)}")
    
    return metadata


def save_metadata(directory: Path, metadata: Dict[str, Any]) -> Path:
    """
    Save metadata to a JSON file in the specified directory.
    
    Args:
        directory: Directory to save the metadata file
        metadata: Metadata dictionary
        
    Returns:
        Path to the saved metadata file
    """
    metadata_path = directory / "metadata.json"
    logger.info(f"DEBUGGING: Saving metadata to {metadata_path}")
    
    try:
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"DEBUGGING: Successfully saved metadata")
    except Exception as e:
        logger.error(f"DEBUGGING: Error saving metadata: {str(e)}")
    
    return metadata_path


def load_metadata(directory: Path) -> Optional[Dict[str, Any]]:
    """
    Load metadata from a JSON file in the specified directory.
    
    Args:
        directory: Directory containing the metadata file
        
    Returns:
        Metadata dictionary or None if not found
    """
    metadata_path = directory / "metadata.json"
    logger.info(f"DEBUGGING: Attempting to load metadata from {metadata_path}")
    
    if not metadata_path.exists():
        logger.warning(f"DEBUGGING: Metadata file not found at {metadata_path}")
        return None
    
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        logger.info(f"DEBUGGING: Successfully loaded metadata")
        
        # Log basic metadata info
        logger.info(f"DEBUGGING: Metadata name: {metadata.get('name', 'unknown')}")
        logger.info(f"DEBUGGING: File count: {metadata.get('file_count', 0)}")
        
        return metadata
    except Exception as e:
        logger.error(f"DEBUGGING: Error loading metadata: {str(e)}")
        return None


def update_metadata(directory: Path, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update an existing metadata file with new information.
    
    Args:
        directory: Directory containing the metadata file
        updates: Dictionary of updates to apply
        
    Returns:
        Updated metadata dictionary or None if not found
    """
    logger.info(f"DEBUGGING: Updating metadata with updates: {json.dumps(updates, indent=2)}")
    
    metadata = load_metadata(directory)
    
    if metadata is None:
        logger.warning(f"DEBUGGING: Cannot update metadata - not found")
        return None
    
    # Update metadata
    metadata.update(updates)
    
    # Always update modified_at timestamp
    metadata["modified_at"] = datetime.datetime.now().isoformat()
    
    # Save updated metadata
    save_metadata(directory, metadata)
    
    return metadata


def get_file_security_info(file_paths: List[str], upload_dir: Path) -> Dict[str, Dict[str, Any]]:
    """
    Get security classification and other metadata for files by reading associated .metadata files.
    
    Args:
        file_paths: List of file paths
        upload_dir: Base directory for uploads
        
    Returns:
        Dictionary mapping file paths to their metadata including security classifications
    """
    logger.info(f"DEBUGGING: get_file_security_info called with {len(file_paths)} paths")
    logger.info(f"DEBUGGING: Upload directory: {upload_dir}")
    
    security_info = {}
    
    for file_path in file_paths:
        # Log each file path being processed
        logger.info(f"DEBUGGING: Processing metadata for file: {file_path}")
        
        # Default values with guaranteed document_id
        info = {
            "security_classification": "UNCLASSIFIED",
            "content_security_classification": "UNCLASSIFIED",
            "original_filename": os.path.basename(file_path),
            "document_id": f"doc_{uuid.uuid4()}"  # Ensure each document has an ID
        }
        
        # Try different approaches to find the metadata file
        
        # 1. First check for a metadata file with the exact same path
        orig_file_path = os.path.join(upload_dir, file_path)
        exact_metadata_path = Path(f"{os.path.splitext(orig_file_path)[0]}.metadata")
        logger.info(f"DEBUGGING: Checking for exact metadata file at: {exact_metadata_path}")
        
        # 2. Look for a metadata file with the same base name
        base_name = os.path.basename(file_path)
        base_metadata_path = upload_dir / f"{base_name}.metadata"
        logger.info(f"DEBUGGING: Checking for metadata file at: {base_metadata_path}")
        
        # 3. Check for metadata file with same name but with .metadata extension
        direct_metadata_path = Path(str(file_path) + ".metadata")
        if not direct_metadata_path.is_absolute():
            direct_metadata_path = upload_dir / direct_metadata_path
        
        # Try each metadata path in order of specificity
        metadata_path = None
        if exact_metadata_path.exists():
            metadata_path = exact_metadata_path
            logger.info(f"DEBUGGING: Found exact metadata file at: {metadata_path}")
        elif base_metadata_path.exists():
            metadata_path = base_metadata_path
            logger.info(f"DEBUGGING: Found base metadata file at: {metadata_path}")
        elif direct_metadata_path.exists():
            metadata_path = direct_metadata_path
            logger.info(f"DEBUGGING: Found direct metadata file at: {metadata_path}")
        else:
            # 4. If not found, try looking for metadata files with similar names
            logger.info(f"DEBUGGING: Metadata not found, checking for alternative matches")
            
            file_ext = os.path.splitext(base_name)[1]
            filename_without_ext = os.path.splitext(base_name)[0]
            
            # Try to find metadata files that might match
            potential_patterns = [
                f"{filename_without_ext}*{file_ext}.metadata",  # For files with UUID in middle
                f"*{filename_without_ext}*{file_ext}.metadata",  # For any position
                f"*{file_ext}.metadata"  # Last resort - any file with same extension
            ]
            
            for pattern in potential_patterns:
                metadata_files = list(upload_dir.glob(pattern))
                if metadata_files:
                    logger.info(f"DEBUGGING: Found {len(metadata_files)} potential metadata files with pattern {pattern}")
                    # Use the first match
                    metadata_path = metadata_files[0]
                    logger.info(f"DEBUGGING: Using potential metadata file: {metadata_path}")
                    break
        
        # Read metadata if found
        if metadata_path and metadata_path.exists():
            try:
                with open(metadata_path, 'r') as f:
                    file_metadata = json.load(f)
                    
                logger.info(f"DEBUGGING: Loaded metadata content: {json.dumps(file_metadata, indent=2)}")
                    
                # Extract relevant fields
                if "security_classification" in file_metadata:
                    raw_classification = file_metadata["security_classification"]
                    # Normalize the security classification
                    normalized_classification = normalize_security_classification(raw_classification)
                    info["security_classification"] = normalized_classification
                    info["content_security_classification"] = normalized_classification
                    logger.info(f"DEBUGGING: Found security classification: {raw_classification}, normalized to: {normalized_classification}")
                
                # Preserve original filename
                if "original_file" in file_metadata:
                    info["original_filename"] = file_metadata["original_file"]
                    logger.info(f"DEBUGGING: Found original filename: {file_metadata['original_file']}")
                elif "filename" in file_metadata:
                    info["original_filename"] = file_metadata["filename"]
                    logger.info(f"DEBUGGING: Found original filename (from filename field): {file_metadata['filename']}")
                    
                # Include document_id if available
                if "document_id" in file_metadata:
                    info["document_id"] = file_metadata["document_id"]
                    logger.info(f"DEBUGGING: Found document ID: {file_metadata['document_id']}")
                
                # Include other useful metadata
                if "file_info" in file_metadata and isinstance(file_metadata["file_info"], dict):
                    if "name" in file_metadata["file_info"]:
                        info["display_name"] = file_metadata["file_info"]["name"]
                        # If we have a display name but no original filename, use the display name
                        if "original_filename" not in info or not info["original_filename"]:
                            info["original_filename"] = file_metadata["file_info"]["name"]
                        logger.info(f"DEBUGGING: Found display name: {file_metadata['file_info']['name']}")
            except Exception as e:
                logger.error(f"DEBUGGING: Error reading metadata file {metadata_path}: {str(e)}")
                logger.error(f"DEBUGGING: Exception details:", exc_info=True)
        else:
            logger.warning(f"DEBUGGING: No metadata file found for {file_path}, using default values")
        
        security_info[file_path] = info
        logger.info(f"DEBUGGING: Final metadata for {file_path}: {json.dumps(info, indent=2)}")
    
    logger.info(f"DEBUGGING: Total files processed for security info: {len(security_info)}")
    return security_info 