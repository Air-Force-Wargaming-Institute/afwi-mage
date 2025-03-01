"""
API router for embedding service.
"""

import os
import json
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from models import (
    get_embedding_model,
    get_available_embedding_models,
    VectorStoreManager
)

from utils import (
    document_loader,
    metadata
)

from config import VECTORSTORE_DIR, DATA_DIR, DOC_STAGING_DIR

# Define the upload directory
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", str(DATA_DIR / "uploads"))

# Define request and response models
class EmbeddingModelInfo(BaseModel):
    id: str
    name: str
    description: str
    provider: str


class VectorStoreInfo(BaseModel):
    id: str
    name: str
    description: str = ""
    embedding_model: str
    created_at: str
    updated_at: Optional[str] = None
    file_count: int
    chunk_size: int = 1000
    chunk_overlap: int = 100


class VectorStoreDetailInfo(BaseModel):
    id: str
    name: str
    description: str = ""
    embedding_model: str
    created_at: str
    updated_at: Optional[str] = None
    files: List[Dict[str, Any]]
    chunk_size: int = 1000
    chunk_overlap: int = 100


class CreateVectorStoreRequest(BaseModel):
    name: str
    description: str = ""
    files: List[str]
    embedding_model: str = "nomic-embed-text"
    chunk_size: int = 1000
    chunk_overlap: int = 100


class CreateVectorStoreResponse(BaseModel):
    success: bool
    message: str
    vectorstore_id: Optional[str] = None
    skipped_files: Optional[List[str]] = None


class UpdateVectorStoreRequest(BaseModel):
    vectorstore_id: str
    files: List[str]


class UpdateVectorStoreResponse(BaseModel):
    success: bool
    message: str
    skipped_files: Optional[List[str]] = None


# Create the router
router = APIRouter(prefix="/api/embedding", tags=["embedding"])


# Get vector store manager instance
def get_vectorstore_manager():
    return VectorStoreManager(Path(VECTORSTORE_DIR))


# Define the routes
@router.get("/models", response_model=List[EmbeddingModelInfo])
async def get_models():
    """Get a list of available embedding models."""
    return get_available_embedding_models()


@router.get("/vectorstores", response_model=List[VectorStoreInfo])
async def list_vectorstores(manager: VectorStoreManager = Depends(get_vectorstore_manager)):
    """Get a list of all vector stores."""
    return manager.list_vectorstores()


@router.get("/vectorstores/{vectorstore_id}", response_model=VectorStoreDetailInfo)
async def get_vectorstore(vectorstore_id: str, manager: VectorStoreManager = Depends(get_vectorstore_manager)):
    """Get details of a specific vector store."""
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    return vs_info


