"""
API endpoints for managing files in the embedding service.

This module provides API endpoints for:
- Listing available files
- Getting file details
- Other file operations
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field

# Import from configuration with better error handling
UPLOAD_DIR = None
try:
    # Try relative import first
    from ..config import UPLOAD_DIR
except ImportError as e:
    print(f"Relative config import failed: {e}")
    try:
        # Try direct import next
        from config import UPLOAD_DIR
    except ImportError as e:
        print(f"Direct config import failed: {e}")
        # Fall back to environment variable
        UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/data/uploads")
        print(f"Using environment UPLOAD_DIR: {UPLOAD_DIR}")

# Set up router
# router = APIRouter(prefix="/files", tags=["files"])
router = APIRouter(tags=["files"])


class FileInfo(BaseModel):
    """Information about a file."""
    path: str
    name: str
    size: int
    last_modified: float
    type: str
    security_classification: Optional[str] = "UNCLASSIFIED"
    
    model_config = {
        "extra": "ignore"
    }


class FileListResponse(BaseModel):
    """Response containing a list of files."""
    files: List[FileInfo]
    
    model_config = {
        "extra": "ignore"
    }


class FileUploadResponse(BaseModel):
    """Response from a file upload operation."""
    success: bool
    message: str
    file_info: Optional[FileInfo] = None
    
    model_config = {
        "extra": "ignore"
    }


class FileDetailResponse(BaseModel):
    """Detailed information about a file."""
    file_info: FileInfo
    metadata: Dict[str, Any]
    
    model_config = {
        "extra": "ignore"
    }


class FileDeleteResponse(BaseModel):
    """Response from a file deletion operation."""
    success: bool
    message: str
    
    model_config = {
        "extra": "ignore"
    }


@router.get("/api/embedding/files", response_model=FileListResponse)
async def get_files():
    """Get a list of files available for embedding."""
    upload_dir = Path(UPLOAD_DIR)
    
    if not upload_dir.exists():
        return FileListResponse(files=[])
    
    files = []
    
    for root, _, filenames in os.walk(upload_dir):
        for filename in filenames:
            # Skip hidden files and metadata files
            if filename.startswith('.') or filename.endswith('.metadata'):
                continue
                
            file_path = os.path.join(root, filename)
            rel_path = os.path.relpath(file_path, upload_dir)
            
            # Get file stats
            stats = os.stat(file_path)
            
            # Look for associated metadata file to get security classification
            metadata_path = Path(os.path.splitext(file_path)[0] + '.metadata')
            security_classification = "UNCLASSIFIED"
            
            if metadata_path.exists():
                try:
                    import json
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                    
                    # Use our normalization function for security classification
                    normalize_security_classification = None
                    # Try three different import paths
                    try:
                        from ..utils.metadata import normalize_security_classification
                    except ImportError:
                        try:
                            from utils.metadata import normalize_security_classification
                        except ImportError:
                            from api.utils.metadata import normalize_security_classification
                    
                    if 'security_classification' in metadata:
                        security_classification = normalize_security_classification(
                            metadata['security_classification'])
                except Exception:
                    # If we can't read the metadata, default to UNCLASSIFIED
                    pass
            
            # Create file info
            file_info = FileInfo(
                path=rel_path,
                name=filename,
                size=stats.st_size,
                last_modified=stats.st_mtime,
                type=os.path.splitext(filename)[1].lower()[1:] if '.' in filename else "",
                security_classification=security_classification
            )
            
            files.append(file_info)
    
    return FileListResponse(files=files)


@router.get("/api/embedding/files/{file_path:path}", response_model=FileDetailResponse)
async def get_file_detail(file_path: str):
    """Get detailed information about a file."""
    upload_dir = Path(UPLOAD_DIR)
    full_path = upload_dir / file_path
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get file stats
    stats = os.stat(full_path)
    
    # Look for associated metadata file
    metadata_path = Path(str(full_path) + '.metadata')
    if not metadata_path.exists():
        metadata_path = Path(os.path.splitext(str(full_path))[0] + '.metadata')
    
    metadata = {}
    if metadata_path.exists():
        try:
            import json
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                
            # Use our normalization function for security classification
            normalize_security_classification = None
            # Try three different import paths
            try:
                from ..utils.metadata import normalize_security_classification
            except ImportError:
                try:
                    from utils.metadata import normalize_security_classification
                except ImportError:
                    from api.utils.metadata import normalize_security_classification
            
            if 'security_classification' in metadata:
                metadata['security_classification'] = normalize_security_classification(
                    metadata['security_classification'])
        except Exception:
            # If we can't read the metadata, use an empty dict
            pass
    
    file_info = FileInfo(
        path=file_path,
        name=os.path.basename(file_path),
        size=stats.st_size,
        last_modified=stats.st_mtime,
        type=os.path.splitext(file_path)[1].lower()[1:] if '.' in file_path else "",
        security_classification=metadata.get('security_classification', "UNCLASSIFIED")
    )
    
    return FileDetailResponse(file_info=file_info, metadata=metadata)


@router.delete("/api/embedding/files/{file_path:path}", response_model=FileDeleteResponse)
async def delete_file(file_path: str):
    """Delete a file and its associated metadata."""
    upload_dir = Path(UPLOAD_DIR)
    full_path = upload_dir / file_path
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Find associated metadata file
    metadata_path = Path(str(full_path) + '.metadata')
    if not metadata_path.exists():
        metadata_path = Path(os.path.splitext(str(full_path))[0] + '.metadata')
    
    # Delete the file
    try:
        os.unlink(full_path)
        
        # Delete metadata file if it exists
        if metadata_path.exists():
            os.unlink(metadata_path)
            
        return FileDeleteResponse(
            success=True,
            message=f"File {file_path} and its metadata were successfully deleted"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")
