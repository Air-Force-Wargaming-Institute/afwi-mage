"""
API router for embedding service.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import datetime

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

# Set up logging
logger = logging.getLogger("embedding_service")

# Define the upload directory
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", str(DATA_DIR / "uploads"))

# Define request and response models
class EmbeddingModelInfo(BaseModel):
    id: str
    name: str
    description: str
    provider: str
    
    model_config = {
        "extra": "ignore"
    }


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
    
    model_config = {
        "extra": "ignore"
    }


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
    
    model_config = {
        "extra": "ignore"
    }


class CreateVectorStoreRequest(BaseModel):
    name: str
    description: str = ""
    files: List[str]
    embedding_model: str = "nomic-embed-text:latest"
    chunk_size: int = 1000
    chunk_overlap: int = 100
    
    model_config = {
        "extra": "ignore"
    }


class CreateVectorStoreResponse(BaseModel):
    success: bool
    message: str
    vectorstore_id: Optional[str] = None
    skipped_files: Optional[List[str]] = None
    
    model_config = {
        "extra": "ignore"
    }


class UpdateVectorStoreRequest(BaseModel):
    vectorstore_id: str
    files: List[str]
    
    model_config = {
        "extra": "ignore"
    }


class UpdateVectorStoreResponse(BaseModel):
    success: bool
    message: str
    skipped_files: Optional[List[str]] = None
    
    model_config = {
        "extra": "ignore"
    }


# Create the router
# router = APIRouter(prefix="/api/embedding", tags=["embedding"])
router = APIRouter(tags=["embedding"])



# Get vector store manager instance
def get_vectorstore_manager():
    return VectorStoreManager(Path(VECTORSTORE_DIR))


# Define the routes
@router.get("/api/embedding/models", response_model=List[EmbeddingModelInfo])
async def get_models():
    """Get a list of available embedding models."""
    return get_available_embedding_models()


@router.get("/api/embedding/vectorstores", response_model=List[VectorStoreInfo])
async def list_vectorstores(manager: VectorStoreManager = Depends(get_vectorstore_manager)):
    """Get a list of all vector stores."""
    return manager.list_vectorstores()


@router.get("/api/embedding/vectorstores/{vectorstore_id}", response_model=VectorStoreDetailInfo)
async def get_vectorstore(vectorstore_id: str, manager: VectorStoreManager = Depends(get_vectorstore_manager)):
    """Get details of a specific vector store."""
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    return vs_info


@router.post("/api/embedding/vectorstores", response_model=CreateVectorStoreResponse)
async def create_vectorstore(
    request: CreateVectorStoreRequest,
    background_tasks: BackgroundTasks,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Create a new vector store with the specified files."""
    # Log the incoming request
    logger.info(f"DEBUGGING: Create vectorstore request - Name: {request.name}")
    logger.info(f"DEBUGGING: Files requested: {request.files}")
    
    # Validate the request
    if not request.name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    if not request.files:
        raise HTTPException(status_code=400, detail="At least one file is required")
    
    try:
        # Get the embedding model
        embedding_model = get_embedding_model(request.embedding_model)
        logger.info(f"DEBUGGING: Using embedding model: {request.embedding_model}")
        
        # Set up directories
        upload_dir = Path(UPLOAD_DIR)
        staging_dir = Path(DOC_STAGING_DIR)
        logger.info(f"DEBUGGING: Upload dir: {upload_dir}, Staging dir: {staging_dir}")
        
        # Copy files to staging directory
        logger.info(f"DEBUGGING: Copying files to staging: {request.files}")
        file_mapping = document_loader.copy_files_to_staging(
            request.files,
            upload_dir,
            staging_dir
        )
        
        if not file_mapping:
            logger.error("DEBUGGING: No valid files found after staging")
            raise HTTPException(status_code=400, detail="No valid files found")
        
        logger.info(f"DEBUGGING: File mapping after staging (keys): {list(file_mapping.keys())}")
        
        # Get security classifications and other metadata
        logger.info(f"DEBUGGING: Getting security info for files: {list(file_mapping.keys())}")
        security_info = metadata.get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
        
        # Log security info keys and values
        logger.info(f"DEBUGGING: Security info keys: {list(security_info.keys())}")
        for key, value in security_info.items():
            classification = value.get("security_classification", "UNCLASSIFIED")
            original_name = value.get("original_filename", "unknown")
            logger.info(f"DEBUGGING: Security info for {key}: classification={classification}, original_name={original_name}")
        
        # Load and process documents with metadata
        logger.info(f"DEBUGGING: Loading documents from: {list(file_mapping.values())}")
        documents, skipped_files = document_loader.load_documents(
            list(file_mapping.values()),
            request.chunk_size,
            request.chunk_overlap,
            file_metadata=security_info
        )
        
        if not documents:
            logger.error("DEBUGGING: No valid documents could be processed")
            raise HTTPException(status_code=400, detail="No valid documents could be processed")
        
        logger.info(f"DEBUGGING: Loaded {len(documents)} documents, skipped {len(skipped_files)} files")
        
        # Log sample document metadata
        if documents:
            logger.info(f"DEBUGGING: Sample document metadata: {json.dumps(documents[0].metadata, indent=2)}")
        
        # Prepare file info list with complete metadata
        logger.info(f"DEBUGGING: Preparing file infos for vectorstore")
        file_infos = []
        for orig_path, staged_path in file_mapping.items():
            # Get metadata for this file
            file_metadata = security_info.get(orig_path, {})
            logger.info(f"DEBUGGING: File info for {orig_path}: {json.dumps(file_metadata, indent=2)}")
            
            file_info = {
                "filename": file_metadata.get("original_filename", os.path.basename(orig_path)),
                "original_path": orig_path,
                "staged_path": staged_path,
                "security_classification": file_metadata.get("security_classification", "UNCLASSIFIED"),
                "content_security_classification": file_metadata.get("content_security_classification", "UNCLASSIFIED"),
                "added_at": datetime.datetime.now().isoformat()
            }
            
            # Add document_id if available
            if "document_id" in file_metadata:
                file_info["document_id"] = file_metadata["document_id"]
                
            file_infos.append(file_info)
            logger.info(f"DEBUGGING: Added file info: {json.dumps(file_info, indent=2)}")
        
        # Create the vector store
        logger.info(f"DEBUGGING: Creating vectorstore with {len(documents)} documents and {len(file_infos)} file infos")
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
        
        logger.info(f"DEBUGGING: Vectorstore created with ID: {vectorstore_id}")
        
        return {
            "success": True,
            "message": f"Vector store '{request.name}' created successfully",
            "vectorstore_id": vectorstore_id,
            "skipped_files": skipped_files
        }
        
    except Exception as e:
        logger.error(f"DEBUGGING: Error creating vectorstore: {str(e)}")
        logger.error(f"DEBUGGING: Exception details:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/embedding/vectorstores/{vectorstore_id}/update", response_model=UpdateVectorStoreResponse)
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
        
        # Get security classifications and other metadata
        security_info = metadata.get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
        
        # Load and process documents with metadata
        documents, skipped_files = document_loader.load_documents(
            list(file_mapping.values()),
            vs_info["chunk_size"],
            vs_info["chunk_overlap"],
            file_metadata=security_info
        )
        
        if not documents:
            raise HTTPException(status_code=400, detail="No valid documents could be processed")
        
        # Prepare file info list with complete metadata
        file_infos = []
        for orig_path, staged_path in file_mapping.items():
            # Get metadata for this file
            file_metadata = security_info.get(orig_path, {})
            
            file_info = {
                "filename": file_metadata.get("original_filename", os.path.basename(orig_path)),
                "original_path": orig_path,
                "staged_path": staged_path,
                "security_classification": file_metadata.get("security_classification", "UNCLASSIFIED"),
                "content_security_classification": file_metadata.get("content_security_classification", "UNCLASSIFIED"),
                "added_at": datetime.datetime.now().isoformat()
            }
            
            # Add document_id if available
            if "document_id" in file_metadata:
                file_info["document_id"] = file_metadata["document_id"]
                
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


@router.delete("/api/embedding/vectorstores/{vectorstore_id}")
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


@router.get("/api/embedding/files")
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