@router.post("/vectorstores", response_model=CreateVectorStoreResponse)
async def create_vectorstore(
    request: CreateVectorStoreRequest,
    background_tasks: BackgroundTasks,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Create a new vector store with the specified files."""
    # Validate the request
    if not request.name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    if not request.files:
        raise HTTPException(status_code=400, detail="At least one file is required")
    
    try:
        # Get the embedding model
        embedding_model = get_embedding_model(request.embedding_model)
        
        # Set up directories
        upload_dir = Path(UPLOAD_DIR)
        staging_dir = Path(DOC_STAGING_DIR)
        
        # Copy files to staging directory
        file_mapping = document_loader.copy_files_to_staging(
            request.files,
            upload_dir,
            staging_dir
        )
        
        if not file_mapping:
            raise HTTPException(status_code=400, detail="No valid files found")
        
        # Load and process documents
        documents, skipped_files = document_loader.load_documents(
            list(file_mapping.values()),
            request.chunk_size,
            request.chunk_overlap
        )
        
        if not documents:
            raise HTTPException(status_code=400, detail="No valid documents could be processed")
        
        # Get security classifications
        security_info = metadata.get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
        
        # Prepare file info list
        file_infos = []
        for orig_path, staged_path in file_mapping.items():
            file_info = {
                "filename": os.path.basename(orig_path),
                "original_path": orig_path,
                "staged_path": staged_path,
                "security_classification": security_info.get(orig_path, {}).get("security_classification", "UNCLASSIFIED"),
                "content_security_classification": security_info.get(orig_path, {}).get("content_security_classification", "UNCLASSIFIED")
            }
            file_infos.append(file_info)
        
        # Create the vector store
        vectorstore_id = manager.create_vectorstore(
            name=request.name,
            description=request.description,
            documents=documents,
            embedding_model=embedding_model,
            model_name=request.embedding_model,
            file_infos=file_infos,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap
        )
        
        return {
            "success": True,
            "message": f"Vector store '{request.name}' created successfully",
            "vectorstore_id": vectorstore_id,
            "skipped_files": skipped_files
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vectorstores/{vectorstore_id}/update", response_model=UpdateVectorStoreResponse)
async def update_vectorstore(
    vectorstore_id: str,
    request: UpdateVectorStoreRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Update an existing vector store with new files."""
    # Check if the vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    # Validate the request
    if not request.files:
        raise HTTPException(status_code=400, detail="At least one file is required")
    
    try:
        # Get the embedding model
        embedding_model = get_embedding_model(vs_info["embedding_model"])
        
        # Set up directories
        upload_dir = Path(UPLOAD_DIR)
        staging_dir = Path(DOC_STAGING_DIR)
        
        # Copy files to staging directory
        file_mapping = document_loader.copy_files_to_staging(
            request.files,
            upload_dir,
            staging_dir
        )
        
        if not file_mapping:
            raise HTTPException(status_code=400, detail="No valid files found")
        
        # Load and process documents
        documents, skipped_files = document_loader.load_documents(
            list(file_mapping.values()),
            vs_info["chunk_size"],
            vs_info["chunk_overlap"]
        )
        
        if not documents:
            raise HTTPException(status_code=400, detail="No valid documents could be processed")
        
        # Get security classifications
        security_info = metadata.get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
        
        # Prepare file info list
        file_infos = []
        for orig_path, staged_path in file_mapping.items():
            file_info = {
                "filename": os.path.basename(orig_path),
                "original_path": orig_path,
                "staged_path": staged_path,
                "security_classification": security_info.get(orig_path, {}).get("security_classification", "UNCLASSIFIED"),
                "content_security_classification": security_info.get(orig_path, {}).get("content_security_classification", "UNCLASSIFIED")
            }
            file_infos.append(file_info)
        
        # Update the vector store
        success = manager.update_vectorstore(
            vectorstore_id=vectorstore_id,
            documents=documents,
            embedding_model=embedding_model,
            new_file_infos=file_infos
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update vector store")
        
        return {
            "success": True,
            "message": f"Vector store {vectorstore_id} updated successfully",
            "skipped_files": skipped_files
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/vectorstores/{vectorstore_id}")
async def delete_vectorstore(
    vectorstore_id: str,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Delete a vector store."""
    # Check if the vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    # Delete the vector store
    success = manager.delete_vectorstore(vectorstore_id)
    
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to delete vector store {vectorstore_id}")
    
    return {
        "success": True,
        "message": f"Vector store {vectorstore_id} deleted successfully"
    }


@router.get("/files")
async def get_files():
    """Get a list of files available for embedding."""
    upload_dir = Path(UPLOAD_DIR)
    
    if not upload_dir.exists():
        return {"files": []}
    
    files = []
    
    for root, _, filenames in os.walk(upload_dir):
        for filename in filenames:
            # Skip hidden files
            if filename.startswith('.'):
                continue
                
            file_path = os.path.join(root, filename)
            rel_path = os.path.relpath(file_path, upload_dir)
            
            # Get file stats
            stats = os.stat(file_path)
            
            # Create file info
            file_info = {
                "path": rel_path,
                "name": filename,
                "size": stats.st_size,
                "last_modified": stats.st_mtime,
                "type": os.path.splitext(filename)[1].lower()[1:] if '.' in filename else ""
            }
            
            files.append(file_info)
    
    return {"files": files} 