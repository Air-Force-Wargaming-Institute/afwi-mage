"""
API endpoints for managing vector stores in the embedding service.

This module provides API endpoints for:
- Creating vector stores from documents
- Querying vector stores
- Updating vector stores
- Managing vector store metadata
"""

import os
import logging
import json
import uuid
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, Request
from pydantic import BaseModel, Field
import numpy as np
from datetime import datetime

# Import job management functions
try:
    from ..core.job import register_job, update_job_progress, fail_job, complete_job
except ImportError:
    from core.job import register_job, update_job_progress, fail_job, complete_job

# Import configuration
try:
    from ..config import VECTORSTORE_DIR, DOC_STAGING_DIR, UPLOAD_DIR
except ImportError:
    try:
        from config import VECTORSTORE_DIR, DOC_STAGING_DIR, UPLOAD_DIR
    except ImportError:
        import os
        VECTORSTORE_DIR = os.environ.get("VECTORSTORE_DIR", "/app/data/vectorstores")
        DOC_STAGING_DIR = os.environ.get("DOC_STAGING_DIR", "/app/doc_staging")
        UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/data/uploads")
        print(f"Using environment variables for paths: VECTORSTORE_DIR={VECTORSTORE_DIR}, DOC_STAGING_DIR={DOC_STAGING_DIR}, UPLOAD_DIR={UPLOAD_DIR}")

# Import document utilities
try:
    from ..core.document import copy_files_to_staging, load_documents
except ImportError:
    try:
        from core.document import copy_files_to_staging, load_documents
    except ImportError:
        print("Unable to import document utilities - vector store operations will fail")

# Import embedding utilities
try:
    from ..core.embedding import get_embedding_model
except ImportError:
    try:
        from core.embedding import get_embedding_model
    except ImportError:
        print("Unable to import embedding utilities - vector store operations will fail")

# Switch to absolute import for Docker compatibility
# This will work both in development and in Docker
try:
    # First try relative import (for development)
    from ..core.vectorstore import VectorStoreManager
except ImportError:
    # Fall back to absolute import (for Docker)
    from core.vectorstore import VectorStoreManager

from core.job import JobStatus

# Set up logging
logger = logging.getLogger("embedding_service")

# Create router
router = APIRouter(prefix="/vectorstores", tags=["Vector Stores"])

# Define model classes for API
class VectorStoreInfo(BaseModel):
    """Basic vector store information."""
    id: str
    name: str
    description: str = ""
    embedding_model: str
    created_at: str
    updated_at: Optional[str] = None
    file_count: int
    chunk_size: Optional[int] = 1000
    chunk_overlap: Optional[int] = 100
    
    model_config = {
        "extra": "ignore"
    }


class VectorStoreDetailInfo(BaseModel):
    """Detailed vector store information."""
    id: str
    name: str
    description: str = ""
    embedding_model: str
    created_at: str
    updated_at: Optional[str] = None
    files: List[Dict[str, Any]]
    chunk_size: Optional[int] = 1000
    chunk_overlap: Optional[int] = 100
    chunking_method: Optional[str] = "fixed"
    max_paragraph_length: Optional[int] = 1500
    min_paragraph_length: Optional[int] = 50
    
    model_config = {
        "extra": "ignore"
    }


class CreateVectorStoreRequest(BaseModel):
    """Request to create a new vector store."""
    name: str
    description: str = ""
    files: List[str]
    embedding_model: str = "nomic-embed-text"
    use_paragraph_chunking: bool = True
    max_paragraph_length: int = 1500
    min_paragraph_length: int = 50
    chunk_size: Optional[int] = 1000
    chunk_overlap: Optional[int] = 100
    batch_processing: bool = True
    file_batch_size: int = 5
    doc_batch_size: int = 1000
    
    model_config = {
        "extra": "ignore"
    }


class CreateVectorStoreResponse(BaseModel):
    """Response from creating a vector store."""
    success: bool
    message: str
    vectorstore_id: Optional[str] = None
    job_id: Optional[str] = None
    skipped_files: Optional[List[str]] = None
    
    model_config = {
        "extra": "ignore"
    }


class UpdateVectorStoreRequest(BaseModel):
    """Request to update a vector store."""
    files: List[str]
    name: Optional[str] = None
    description: Optional[str] = None
    batch_processing: bool = True
    file_batch_size: int = 5
    doc_batch_size: int = 1000
    
    model_config = {
        "extra": "ignore"
    }


class UpdateVectorStoreResponse(BaseModel):
    """Response from updating a vector store."""
    success: bool
    message: str
    job_id: Optional[str] = None
    skipped_files: Optional[List[str]] = None
    
    model_config = {
        "extra": "ignore"
    }


class RemoveDocumentsRequest(BaseModel):
    """Request to remove documents from a vector store."""
    document_ids: List[str]
    
    model_config = {
        "extra": "ignore"
    }


class RemoveDocumentsResponse(BaseModel):
    """Response from removing documents from a vector store."""
    success: bool
    message: str
    job_id: Optional[str] = None
    removed_count: int = 0
    
    model_config = {
        "extra": "ignore"
    }


class BatchUpdateRequest(BaseModel):
    """Request to perform a batch update on a vector store."""
    add: Optional[List[str]] = None  # Document paths to add
    remove: Optional[List[str]] = None  # Document IDs to remove
    name: Optional[str] = None  # Optional new name
    description: Optional[str] = None  # Optional new description
    batch_processing: bool = True
    file_batch_size: int = 5
    doc_batch_size: int = 1000
    
    model_config = {
        "extra": "ignore"
    }


class BatchUpdateResponse(BaseModel):
    """Response from a batch update operation."""
    success: bool
    message: str
    job_id: Optional[str] = None
    skipped_files: Optional[List[str]] = None
    removed_count: int = 0
    
    model_config = {
        "extra": "ignore"
    }


class QueryRequest(BaseModel):
    """Request to query a vector store."""
    query: str
    top_k: int = 5
    score_threshold: float = 0.5
    
    model_config = {
        "extra": "ignore"
    }


class QueryResponse(BaseModel):
    """Response from a vector store query."""
    results: List[Dict[str, Any]]
    
    model_config = {
        "extra": "ignore"
    }


class VectorStoreAnalysisRequest(BaseModel):
    """Request to analyze a vector store's content."""
    sample_size: int = 1000
    summary_length: str = "long"  # "short", "medium", "long"
    sampling_strategy: str = "random"  # "random", "grouped_by_source", "temporal", "clustering"
    
    model_config = {
        "extra": "ignore"
    }


class VectorStoreAnalysisResponse(BaseModel):
    """Response containing analysis of a vector store."""
    raw_response: str  # The complete raw response from the LLM
    content_analysis: Optional[str] = None  # Optional parsed content analysis
    example_queries: Optional[List[str]] = None  # Optional parsed example queries
    document_count: int
    chunk_count: int
    sample_size: int
    sampling_strategy: str
    
    model_config = {
        "extra": "ignore"
    }


class VectorStoreLLMQueryRequest(BaseModel):
    """Request to query a vector store and get LLM-generated responses."""
    query: str
    top_k: int = 5
    score_threshold: float = 0.5
    use_llm: bool = True
    include_sources: bool = True
    
    model_config = {
        "extra": "ignore"
    }


