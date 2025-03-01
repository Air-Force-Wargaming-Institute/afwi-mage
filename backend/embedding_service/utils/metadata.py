"""
Utility functions for managing vector store metadata.
"""

import os
import json
import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path


def create_vectorstore_metadata(
    name: str,
    description: str,
    embedding_model: str,
    files: List[str],
    chunk_size: int,
    chunk_overlap: int,
    file_security_info: Optional[Dict[str, Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Create metadata for a vector store.
    
    Args:
        name: Name of the vector store
        description: Description of the vector store
        embedding_model: Name of the embedding model used
        files: List of files used to create the vector store
        chunk_size: Size of chunks used for text splitting
        chunk_overlap: Overlap between chunks
        file_security_info: Security information for each file (optional)
        
    Returns:
        Dict containing metadata
    """
    now = datetime.datetime.now()
    
    metadata = {
        "name": name,
        "description": description,
        "embedding_model": embedding_model,
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "file_count": len(files),
        "created_at": now.isoformat(),
        "modified_at": now.isoformat(),
        "files": []
    }
    
    # Add detailed file information
    for file_path in files:
        file_name = os.path.basename(file_path)
        file_info = {
            "original_path": file_path,
            "filename": file_name,
            "added_at": now.isoformat(),
        }
        
        # Add security classification if available
        if file_security_info and file_path in file_security_info:
            file_info.update(file_security_info[file_path])
        
        metadata["files"].append(file_info)
    
    return metadata


def save_metadata(metadata: Dict[str, Any], directory: Path) -> Path:
    """
    Save metadata to a JSON file in the specified directory.
    
    Args:
        metadata: Metadata dictionary
        directory: Directory to save the metadata file
        
    Returns:
        Path to the saved metadata file
    """
    metadata_path = directory / "metadata.json"
    
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    
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
    
    if not metadata_path.exists():
        return None
    
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
    
    return metadata


def update_metadata(directory: Path, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update an existing metadata file with new information.
    
    Args:
        directory: Directory containing the metadata file
        updates: Dictionary of updates to apply
        
    Returns:
        Updated metadata dictionary or None if not found
    """
    metadata = load_metadata(directory)
    
    if metadata is None:
        return None
    
    # Update metadata
    metadata.update(updates)
    
    # Always update modified_at timestamp
    metadata["modified_at"] = datetime.datetime.now().isoformat()
    
    # Save updated metadata
    save_metadata(metadata, directory)
    
    return metadata


def get_file_security_info(file_paths: List[str], upload_dir: Path) -> Dict[str, Dict[str, Any]]:
    """
    Get security classification information for files.
    
    Args:
        file_paths: List of file paths
        upload_dir: Base directory for uploads
        
    Returns:
        Dictionary mapping file paths to security info
    """
    security_info = {}
    
    for file_path in file_paths:
        # For each file, try to find security classification information
        # This is a placeholder - we would need to implement the actual logic
        # to get security classifications based on your system
        
        # Example placeholder:
        security_info[file_path] = {
            "security_classification": "UNCLASSIFIED",  # Default
            "content_security_classification": "UNCLASSIFIED"  # Default
        }
        
        # In a real implementation, you would look up the actual security information
        # from your document management system or metadata
    
    return security_info 