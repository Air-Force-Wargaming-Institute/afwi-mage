"""
Main application entry point for the embedding service.
This is a simplified version that includes direct implementation
of the Nomic embedding model to avoid import issues.
"""

import os
import sys
import json
import shutil
import logging
import requests
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import uuid
import time
import math

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Import for embedding models and vector stores
import numpy as np
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter, TextSplitter
from langchain_community.vectorstores import FAISS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("embedding_service")

# Job tracking for long-running operations
job_progress = {}

class JobStatus(BaseModel):
    """Job status for tracking long-running operations."""
    job_id: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    operation_type: str  # 'create_vectorstore', 'update_vectorstore', etc.
    total_items: int = 0
    processed_items: int = 0
    started_at: str
    completed_at: Optional[str] = None
    details: Dict[str, Any] = {}
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

def generate_job_id():
    """Generate a unique job ID."""
    return str(uuid.uuid4())

def register_job(operation_type: str, total_items: int = 0, details: Dict[str, Any] = {}):
    """Register a new job and return its ID."""
    job_id = generate_job_id()
    job_progress[job_id] = JobStatus(
        job_id=job_id,
        status="pending",
        operation_type=operation_type,
        total_items=total_items,
        processed_items=0,
        started_at=datetime.now().isoformat(),
        details=details
    )
    return job_id

def update_job_progress(job_id: str, processed_items: int, status: str = None):
    """Update the progress of a job."""
    if job_id not in job_progress:
        logger.warning(f"Attempted to update non-existent job {job_id}")
        return False
    
    job = job_progress[job_id]
    job.processed_items = processed_items
    
    if status:
        job.status = status
    
    # If job is completed or failed, set completed_at timestamp
    if status in ["completed", "failed"]:
        job.completed_at = datetime.now().isoformat()
    
    return True

def complete_job(job_id: str, result: Dict[str, Any] = None):
    """Mark a job as completed with optional result."""
    if job_id not in job_progress:
        logger.warning(f"Attempted to complete non-existent job {job_id}")
        return False
    
    job = job_progress[job_id]
    job.status = "completed"
    job.completed_at = datetime.now().isoformat()
    
    if result:
        job.result = result
    
    return True

def fail_job(job_id: str, error: str):
    """Mark a job as failed with error message."""
    if job_id not in job_progress:
        logger.warning(f"Attempted to fail non-existent job {job_id}")
        return False
    
    job = job_progress[job_id]
    job.status = "failed"
    job.completed_at = datetime.now().isoformat()
    job.error = error
    
    return True

def get_job_status(job_id: str) -> Optional[JobStatus]:
    """Get the status of a job."""
    return job_progress.get(job_id)

# Configuration
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 8000))
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")

# Define directories
DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
VECTORSTORE_DIR = os.environ.get("VECTORSTORE_DIR", str(DATA_DIR / "vectorstores"))
DOC_STAGING_DIR = os.environ.get("DOC_STAGING_DIR", str(DATA_DIR / "staging"))
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", str(DATA_DIR / "uploads"))

# Make sure directories exist
DATA_DIR.mkdir(exist_ok=True)
Path(VECTORSTORE_DIR).mkdir(exist_ok=True)
Path(DOC_STAGING_DIR).mkdir(exist_ok=True)
Path(UPLOAD_DIR).mkdir(exist_ok=True)