class VectorStoreLLMQueryResponse(BaseModel):
    """Response from an LLM-enhanced vector store query."""
    answer: str
    sources: Optional[List[Dict[str, Any]]] = None
    raw_chunks: Optional[List[Dict[str, Any]]] = None
    
    model_config = {
        "extra": "ignore"
    }


class UpdateVectorStoreMetadataRequest(BaseModel):
    """Request to update vector store metadata."""
    name: Optional[str] = None
    description: Optional[str] = None
    
    model_config = {
        "extra": "ignore"
    }


class UpdateVectorStoreMetadataResponse(BaseModel):
    """Response from updating vector store metadata."""
    success: bool
    message: str
    vectorstore_id: str
    
    model_config = {
        "extra": "ignore"
    }


def get_vectorstore_manager():
    """
    Get a vector store manager instance.
    
    Returns:
        VectorStoreManager: Vector store manager instance
    """
    # Initialize with default value
    VECTORSTORE_DIR = None
    
    # Try different import approaches
    try:
        # First try relative import
        from ..config import VECTORSTORE_DIR
        logger.info("Successfully imported VECTORSTORE_DIR with relative import")
    except ImportError as e:
        logger.error(f"Relative config import failed in vectorstore.py: {str(e)}")
        try:
            # Try direct import
            from config import VECTORSTORE_DIR
            logger.info("Successfully imported VECTORSTORE_DIR with direct import")
        except ImportError:
            # Fallback to environment variable or default
            import os
            VECTORSTORE_DIR = os.environ.get("VECTORSTORE_DIR", "/app/data/vectorstores")
            logger.info(f"Using fallback VECTORSTORE_DIR: {VECTORSTORE_DIR}")
    
    # Try to import VectorStoreManager
    try:
        # First try relative import
        from ..core.vectorstore import VectorStoreManager
        logger.info("Successfully imported VectorStoreManager with relative import")
    except ImportError as e:
        logger.error(f"Relative import of VectorStoreManager failed: {str(e)}")
        try:
            # Try direct import
            from core.vectorstore import VectorStoreManager
            logger.info("Successfully imported VectorStoreManager with direct import")
        except ImportError as e:
            # Try another import path
            try:
                import sys
                logger.info(f"Current sys.path: {sys.path}")
                from vectorstore import VectorStoreManager
                logger.info("Successfully imported VectorStoreManager from vectorstore")
            except ImportError as e:
                logger.error(f"All VectorStoreManager import attempts failed: {str(e)}")
                raise ImportError("Could not import VectorStoreManager")
    
    return VectorStoreManager(VECTORSTORE_DIR)


@router.get("", response_model=List[VectorStoreInfo])
async def list_vectorstores(manager: VectorStoreManager = Depends(get_vectorstore_manager)):
    """
    Get a list of all vector stores.
    
    Returns:
        List of vector store info objects
    """
    return manager.list_vectorstores()


@router.get("/{vectorstore_id}", response_model=VectorStoreDetailInfo)
async def get_vectorstore(vectorstore_id: str, manager: VectorStoreManager = Depends(get_vectorstore_manager)):
    """
    Get details of a specific vector store.
    
    Args:
        vectorstore_id: ID of the vector store to get
        
    Returns:
        Detailed vector store info
    """
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    # Apply security classification normalization to all files
    if "files" in vs_info:
        for file_info in vs_info["files"]:
            if "security_classification" in file_info:
                file_info["security_classification"] = normalize_security_classification(
                    file_info["security_classification"])
    
    return vs_info


@router.post("", response_model=CreateVectorStoreResponse)
async def create_vectorstore(
    request: CreateVectorStoreRequest,
    background_tasks: BackgroundTasks,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Create a new vector store with the specified files.
    
    Args:
        request: Vector store creation request
        background_tasks: FastAPI background tasks
        manager: Vector store manager instance
        
    Returns:
        Vector store creation response
    """
    # Validate the request
    if not request.name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    if not request.files:
        raise HTTPException(status_code=400, detail="At least one file is required")
    
    try:
        # Register a new job for this operation
        job_id = register_job(
            operation_type="create_vectorstore",
            total_items=len(request.files),
            details={
                "name": request.name,
                "description": request.description,
                "file_count": len(request.files),
                "embedding_model": request.embedding_model,
            }
        )
        
        logger.info(f"Starting job {job_id} to create vector store '{request.name}' with {len(request.files)} files")
        
        # Update job status to processing
        update_job_progress(job_id, 0, "processing")
        
        # Start the background task
        background_tasks.add_task(
            process_vectorstore_creation,
            job_id=job_id,
            request=request,
            manager=manager
        )
        
        return {
            "success": True,
            "message": f"Vector store creation started. Use job ID to track progress.",
            "job_id": job_id,
            "skipped_files": []
        }
        
    except Exception as e:
        logger.error(f"Error starting vector store creation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{vectorstore_id}/update", response_model=UpdateVectorStoreResponse)
async def update_vectorstore(
    vectorstore_id: str,
    request: UpdateVectorStoreRequest,
    background_tasks: BackgroundTasks,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Update an existing vector store with new files.
    
    Args:
        vectorstore_id: ID of the vector store to update
        request: Vector store update request
        background_tasks: FastAPI background tasks
        manager: Vector store manager instance
        
    Returns:
        Vector store update response
    """
    # Check if the vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    try:
        # Register a new job for this operation
        job_id = register_job(
            operation_type="update_vectorstore",
            total_items=len(request.files),
            details={
                "vectorstore_id": vectorstore_id,
                "name": vs_info["name"],
                "description": vs_info["description"],
                "new_name": request.name,
                "new_description": request.description,
                "file_count": len(request.files)
            }
        )
        
        logger.info(f"Starting job {job_id} to update vector store '{vs_info['name']}' with {len(request.files)} files")
        
        # Update job status to processing
        update_job_progress(job_id, 0, "processing")
        
        # Start the background task
        background_tasks.add_task(
            process_vectorstore_update,
            job_id=job_id,
            vectorstore_id=vectorstore_id,
            request=request,
            manager=manager,
            vs_info=vs_info
        )
        
        return {
            "success": True,
            "message": f"Vector store update started. Use job ID to track progress.",
            "job_id": job_id,
            "skipped_files": []
        }
        
    except Exception as e:
        logger.error(f"Error starting vector store update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{vectorstore_id}")
async def delete_vectorstore(
    vectorstore_id: str,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Delete a vector store.
    
    Args:
        vectorstore_id: ID of the vector store to delete
        manager: Vector store manager instance
        
    Returns:
        Success message
    """
    # Check if the vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    # Delete the vector store
    success = manager.delete_vectorstore(vectorstore_id)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to delete vector store {vectorstore_id}")
    
    return {"success": True, "message": f"Vector store {vectorstore_id} deleted"}


@router.post("/{vectorstore_id}/query", response_model=QueryResponse)
async def query_vectorstore(
    vectorstore_id: str,
    query_request: QueryRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Query a vector store with a text query.
    
    Args:
        vectorstore_id: ID of the vector store to query
        query_request: Query parameters
        manager: Vector store manager dependency
        
    Returns:
        Query results with text and metadata
    """
    try:
        # Get vector store info
        vs_info = manager.get_vectorstore_info(vectorstore_id)
        if not vs_info:
            raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
        
        logger.info(f"DEBUGGING: Querying vector store '{vectorstore_id}' with query: '{query_request.query}', top_k={query_request.top_k}")
        
        # Query the vector store using the enhanced method
        results = manager.query_vector_store(
            vectorstore_id,
            query_request.query,
            top_k=query_request.top_k,
            score_threshold=query_request.score_threshold
        )
        
        # Debug log the results to verify metadata enrichment
        logger.info(f"DEBUGGING: Found {len(results)} results for query")
        
        # Log metadata for debugging
        for i, result in enumerate(results[:min(5, len(results))]):
            if "metadata" in result:
                logger.info(f"DEBUGGING: Result {i} raw metadata: {json.dumps(result['metadata'])}")
                
                # Log key metadata fields
                logger.info(f"DEBUGGING: Result {i} key metadata fields:")
                logger.info(f"  document_id: {result['metadata'].get('document_id', 'unknown')}")
                logger.info(f"  filename: {result['metadata'].get('filename', 'unknown')}")
                logger.info(f"  original_filename: {result['metadata'].get('original_filename', 'unknown')}")
                logger.info(f"  security_classification: {result['metadata'].get('security_classification', 'UNCLASSIFIED')}")
                
                # Final filename selection logic for display
                filename = result['metadata'].get('filename')
                if not filename:
                    filename = result['metadata'].get('original_filename', 'unknown')
                logger.info(f"DEBUGGING: Using filename: {filename}")
                
                # Final security classification for display
                sec_class = result['metadata'].get('security_classification', 'UNCLASSIFIED')
                logger.info(f"DEBUGGING: Final security classification: {sec_class}")
                
                # For the first result, format the entire metadata structure as we'll send to frontend
                if i == 0:
                    formatted_metadata = {
                        "document_id": result['metadata'].get('document_id', 'unknown'),
                        "source": result['metadata'].get('source', 'unknown'),
                        "file_path": result['metadata'].get('file_path', 'unknown'),
                        "filename": filename,
                        "original_filename": result['metadata'].get('original_filename', filename),
                        "display_name": filename,  # Use filename for display
                        "security_classification": sec_class,
                        "content_security_classification": result['metadata'].get('content_security_classification', sec_class),
                        "document_type": result['metadata'].get('document_type', 'unknown'),
                        "page_info": {
                            "page": result['metadata'].get('page', 'N/A'),
                            "total_pages": result['metadata'].get('total_pages', 'N/A'),
                            "is_first_page": result['metadata'].get('is_first_page', False),
                            "is_last_page": result['metadata'].get('is_last_page', False),
                            "page_percentage": result['metadata'].get('page_percentage', 0),
                            "page_word_count": result['metadata'].get('page_word_count', 0),
                            "page_has_images": result['metadata'].get('page_has_images', False),
                            "page_has_tables": result['metadata'].get('page_has_tables', False)
                        },
                        "chunk_info": {
                            "index": result['metadata'].get('chunk_index', 0),
                            "total_chunks": result['metadata'].get('total_chunks', 1),
                            "char_count": len(result['text']),
                            "word_count": len(result['text'].split()),
                            "position": {
                                "chunk_number": result['metadata'].get('chunk_number', 1),
                                "of_total": result['metadata'].get('of_total', 1),
                                "percentage": result['metadata'].get('percentage', 100)
                            }
                        },
                        "document_context": {
                            "title": result['metadata'].get('title', ''),
                            "author": result['metadata'].get('author', ''),
                            "creation_date": result['metadata'].get('creation_date', ''),
                            "last_modified": result['metadata'].get('last_modified', ''),
                            "content_status": result['metadata'].get('content_status', ''),
                            "category": result['metadata'].get('category', ''),
                            "content_analysis": {
                                "has_images": result['metadata'].get('has_images', False),
                                "has_tables": result['metadata'].get('has_tables', False),
                                "total_words": result['metadata'].get('total_words', 0),
                                "estimated_reading_time": result['metadata'].get('estimated_reading_time', 0),
                                "language": result['metadata'].get('language', 'en')
                            }
                        },
                        "embedding_info": {
                            "timestamp": result['metadata'].get('timestamp', ''),
                            "version": result['metadata'].get('version', '1.0'),
                            "model": result['metadata'].get('model', 'nomic-embed-text')
                        }
                    }
                    logger.info(f"DEBUGGING: First result formatted metadata: {json.dumps(formatted_metadata)}")
        
        logger.info(f"DEBUGGING: Returning {len(results)} formatted results")
        
        return QueryResponse(results=results)
    
    except Exception as e:
        logger.error(f"Error querying vector store: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error querying vector store: {str(e)}")


@router.delete("/{vectorstore_id}/documents", response_model=RemoveDocumentsResponse)
async def remove_documents_from_vectorstore(
    vectorstore_id: str,
    request: RemoveDocumentsRequest,
    background_tasks: BackgroundTasks,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Remove documents from a vector store.
    
    Args:
        vectorstore_id: ID of the vector store
        request: Document removal request
        background_tasks: FastAPI background tasks
        manager: Vector store manager instance
        
    Returns:
        Document removal response
    """
    # Check if the vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    # Validate the request
    if not request.document_ids:
        raise HTTPException(status_code=400, detail="At least one document ID is required")
    
    # Create a job for document removal
    from core.job import register_job
    job_id = register_job("remove_documents", details={"vectorstore_id": vectorstore_id})
    
    # Start the document removal process in the background
    background_tasks.add_task(
        process_document_removal,
        job_id=job_id,
        vectorstore_id=vectorstore_id,
        document_ids=request.document_ids,
        manager=manager
    )
    
    return {
        "success": True,
        "message": f"Document removal started. Job ID: {job_id}",
        "job_id": job_id,
        "removed_count": 0
    }


async def process_document_removal(
    job_id: str,
    vectorstore_id: str,
    document_ids: List[str],
    manager: VectorStoreManager
):
    """
    Process document removal from a vector store.
    
    Args:
        job_id: ID of the job
        vectorstore_id: ID of the vector store
        document_ids: List of document IDs to remove
        manager: Vector store manager instance
    """
    from core.job import update_job_progress, complete_job, fail_job, JobStatus
    from core.vectorstore import load_metadata, save_metadata
    
    try:
        # Update job progress
        update_job_progress(job_id, 0, status=JobStatus.PROCESSING)
        
        # Get metadata file path
        metadata_file = Path(os.path.join(manager.base_dir, vectorstore_id, "metadata.json"))
        if not metadata_file.exists():
            raise Exception(f"Metadata file not found for vector store {vectorstore_id}")
        
        # Load metadata
        metadata = load_metadata(metadata_file)
        if not metadata:
            raise Exception(f"Failed to load metadata for vector store {vectorstore_id}")
        
        # Update job progress
        update_job_progress(
            job_id, 
            25, 
            status=JobStatus.PROCESSING,
            current_operation="Removing documents from metadata"
        )
        
        # Filter out removed documents from metadata
        removed_count = 0
        if "files" in metadata:
            original_file_count = len(metadata["files"])
            metadata["files"] = [
                file_info for file_info in metadata["files"] 
                if file_info.get("document_id") not in document_ids
            ]
            removed_count = original_file_count - len(metadata["files"])
            
            # Update metadata
            metadata["updated_at"] = datetime.now().isoformat()
            
            # Save updated metadata
            save_metadata(metadata, metadata_file)
            logger.info(f"Removed {removed_count} documents from metadata")
        
        # Update job progress
        update_job_progress(
            job_id, 
            90, 
            status=JobStatus.PROCESSING,
            current_operation="Finalizing changes"
        )
        
        # Complete the job
        complete_job(
            job_id,
            {
                "vectorstore_id": vectorstore_id,
                "removed_count": removed_count
            }
        )
        
        logger.info(f"Document removal completed: {removed_count} documents removed")
        
    except Exception as e:
        logger.error(f"Error in document removal: {str(e)}")
        import traceback
        logger.error(f"Error details: {traceback.format_exc()}")
        
        try:
            fail_job(job_id, str(e))
        except:
            logger.error(f"Failed to mark job {job_id} as failed")


@router.post("/{vectorstore_id}/batch_update", response_model=BatchUpdateResponse)
async def batch_update_vectorstore(
    vectorstore_id: str,
    request: BatchUpdateRequest,
    background_tasks: BackgroundTasks,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Perform a batch update on a vector store (add and/or remove documents).
    
    Args:
        vectorstore_id: ID of the vector store
        request: Batch update request
        background_tasks: FastAPI background tasks
        manager: Vector store manager instance
        
    Returns:
        Batch update response
    """
    # Check if the vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    # Validate the request
    if not request.add and not request.remove and not request.name and not request.description:
        raise HTTPException(status_code=400, detail="No update operations specified")
    
    # Create a job for the batch update
    from core.job import register_job
    job_id = register_job("batch_update", details={"vectorstore_id": vectorstore_id})
    
    # Start the batch update process in the background
    background_tasks.add_task(
        process_batch_update,
        job_id=job_id,
        vectorstore_id=vectorstore_id,
        request=request,
        manager=manager,
        vs_info=vs_info
    )
    
    return {
        "success": True,
        "message": f"Batch update started. Job ID: {job_id}",
        "job_id": job_id,
        "skipped_files": []
    }


async def process_batch_update(
    job_id: str,
    vectorstore_id: str,
    request: BatchUpdateRequest,
    manager: VectorStoreManager,
    vs_info: Dict[str, Any]
):
    """
    Process a batch update for a vector store.
    
    Args:
        job_id: ID of the job
        vectorstore_id: ID of the vector store
        request: Batch update request
        manager: Vector store manager instance
        vs_info: Vector store info
    """
    from core.job import update_job_progress, complete_job, fail_job
    from core.vectorstore import load_metadata, save_metadata

    try:
        # Update job progress
        update_job_progress(job_id, 0, status=JobStatus.PROCESSING)
        
        # Update metadata first if needed
        metadata_updated = False
        if request.name or request.description:
            metadata_file = Path(os.path.join(manager.base_dir, vectorstore_id, "metadata.json"))
            if metadata_file.exists():
                try:
                    metadata = load_metadata(metadata_file)
                    
                    if request.name:
                        metadata["name"] = request.name
                    
                    if request.description:
                        metadata["description"] = request.description
                    
                    metadata["updated_at"] = datetime.now().isoformat()
                    
                    # Save updated metadata
                    save_metadata(metadata, metadata_file)
                    metadata_updated = True
                    
                    update_job_progress(
                        job_id, 
                        5, 
                        status=JobStatus.PROCESSING,
                        current_operation="Updating metadata"
                    )
                except Exception as e:
                    logger.error(f"Error updating metadata: {str(e)}")
        
        # Initialize counts
        documents_added = 0
        documents_removed = 0
        skipped_files = []
        
        # Process document additions if any
        if request.add and len(request.add) > 0:
            # Get upload directory
            upload_dir = Path(os.environ.get("UPLOAD_DIR", "data/uploads"))
            
            # Get staging directory
            staging_dir = Path(os.environ.get("STAGING_DIR", "doc_staging"))
            staging_dir.mkdir(exist_ok=True)
            
            # Copy files to staging
            update_job_progress(
                job_id, 
                10, 
                status=JobStatus.PROCESSING,
                current_operation="Copying files to staging directory",
                current_file=f"Preparing {len(request.add)} files"
            )
            
            # Ensure upload directory exists
            if not upload_dir.exists():
                logger.error(f"Upload directory {upload_dir} does not exist")
                raise Exception(f"Upload directory {upload_dir} does not exist")
            
            # Copy files to staging
            from core.document import copy_files_to_staging
            staged_files = copy_files_to_staging(request.add, upload_dir, staging_dir)
            
            # Get staging file paths
            staging_file_paths = list(staged_files.values())
            logger.info(f"Copied {len(staging_file_paths)} files to staging")
            
            # Load documents
            update_job_progress(
                job_id, 
                20, 
                status=JobStatus.PROCESSING,
                current_operation="Loading and parsing documents",
                current_file=f"Processing {len(staging_file_paths)} files for chunking"
            )
            
            from core.document import load_documents
            from core.embedding import get_embedding_model
            
            # Get chunking parameters from vector store metadata
            chunk_size = vs_info.get("chunk_size", 1000)
            chunk_overlap = vs_info.get("chunk_overlap", 100)
            
            # Load documents with progress updates for individual files
            documents = []
            skipped = []
            
            for idx, file_path in enumerate(staging_file_paths):
                try:
                    file_name = os.path.basename(file_path)
                    # Update progress for each file
                    update_job_progress(
                        job_id,
                        20 + int(10 * idx / len(staging_file_paths)),
                        status=JobStatus.PROCESSING,
                        current_operation="Loading document",
                        current_file=file_name
                    )
                    
                    # Load documents for this file
                    file_docs, file_skipped = load_documents(
                        [file_path],
                        chunk_size=chunk_size,
                        chunk_overlap=chunk_overlap
                    )
                    
                    if file_docs:
                        documents.extend(file_docs)
                        logger.info(f"Loaded {len(file_docs)} chunks from {file_name}")
                    
                    if file_skipped:
                        skipped.extend(file_skipped)
                        logger.warning(f"Skipped {file_name} during document loading")
                        
                except Exception as e:
                    logger.error(f"Error processing file {file_path}: {str(e)}")
                    skipped.append(file_path)
            
            if skipped:
                logger.warning(f"Skipped {len(skipped)} files during document loading")
                skipped_files.extend(skipped)
            
            # Create file infos for successfully processed files
            file_infos = []
            for file_path in staging_file_paths:
                if file_path not in skipped:
                    file_path_obj = Path(file_path)
                    file_info = {
                        "filename": file_path_obj.name,
                        "original_path": str(file_path),
                        "staging_path": str(file_path),
                        "file_type": file_path_obj.suffix[1:],  # Remove the dot
                        "document_id": str(uuid.uuid4()),
                        "size_bytes": file_path_obj.stat().st_size,
                        "added_at": datetime.now().isoformat()
                    }
                    file_infos.append(file_info)
            
            # Update job progress
            update_job_progress(
                job_id, 
                40, 
                status=JobStatus.PROCESSING,
                current_operation="Initializing embedding model",
                current_file=f"Preparing to embed {len(documents)} chunks"
            )
            
            # Get embedding model
            embedding_model = get_embedding_model(vs_info.get("embedding_model", "nomic-embed-text"))
            
            # Update vector store
            if documents and embedding_model:
                # Give detailed progress update before starting embedding
                update_job_progress(
                    job_id, 
                    45, 
                    status=JobStatus.PROCESSING,
                    current_operation="Starting document embedding process",
                    current_file=f"Using model: {vs_info.get('embedding_model', 'nomic-embed-text')}"
                )
                
                # Update vector store - this will add its own progress updates
                result = manager.update_vectorstore(
                    vectorstore_id=vectorstore_id,
                    documents=documents,
                    embedding_model=embedding_model,
                    file_infos=file_infos,
                    batch_size=request.doc_batch_size,
                    job_id=job_id
                )
                
                if result:
                    documents_added = len(documents)
                    logger.info(f"Successfully added {documents_added} documents to vector store")
                    
                    # Final success update
                    update_job_progress(
                        job_id, 
                        95, 
                        status=JobStatus.PROCESSING,
                        current_operation="Finalizing vector store update",
                        current_file="Embedding complete, updating metadata"
                    )
                else:
                    logger.error("Failed to update vector store with new documents")
                    update_job_progress(
                        job_id, 
                        50, 
                        status=JobStatus.PROCESSING,
                        current_operation="Error updating vector store",
                        current_file="Failed to add documents"
                    )
            else:
                if not documents:
                    logger.warning("No documents to add after processing")
                    update_job_progress(
                        job_id, 
                        50, 
                        status=JobStatus.PROCESSING,
                        current_operation="No documents to add",
                        current_file="Skipping embedding phase"
                    )
                if not embedding_model:
                    logger.error(f"Could not get embedding model: {vs_info.get('embedding_model', 'nomic-embed-text')}")
        
        # Process document removals if any
        if request.remove and len(request.remove) > 0:
            update_job_progress(
                job_id, 
                70, 
                status=JobStatus.PROCESSING,
                current_operation="Removing documents"
            )
            
            # Currently, we don't have direct document removal functionality in VectorStoreManager
            # We'll need to implement this or provide a workaround
            
            # For now, we'll just update the metadata to mark these documents as removed
            metadata_file = Path(os.path.join(manager.base_dir, vectorstore_id, "metadata.json"))
            if metadata_file.exists():
                try:
                    metadata = load_metadata(metadata_file)
                    
                    # Filter out removed documents
                    if "files" in metadata:
                        original_file_count = len(metadata["files"])
                        metadata["files"] = [
                            file_info for file_info in metadata["files"] 
                            if file_info.get("document_id") not in request.remove
                        ]
                        documents_removed = original_file_count - len(metadata["files"])
                        
                        # Update metadata
                        metadata["updated_at"] = datetime.now().isoformat()
                        
                        # Save updated metadata
                        save_metadata(metadata, metadata_file)
                        logger.info(f"Removed {documents_removed} documents from metadata")
                except Exception as e:
                    logger.error(f"Error updating metadata for document removal: {str(e)}")
        
        # Complete the job
        complete_job(
            job_id,
            {
                "vectorstore_id": vectorstore_id,
                "documents_added": documents_added,
                "documents_removed": documents_removed,
                "skipped_files": skipped_files
            }
        )
        
        logger.info(f"Batch update completed: {documents_added} added, {documents_removed} removed")
        
    except Exception as e:
        logger.error(f"Error in batch update: {str(e)}")
        import traceback
        logger.error(f"Error details: {traceback.format_exc()}")
        
        try:
            fail_job(job_id, str(e))
        except:
            logger.error(f"Failed to mark job {job_id} as failed")


@router.put("/{vectorstore_id}", response_model=UpdateVectorStoreMetadataResponse)
async def update_vectorstore_metadata(
    vectorstore_id: str,
    request: UpdateVectorStoreMetadataRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Update metadata for a vector store (name and description).
    
    Args:
        vectorstore_id: ID of the vector store
        request: Metadata update request
        manager: Vector store manager instance
        
    Returns:
        Metadata update response
    """
    # Check if the vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    # Validate the request
    if not request.name and not request.description:
        raise HTTPException(status_code=400, detail="No metadata updates specified")
    
    # Get metadata file path
    metadata_file = Path(os.path.join(manager.base_dir, vectorstore_id, "metadata.json"))
    if not metadata_file.exists():
        raise HTTPException(
            status_code=500, 
            detail=f"Metadata file not found for vector store {vectorstore_id}"
        )
    
    try:
        # Load metadata
        metadata = load_metadata(metadata_file)
        if not metadata:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to load metadata for vector store {vectorstore_id}"
            )
        
        # Update metadata fields
        updated = False
        
        if request.name is not None:
            metadata["name"] = request.name
            updated = True
        
        if request.description is not None:
            metadata["description"] = request.description
            updated = True
        
        if updated:
            # Update timestamp
            metadata["updated_at"] = datetime.now().isoformat()
            
            # Save updated metadata
            if save_metadata(metadata, metadata_file):
                return {
                    "success": True,
                    "message": "Vector store metadata updated successfully",
                    "vectorstore_id": vectorstore_id
                }
            else:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to save updated metadata"
                )
        else:
            return {
                "success": True,
                "message": "No changes made to vector store metadata",
                "vectorstore_id": vectorstore_id
            }
            
    except Exception as e:
        logger.error(f"Error updating vector store metadata: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating vector store metadata: {str(e)}"
        )


@router.post("/{vectorstore_id}/analyze", response_model=VectorStoreAnalysisResponse)
async def analyze_vectorstore(
    vectorstore_id: str,
    request: VectorStoreAnalysisRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Analyze the content of a vector store using an LLM.
    
    Args:
        vectorstore_id: ID of the vector store to analyze
        request: Analysis parameters
        manager: Vector store manager dependency
        
    Returns:
        Analysis results
    """
    try:
        # Get vector store info
        vs_info = manager.get_vectorstore_info(vectorstore_id)
        if not vs_info:
            raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
        
        # Check if the vector store has documents
        if not vs_info.get("files"):
            raise HTTPException(status_code=400, detail="Vector store is empty")
        
        # Get metadata
        metadata_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vectorstores", f"{vectorstore_id}", "metadata.json")
        vs_metadata = None
        
        with open(metadata_path, "r") as f:
            vs_metadata = json.load(f)
        
        if not vs_metadata:
            raise HTTPException(status_code=500, detail="Could not load vector store metadata")
            
        # Create a mapping of document_id to file info for metadata enrichment
        doc_metadata_map = {}
        for file_info in vs_metadata.get("files", []):
            if "document_id" in file_info:
                doc_metadata_map[file_info["document_id"]] = file_info
        
        # Get sample chunks from the vector store
        # Use the query method that has metadata enrichment
        sample_size = min(request.sample_size, 50)  # Limit sample size for analysis
        
        # Get random embeddings to retrieve diverse chunks
        random_embeddings = [np.random.rand(128).tolist() for _ in range(10)]
        
        # Collect chunks from different random queries
        all_chunks = []
        for embedding in random_embeddings:
            if len(all_chunks) >= sample_size:
                break
                
            # Query with the random embedding
            chunks = manager.query_vector_store(
                vectorstore_id,
                embedding,
                top_k=min(10, sample_size - len(all_chunks)),
                score_threshold=0.0  # No threshold for samples
            )
            
            # Add chunks to our collection, avoiding duplicates
            existing_texts = {chunk["text"] for chunk in all_chunks}
            for chunk in chunks:
                if chunk["text"] not in existing_texts and len(all_chunks) < sample_size:
                    all_chunks.append(chunk)
                    existing_texts.add(chunk["text"])
        
        if not all_chunks:
            raise HTTPException(status_code=400, detail="Could not retrieve content sample")
            
        # Log the chunk metadata
        logger.info(f"Retrieved {len(all_chunks)} chunks for analysis")
        
        # Count chunks by document
        doc_counts = {}
        for chunk in all_chunks:
            if "metadata" in chunk and "document_id" in chunk["metadata"]:
                doc_id = chunk["metadata"]["document_id"]
                if doc_id in doc_counts:
                    doc_counts[doc_id] += 1
                else:
                    doc_counts[doc_id] = 1
                    
        # Get document names for logging
        doc_names = {}
        for doc_id, count in doc_counts.items():
            if doc_id in doc_metadata_map:
                filename = doc_metadata_map[doc_id].get("filename", "unknown")
                doc_names[doc_id] = filename
            else:
                doc_names[doc_id] = "unknown"
                
        # Log document distribution in sample
        logger.info("Sample chunk distribution by document:")
        for doc_id, count in doc_counts.items():
            logger.info(f"  {doc_names.get(doc_id, 'unknown')}: {count} chunks")
        
        # Determine the number of chunks to send to the LLM based on summary length
        max_chunks = {
            "short": min(5, len(all_chunks)),
            "medium": min(15, len(all_chunks)),
            "long": min(30, len(all_chunks))
        }.get(request.summary_length, min(15, len(all_chunks)))
        
        # Prepare chunks for LLM
        chunks_for_llm = all_chunks[:max_chunks]
        
        # Generate context headers for chunks with correct metadata
        context_headers = []
        for i, chunk in enumerate(chunks_for_llm):
            # Get source info
            source = "unknown"
            page = "N/A"
            classification = "UNCLASSIFIED"
            
            if "metadata" in chunk:
                metadata = chunk["metadata"]
                
                # Get filename
                if "filename" in metadata:
                    source = metadata["filename"]
                elif "original_filename" in metadata:
                    source = metadata["original_filename"]
                    
                # Get page
                if "page" in metadata:
                    page = metadata["page"]
                    
                # Get classification
                if "security_classification" in metadata:
                    classification = metadata["security_classification"]
                elif "content_security_classification" in metadata:
                    classification = metadata["content_security_classification"]
                
                # If we have a document_id, try to get more complete metadata
                if "document_id" in metadata and metadata["document_id"] in doc_metadata_map:
                    file_info = doc_metadata_map[metadata["document_id"]]
                    
                    # Override with more complete information if available
                    if "filename" in file_info:
                        source = file_info["filename"]
                    if "security_classification" in file_info:
                        classification = file_info["security_classification"]
            
            # Create context header
            context_header = f"Document {i+1} | Source: {source} | Page: {page} | Classification: {classification}"
            context_headers.append(context_header)
        
        # Generate prompt for the LLM
        prompt = generate_analysis_prompt(chunks_for_llm, vs_metadata["name"], context_headers)
        
        # Get LLM response
        llm_response = get_llm_analysis(prompt)
        
        # Parse the response to extract structured information
        parsed_response = parse_llm_analysis(llm_response)
        
        # Prepare the response
        response = VectorStoreAnalysisResponse(
            raw_response=llm_response,
            content_analysis=parsed_response.get("content_analysis"),
            example_queries=parsed_response.get("example_queries"),
            document_count=len(vs_info.get("files", [])),
            chunk_count=vs_metadata.get("chunk_count", 0),
            sample_size=len(all_chunks),
            sampling_strategy=request.sampling_strategy
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing vector store: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error analyzing vector store: {str(e)}")


def generate_analysis_prompt(chunks: List[Dict[str, Any]], vectorstore_name: str, context_headers: List[str]) -> str:
    """
    Generate a prompt for analyzing vector store content.
    
    Args:
        chunks: List of text chunks with metadata
        vectorstore_name: Name of the vector store
        context_headers: List of context headers for chunks
        
    Returns:
        LLM prompt for analysis
    """
    prompt = f"""
    You are an expert analyst tasked with examining content from a vector store named '{vectorstore_name}'.
    Below are sample text chunks from the vector store. Analyze them carefully to understand what type of information is contained in this collection.
    
    """
    
    # Include chunks with their context headers, if available
    for i, (chunk, header) in enumerate(zip(chunks, context_headers) if context_headers else [(c, None) for c in chunks]):
        if header:
            prompt += f"CHUNK {i+1} CONTEXT: {header}\n"
        prompt += f"CHUNK {i+1} CONTENT:\n{chunk['text']}\n\n"
    
    prompt += """
    Based on these samples, please provide a comprehensive analysis in the following format:
    
    CONTENT ANALYSIS:
    [Provide a detailed analysis of what type of information is contained in this vector store. Include details about:
    1. Subject matter and domains covered
    2. Document types (e.g., technical manuals, reports, specifications)
    3. Writing style and formality level
    4. Any observed patterns in classification or security markings
    5. Apparent purpose or use case for these documents
    6. Any specialized terminology or jargon that appears frequently]
    
    EXAMPLE QUERIES:
    [List 8-10 specific and diverse example queries that would be useful to run against this vector store. These should demonstrate the range of information available and show the kinds of questions this data can answer. Number each query.]
    
    FORMAT YOUR RESPONSE EXACTLY according to the template above, with clearly labeled sections for CONTENT ANALYSIS and EXAMPLE QUERIES.
    """
    
    return prompt


def get_llm_analysis(prompt: str) -> str:
    """
    Get LLM analysis using the provided prompt.
    
    This function interfaces with an LLM to generate an analysis of vector store content.
    In a production system, this would call an external API or a local model.
    
    Args:
        prompt: The prompt to send to the LLM
        
    Returns:
        The LLM's response
    """
    try:
        # Log the LLM request
        logger.info("Sending analysis request to LLM")
        
        # Import the LLM module
        try:
            from ..core.llm import generate_with_best_model
            
            # Use the LLM module to generate a response
            options = {
                "temperature": 0.7,
                "max_tokens": 1500,
                "top_p": 0.9
            }
            
            llm_response = generate_with_best_model(prompt, options)
            return llm_response
            
        except ImportError:
            # If the LLM module is not available, fall back to direct Ollama API call
            logger.warning("LLM module not found, falling back to direct Ollama API call")
            
            # Get Ollama URL from config
            try:
                from ..config import OLLAMA_BASE_URL
            except ImportError:
                try:
                    from config import OLLAMA_BASE_URL
                except ImportError:
                    OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
            
            # Prepare Ollama API request
            base_url = OLLAMA_BASE_URL.rstrip('/')
            url = f"{base_url}/api/generate"
            
            # Use llama3.2 as a reasonable default model if available
            # Models like llama3.2, mistral, or gemma are good choices for this task
            model = "huihui_ai/llama3.2-abliterate:latest"
            
            # Log the model and URL being used
            logger.info(f"Using Ollama API at {url} with model {model}")
            
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 1000
                }
            }
            
            # Make the API request
            import requests
            response = requests.post(url, json=payload, timeout=60)
            
            # Check for successful response
            if response.status_code == 200:
                result = response.json()
                llm_response = result.get("response", "")
                
                # Log success and response length
                logger.info(f"Successfully received response from Ollama ({len(llm_response)} chars)")
                
                return llm_response
            else:
                # Log error and try fallback
                logger.error(f"Error from Ollama API: Status {response.status_code}, message: {response.text}")
                
                # Try alternate model if the first one failed
                if model == "huihui_ai/llama3.2-abliterate:latest":
                    logger.info("Trying fallback to mistral model")
                    payload["model"] = "mistral"
                    response = requests.post(url, json=payload, timeout=60)
                    
                    if response.status_code == 200:
                        result = response.json()
                        llm_response = result.get("response", "")
                        logger.info(f"Successfully received response from fallback model ({len(llm_response)} chars)")
                        return llm_response
                
                # If all real LLM attempts failed, return the placeholder response with a warning
                logger.warning("All LLM attempts failed, returning placeholder response")
                return """
                FAILED TO GENERATE ANALYSIS
                """
    
    except Exception as e:
        # Log the error and return an error message
        logger.error(f"Error getting LLM analysis: {str(e)}", exc_info=True)
        return f"""
        CONTENT ANALYSIS:
        Error generating analysis: {str(e)}
        
        EXAMPLE QUERIES:
        1. What error occurred during analysis?
        2. How can I fix this error?
        """


def parse_llm_analysis(response: str) -> Dict[str, Any]:
    """
    Parse the LLM analysis response to extract structured data.
    
    Args:
        response: The raw response from the LLM
        
    Returns:
        Dictionary with content_analysis and example_queries
    """
    result = {}
    
    # Extract content analysis
    if "CONTENT ANALYSIS:" in response:
        parts = response.split("CONTENT ANALYSIS:")
        if len(parts) > 1:
            analysis_text = parts[1]
            if "EXAMPLE QUERIES:" in analysis_text:
                analysis_text = analysis_text.split("EXAMPLE QUERIES:")[0]
            result["content_analysis"] = analysis_text.strip()
    
    # Extract example queries
    if "EXAMPLE QUERIES:" in response:
        parts = response.split("EXAMPLE QUERIES:")
        if len(parts) > 1:
            queries_text = parts[1].strip()
            queries = []
            
            # Try to extract numbered queries
            import re
            query_matches = re.findall(r'\d+\.\s+(.*?)(?=\d+\.|$)', queries_text, re.DOTALL)
            
            if query_matches:
                for match in query_matches:
                    queries.append(match.strip())
            else:
                # Fallback to line-by-line if numbered pattern doesn't match
                for line in queries_text.split('\n'):
                    line = line.strip()
                    if line and not line.startswith('CONTENT ANALYSIS:'):
                        queries.append(line)
            
            result["example_queries"] = queries
    
    # If no content analysis was found, use a fallback approach
    if "content_analysis" not in result:
        logger.warning("No content analysis section found with standard patterns, using fallback extraction")
        # Use the first half of the response as the content analysis
        half_point = len(response) // 2
        result["content_analysis"] = response[:half_point].strip()
    
    # If no queries were found or fewer than expected, add generic ones
    if "example_queries" not in result or len(result["example_queries"]) < 5:
        logger.warning("No or few example queries found with standard patterns, using fallback extraction")
        generic_queries = [
            "What are the key topics covered in the documents?",
            "How do the documents describe the main concepts?",
            "What are the most important findings discussed in the documents?",
            "Can you summarize the main points from the documents?",
            "What information do the documents provide about the primary subject matter?"
        ]
        
        if "example_queries" not in result:
            result["example_queries"] = generic_queries
        else:
            # Add generic queries to reach a total of at least 5
            existing_count = len(result["example_queries"])
            if existing_count < 5:
                result["example_queries"].extend(generic_queries[:(5-existing_count)])
                logger.info(f"Added {5-existing_count} generic queries to reach total of 5")
    
    return result


# Background task implementations
async def process_vectorstore_creation(
    job_id: str,
    request: CreateVectorStoreRequest,
    manager: VectorStoreManager
):
    """
    Background task for creating a vector store.
    
    This will:
    1. Copy files to staging
    2. Load documents
    3. Create vector store
    4. Clean up staged files
    
    Args:
        job_id: Job ID for tracking progress
        request: Vector store creation request
        manager: Vector store manager instance
    """
    try:
        # Update job progress
        update_job_progress(job_id, 0, "Preparing files", "copying_files")
        
        # Copy files to staging
        staged_files = copy_files_to_staging(
            files=request.files,
            upload_dir=Path(UPLOAD_DIR),
            staging_dir=Path(DOC_STAGING_DIR)
        )
        
        # Load documents
        update_job_progress(job_id, 0, "Loading documents", "loading_documents")
        
        # Choose chunking method based on request
        chunking_method = "paragraph" if request.use_paragraph_chunking else "fixed"
        
        # Load documents with appropriate chunking
        # First, get the text splitter
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap
        )
        
        # Extract the staging file paths from the mapping
        staging_file_paths = list(staged_files.values())
        logger.info(f"Loading documents from {len(staging_file_paths)} staged files")
        
        # Load documents with progress updates for individual files
        documents = []
        skipped = []
        
        for idx, file_path in enumerate(staging_file_paths):
            try:
                file_name = os.path.basename(file_path)
                # Update progress for each file
                update_job_progress(
                    job_id,
                    20 + int(10 * idx / len(staging_file_paths)),
                    status=JobStatus.PROCESSING,
                    current_operation="Loading document",
                    current_file=file_name
                )
                
                # Load documents for this file
                file_docs, file_skipped = load_documents(
                    [file_path],
                    chunk_size=request.chunk_size,
                    chunk_overlap=request.chunk_overlap
                )
                
                if file_docs:
                    documents.extend(file_docs)
                    logger.info(f"Loaded {len(file_docs)} chunks from {file_name}")
                    
                if file_skipped:
                    skipped.extend(file_skipped)
                    logger.warning(f"Skipped {file_name} during document loading")
                    
            except Exception as e:
                logger.error(f"Error processing file {file_path}: {str(e)}")
                skipped.append(file_path)
        
        if skipped:
            logger.warning(f"Skipped {len(skipped)} files during document loading")
            skipped_files.extend(skipped)
        
        # Get embedding model
        embedding_model = get_embedding_model(request.embedding_model)
        if not embedding_model:
            fail_job(job_id, f"Failed to initialize embedding model: {request.embedding_model}")
            return
        
        # Create vector store
        update_job_progress(job_id, len(request.files), "Creating vector store", "creating_vectorstore")
        
        # Create file_infos from the successfully processed files (not skipped files)
        # Map original filenames to staging paths
        original_to_staging = {os.path.basename(orig): staged for orig, staged in staged_files.items()}
        
        # Create file info dictionaries with metadata for each successfully processed file
        file_infos = []
        for file_path in staging_file_paths:
            # Skip files that were in the skipped list
            if file_path in skipped:
                continue
                
            original_filename = os.path.basename(file_path)
            original_path = None
            
            # Find the original path by matching the staging path
            for orig, staged in staged_files.items():
                if staged == file_path:
                    original_path = orig
                    original_filename = os.path.basename(orig)
                    break
            
            file_info = {
                "filename": original_filename,
                "original_path": original_path,
                "staging_path": file_path,
                "file_type": os.path.splitext(file_path)[1].lower(),
                "document_id": f"doc_{uuid.uuid4()}",
                "size_bytes": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
                "added_at": datetime.now().isoformat()
            }
            file_infos.append(file_info)
            
        logger.info(f"Created file_infos for {len(file_infos)} successfully processed files")
        
        vectorstore_id = manager.create_vectorstore(
            name=request.name,
            description=request.description,
            documents=documents,
            embedding_model=embedding_model,
            embedding_model_name=request.embedding_model,
            file_infos=file_infos,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            batch_size=request.doc_batch_size,
            job_id=job_id
        )
        
        # Clean up staged files
        # NOTE: This function would need to be implemented or imported
        # cleanup_staged_files(staged_files)
        
        # Complete the job
        complete_job(job_id, {
            "vectorstore_id": vectorstore_id,
            "document_count": len(documents)
        })
        
    except Exception as e:
        logger.error(f"Error in process_vectorstore_creation: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        fail_job(job_id, str(e))


async def process_vectorstore_update(
    job_id: str,
    vectorstore_id: str,
    request: UpdateVectorStoreRequest,
    manager: VectorStoreManager,
    vs_info: Dict[str, Any]
):
    """
    Background task for updating a vector store.
    
    This will:
    1. Copy files to staging
    2. Load documents
    3. Update vector store
    4. Clean up staged files
    
    Args:
        job_id: Job ID for tracking progress
        vectorstore_id: ID of the vector store to update
        request: Vector store update request
        manager: Vector store manager instance
        vs_info: Vector store information
    """
    try:
        from ..config import DOC_STAGING_DIR, UPLOAD_DIR
        
        # Update job progress
        update_job_progress(job_id, 0, "Preparing files", "copying_files")
        
        # Copy files to staging
        staged_files = copy_files_to_staging(
            file_paths=request.files,
            upload_dir=Path(UPLOAD_DIR),
            staging_dir=Path(DOC_STAGING_DIR),
            preserve_filenames=True  # Preserve original filenames
        )
        
        # Load documents
        update_job_progress(job_id, 0, "Loading documents", "loading_documents")
        
        # Get chunking settings from existing vector store
        chunking_method = vs_info.get("chunking_method", "fixed")
        max_paragraph_length = vs_info.get("max_paragraph_length", 1500)
        min_paragraph_length = vs_info.get("min_paragraph_length", 50)
        chunk_size = vs_info.get("chunk_size", 1000)
        chunk_overlap = vs_info.get("chunk_overlap", 100)
        
        # Load documents with appropriate chunking
        documents, file_infos = load_documents(
            file_paths=staged_files,
            upload_dir=Path(UPLOAD_DIR),
            chunking_method=chunking_method,
            max_paragraph_length=max_paragraph_length,
            min_paragraph_length=min_paragraph_length,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        # Get embedding model
        embedding_model_name = vs_info["embedding_model"]
        embedding_model = get_embedding_model(embedding_model_name)
        if not embedding_model:
            fail_job(job_id, f"Failed to initialize embedding model: {embedding_model_name}")
            return
        
        # Update vector store
        update_job_progress(job_id, len(request.files), "Updating vector store", "updating_vectorstore")
        
        success = manager.update_vectorstore(
            vectorstore_id=vectorstore_id,
            documents=documents,
            embedding_model=embedding_model,
            file_infos=file_infos,
            name=request.name,
            description=request.description,
            batch_size=request.doc_batch_size,
            job_id=job_id
        )
        
        if not success:
            fail_job(job_id, "Failed to update vector store")
            return
        
        # Clean up staged files
        # NOTE: This function would need to be implemented or imported
        # cleanup_staged_files(staged_files)
        
        # Complete the job
        complete_job(job_id, {
            "vectorstore_id": vectorstore_id,
            "document_count": len(documents)
        })
        
    except Exception as e:
        logger.error(f"Error in process_vectorstore_update: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        fail_job(job_id, str(e))


@router.post("/{vectorstore_id}/llm-query", response_model=VectorStoreLLMQueryResponse)
async def llm_query_vectorstore(
    vectorstore_id: str,
    query_request: VectorStoreLLMQueryRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Query a vector store and get LLM-enhanced responses.
    
    Args:
        vectorstore_id: ID of the vector store to query
        query_request: Query parameters
        manager: Vector store manager dependency
        
    Returns:
        LLM-enhanced query results with sources
    """
    try:
        # Get vector store info
        vs_info = manager.get_vectorstore_info(vectorstore_id)
        if not vs_info:
            raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
        
        logger.info(f"Processing LLM query for vector store {vectorstore_id}: {query_request.query}")
        
        # Query the vector store to get relevant chunks
        results = manager.query_vector_store(
            vectorstore_id,
            query_request.query,
            top_k=query_request.top_k,
            score_threshold=query_request.score_threshold
        )
        
        if not results:
            return VectorStoreLLMQueryResponse(
                answer="I couldn't find any relevant information to answer your question.",
                sources=[],
                raw_chunks=[]
            )
        
        # Prepare chunks for LLM processing
        chunks = []
        sources = []
        
        for i, result in enumerate(results):
            # Extract the text and metadata
            text = result.get("text", "")
            metadata = result.get("metadata", {})
            score = result.get("score", 0.0)
            
            # Add to chunks list
            chunks.append(text)
            
            # Create source info
            source_info = {
                "text": text[:200] + "..." if len(text) > 200 else text,  # Truncate for display
                "metadata": metadata,
                "score": score,
                "index": i
            }
            
            # Add document information if available
            if "document_id" in metadata:
                source_info["document_id"] = metadata["document_id"]
            
            if "filename" in metadata:
                source_info["filename"] = metadata["filename"]
            elif "source" in metadata:
                source_info["filename"] = metadata["source"]
            
            if "page" in metadata:
                source_info["page"] = metadata["page"]
                
            sources.append(source_info)
        
        # Generate a response using the LLM
        if query_request.use_llm:
            # Import LLM-related functions
            from .llm import generate_query_prompt, get_llm_response
            
            # Generate prompt for the LLM
            prompt = generate_query_prompt(
                query_request.query,
                chunks,
                [result.get("metadata", {}) for result in results]
            )
            
            # Get LLM response
            llm_response = get_llm_response(prompt)
        else:
            # If LLM is not used, just return a simple response
            llm_response = "To see answers with AI assistance, enable the LLM option."
        
        # Return the response
        response = VectorStoreLLMQueryResponse(
            answer=llm_response,
            sources=sources if query_request.include_sources else None,
            raw_chunks=results if query_request.include_sources else None
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error in LLM query: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing LLM query: {str(e)}")