# Create the FastAPI application
app = FastAPI(title="Embedding Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    chunking_method: Optional[str] = "fixed"
    max_paragraph_length: Optional[int] = 1500
    min_paragraph_length: Optional[int] = 50

class ParagraphTextSplitter(TextSplitter):
    """Custom text splitter that splits text into paragraphs."""
    
    def __init__(self, max_paragraph_length=1500, min_paragraph_length=50):
        """Initialize with max and min paragraph lengths."""
        self.max_paragraph_length = max_paragraph_length
        self.min_paragraph_length = min_paragraph_length
        super().__init__(chunk_size=max_paragraph_length, chunk_overlap=0)
    
    def split_text(self, text):
        """Split text into paragraphs using double newlines as separators."""
        # Split by double newlines which typically denote paragraphs
        paragraphs = text.split("\n\n")
        
        # Filter empty paragraphs and strip whitespace
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        # Process paragraphs based on length
        processed_paragraphs = []
        current_paragraph = ""
        
        for paragraph in paragraphs:
            # If paragraph is too short, merge with the next one
            if len(current_paragraph) > 0 and len(current_paragraph) + len(paragraph) < self.max_paragraph_length:
                current_paragraph += " " + paragraph
            elif len(paragraph) < self.min_paragraph_length:
                # Start building a new merged paragraph
                current_paragraph = paragraph
            else:
                # If we have a pending merged paragraph, add it first
                if current_paragraph:
                    processed_paragraphs.append(current_paragraph)
                    current_paragraph = ""
                
                # Handle long paragraphs
                if len(paragraph) > self.max_paragraph_length:
                    # Split long paragraph using recursive character splitter
                    long_splits = self._split_long_paragraph(paragraph)
                    processed_paragraphs.extend(long_splits)
                else:
                    processed_paragraphs.append(paragraph)
        
        # Add any remaining merged paragraph
        if current_paragraph:
            processed_paragraphs.append(current_paragraph)
        
        return processed_paragraphs
    
    def _split_long_paragraph(self, paragraph):
        """Split a long paragraph into smaller chunks."""
        # Use RecursiveCharacterTextSplitter for long paragraphs
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.max_paragraph_length,
            chunk_overlap=min(100, self.max_paragraph_length // 10)
        )
        return splitter.split_text(paragraph)

class CreateVectorStoreRequest(BaseModel):
    name: str
    description: str = ""
    files: List[str]
    embedding_model: str = "nomic-embed-text"
    use_paragraph_chunking: bool = True
    max_paragraph_length: int = 1500
    min_paragraph_length: int = 50
    chunk_size: int = 1000
    chunk_overlap: int = 100
    batch_processing: bool = True
    file_batch_size: int = 5
    doc_batch_size: int = 1000

class CreateVectorStoreResponse(BaseModel):
    success: bool
    message: str
    vectorstore_id: Optional[str] = None
    job_id: Optional[str] = None
    skipped_files: Optional[List[str]] = None

class UpdateVectorStoreRequest(BaseModel):
    files: List[str]
    name: Optional[str] = None
    description: Optional[str] = None
    batch_processing: bool = True
    file_batch_size: int = 5
    doc_batch_size: int = 1000

class UpdateVectorStoreResponse(BaseModel):
    success: bool
    message: str
    job_id: Optional[str] = None
    skipped_files: Optional[List[str]] = None

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    operation_type: str
    total_items: int
    processed_items: int
    progress_percentage: float
    started_at: str
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Ollama embedding model implementation
class OllamaEmbeddings(Embeddings):
    """Embeddings implementation using Ollama API."""
    
    def __init__(self, model: str = "nomic-embed-text:latest", base_url: str = OLLAMA_BASE_URL):
        self.model = model
        self.base_url = base_url
    
    def _embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Embed texts using Ollama API."""
        results = []
        for text in texts:
            try:
                response = requests.post(
                    f"{self.base_url}/api/embeddings",
                    json={"model": self.model, "prompt": text}
                )
                response.raise_for_status()
                data = response.json()
                embedding = data.get("embedding", [])
                results.append(embedding)
            except Exception as e:
                logger.error(f"Error getting embeddings from Ollama: {str(e)}")
                # Return zero vector as fallback
                results.append([0.0] * 768)  # Nomic embeddings are 768-dimensional
        return results
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed documents using Ollama API."""
        return self._embed_texts(texts)
    
    def embed_query(self, text: str) -> List[float]:
        """Embed query using Ollama API."""
        embeddings = self._embed_texts([text])
        return embeddings[0] if embeddings else [0.0] * 768

# Embedding model functions
def get_embedding_model(model_id="nomic-embed-text"):
    """Get the Nomic embedding model."""
    return OllamaEmbeddings(model="nomic-embed-text:latest")

def get_available_embedding_models():
    """Get a list of available embedding models."""
    return [
        {
            "id": "nomic-embed-text",
            "name": "Nomic Embed Text",
            "description": "Nomic AI's text embedding model running on Ollama",
            "provider": "Nomic AI via Ollama"
        }
    ]

# Document loading functions
def get_document_loader(file_path):
    """Get appropriate document loader based on file extension."""
    from langchain_community.document_loaders import (
        TextLoader, PyPDFLoader, Docx2txtLoader, 
        UnstructuredMarkdownLoader, UnstructuredCSVLoader, 
        UnstructuredExcelLoader, UnstructuredHTMLLoader
    )
    
    file_extension = os.path.splitext(file_path)[1].lower()
    
    loaders = {
        '.txt': TextLoader,
        '.pdf': PyPDFLoader,
        '.docx': Docx2txtLoader,
        '.doc': Docx2txtLoader,
        '.md': UnstructuredMarkdownLoader,
        '.csv': UnstructuredCSVLoader,
        '.xlsx': UnstructuredExcelLoader,
        '.xls': UnstructuredExcelLoader,
        '.html': UnstructuredHTMLLoader,
        '.htm': UnstructuredHTMLLoader
    }
    
    if file_extension in loaders:
        return loaders[file_extension](file_path)
    
    return None

def copy_files_to_staging(file_paths, upload_dir, staging_dir):
    """Copy files from upload directory to staging directory."""
    file_mapping = {}
    
    for file_path in file_paths:
        # Construct the full source path
        src_path = os.path.join(upload_dir, file_path)
        
        if not os.path.exists(src_path):
            logger.warning(f"File not found: {src_path}")
            continue
        
        # Generate a unique filename for the staging area
        file_extension = os.path.splitext(file_path)[1]
        staged_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Construct the destination path
        dst_path = os.path.join(staging_dir, staged_filename)
        
        # Copy the file
        try:
            shutil.copy2(src_path, dst_path)
            file_mapping[file_path] = dst_path
            logger.info(f"Copied {src_path} to {dst_path}")
        except Exception as e:
            logger.error(f"Error copying {src_path} to {dst_path}: {str(e)}")
    
    return file_mapping

def load_documents(
    file_paths,
    use_paragraph_chunking=True,
    max_paragraph_length=1500,
    min_paragraph_length=50,
    chunk_size=1000,
    chunk_overlap=100,
    batch_size=5,
    job_id=None
):
    """Load and process documents from the provided file paths in batches.
    
    Args:
        file_paths: List of file paths to process
        use_paragraph_chunking: Whether to use paragraph-based chunking
        max_paragraph_length: Maximum length of paragraphs when using paragraph chunking
        min_paragraph_length: Minimum length of paragraphs when using paragraph chunking
        chunk_size: Chunk size for fixed-length chunking
        chunk_overlap: Chunk overlap for fixed-length chunking
        batch_size: Number of files to process in each batch
        job_id: Job ID for tracking progress
    
    Returns:
        tuple: (documents, skipped_files)
    """
    total_files = len(file_paths)
    logger.info(f"Processing {total_files} files in batches of {batch_size}")
    
    documents = []
    skipped_files = []
    
    # Create text splitter based on chunking method
    text_splitter = get_text_splitter(
        use_paragraph_chunking,
        max_paragraph_length,
        min_paragraph_length,
        chunk_size,
        chunk_overlap
    )
    
    # Process files in batches
    batches = [file_paths[i:i + batch_size] for i in range(0, len(file_paths), batch_size)]
    
    for batch_idx, batch in enumerate(batches):
        logger.info(f"Processing batch {batch_idx + 1}/{len(batches)}: {len(batch)} files")
        
        batch_documents = []
        for file_idx, file_path in enumerate(batch):
            current_file_idx = batch_idx * batch_size + file_idx
            
            # Update job progress if job_id is provided
            if job_id:
                update_job_progress(
                    job_id,
                    current_file_idx,
                    f"Processing file {current_file_idx + 1}/{total_files}"
                )
            
            try:
                # Get appropriate document loader based on file extension
                loader = get_document_loader(file_path)
                if not loader:
                    logger.warning(f"Unsupported file type: {file_path}")
                    skipped_files.append(os.path.basename(file_path))
                    continue
                
                # Load and process the document
                loader_docs = loader.load()
                
                if not loader_docs:
                    logger.warning(f"No content extracted from: {file_path}")
                    skipped_files.append(os.path.basename(file_path))
                    continue
                
                # Split documents into chunks
                chunks = []
                for doc in loader_docs:
                    doc_chunks = text_splitter.split_documents([doc])
                    chunks.extend(doc_chunks)
                
                if not chunks:
                    logger.warning(f"No chunks created from: {file_path}")
                    skipped_files.append(os.path.basename(file_path))
                    continue
                
                # Log successful processing
                avg_chunk_length = sum(len(chunk.page_content) for chunk in chunks) / len(chunks)
                logger.info(f"Processed {file_path} into {len(chunks)} chunks with avg length: {avg_chunk_length:.0f}")
                batch_documents.extend(chunks)
                
            except Exception as e:
                logger.error(f"Error processing file {file_path}: {str(e)}")
                skipped_files.append(os.path.basename(file_path))
        
        # Add batch documents to total documents list
        documents.extend(batch_documents)
        logger.info(f"Batch complete. Total documents so far: {len(documents)}")
        
        # Update job progress with batch completion if job_id is provided
        if job_id:
            # Calculate progress based on processed files, not chunks
            processed_files = min((batch_idx + 1) * batch_size, total_files)
            update_job_progress(
                job_id,
                processed_files,
                f"Processed {processed_files}/{total_files} files"
            )
    
    logger.info(f"Document processing complete: {len(documents)} documents, {len(skipped_files)} skipped files")
    
    # Update job status if job_id is provided
    if job_id:
        update_job_progress(
            job_id,
            total_files,
            "Document processing complete"
        )
    
    return documents, skipped_files

# Metadata functions
def get_file_security_info(file_paths, upload_dir):
    """Get security classification information for files by reading their metadata files."""
    security_info = {}
    
    for file_path in file_paths:
        # Default classification if metadata file is not found
        default_classification = {
            "security_classification": "UNCLASSIFIED",
            "content_security_classification": "UNCLASSIFIED"
        }
        
        try:
            # Construct the path to the original file in the upload directory
            orig_file_path = os.path.join(upload_dir, file_path)
            
            # Construct the path to the metadata file
            metadata_file_path = f"{os.path.splitext(orig_file_path)[0]}.metadata"
            
            # Check if metadata file exists
            if os.path.exists(metadata_file_path):
                # Read metadata file
                with open(metadata_file_path, 'r') as f:
                    file_metadata = json.load(f)
                
                # Extract security classification from metadata
                security_classification = file_metadata.get("security_classification", "UNCLASSIFIED")
                
                # For content_security_classification, use the same as security_classification if not present
                content_security_classification = file_metadata.get(
                    "content_security_classification", 
                    security_classification
                )
                
                classification_info = {
                    "security_classification": security_classification,
                    "content_security_classification": content_security_classification
                }
                
                logger.info(f"Read security classification for {file_path}: {classification_info}")
                security_info[file_path] = classification_info
            else:
                logger.warning(f"No metadata file found for {file_path}, using default classification")
                security_info[file_path] = default_classification
        except Exception as e:
            logger.error(f"Error reading metadata for {file_path}: {str(e)}")
            security_info[file_path] = default_classification
    
    return security_info

def create_vectorstore_metadata(
    vs_id, 
    name, 
    description, 
    embedding_model, 
    file_infos, 
    use_paragraph_chunking=True,
    max_paragraph_length=1500,
    min_paragraph_length=50,
    chunk_size=1000, 
    chunk_overlap=100
):
    """Create metadata for a vector store."""
    return {
        "id": vs_id,
        "name": name,
        "description": description,
        "embedding_model": embedding_model,
        "created_at": datetime.now().isoformat(),
        "updated_at": None,
        "files": file_infos,
        "chunking_method": "paragraph" if use_paragraph_chunking else "fixed",
        "max_paragraph_length": max_paragraph_length if use_paragraph_chunking else None,
        "min_paragraph_length": min_paragraph_length if use_paragraph_chunking else None,
        "chunk_size": chunk_size if not use_paragraph_chunking else None,
        "chunk_overlap": chunk_overlap if not use_paragraph_chunking else None
    }

def save_metadata(metadata, file_path):
    """Save metadata to a JSON file."""
    with open(file_path, 'w') as f:
        json.dump(metadata, f, indent=2)

def load_metadata(file_path):
    """Load metadata from a JSON file."""
    if not os.path.exists(file_path):
        return None
    
    with open(file_path, 'r') as f:
        return json.load(f)

def update_metadata(metadata, file_path):
    """Update existing metadata and save it."""
    metadata["updated_at"] = datetime.now().isoformat()
    save_metadata(metadata, file_path)

# Vector store management
class VectorStoreManager:
    def __init__(self, base_dir):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
    
    def list_vectorstores(self):
        """List all vector stores."""
        vectorstores = []
        
        for vs_dir in self.base_dir.glob("*"):
            if not vs_dir.is_dir():
                continue
            
            metadata_file = vs_dir / "metadata.json"
            
            if not metadata_file.exists():
                continue
            
            try:
                metadata = load_metadata(metadata_file)
                
                if metadata:
                    # Add file count
                    metadata["file_count"] = len(metadata.get("files", []))
                    vectorstores.append(metadata)
            
            except Exception as e:
                logger.error(f"Error loading metadata from {metadata_file}: {str(e)}")
        
        return vectorstores
    
    def get_vectorstore_info(self, vs_id):
        """Get information about a specific vector store."""
        vs_dir = self.base_dir / vs_id
        
        if not vs_dir.exists() or not vs_dir.is_dir():
            return None
        
        metadata_file = vs_dir / "metadata.json"
        
        if not metadata_file.exists():
            return None
        
        try:
            return load_metadata(metadata_file)
        
        except Exception as e:
            logger.error(f"Error loading metadata from {metadata_file}: {str(e)}")
            return None
    
    def create_vectorstore(
        self,
        name: str,
        description: str,
        documents: List[Document],
        embedding_model: Any,
        embedding_model_name: str,
        file_infos: List[Dict[str, str]],
        chunking_method: str = "paragraph",
        max_paragraph_length: int = 1500,
        min_paragraph_length: int = 50,
        chunk_size: int = 1000,
        chunk_overlap: int = 100,
        batch_size: int = 1000,
        job_id: Optional[str] = None,
    ) -> str:
        """Create a new vector store from a list of documents."""
        if not documents:
            logger.error("No documents provided for vector store creation")
            return None
        
        try:
            # Generate a unique ID for the vector store
            vectorstore_id = str(uuid.uuid4())
            logger.info(f"Creating vector store with ID: {vectorstore_id}")
            
            # Create the directory for the vector store
            vs_dir = os.path.join(self.base_dir, vectorstore_id)
            
            # Check if directory already exists
            if os.path.exists(vs_dir):
                logger.warning(f"Vector store directory already exists: {vs_dir}, using a new ID")
                vectorstore_id = str(uuid.uuid4())
                vs_dir = os.path.join(self.base_dir, vectorstore_id)
            
            # Create directory
            os.makedirs(vs_dir, exist_ok=True)
            
            logger.info(f"Created directory for vector store {vectorstore_id}: {vs_dir}")
            
            # Process documents in batches and add to the vector store
            total_batches = math.ceil(len(documents) / batch_size)
            logger.info(f"Processing {len(documents)} documents in {total_batches} batches of size {batch_size}")
            
            # Initialize FAISS index
            try:
                logger.info(f"Initializing FAISS index for vector store {vectorstore_id}")
                vectorstore = None
                
                for i in range(total_batches):
                    start_idx = i * batch_size
                    end_idx = min((i + 1) * batch_size, len(documents))
                    batch = documents[start_idx:end_idx]
                    
                    logger.info(f"Processing batch {i+1}/{total_batches} with {len(batch)} documents")
                    
                    # Update job progress
                    if job_id:
                        progress = (end_idx / len(documents)) * 100
                        update_job_progress(job_id, progress, f"batch {i+1}/{total_batches}")
                    
                    # For the first batch, create the vector store
                    if i == 0:
                        logger.info(f"Creating initial FAISS vectorstore with {len(batch)} documents")
                        vectorstore = FAISS.from_documents(batch, embedding_model)
                    # For subsequent batches, add to the existing vector store
                    else:
                        logger.info(f"Adding batch {i+1} to FAISS vectorstore")
                        vectorstore.add_documents(batch)
                
                if not vectorstore:
                    logger.error(f"Failed to create vectorstore {vectorstore_id}: FAISS index initialization failed")
                    return None
                
                # Save the FAISS index directly in the vector store directory
                logger.info(f"Saving FAISS index to {vs_dir}")
                vectorstore.save_local(vs_dir)
                logger.info(f"FAISS index saved successfully for vector store {vectorstore_id}")
            
            except Exception as e:
                import traceback
                logger.error(f"Error processing documents for vector store {vectorstore_id}: {str(e)}")
                logger.error(f"Error details: {traceback.format_exc()}")
                
                # Clean up the vector store directory if creation failed
                try:
                    if os.path.exists(vs_dir):
                        shutil.rmtree(vs_dir)
                        logger.info(f"Cleaned up vector store directory after failure: {vs_dir}")
                except Exception as cleanup_error:
                    logger.error(f"Error cleaning up after failed vector store creation: {str(cleanup_error)}")
                
                return None
            
            # Create and save metadata
            metadata = {
                "id": vectorstore_id,
                "name": name,
                "description": description,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "document_count": len(documents),
                "embedding_model": embedding_model_name,
                "chunking_method": chunking_method,
                "chunk_size": chunk_size,
                "chunk_overlap": chunk_overlap,
                "max_paragraph_length": max_paragraph_length,
                "min_paragraph_length": min_paragraph_length,
                "files": file_infos
            }
            
            # Save metadata
            try:
                logger.info(f"Saving metadata for vector store {vectorstore_id}")
                metadata_path = os.path.join(vs_dir, "metadata.json")
                with open(metadata_path, "w") as f:
                    json.dump(metadata, f, indent=2)
                logger.info(f"Metadata saved successfully for vector store {vectorstore_id}")
            except Exception as e:
                logger.error(f"Error saving metadata for vector store {vectorstore_id}: {str(e)}")
                return None
            
            logger.info(f"Vector store created successfully: {vectorstore_id}")
            return vectorstore_id
            
        except Exception as e:
            import traceback
            logger.error(f"Error creating vector store: {str(e)}")
            logger.error(f"Error details: {traceback.format_exc()}")
            return None
    
    def update_vectorstore(
        self, 
        vectorstore_id, 
        documents, 
        embedding_model, 
        file_infos=None, 
        name=None, 
        description=None,
        batch_size=1000,
        job_id=None
    ):
        """Update an existing vector store with new documents.
        
        Args:
            vectorstore_id: ID of the vector store to update
            documents: List of new documents to add
            embedding_model: Embedding model to use
            file_infos: List of file information dictionaries for new files
            name: New name for the vector store (optional)
            description: New description for the vector store (optional)
            batch_size: Number of documents to process in each batch
            job_id: Job ID for tracking progress
        
        Returns:
            bool: True if the update was successful, False otherwise
        """
        vs_dir = self.base_dir / vectorstore_id
        
        # Check if vector store directory exists
        if not vs_dir.exists() or not vs_dir.is_dir():
            logger.error(f"Vector store directory not found: {vs_dir}")
            return False
        
        # Check for metadata file
        metadata_file = vs_dir / "metadata.json"
        if not metadata_file.exists():
            logger.error(f"Metadata file not found for vector store {vectorstore_id}")
            return False
        
        try:
            # Load existing metadata
            metadata = load_metadata(metadata_file)
            if not metadata:
                logger.error(f"Failed to load metadata for vector store {vectorstore_id}")
                return False
            
            # Update name and description if provided
            if name is not None:
                metadata["name"] = name
            
            if description is not None:
                metadata["description"] = description
            
            # Check if vector store directory exists
            if not vs_dir.exists():
                logger.error(f"Vector store directory not found: {vs_dir}")
                return False
            
            # Log contents of the directory to help with debugging
            try:
                index_files = list(vs_dir.glob("*"))
                logger.info(f"Vector store directory contents: {[str(f.name) for f in index_files]}")
            except Exception as e:
                logger.warning(f"Could not list directory contents: {str(e)}")
                
            # Verify that the embedding model is initialized properly
            logger.info(f"Using embedding model: {getattr(embedding_model, 'model', str(embedding_model))}")
            
            # Load existing vector store
            try:
                # Make sure embedding model is initialized
                if not embedding_model:
                    logger.error("Embedding model is None")
                    return False
                
                # Create a backup of the vector store first
                backup_dir = vs_dir.parent / f"{vectorstore_id}_backup_{int(time.time())}"
                try:
                    shutil.copytree(vs_dir, backup_dir)
                    logger.info(f"Created backup of vector store at {backup_dir}")
                except Exception as backup_e:
                    logger.warning(f"Could not create backup of vector store: {str(backup_e)}")
                
                # Load the vector store from the main directory
                vectorstore = FAISS.load_local(str(vs_dir), embedding_model)
                logger.info(f"Loaded existing vector store from {vs_dir}")
                
                # Verify the vector store was loaded correctly
                if not vectorstore:
                    logger.error("Vector store loaded as None")
                    return False
                
                if not hasattr(vectorstore, 'add_documents'):
                    logger.error(f"Loaded vector store doesn't have add_documents method: {type(vectorstore)}")
                    return False
            except Exception as e:
                logger.error(f"Error loading vector store {vectorstore_id}: {str(e)}")
                # Try to provide more details about what went wrong
                import traceback
                logger.error(f"Error details: {traceback.format_exc()}")
                return False
            
            # Add documents in batches
            total_documents = len(documents)
            logger.info(f"Adding {total_documents} documents to vector store in batches of {batch_size}")
            
            # If no documents to add, just update metadata and return
            if total_documents == 0:
                logger.info("No documents to add, just updating metadata")
                # Update metadata with new file information
                if file_infos:
                    metadata["files"].extend(file_infos)
                
                # Update timestamp
                metadata["updated_at"] = datetime.now().isoformat()
                
                # Save updated metadata
                save_metadata(metadata, metadata_file)
                logger.info(f"Saved updated metadata to {metadata_file}")
                
                if job_id:
                    update_job_progress(job_id, 0, "Vector store metadata updated (no documents added)")
                
                return True
            
            # Add documents in batches
            batches = [documents[i:i + batch_size] for i in range(0, len(documents), batch_size)]
            
            for batch_idx, batch in enumerate(batches):
                logger.info(f"Processing batch {batch_idx + 1}/{len(batches)}: {len(batch)} documents")
                
                try:
                    # Add documents from this batch
                    vectorstore.add_documents(batch)
                    logger.info(f"Added batch of {len(batch)} documents to vector store")
                    
                    # Update job progress if job_id is provided
                    if job_id:
                        # Calculate progress based on processed documents
                        processed_docs = min((batch_idx + 1) * batch_size, total_documents)
                        progress_percentage = (processed_docs / total_documents) * 100
                        update_job_progress(
                            job_id,
                            processed_docs,
                            f"Added {processed_docs}/{total_documents} documents ({progress_percentage:.1f}%)"
                        )
                    
                except Exception as e:
                    logger.error(f"Error processing batch {batch_idx}: {str(e)}")
                    # If job_id is provided, update job status with error
                    if job_id:
                        update_job_progress(
                            job_id,
                            (batch_idx * batch_size),
                            f"Error during batch processing: {str(e)}"
                        )
                    return False
            
            # Save the updated vector store
            vectorstore.save_local(str(vs_dir))
            logger.info(f"Saved updated vector store to {vs_dir}")
            
            # Update metadata with new file information
            if file_infos:
                metadata["files"].extend(file_infos)
            
            # Update timestamp
            metadata["updated_at"] = datetime.now().isoformat()
            
            # Save updated metadata
            save_metadata(metadata, metadata_file)
            logger.info(f"Saved updated metadata to {metadata_file}")
            
            # If job_id is provided, update job status to completed
            if job_id:
                update_job_progress(
                    job_id,
                    total_documents,
                    "Vector store update completed"
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating vector store {vectorstore_id}: {str(e)}")
            # If job_id is provided, update job status with error
            if job_id:
                fail_job(job_id, str(e))
            return False
    
    def delete_vectorstore(self, vs_id):
        """Delete a vector store."""
        vs_dir = self.base_dir / vs_id
        
        if not vs_dir.exists() or not vs_dir.is_dir():
            return False
        
        try:
            shutil.rmtree(vs_dir)
            return True
        
        except Exception as e:
            logger.error(f"Error deleting vector store {vs_id}: {str(e)}")
            return False

# Get vector store manager instance
def get_vectorstore_manager():
    return VectorStoreManager(Path(VECTORSTORE_DIR))

# Define the API routes
@app.get("/api/embedding/models", response_model=List[EmbeddingModelInfo])
async def get_models():
    """Get a list of available embedding models."""
    return get_available_embedding_models()

@app.get("/api/embedding/vectorstores", response_model=List[VectorStoreInfo])
async def list_vectorstores(manager: VectorStoreManager = Depends(get_vectorstore_manager)):
    """Get a list of all vector stores."""
    return manager.list_vectorstores()

@app.get("/api/embedding/vectorstores/{vectorstore_id}", response_model=VectorStoreDetailInfo)
async def get_vectorstore(vectorstore_id: str, manager: VectorStoreManager = Depends(get_vectorstore_manager)):
    """Get details of a specific vector store."""
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    return vs_info

def cleanup_staged_files(staged_file_paths):
    """Remove staged files after they have been processed and added to a vectorstore.
    
    Args:
        staged_file_paths: List of file paths in the staging directory to be removed
    
    Returns:
        tuple: (success_count, error_count) - Number of files successfully removed and failed to remove
    """
    success_count = 0
    error_count = 0
    
    for file_path in staged_file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Removed staged file: {file_path}")
                success_count += 1
            else:
                logger.warning(f"Staged file not found for cleanup: {file_path}")
                error_count += 1
        except Exception as e:
            logger.error(f"Error removing staged file {file_path}: {str(e)}")
            error_count += 1
    
    logger.info(f"Cleanup complete: {success_count} files removed, {error_count} errors")
    return success_count, error_count

@app.post("/api/embedding/vectorstores", response_model=CreateVectorStoreResponse)
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

async def process_vectorstore_creation(job_id: str, request: CreateVectorStoreRequest, manager: VectorStoreManager):
    """Background task for processing vector store creation."""
    # Initialize start_time for tracking creation duration
    start_time = time.time()
    
    file_mapping = None
    try:
        # Initialize the embedding model
        logger.info(f"Initializing embedding model: {request.embedding_model}")
        embedding_model = get_embedding_model(request.embedding_model)
        embedding_model_name = request.embedding_model
        
        if not embedding_model:
            fail_job(job_id, f"Failed to initialize embedding model: {request.embedding_model}")
            return
        
        # Set up directories
        upload_dir = Path(UPLOAD_DIR)
        staging_dir = Path(DOC_STAGING_DIR)
        
        if not upload_dir.exists():
            logger.warning(f"Upload directory does not exist: {upload_dir}")
            upload_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created upload directory: {upload_dir}")
        
        if not staging_dir.exists():
            logger.warning(f"Staging directory does not exist: {staging_dir}")
            staging_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created staging directory: {staging_dir}")
        
        # Copy files to staging directory
        file_mapping = copy_files_to_staging(
            request.files,
            upload_dir,
            staging_dir
        )
        
        if not file_mapping:
            fail_job(job_id, "No valid files found")
            return
        
        # Update job progress
        update_job_progress(job_id, 10, "processing files")
        
        # Get chunking parameters
        use_paragraph_chunking = request.use_paragraph_chunking
        chunking_method = "paragraph" if use_paragraph_chunking else "fixed"
        max_paragraph_length = request.max_paragraph_length
        min_paragraph_length = request.min_paragraph_length
        chunk_size = request.chunk_size
        chunk_overlap = request.chunk_overlap
        
        # Log chunking parameters
        logger.info(f"Chunking parameters: method={chunking_method}, "
                    f"max_paragraph_length={max_paragraph_length}, min_paragraph_length={min_paragraph_length}, "
                    f"chunk_size={chunk_size}, chunk_overlap={chunk_overlap}")
        
        # Verify staging dir exists and has the files
        try:
            staged_files = list(staging_dir.glob("*"))
            logger.info(f"Files in staging directory: {[f.name for f in staged_files]}")
            
            # Check that all files in file_mapping exist in staging dir
            for staged_path in file_mapping.values():
                staged_file = Path(staged_path)
                if not staged_file.exists():
                    logger.warning(f"Staged file not found: {staged_file}")
        except Exception as e:
            logger.warning(f"Error checking staging directory: {str(e)}")
        
        # Load and process documents with batch processing if enabled
        try:
            documents, skipped_files = load_documents(
                list(file_mapping.values()),
                use_paragraph_chunking=use_paragraph_chunking,
                max_paragraph_length=max_paragraph_length,
                min_paragraph_length=min_paragraph_length,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                batch_size=request.file_batch_size if request.batch_processing else len(file_mapping),
                job_id=job_id  # Pass job_id for progress tracking
            )
            
            logger.info(f"Document loading completed: {len(documents)} documents extracted, {len(skipped_files)} files skipped")
            
            if skipped_files:
                logger.warning(f"Skipped files: {skipped_files}")
        except Exception as e:
            import traceback
            logger.error(f"Error loading documents: {str(e)}")
            logger.error(f"Error details: {traceback.format_exc()}")
            fail_job(job_id, f"Error loading documents: {str(e)}")
            cleanup_staged_files(list(file_mapping.values()))
            return
        
        if not documents:
            fail_job(job_id, "No valid documents could be processed")
            cleanup_staged_files(list(file_mapping.values()))
            return
        
        # Update job with actual document count for progress tracking
        job = get_job_status(job_id)
        if job:
            job.total_items = len(documents)
            job.status = "creating vector store"
        
        # Get security classifications
        try:
            security_info = get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
            logger.info(f"Retrieved security info for {len(security_info)} files for job {job_id}")
        except Exception as e:
            logger.warning(f"Error getting security info for job {job_id}: {str(e)}")
            security_info = {}
        
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
        logger.info(f"Starting vector store creation with {len(documents)} documents for job {job_id}")
        try:
            vectorstore_id = manager.create_vectorstore(
                name=request.name,
                description=request.description,
                documents=documents,
                embedding_model=embedding_model,
                embedding_model_name=embedding_model_name,
                chunking_method=chunking_method,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                max_paragraph_length=max_paragraph_length,
                min_paragraph_length=min_paragraph_length,
                file_infos=file_infos,
                batch_size=request.doc_batch_size if request.batch_processing else len(documents),
                job_id=job_id,  # Pass job_id for progress tracking
            )
            
            creation_time = time.time() - start_time
            logger.info(f"Vector store creation completed for job {job_id}: "
                        f"ID={vectorstore_id}, creation time: {creation_time:.2f} seconds")
        except Exception as e:
            import traceback
            logger.error(f"Error creating vector store for job {job_id}: {str(e)}")
            logger.error(f"Error details: {traceback.format_exc()}")
            fail_job(job_id, f"Error creating vector store: {str(e)}")
            cleanup_staged_files(list(file_mapping.values()))
            return
        
        # Clean up staged files
        success_count, error_count = cleanup_staged_files(list(file_mapping.values()))
        logger.info(f"Cleaned up {success_count} staged files after creating vectorstore {vectorstore_id} for job {job_id}")
        if error_count > 0:
            logger.warning(f"Failed to clean up {error_count} staged files for job {job_id}")
        
        # Mark job as completed
        result = {
            "vectorstore_id": vectorstore_id,
            "name": request.name,
            "document_count": len(documents),
            "embedding_model": embedding_model_name,
            "skipped_files": skipped_files
        }
        complete_job(job_id, result)
        logger.info(f"Job {job_id} completed successfully: created vector store {vectorstore_id}")
        
    except Exception as e:
        import traceback
        logger.error(f"Error in background processing for job {job_id}: {str(e)}")
        logger.error(f"Error details: {traceback.format_exc()}")
        fail_job(job_id, str(e))
        # Attempt to clean up any staged files
        try:
            if file_mapping:
                cleanup_staged_files(list(file_mapping.values()))
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up after failed job {job_id}: {str(cleanup_error)}")

@app.post("/api/embedding/vectorstores/{vectorstore_id}/update", response_model=UpdateVectorStoreResponse)
async def update_vectorstore(
    vectorstore_id: str,
    request: UpdateVectorStoreRequest,
    background_tasks: BackgroundTasks,
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
        # Register a new job for this operation
        job_id = register_job(
            operation_type="update_vectorstore",
            total_items=len(request.files),
            details={
                "vectorstore_id": vectorstore_id,
                "name": vs_info["name"],
                "new_name": request.name,
                "description": vs_info["description"],
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

async def process_vectorstore_update(
    job_id: str,
    vectorstore_id: str,
    request: UpdateVectorStoreRequest,
    manager: VectorStoreManager,
    vs_info: Dict[str, Any]
):
    """Background task for processing vector store updates."""
    file_mapping = None
    try:
        # Get the embedding model
        embedding_model_name = vs_info["embedding_model"]
        logger.info(f"Using embedding model: {embedding_model_name}")
        embedding_model = get_embedding_model(embedding_model_name)
        
        if not embedding_model:
            fail_job(job_id, f"Failed to initialize embedding model: {embedding_model_name}")
            return
            
        # Set up directories
        upload_dir = Path(UPLOAD_DIR)
        staging_dir = Path(DOC_STAGING_DIR)
        
        # Copy files to staging directory
        file_mapping = copy_files_to_staging(
            request.files,
            upload_dir,
            staging_dir
        )
        
        if not file_mapping:
            fail_job(job_id, "No valid files found")
            return
        
        # Update job progress
        update_job_progress(job_id, 0, "processing files")
        
        # Get chunking parameters
        use_paragraph_chunking = vs_info.get("chunking_method", "paragraph") == "paragraph"
        max_paragraph_length = vs_info.get("max_paragraph_length", 1500)
        min_paragraph_length = vs_info.get("min_paragraph_length", 50)
        chunk_size = vs_info.get("chunk_size", 1000)
        chunk_overlap = vs_info.get("chunk_overlap", 100)
        
        # Log chunking parameters
        logger.info(f"Chunking parameters: method={'paragraph' if use_paragraph_chunking else 'fixed'}, "
                    f"max_paragraph_length={max_paragraph_length}, min_paragraph_length={min_paragraph_length}, "
                    f"chunk_size={chunk_size}, chunk_overlap={chunk_overlap}")
        
        # Verify staging dir exists and has the files
        try:
            staged_files = list(staging_dir.glob("*"))
            logger.info(f"Files in staging directory: {[f.name for f in staged_files]}")
            
            # Check that all files in file_mapping exist in staging dir
            for staged_path in file_mapping.values():
                staged_file = Path(staged_path)
                if not staged_file.exists():
                    logger.warning(f"Staged file not found: {staged_file}")
        except Exception as e:
            logger.warning(f"Error checking staging directory: {str(e)}")
        
        # Load and process documents with batch processing if enabled
        try:
            documents, skipped_files = load_documents(
                list(file_mapping.values()),
                use_paragraph_chunking=use_paragraph_chunking,
                max_paragraph_length=max_paragraph_length,
                min_paragraph_length=min_paragraph_length,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                batch_size=request.file_batch_size if request.batch_processing else len(file_mapping),
                job_id=job_id  # Pass job_id for progress tracking
            )
            
            logger.info(f"Document loading completed: {len(documents)} documents extracted, {len(skipped_files)} files skipped")
            
            if skipped_files:
                logger.warning(f"Skipped files: {skipped_files}")
        except Exception as e:
            import traceback
            logger.error(f"Error loading documents: {str(e)}")
            logger.error(f"Error details: {traceback.format_exc()}")
            fail_job(job_id, f"Error loading documents: {str(e)}")
            cleanup_staged_files(list(file_mapping.values()))
            return
        
        if not documents:
            fail_job(job_id, "No valid documents could be processed")
            cleanup_staged_files(list(file_mapping.values()))
            return
        
        # Update job with actual document count for progress tracking
        job = get_job_status(job_id)
        if job:
            job.total_items = len(documents)
            job.status = "updating vector store"
        
        # Get security classifications
        try:
            security_info = get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
            logger.info(f"Retrieved security info for {len(security_info)} files")
        except Exception as e:
            logger.warning(f"Error getting security info: {str(e)}")
            security_info = {}
        
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
        
        # Update vector store name and description if provided
        update_params = {}
        if request.name is not None:
            update_params["name"] = request.name
        if request.description is not None:
            update_params["description"] = request.description
        
        # Update the vector store with new documents
        logger.info(f"Starting vector store update with {len(documents)} documents")
        success = manager.update_vectorstore(
            vectorstore_id,
            documents=documents,
            embedding_model=embedding_model,
            file_infos=file_infos,
            batch_size=request.doc_batch_size if request.batch_processing else len(documents),
            job_id=job_id,  # Pass job_id for progress tracking
            **update_params
        )
        
        if not success:
            fail_job(job_id, f"Error updating vector store {vectorstore_id}")
            cleanup_staged_files(list(file_mapping.values()))
            return
        
        # Clean up staged files
        staged_files = list(file_mapping.values())
        success_count, error_count = cleanup_staged_files(staged_files)
        logger.info(f"Cleaned up {success_count} staged files after updating vectorstore {vectorstore_id}")
        
        # Mark job as completed
        result = {
            "vectorstore_id": vectorstore_id,
            "name": request.name if request.name else vs_info["name"],
            "document_count": len(documents),
            "skipped_files": skipped_files
        }
        complete_job(job_id, result)
        logger.info(f"Job {job_id} completed successfully: updated vector store {vectorstore_id}")
        
    except Exception as e:
        import traceback
        logger.error(f"Error in background processing for job {job_id}: {str(e)}")
        logger.error(f"Error details: {traceback.format_exc()}")
        fail_job(job_id, str(e))
        # Attempt to clean up any staged files
        try:
            if 'file_mapping' in locals() and file_mapping:
                cleanup_staged_files(list(file_mapping.values()))
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up after failed job {job_id}: {str(cleanup_error)}")

@app.delete("/api/embedding/vectorstores/{vectorstore_id}")
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
    
    # Clean up any staged files associated with this vectorstore
    if vs_info and "files" in vs_info:
        staged_files = [file_info.get("staged_path") for file_info in vs_info.get("files", []) if "staged_path" in file_info]
        if staged_files:
            success_count, error_count = cleanup_staged_files(staged_files)
            logger.info(f"Cleaned up {success_count} staged files after deleting vectorstore {vectorstore_id}")
    
    return {
        "success": True,
        "message": f"Vector store {vectorstore_id} deleted successfully"
    }

@app.get("/api/embedding/files")
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

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

# Add a new endpoint to clean up orphaned staged files
@app.post("/api/embedding/cleanup-staging")
async def cleanup_staging():
    """Cleanup orphaned files in the staging directory."""
    staging_dir = Path(DOC_STAGING_DIR)
    vectorstore_dir = Path(VECTORSTORE_DIR)
    
    # Get all staged files
    staged_files = [f for f in staging_dir.glob("*") if f.is_file() and not f.name.startswith(".")]
    
    # Get all referenced staged files from all vectorstores
    manager = get_vectorstore_manager()
    all_vectorstores = manager.list_vectorstores()
    
    referenced_files = set()
    for vs in all_vectorstores:
        for file_info in vs.get("files", []):
            if "staged_path" in file_info:
                referenced_files.add(file_info["staged_path"])
    
    # Find orphaned files (files in staging that aren't referenced by any vectorstore)
    orphaned_files = []
    for file_path in staged_files:
        if str(file_path) not in referenced_files:
            orphaned_files.append(str(file_path))
    
    # Clean up orphaned files
    success_count, error_count = cleanup_staged_files(orphaned_files)
    
    return {
        "success": True,
        "message": f"Cleaned up {success_count} orphaned files from staging directory",
        "files_removed": success_count,
        "errors": error_count
    }

@app.get("/api/embedding/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status_endpoint(job_id: str):
    """Get the status of a job by its ID."""
    job = get_job_status(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    # Calculate progress percentage
    progress_percentage = 0
    if job.total_items > 0:
        progress_percentage = (job.processed_items / job.total_items) * 100
    
    # Return the job status with progress percentage
    return {
        "job_id": job.job_id,
        "status": job.status,
        "operation_type": job.operation_type,
        "total_items": job.total_items,
        "processed_items": job.processed_items,
        "progress_percentage": round(progress_percentage, 2),
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "result": job.result,
        "error": job.error
    }

def get_text_splitter(
    use_paragraph_chunking=True,
    max_paragraph_length=1500,
    min_paragraph_length=50,
    chunk_size=1000,
    chunk_overlap=100
):
    """Create the appropriate text splitter based on the chunking method.
    
    Args:
        use_paragraph_chunking: Whether to use paragraph-based chunking
        max_paragraph_length: Maximum length of paragraphs for paragraph chunking
        min_paragraph_length: Minimum length of paragraphs for paragraph chunking
        chunk_size: Size of chunks for traditional chunking
        chunk_overlap: Overlap between chunks for traditional chunking
    
    Returns:
        TextSplitter: The configured text splitter
    """
    if use_paragraph_chunking:
        text_splitter = ParagraphTextSplitter(
            max_paragraph_length=max_paragraph_length,
            min_paragraph_length=min_paragraph_length
        )
        logger.info(f"Using paragraph-based chunking with max length: {max_paragraph_length}, min length: {min_paragraph_length}")
    else:
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len
        )
        logger.info(f"Using traditional chunking with chunk size: {chunk_size}, overlap: {chunk_overlap}")
    
    return text_splitter

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    score_threshold: float = 0.5

@app.post("/api/embedding/vectorstores/{vectorstore_id}/query")
async def query_vectorstore(
    vectorstore_id: str,
    query_request: QueryRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Query a vector store to retrieve relevant document chunks."""
    # Check if vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    try:
        # Get the vector store path
        vs_dir = os.path.join(manager.base_dir, vectorstore_id)
        
        # Get the embedding model based on the vector store's metadata
        embedding_model_name = vs_info.get('embedding_model', 'nomic-embed-text')
        embedding_model = get_embedding_model(embedding_model_name)
        
        # Load the vector store
        try:
            vectorstore = FAISS.load_local(vs_dir, embedding_model, allow_dangerous_deserialization=True)
        except Exception as e:
            logger.error(f"Error loading vector store {vectorstore_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error loading vector store: {str(e)}")
        
        # Perform similarity search
        results = vectorstore.similarity_search_with_score(
            query_request.query,
            k=query_request.top_k
        )
        
        # Format and filter results
        formatted_results = []
        for doc, score in results:
            # Convert score to similarity score (assuming distance is between 0 and 2, with 0 being identical)
            # This assumes the scoring is cosine distance
            similarity_score = 1 - (score / 2.0)
            
            # Filter by score threshold
            if similarity_score >= query_request.score_threshold:
                formatted_results.append({
                    "text": doc.page_content,
                    "metadata": doc.metadata,
                    "score": similarity_score
                })
        
        return formatted_results
        
    except Exception as e:
        logger.error(f"Error querying vector store {vectorstore_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error querying vector store: {str(e)}")

def migrate_index_files():
    """
    Migrate vector store index files from index subdirectories to main vector store directories.
    This is a one-time migration to fix the directory structure.
    """
    logger.info("Starting migration of vector store index files...")
    vs_dir = Path(VECTORSTORE_DIR)
    
    # Get all vector store directories
    for vs_path in vs_dir.glob("*"):
        if not vs_path.is_dir():
            continue
        
        vectorstore_id = vs_path.name
        index_subdir = vs_path / "index"
        
        # Check if the index subdirectory exists
        if index_subdir.exists() and index_subdir.is_dir():
            logger.info(f"Found index subdirectory for vector store {vectorstore_id}")
            
            # Check for index.faiss and index.pkl files in the subdirectory
            index_faiss = index_subdir / "index.faiss"
            index_pkl = index_subdir / "index.pkl"
            
            if index_faiss.exists() and index_pkl.exists():
                logger.info(f"Moving index files from {index_subdir} to {vs_path}")
                
                try:
                    # Copy the files to the main directory
                    shutil.copy2(index_faiss, vs_path / "index.faiss")
                    shutil.copy2(index_pkl, vs_path / "index.pkl")
                    
                    # Create a backup of the index subdirectory
                    backup_dir = vs_path / f"index_backup_{int(time.time())}"
                    shutil.copytree(index_subdir, backup_dir)
                    
                    logger.info(f"Successfully migrated index files for vector store {vectorstore_id}")
                except Exception as e:
                    logger.error(f"Error migrating index files for vector store {vectorstore_id}: {str(e)}")
    
    logger.info("Migration of vector store index files completed")

# Run migration on startup
@app.on_event("startup")
async def startup_event():
    """Run migration tasks when the app starts."""
    migrate_index_files()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=HOST, port=PORT, reload=True)

