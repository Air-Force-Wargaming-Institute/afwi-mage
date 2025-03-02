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
import gc  # Add garbage collection module
import re  # Add regular expression module

# Configure logging first before any other operations
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("embedding_service")

# Flag to enable very verbose logging (full document contexts)
DEBUG_LOG_DOCUMENTS = os.environ.get("DEBUG_LOG_DOCUMENTS", "true").lower() == "true"

# Add LRU cache for vector stores
from functools import lru_cache

# Import for monitoring GPU usage
import psutil
try:
    import GPUtil
    GPUS_AVAILABLE = len(GPUtil.getGPUs()) > 0
except ImportError:
    GPUS_AVAILABLE = False
    logger.warning("GPUtil not available for GPU monitoring")
    pass

# Add torch GPU check
try:
    import torch
    TORCH_CUDA_AVAILABLE = torch.cuda.is_available()
    if TORCH_CUDA_AVAILABLE:
        logger.info(f"PyTorch CUDA available: {TORCH_CUDA_AVAILABLE}")
        logger.info(f"CUDA device count: {torch.cuda.device_count()}")
        logger.info(f"CUDA device name: {torch.cuda.get_device_name(0)}")
        # Set PyTorch to use CUDA
        torch.cuda.set_device(0)
except Exception as e:
    logger.warning(f"Error checking PyTorch CUDA: {str(e)}")
    TORCH_CUDA_AVAILABLE = False

# Update the FAISS import to use GPU if available
if TORCH_CUDA_AVAILABLE:
    try:
        import faiss
        # Check if faiss has GPU support (faiss-gpu)
        has_faiss_gpu = hasattr(faiss, 'StandardGpuResources')
        # Try to enable StandardGpuResources if GPU support is available
        if has_faiss_gpu:
            try:
                res = faiss.StandardGpuResources()
                logger.info("FAISS GPU resources initialized successfully")
            except Exception as e:
                logger.warning(f"Could not initialize FAISS GPU resources: {str(e)}")
                has_faiss_gpu = False
        else:
            logger.info("Using FAISS CPU version. GPU acceleration for vector operations will not be available.")
    except Exception as e:
        logger.warning(f"Error importing FAISS: {str(e)}")
        has_faiss_gpu = False
else:
    logger.info("CUDA not available. Using CPU-only mode for FAISS.")
    import faiss
    has_faiss_gpu = False

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

# Add LangChain imports for LLM integration
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser

# Constants for LLM integration
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:latest")
LLM_TEMPERATURE = float(os.environ.get("LLM_TEMPERATURE", "0.2"))
LLM_TOP_P = float(os.environ.get("LLM_TOP_P", "0.9"))
LLM_TOP_K = int(os.environ.get("LLM_TOP_K", "40"))
LLM_CONTEXT_WINDOW = int(os.environ.get("LLM_CONTEXT_WINDOW", "16000"))
LLM_REPEAT_PENALTY = float(os.environ.get("LLM_REPEAT_PENALTY", "1.1"))

# Set USE_GPU based on environment and detected capabilities
USE_GPU = os.getenv("USE_GPU", "true").lower() in ("true", "1", "t") and (GPUS_AVAILABLE or TORCH_CUDA_AVAILABLE)
GPU_LAYERS = int(os.environ.get("GPU_LAYERS", "99"))  # Use all available layers by default

# Check if GPU is available
def check_gpu_available():
    """Check if GPU is available and log information about it"""
    gpu_available = False
    
    # Check GPU with GPUtil
    if GPUS_AVAILABLE:
        try:
            gpus = GPUtil.getGPUs()
            for i, gpu in enumerate(gpus):
                logger.info(f"GPU {i}: {gpu.name}, Memory: {gpu.memoryUsed}MB / {gpu.memoryTotal}MB ({gpu.memoryUtil*100:.1f}%)")
            gpu_available = len(gpus) > 0
        except Exception as e:
            logger.warning(f"Error checking GPU with GPUtil: {str(e)}")
    else:
        logger.warning("GPUtil not available, falling back to PyTorch CUDA check")
    
    # Check GPU with PyTorch
    if TORCH_CUDA_AVAILABLE:
        try:
            device_count = torch.cuda.device_count()
            if device_count > 0:
                gpu_available = True
                logger.info(f"PyTorch detected {device_count} CUDA device(s)")
                # Print device properties
                for i in range(device_count):
                    device_name = torch.cuda.get_device_name(i)
                    device_capability = torch.cuda.get_device_capability(i)
                    logger.info(f"CUDA device {i}: {device_name}, Compute capability: {device_capability}")
        except Exception as e:
            logger.warning(f"Error checking PyTorch CUDA: {str(e)}")
    
    return gpu_available

# Log GPU availability
gpu_available = check_gpu_available()
logger.info(f"GPU available: {gpu_available}")

# Initialize LLM with GPU support if available
logger.info(f"Initializing LLM with: Model={OLLAMA_MODEL}, Base URL={OLLAMA_BASE_URL}")
logger.info(f"LLM settings: Temperature={LLM_TEMPERATURE}, Context Window={LLM_CONTEXT_WINDOW}")
try:
    llm = ChatOllama(
        base_url=OLLAMA_BASE_URL,
        model=OLLAMA_MODEL,
        temperature=LLM_TEMPERATURE,
        context_window=LLM_CONTEXT_WINDOW,
        top_k=LLM_TOP_K,
        top_p=LLM_TOP_P,
        repeat_penalty=LLM_REPEAT_PENALTY,
        num_gpu=GPU_LAYERS if USE_GPU and gpu_available else 0,  # Only use GPU if available and enabled
        num_thread=1 if USE_GPU and gpu_available else 4,  # Fewer CPU threads when using GPU
        f16=True  # Use half precision for better GPU performance
    )
    logger.info(f"Successfully initialized LLM")
except Exception as e:
    logger.error(f"Failed to initialize LLM: {str(e)}")
    raise

logger.info(f"Initialized LLM with model: {OLLAMA_MODEL}, GPU enabled: {USE_GPU and gpu_available}")

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

def update_job_progress(job_id: str, processed_items: int, status: str = None, current_file: str = None, current_operation: str = None):
    """Update the progress of a job."""
    if job_id not in job_progress:
        logger.warning(f"Attempted to update non-existent job {job_id}")
        return False
    
    job = job_progress[job_id]
    job.processed_items = processed_items
    
    if status:
        job.status = status
    
    # Add detailed information about what's currently being processed
    if current_file or current_operation:
        if 'current_progress' not in job.details:
            job.details['current_progress'] = {}
            
        if current_file:
            job.details['current_progress']['current_file'] = current_file
            
        if current_operation:
            job.details['current_progress']['current_operation'] = current_operation
    
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
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
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
    chunk_size: Optional[int] = 1000
    chunk_overlap: Optional[int] = 100

class VectorStoreDetailInfo(BaseModel):
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
    chunk_size: Optional[int] = 1000
    chunk_overlap: Optional[int] = 100
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
    details: Optional[Dict[str, Any]] = None  # Include optional details field

class RemoveDocumentsRequest(BaseModel):
    document_ids: List[str]

class RemoveDocumentsResponse(BaseModel):
    success: bool
    message: str
    job_id: Optional[str] = None
    removed_count: int = 0

class BatchUpdateRequest(BaseModel):
    add: Optional[List[str]] = None  # Document paths to add
    remove: Optional[List[str]] = None  # Document IDs to remove
    name: Optional[str] = None  # Optional new name
    description: Optional[str] = None  # Optional new description
    batch_processing: bool = True
    file_batch_size: int = 5
    doc_batch_size: int = 1000

class BatchUpdateResponse(BaseModel):
    success: bool
    message: str
    job_id: Optional[str] = None
    skipped_files: Optional[List[str]] = None
    removed_count: int = 0

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
    job_id=None,
    security_info=None  # Add optional security_info parameter to pass pre-loaded IDs
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
        security_info: Optional pre-loaded security info with document IDs
    
    Returns:
        tuple: (documents, skipped_files)
    """
    total_files = len(file_paths)
    logger.info(f"Processing {total_files} files in batches of {batch_size}")
    
    documents = []
    skipped_files = []
    document_id_map = {}  # Track document IDs for better debugging
    
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
            
            # Update progress
            if job_id:
                update_job_progress(
                    job_id,
                    current_file_idx,
                    f"Processing file {current_file_idx + 1}/{total_files}",
                    current_file=os.path.basename(file_path),
                    current_operation="loading"
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
                
                # Get document ID from metadata file or security info if provided
                file_name = os.path.basename(file_path)
                document_id = None
                metadata_document_id = None  # Track the ID from metadata specifically
                
                # First check if we have a document ID in the provided security_info
                if security_info and file_path in security_info:
                    metadata_document_id = security_info[file_path].get("document_id")
                    if metadata_document_id:
                        document_id = metadata_document_id
                        logger.info(f"Using document_id {document_id} from security info for {file_path}")
                
                # If no ID found in security_info, try to get document_id from metadata file
                if not document_id:
                    try:
                        metadata_path = f"{os.path.splitext(file_path)[0]}.metadata"
                        if os.path.exists(metadata_path):
                            with open(metadata_path, 'r') as f:
                                file_metadata = json.load(f)
                                metadata_document_id = file_metadata.get("document_id")
                                if metadata_document_id:
                                    document_id = metadata_document_id
                                    logger.info(f"Found document_id {document_id} in metadata for {file_path}")
                    except Exception as e:
                        logger.warning(f"Could not read document_id from metadata: {str(e)}")
                
                # Only generate a document_id if none was found in metadata or security_info
                if not document_id:
                    document_id = f"doc_{uuid.uuid4()}"  # Changed prefix from 'generated_' to 'doc_' for clarity
                    logger.info(f"Generated new document_id {document_id} for {file_path}")
                else:
                    logger.info(f"Using metadata document_id {document_id} for {file_path}")
                
                # Store in our ID map for reference
                document_id_map[file_path] = document_id
                logger.info(f"Using document_id {document_id} for file: {os.path.basename(file_path)}")
                
                # Split documents into chunks
                chunks = []
                for doc in loader_docs:
                    # Add document_id to metadata
                    if "metadata" not in doc or not isinstance(doc.metadata, dict):
                        doc.metadata = {}
                    doc.metadata["document_id"] = document_id  # Use consistent document_id
                    doc.metadata["original_filename"] = os.path.basename(file_path)
                    # If we have a metadata ID, store it separately for cross-reference
                    if metadata_document_id and metadata_document_id != document_id:
                        doc.metadata["metadata_document_id"] = metadata_document_id
                    
                    doc_chunks = text_splitter.split_documents([doc])
                    
                    # Ensure each chunk has the document_id
                    for i, chunk in enumerate(doc_chunks):
                        # Ensure the document_id is consistent
                        chunk.metadata["document_id"] = document_id
                        chunk.metadata["chunk_id"] = f"{document_id}_{i}"
                        chunk.metadata["original_filename"] = os.path.basename(file_path)
                        # If we have a metadata ID, store it separately for cross-reference
                        if metadata_document_id and metadata_document_id != document_id:
                            chunk.metadata["metadata_document_id"] = metadata_document_id
                    
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
            
            # Get a summary of files processed in this batch without using batch_start/batch_end
            current_batch_files = [
                os.path.basename(file_paths[i]) 
                for i in range(batch_idx * batch_size, min((batch_idx + 1) * batch_size, total_files))
            ]
            batch_summary = ", ".join(current_batch_files[:3])
            if len(current_batch_files) > 3:
                batch_summary += f"... and {len(current_batch_files) - 3} more"
                
            update_job_progress(
                job_id,
                processed_files,
                f"Processed {processed_files}/{total_files} files",
                current_operation="chunking",
                current_file=batch_summary
            )
    
    logger.info(f"Document processing complete: {len(documents)} documents, {len(skipped_files)} skipped files")
    # Log document IDs in a clearer format
    logger.info(f"Document ID mapping summary:")
    for file_path, doc_id in document_id_map.items():
        logger.info(f"  File: {os.path.basename(file_path)} -> ID: {doc_id}")
    
    # Update job status if job_id is provided
    if job_id:
        update_job_progress(
            job_id,
            total_files,
            "Document processing complete",
            current_operation="complete"
        )
    
    return documents, skipped_files

# Metadata functions
def get_file_security_info(file_paths, upload_dir):
    """Get security classification and document ID information for files by reading their metadata files."""
    security_info = {}
    
    for file_path in file_paths:
        # Default classification if metadata file is not found
        default_classification = {
            "security_classification": "UNCLASSIFIED",
            "content_security_classification": "UNCLASSIFIED",
            "document_id": f"generated_{uuid.uuid4()}"  # Generate a fallback ID if none exists
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
                
                # Extract document ID or generate one if not present (for backward compatibility)
                document_id = file_metadata.get("document_id", f"generated_{uuid.uuid4()}")
                
                classification_info = {
                    "security_classification": security_classification,
                    "content_security_classification": content_security_classification,
                    "document_id": document_id
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
                    # Add directory name for backup detection
                    metadata["directory"] = vs_dir.name
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
            metadata = load_metadata(metadata_file)
            if metadata:
                # Add directory name for backup detection
                metadata["directory"] = vs_dir.name
            return metadata
        
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
        # Log start of operation
        log_system_resources(f"before create_vectorstore {name}")
        
        # Generate a unique ID for the vector store
        vs_id = str(uuid.uuid4())
        vs_dir = os.path.join(self.base_dir, vs_id)
        os.makedirs(vs_dir, exist_ok=True)
        
        # Create FAISS index with GPU support if available
        try:
            if TORCH_CUDA_AVAILABLE and has_faiss_gpu and os.getenv("USE_GPU", "true").lower() in ("true", "1", "t"):
                logger.info(f"Creating FAISS vector store with GPU acceleration")
                # Process in smaller batches to avoid GPU memory issues
                processed_docs = 0
                total_docs = len(documents)
                all_embeddings = []
                all_metadatas = []
                all_texts = []
                
                # Process documents in batches
                for i in range(0, total_docs, batch_size):
                    batch_end = min(i + batch_size, total_docs)
                    batch_docs = documents[i:batch_end]
                    
                    # Extract texts and metadatas
                    texts = [doc.page_content for doc in batch_docs]
                    metadatas = [doc.metadata for doc in batch_docs]
                    
                    # Get embeddings
                    embeddings = embedding_model.embed_documents(texts)
                    
                    # Store for later processing
                    all_embeddings.extend(embeddings)
                    all_metadatas.extend(metadatas)
                    all_texts.extend(texts)
                    
                    # Update progress
                    processed_docs += len(batch_docs)
                    if job_id:
                        update_job_progress(job_id, processed_docs)
                    
                    # Log progress
                    logger.info(f"Vectorized batch {i//batch_size + 1}/{math.ceil(total_docs/batch_size)}, "
                               f"{processed_docs}/{total_docs} documents processed")
                    
                    # Force garbage collection
                    gc.collect()
                    if TORCH_CUDA_AVAILABLE:
                        torch.cuda.empty_cache()
                
                # Create FAISS index
                dimension = len(all_embeddings[0])
                index = faiss.IndexFlatL2(dimension)
                
                # Use GPU index if available
                if TORCH_CUDA_AVAILABLE and has_faiss_gpu:
                    try:
                        # Try to use GPU index
                        gpu_index = faiss.index_cpu_to_gpu(res, 0, index)
                        logger.info("Using GPU for FAISS index creation")
                        # Add vectors to GPU index
                        vectors = np.array(all_embeddings).astype('float32')
                        gpu_index.add(vectors)
                        # Copy back to CPU for storage
                        index = faiss.index_gpu_to_cpu(gpu_index)
                    except Exception as e:
                        logger.warning(f"Error using GPU for FAISS: {str(e)}, falling back to CPU")
                        # Fall back to CPU
                        vectors = np.array(all_embeddings).astype('float32')
                        index.add(vectors)
                else:
                    # Use CPU index
                    vectors = np.array(all_embeddings).astype('float32')
                    index.add(vectors)
                
                # Create a dict mapping ids to documents
                ids_to_docs = {}
                for i, (metadata, text) in enumerate(zip(all_metadatas, all_texts)):
                    # Use the document ID from metadata or create one
                    doc_id = metadata.get('document_id', f"doc_{i}")
                    ids_to_docs[i] = {"metadata": metadata, "content": text}
                
                # Save the index and documents
                faiss.write_index(index, os.path.join(vs_dir, "index.faiss"))
                with open(os.path.join(vs_dir, "docstore.json"), 'w') as f:
                    json.dump(ids_to_docs, f)
                
                # Create a FAISS wrapper using the saved files
                vectorstore = FAISS.load_local(vs_dir, embedding_model)
            else:
                # Use regular FAISS with standard method
                logger.info("Using CPU for FAISS vector store creation")
                vectorstore = FAISS.from_documents(
                    documents, embedding_model
                )
                # Save the index and documents to disk
                vectorstore.save_local(vs_dir)
                
            # Create and save metadata
            metadata = create_vectorstore_metadata(
                vs_id,
                name,
                description,
                embedding_model_name,
                file_infos,
                chunking_method == "paragraph",
                max_paragraph_length,
                min_paragraph_length,
                chunk_size,
                chunk_overlap
            )
            save_metadata(metadata, os.path.join(vs_dir, "metadata.json"))
            
            # Log success
            logger.info(f"Vector store '{name}' created with ID {vs_id}, containing {len(documents)} documents")
            log_system_resources(f"after create_vectorstore {name}")
            
            # Clean up memory
            del vectorstore
            del documents
            # Only try to delete these variables if they exist in this scope
            if 'all_embeddings' in locals():
                del all_embeddings
            if 'all_metadatas' in locals():
                del all_metadatas
            if 'all_texts' in locals():
                del all_texts
            gc.collect()
            if TORCH_CUDA_AVAILABLE:
                torch.cuda.empty_cache()
            
            return vs_id
        except Exception as e:
            logger.error(f"Error creating vector store: {str(e)}")
            if os.path.exists(vs_dir):
                shutil.rmtree(vs_dir)
            raise
    
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
                
                # Note: Backup creation removed from here and moved to process_batch_update
                
                # Load the vector store from the main directory
                vectorstore = FAISS.load_local(str(vs_dir), embedding_model, allow_dangerous_deserialization=True)
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
                    # Update job progress with embedding information
                    if job_id:
                        processed_docs = min((batch_idx) * batch_size, total_documents)
                        progress_percentage = (processed_docs / total_documents) * 100
                        update_job_progress(
                            job_id,
                            processed_docs,
                            f"Generating embeddings: batch {batch_idx + 1}/{len(batches)} ({progress_percentage:.1f}%)",
                            current_operation="embedding",
                            current_file=f"Batch {batch_idx + 1}/{len(batches)} ({len(batch)} documents)"
                        )
                        
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
                            f"Added {processed_docs}/{total_documents} documents ({progress_percentage:.1f}%)",
                            current_operation="indexing",
                            current_file=f"Completed batch {batch_idx + 1}/{len(batches)}"
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
        
        # Get security info before loading documents
        security_info = get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
        logger.info(f"Retrieved security info for {len(security_info)} files for job {job_id}")
        
        # Log all document IDs from security info
        for file_path, info in security_info.items():
            logger.info(f"Security info document ID for {os.path.basename(file_path)}: {info.get('document_id')}")
            
        # Create a mapping from staged paths to security info for the load_documents function
        staged_security_info = {
            staged_path: security_info[orig_path] 
            for orig_path, staged_path in file_mapping.items() 
            if orig_path in security_info
        }
        
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
                job_id=job_id,  # Pass job_id for progress tracking
                security_info=staged_security_info
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
        
        # Prepare file info list - use the same document IDs that were used in the documents
        file_infos = []
        for orig_path, staged_path in file_mapping.items():
            # Get the document ID that was used for this file
            orig_filename = os.path.basename(orig_path)
            
            # First check security info for the document ID
            doc_id = security_info.get(orig_path, {}).get("document_id")
            
            # If not found, look for the first document with this filename
            if not doc_id:
                for doc in documents:
                    if doc.metadata.get("original_filename") == orig_filename:
                        doc_id = doc.metadata.get("document_id")
                        if doc_id:
                            break
            
            # Fallback to generating a new ID if still not found
            if not doc_id:
                doc_id = f"doc_{uuid.uuid4()}"
                logger.warning(f"Had to generate a new document ID for {orig_path}: {doc_id}")
            
            file_info = {
                "filename": orig_filename,
                "original_path": orig_path,
                "staged_path": staged_path,
                "security_classification": security_info.get(orig_path, {}).get("security_classification", "UNCLASSIFIED"),
                "content_security_classification": security_info.get(orig_path, {}).get("content_security_classification", "UNCLASSIFIED"),
                "document_id": doc_id
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
                job_id=job_id,  # Pass job_id for progress tracking
                security_info=get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
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
                "content_security_classification": security_info.get(orig_path, {}).get("content_security_classification", "UNCLASSIFIED"),
                "document_id": security_info.get(orig_path, {}).get("document_id", f"generated_{uuid.uuid4()}")
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
        "error": job.error,
        "details": job.details  # Include the details field in the response
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
    """Request to query a vectorstore."""
    query: str
    top_k: int = 5
    score_threshold: float = 0.5

class QueryResponse(BaseModel):
    """Response from a vectorstore query."""
    results: List[Dict[str, Any]]

@app.post("/api/embedding/vectorstores/{vectorstore_id}/query", response_model=QueryResponse)
async def query_vectorstore(
    vectorstore_id: str,
    query_request: QueryRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Query a vector store for similar documents."""
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
        
        # Load the vector store with caching
        try:
            vectorstore = load_vectorstore_with_cache(vectorstore_id, embedding_model, vs_dir)
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
            # Properly normalize scores to 0-1 range, handling both small and large values
            # Convert to standard Python float to avoid numpy.float32 serialization issues
            if score <= 2.0:  # Cosine similarity range (-1 to 1) or distance (0 to 2)
                # Standard cosine similarity normalization
                similarity_score = float((score + 1) / 2 if score <= 1 else (2 - score) / 2)
            else:
                # For larger scores (like 100+), use a logarithmic normalization
                # This scales high scores (100-250) to 0.8-1.0 range for better user experience
                similarity_score = float(min(1.0, 0.8 + (0.2 * min(1.0, math.log10(score/100)))))
                
            # Store both the normalized score and the original score for reference
            normalized_score = float(similarity_score)
            original_score = float(score)
            
            # Only include results above the threshold
            if normalized_score >= query_request.score_threshold:
                formatted_results.append({
                    "text": doc.page_content,
                    "metadata": doc.metadata,
                    "score": normalized_score,  # Normalized score for filtering and display
                    "original_score": original_score  # Original score for reference
                })
                
        return QueryResponse(results=formatted_results)
        
    except Exception as e:
        logger.error(f"Error querying vector store {vectorstore_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error querying vector store: {str(e)}")

class VectorStoreAnalysisRequest(BaseModel):
    """Request to analyze a vectorstore's content using an LLM."""
    sample_size: int = 1000
    summary_length: str = "long"  # "short", "medium", "long"
    sampling_strategy: str = "random"  # "random", "grouped_by_source", "temporal", "clustering"

class VectorStoreAnalysisResponse(BaseModel):
    """Response containing analysis of a vectorstore."""
    raw_response: str  # The complete raw response from the LLM
    content_analysis: Optional[str] = None  # Optional parsed content analysis
    example_queries: Optional[List[str]] = None  # Optional parsed example queries
    document_count: int
    chunk_count: int
    sample_size: int
    sampling_strategy: str

# Constants for vectorstore caching
VS_CACHE_SIZE = int(os.environ.get("VS_CACHE_SIZE", "3"))  # Number of vector stores to keep in memory
VS_CACHE_TTL = int(os.environ.get("VS_CACHE_TTL", "300"))  # Time in seconds to keep vector stores in cache

# Simple time-based LRU cache for vector stores
class VectorStoreCache:
    def __init__(self, max_size=VS_CACHE_SIZE):
        self.cache = {}  # dict to store vectorstores
        self.max_size = max_size
        self.access_times = {}  # track last access time
    
    def get(self, vs_id):
        """Get a vector store from cache if it exists and is not expired"""
        if vs_id in self.cache:
            # Update access time
            self.access_times[vs_id] = time.time()
            return self.cache[vs_id]
        return None
    
    def set(self, vs_id, vectorstore):
        """Add a vector store to the cache, evicting old ones if needed"""
        # If cache is full, remove least recently used item
        if len(self.cache) >= self.max_size:
            self._evict_lru()
        
        # Add to cache
        self.cache[vs_id] = vectorstore
        self.access_times[vs_id] = time.time()
    
    def _evict_lru(self):
        """Remove the least recently used item from cache"""
        if not self.cache:
            return
        
        # Find oldest access time
        oldest_id = min(self.access_times.items(), key=lambda x: x[1])[0]
        
        # Remove from cache
        if oldest_id in self.cache:
            logger.info(f"Evicting vector store {oldest_id} from cache")
            del self.cache[oldest_id]
            del self.access_times[oldest_id]
            # Force garbage collection to free up memory
            gc.collect()
    
    def clear(self):
        """Clear the entire cache"""
        self.cache.clear()
        self.access_times.clear()
        gc.collect()

# Initialize vector store cache
vs_cache = VectorStoreCache(max_size=VS_CACHE_SIZE)

# Helper function to monitor system resources
def log_system_resources(operation=""):
    """Log current system resource usage"""
    try:
        # Log CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        logger.info(f"Resource usage {operation} - CPU: {cpu_percent}%, "
                   f"Memory: {memory.used / (1024**3):.2f}GB / {memory.total / (1024**3):.2f}GB "
                   f"({memory.percent}%)")
        
        # Log GPU usage with GPUtil if available
        if GPUS_AVAILABLE:
            try:
                gpus = GPUtil.getGPUs()
                for i, gpu in enumerate(gpus):
                    logger.info(f"GPU {i} usage {operation}: {gpu.name}, "
                               f"Memory: {gpu.memoryUsed}MB / {gpu.memoryTotal}MB ({gpu.memoryUtil*100:.1f}%), "
                               f"Load: {gpu.load*100:.1f}%")
            except Exception as e:
                logger.warning(f"Error checking GPU usage with GPUtil: {str(e)}")
        
        # Log PyTorch CUDA memory if available
        if TORCH_CUDA_AVAILABLE:
            try:
                for i in range(torch.cuda.device_count()):
                    allocated = torch.cuda.memory_allocated(i) / (1024**3)
                    reserved = torch.cuda.memory_reserved(i) / (1024**3)
                    logger.info(f"PyTorch CUDA {i} memory {operation}: "
                               f"Allocated: {allocated:.2f}GB, Reserved: {reserved:.2f}GB")
            except Exception as e:
                logger.warning(f"Error checking PyTorch CUDA memory: {str(e)}")
    except Exception as e:
        logger.warning(f"Error monitoring system resources: {str(e)}")

# Helper function to load vector store with caching
def load_vectorstore_with_cache(vectorstore_id, embedding_model, vs_dir):
    """Load a vector store with caching to reduce memory usage"""
    log_system_resources(f"before loading vectorstore {vectorstore_id}")
    
    # Check if it's in the cache
    cached_vs = vs_cache.get(vectorstore_id)
    if cached_vs:
        logger.info(f"Using cached vector store for {vectorstore_id}")
        return cached_vs
    
    # Not in cache, load it
    logger.info(f"Loading vector store {vectorstore_id} from disk")
    try:
        # Try to configure FAISS to use GPU if available
        try:
            if GPUS_AVAILABLE and USE_GPU:
                # First check if we have FAISS GPU support
                import faiss
                if hasattr(faiss, 'StandardGpuResources'):
                    logger.info("FAISS GPU support is available")
                else:
                    logger.warning("FAISS GPU support not available despite GPU being detected")
        except Exception as e:
            logger.warning(f"Error checking FAISS GPU support: {str(e)}")
            
        vectorstore = FAISS.load_local(vs_dir, embedding_model, allow_dangerous_deserialization=True)
        
        # Add to cache
        vs_cache.set(vectorstore_id, vectorstore)
        
        log_system_resources(f"after loading vectorstore {vectorstore_id}")
        return vectorstore
    except Exception as e:
        logger.error(f"Error loading vector store {vectorstore_id}: {str(e)}")
        raise

@app.post("/api/embedding/vectorstores/{vectorstore_id}/analyze", response_model=VectorStoreAnalysisResponse)
async def analyze_vectorstore(
    vectorstore_id: str,
    request: VectorStoreAnalysisRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Analyze a vectorstore's content using an LLM to provide a summary and suggested queries."""
    log_system_resources("before analyze_vectorstore")
    
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
        
        # Load the vector store with caching
        try:
            vectorstore = load_vectorstore_with_cache(vectorstore_id, embedding_model, vs_dir)
        except Exception as e:
            logger.error(f"Error loading vector store {vectorstore_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error loading vector store: {str(e)}")
        
        # Get document count and total chunk count
        metadata = load_metadata(os.path.join(vs_dir, "metadata.json"))
        document_count = len(metadata.get("files", []))
        
        # Sample documents from the vectorstore
        # This assumes the docstore attribute exists and contains the documents
        all_docs = []
        for doc_id, doc in vectorstore.docstore._dict.items():
            all_docs.append(doc)
        
        chunk_count = len(all_docs)
        
        # Limit sample size to available documents
        sample_size = min(request.sample_size, len(all_docs))
        
        # Log information about the sampling
        logger.info(f"Analyzing vectorstore {vectorstore_id} with {chunk_count} total chunks")
        logger.info(f"Requested sample size: {request.sample_size}, actual sample size: {sample_size}")
        
        # Warn if sample size is significantly smaller than requested
        if sample_size < request.sample_size:
            logger.warning(f"Requested sample size ({request.sample_size}) exceeds available chunks ({chunk_count}). Using all available chunks.")
            
        # Implement smarter sampling to ensure broad coverage
        sampled_docs = []
        
        # Option 1: Group by source document and sample from each
        if request.sampling_strategy == "grouped_by_source":
            # Group documents by source
            docs_by_source = {}
            for doc in all_docs:
                source = doc.metadata.get("source", "unknown")
                if source not in docs_by_source:
                    docs_by_source[source] = []
                docs_by_source[source].append(doc)
            
            # Calculate how many docs to sample from each source
            sources = list(docs_by_source.keys())
            if not sources:
                sources = ["unknown"]
                docs_by_source["unknown"] = all_docs
                
            samples_per_source = max(1, sample_size // len(sources))
            
            # Sample from each source
            import random
            for source, docs in docs_by_source.items():
                if len(docs) <= samples_per_source:
                    sampled_docs.extend(docs)
                else:
                    sampled_docs.extend(random.sample(docs, samples_per_source))
            
            # If we haven't reached our sample size, add more randomly
            if len(sampled_docs) < sample_size and len(all_docs) > len(sampled_docs):
                remaining_docs = [d for d in all_docs if d not in sampled_docs]
                additional_samples = min(sample_size - len(sampled_docs), len(remaining_docs))
                sampled_docs.extend(random.sample(remaining_docs, additional_samples))
        
        # Option 2: Temporal sampling - sample across document timeline if timestamps exist
        elif request.sampling_strategy == "temporal":
            # Try to find documents with timestamp or date information
            docs_with_time = []
            for doc in all_docs:
                if any(time_field in doc.metadata for time_field in ["timestamp", "date", "created_at"]):
                    docs_with_time.append(doc)
            
            if docs_with_time:
                # Sort by timestamp
                def get_time_value(doc):
                    for field in ["timestamp", "date", "created_at"]:
                        if field in doc.metadata:
                            return doc.metadata[field]
                    return 0
                
                docs_with_time.sort(key=get_time_value)
                
                # Sample across the timeline
                indices = [int(i * (len(docs_with_time) - 1) / (sample_size - 1)) 
                           for i in range(sample_size)]
                sampled_docs = [docs_with_time[i] for i in indices if i < len(docs_with_time)]
                
                # Fill remaining with random samples if needed
                if len(sampled_docs) < sample_size:
                    remaining_docs = [d for d in all_docs if d not in sampled_docs]
                    additional_samples = min(sample_size - len(sampled_docs), len(remaining_docs))
                    sampled_docs.extend(random.sample(remaining_docs, additional_samples))
            else:
                # Fall back to random sampling
                import random
                sampled_docs = random.sample(all_docs, sample_size) if len(all_docs) > sample_size else all_docs
        
        # Option 3: Clustering-based sampling
        elif request.sampling_strategy == "clustering":
            # For large vector stores, we can use K-means clustering to find representative samples
            try:
                if len(all_docs) > sample_size:
                    import numpy as np
                    # Get all embeddings
                    embeddings = []
                    for doc in all_docs:
                        # Try to get from cache or compute
                        if hasattr(doc, "embedding") and doc.embedding is not None:
                            embeddings.append(doc.embedding)
                        else:
                            # Skip docs without embeddings for clustering purposes
                            continue
                    
                    if len(embeddings) > sample_size:
                        # Normalize embeddings
                        embeddings = np.array(embeddings)
                        norm = np.linalg.norm(embeddings, axis=1, keepdims=True)
                        norm[norm == 0] = 1
                        embeddings = embeddings / norm
                        
                        # Use K-means to cluster
                        from sklearn.cluster import KMeans
                        kmeans = KMeans(n_clusters=sample_size, random_state=42).fit(embeddings)
                        
                        # Find closest points to centroids
                        centroids = kmeans.cluster_centers_
                        # For each centroid, find the closest point
                        for centroid_idx in range(len(centroids)):
                            distances = np.linalg.norm(embeddings - centroids[centroid_idx], axis=1)
                            closest_idx = np.argmin(distances)
                            sampled_docs.append(all_docs[closest_idx])
                    else:
                        # Not enough embeddings, fall back to random sampling
                        import random
                        sampled_docs = random.sample(all_docs, sample_size) if len(all_docs) > sample_size else all_docs
                else:
                    sampled_docs = all_docs
            except Exception as e:
                logger.warning(f"Clustering-based sampling failed: {str(e)}. Falling back to random sampling.")
                import random
                sampled_docs = random.sample(all_docs, sample_size) if len(all_docs) > sample_size else all_docs
        
        # Default: Random sampling
        else:
            import random
            sampled_docs = random.sample(all_docs, sample_size) if len(all_docs) > sample_size else all_docs
        
        # Ensure we don't exceed sample size
        sampled_docs = sampled_docs[:sample_size]
        
        # Combine document texts with metadata for analysis
        analysis_text = ""
        
        # Track unique document sources for better context
        document_sources = set()
        file_to_chunks = {}
        document_id_to_filename = {}
        
        # First pass - collect information about unique sources
        for doc in sampled_docs:
            source = doc.metadata.get("source", "Unknown source")
            original_filename = doc.metadata.get("original_filename", "")
            document_id = doc.metadata.get("document_id", "")
            
            if original_filename:
                if original_filename not in file_to_chunks:
                    file_to_chunks[original_filename] = 0
                file_to_chunks[original_filename] += 1
            
            if document_id and original_filename:
                document_id_to_filename[document_id] = original_filename
            
            document_sources.add(source)
        
        # Provide source document context at the beginning
        analysis_text += "## Source Document Context\n"
        if file_to_chunks:
            analysis_text += "This analysis is based on chunks from the following files:\n"
            for filename, count in file_to_chunks.items():
                analysis_text += f"- {filename}: {count} chunks\n"
        else:
            analysis_text += "Document filenames are not available for these chunks.\n"
        
        analysis_text += "\n## Document Chunks\n"
        
        # Second pass - add actual content with enhanced metadata
        for doc in sampled_docs:
            source = doc.metadata.get("source", "Unknown source")
            page = doc.metadata.get("page", "")
            doc_id = doc.metadata.get("document_id", "Unknown ID")
            original_filename = doc.metadata.get("original_filename", "")
            chunk_index = doc.metadata.get("chunk_index", "")
            
            # Build a detailed header for this chunk
            chunk_header = f"Document: {doc_id}"
            
            if original_filename:
                chunk_header += f" | File: {original_filename}"
            
            if chunk_index:
                chunk_header += f" | Chunk: {chunk_index}"
                
            if source != "Unknown source":
                chunk_header += f" | Source: {source}"
                
            if page:
                chunk_header += f" | Page: {page}"
                
            analysis_text += f"{chunk_header}\n"
            analysis_text += f"Content: {doc.page_content}\n\n"
        
        # Define summary length prompts
        summary_length_prompts = {
            "short": "Provide a brief summary (4-5 sentences)",
            "medium": "Provide a moderately detailed summary (2-3 paragraphs)",
            "long": "Provide a comprehensive, detailed analysis (5-8 paragraphs with specific examples)"
        }
        
        length_prompt = summary_length_prompts.get(request.summary_length, summary_length_prompts["medium"])
        
        # Create analysis prompt
        system_prompt = f"""You are an expert document analysis AI that specializes in analyzing document collections.
You will be given a sample of document chunks from a vector database. Your task is to provide a comprehensive, 
detailed analysis that would be valuable to researchers or analysts exploring this content.

## DETAILED ANALYSIS REQUIREMENTS:
1. Your analysis must be thorough and in-depth, covering:
   - {length_prompt}
   - The primary subject areas or domains these documents cover, with specific examples
   - Key themes, entities, and relationships identified in the content
   - Notable patterns, trends, or insights discovered in the documents
   - Specific details, statistics, technical terms, or methodologies mentioned

2. Structure your analysis with only 2 clear sections that use these exact headings:
   - "CONTENT ANALYSIS:" (This heading must be exact - this is the main analysis section where you will provide your detailed analysis of the documents.)
   - "EXAMPLE QUERIES:" (This heading must be exact - list 5 specific queries that a user might ask that are related to the documents that you have analyzed.)

3. Document references:
   - Reference specific document names or filenames whenever possible
   - Include direct quotes or examples from the documents to illustrate key points
   - Mention document IDs when referring to specific information

## OUTPUT FORMAT INSTRUCTIONS:
- Begin your analysis with "CONTENT ANALYSIS:" on its own line followed by your detailed analysis
- Write in clear, professional language with proper paragraphing for readability
- Include as much specific, factual information from the documents as possible
- Format your response as follows:

CONTENT ANALYSIS:
[Your detailed, multi-paragraph analysis goes here with document references from the metadata...]

EXAMPLE QUERIES:
1. [First specific query that a user might ask that are related to the documents that you have analyzed]
2. [Second specific query that a user might ask that are related to the documents that you have analyzed]
3. [Third specific query that a user might ask that are related to the documents that you have analyzed]
4. [Fourth specific query that a user might ask that are related to the documents that you have analyzed]
5. [Fifth specific query that a user might ask that are related to the documents that you have analyzed]

The document chunks will begin with metadata that identifies their source. Please use this metadata in your CONTENT ANALYSIS analysis to help the user understand which documents contain which information. The documents may be fragments or chunks of larger documents, so synthesize the information appropriately.
"""
        
        # Prepare messages for LLM
        document_content = analysis_text  # Rename for clarity
        analysis_text = None  # Clear to avoid confusion
        
        # Fix the duplicated instructions and message construction
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Here is a sample of {sample_size} document chunks from a collection of {document_count} documents ({chunk_count} total chunks):\n\n{document_content}")
        ]
        
        # Log full message content being sent to LLM
        logger.info("====== BEGINNING OF FULL MESSAGES SENT TO LLM ======")
        logger.info(f"System message content length: {len(system_prompt)} characters")
        logger.info(f"Human message content length: {len(document_content) + 100} characters") # approximate with the intro text
        # Log the first part of the human message to see document context
        human_message = f"Here is a sample of {sample_size} document chunks from a collection of {document_count} documents ({chunk_count} total chunks):\n\n{document_content}"
        logger.info(f"Human message preview (first 500 chars): {human_message[:500]}...")
        
        
        # Optionally log the full document context if DEBUG_LOG_DOCUMENTS is enabled
        if DEBUG_LOG_DOCUMENTS:
            logger.info("====== FULL DOCUMENT CONTEXT (very verbose) ======")
            logger.info(document_content)
            logger.info("====== END OF FULL DOCUMENT CONTEXT ======")
            
        logger.info("====== END OF FULL MESSAGES SENT TO LLM ======")
        
        # Store the actual sample count for final response
        actual_sample_count = len(sampled_docs)
        
        # Clear the sample docs to free up memory
        sampled_docs = None
        all_docs = None
        document_content = None  # Clear to free memory
        
        # Force garbage collection before LLM call
        gc.collect()
        
        # Log resource usage before LLM call
        log_system_resources("before LLM call in analyze_vectorstore")
        
        # Call LLM for analysis
        response = llm.invoke(messages)
        analysis_text = response.content
        
        # Log the full system prompt and raw LLM response for debugging
        logger.info("====== BEGINNING OF SYSTEM PROMPT SENT TO LLM ======")
        logger.info(system_prompt)
        logger.info("====== END OF SYSTEM PROMPT SENT TO LLM ======")
        
        logger.info("====== BEGINNING OF RAW LLM RESPONSE ======")
        logger.info(analysis_text)
        logger.info("====== END OF RAW LLM RESPONSE ======")
        
        # Log resource usage after LLM call
        log_system_resources("after LLM call in analyze_vectorstore")
        
        # Enhanced parsing to extract content analysis and example queries
        # with more robust pattern matching and detailed logging
        content_analysis = ""
        example_queries = []
        
        logger.info("Starting enhanced parsing of LLM response...")
        
        # Define multiple patterns to try for content analysis and example queries
        content_analysis_patterns = [
            r'CONTENT ANALYSIS:(.*?)(?:EXAMPLE QUERIES:|$)',  # Standard format
            r'Content Analysis:(.*?)(?:Example Queries:|$)',  # Case variation
            r'Content Analysis(.*?)(?:Example Queries|$)',    # Without colon
            r'Analysis:(.*?)(?:Queries:|$)',                  # Shortened format
            r'# Content Analysis(.*?)(?:# Example Queries|$)', # Markdown format
            r'## Content Analysis(.*?)(?:## Example Queries|$)', # Markdown format 2
        ]
        
        example_queries_patterns = [
            r'EXAMPLE QUERIES:(.*?)$',        # Standard format
            r'Example Queries:(.*?)$',        # Case variation
            r'Example Queries(.*?)$',         # Without colon
            r'SUGGESTED QUERIES:(.*?)$',      # Alternative wording
            r'Suggested Queries:(.*?)$',      # Alternative case
            r'# Example Queries(.*?)$',       # Markdown format
            r'## Example Queries(.*?)$',      # Markdown format 2
            r'Questions:(.*?)$',              # Simple alternative
        ]
        
        # Try to extract content analysis
        content_analysis_found = False
        for pattern in content_analysis_patterns:
            try:
                match = re.search(pattern, analysis_text, re.DOTALL | re.IGNORECASE)
                if match:
                    content_analysis = match.group(1).strip()
                    logger.info(f"Content analysis extracted successfully using pattern: {pattern}")
                    content_analysis_found = True
                    break
            except Exception as e:
                logger.warning(f"Error trying pattern {pattern}: {str(e)}")
        
        if not content_analysis_found:
            # Fallback: take the first part of the response before any numbered list
            logger.warning("No content analysis section found with standard patterns, using fallback extraction")
            try:
                # Look for start of numbered list or "queries" mention
                numbered_list_match = re.search(r'\n\s*1\.', analysis_text)
                queries_mention = re.search(r'\n[^\n]*quer(y|ies)', analysis_text, re.IGNORECASE)
                
                if numbered_list_match and queries_mention:
                    # Take the earlier of the two
                    split_point = min(numbered_list_match.start(), queries_mention.start())
                    content_analysis = analysis_text[:split_point].strip()
                    logger.info("Extracted content analysis using numbered list/queries fallback")
                elif numbered_list_match:
                    content_analysis = analysis_text[:numbered_list_match.start()].strip()
                    logger.info("Extracted content analysis using numbered list fallback")
                elif queries_mention:
                    content_analysis = analysis_text[:queries_mention.start()].strip()
                    logger.info("Extracted content analysis using queries mention fallback")
                else:
                    # Just take the first half of the response
                    content_analysis = analysis_text[:len(analysis_text)//2].strip()
                    logger.info("Extracted content analysis using first-half fallback")
            except Exception as e:
                logger.warning(f"Fallback extraction failed: {str(e)}")
                # Last resort: just use the whole response
                content_analysis = analysis_text
                logger.warning("Using entire response as content analysis (last resort)")
        
        # Try to extract example queries
        example_queries_found = False
        for pattern in example_queries_patterns:
            try:
                match = re.search(pattern, analysis_text, re.DOTALL | re.IGNORECASE)
                if match:
                    queries_text = match.group(1).strip()
                    logger.info(f"Example queries section found using pattern: {pattern}")
                    
                    # Try to extract numberd queries first (1. 2. 3. etc.)
                    numbered_queries = re.findall(r'\d+\.\s+(.*?)(?=\n\d+\.|\n*$)', queries_text + '\n')
                    if numbered_queries and len(numbered_queries) > 0:
                        example_queries = [q.strip() for q in numbered_queries if q.strip()]
                        logger.info(f"Extracted {len(example_queries)} numbered queries")
                        example_queries_found = True
                        break
                    
                    # Try to find queries by splitting on newlines (one per line)
                    line_queries = [line.strip() for line in queries_text.split('\n') if line.strip()]
                    if line_queries and len(line_queries) > 0:
                        # Filter lines that look like questions
                        question_lines = [line for line in line_queries if '?' in line or re.match(r'^(what|how|where|when|who|why|can|could|which|is|are|do|does)', line.lower())]
                        if question_lines and len(question_lines) > 0:
                            example_queries = question_lines
                            logger.info(f"Extracted {len(example_queries)} line-based queries")
                            example_queries_found = True
                            break
            except Exception as e:
                logger.warning(f"Error trying queries pattern {pattern}: {str(e)}")
        
        # If we still don't have queries, try more aggressive extraction
        if not example_queries_found or len(example_queries) < 3:
            logger.warning("No or few example queries found with standard patterns, using fallback extraction")
            try:
                # Find all sentences that end with a question mark
                question_sentences = re.findall(r'[A-Z][^.!?]*\?', analysis_text)
                if question_sentences and len(question_sentences) > 0:
                    # Take up to 5 questions
                    candidate_queries = [q.strip() for q in question_sentences if len(q.strip()) > 10][:5]
                    
                    # If we have some queries already, supplement them
                    if example_queries:
                        # Add only new queries that aren't already in the list
                        new_queries = [q for q in candidate_queries if q not in example_queries]
                        example_queries.extend(new_queries[:5-len(example_queries)])
                    else:
                        example_queries = candidate_queries
                    
                    logger.info(f"Extracted {len(example_queries)} queries using question mark fallback")
            except Exception as e:
                logger.warning(f"Question extraction fallback failed: {str(e)}")
        
        # If we still have fewer than 5 queries, generate some generic ones
        if not example_queries or len(example_queries) < 5:
            logger.warning(f"Only found {len(example_queries) if example_queries else 0} queries, adding generic ones")
            generic_queries = [
                f"What are the key topics covered in the documents?",
                f"How do the documents describe the main concepts?",
                f"What are the most important findings discussed in the documents?",
                f"Can you summarize the main points from the documents?",
                f"What information do the documents provide about the primary subject matter?"
            ]
            
            # Add only enough generic queries to reach 5 total
            if not example_queries:
                example_queries = []
            
            num_to_add = min(5 - len(example_queries), len(generic_queries))
            example_queries.extend(generic_queries[:num_to_add])
            logger.info(f"Added {num_to_add} generic queries to reach total of {len(example_queries)}")
        
        # Ensure we don't exceed 5 queries
        example_queries = example_queries[:5]
        
        # Log what we extracted
        logger.info(f"Final content analysis length: {len(content_analysis)} characters")
        logger.info(f"Final example queries count: {len(example_queries)}")
        
        # Small preview of content analysis
        preview_length = min(100, len(content_analysis))
        logger.info(f"Content analysis preview: {content_analysis[:preview_length]}...")
        
        # Show the queries we extracted
        for i, query in enumerate(example_queries):
            logger.info(f"Query {i+1}: {query}")

        # Clear variables to free memory
        messages = None
        parts = None
        
        # Run GC to reclaim memory
        gc.collect()
        
        log_system_resources("after analyze_vectorstore")
        
        return VectorStoreAnalysisResponse(
            raw_response=analysis_text,
            content_analysis=content_analysis.strip() if content_analysis else None,
            example_queries=example_queries if example_queries else None,
            document_count=document_count,
            chunk_count=chunk_count,
            sample_size=actual_sample_count,
            sampling_strategy=request.sampling_strategy
        )
        
    except Exception as e:
        logger.error(f"Error querying vector store {vectorstore_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error querying vector store: {str(e)}")

class VectorStoreLLMQueryRequest(BaseModel):
    """Request to query a vectorstore and get LLM-generated responses."""
    query: str
    top_k: int = 5
    score_threshold: float = 0.5
    use_llm: bool = True
    include_sources: bool = True

class VectorStoreLLMQueryResponse(BaseModel):
    """Response from an LLM-enhanced vectorstore query."""
    answer: str
    sources: Optional[List[Dict[str, Any]]] = None
    raw_chunks: Optional[List[Dict[str, Any]]] = None

@app.post("/api/embedding/vectorstores/{vectorstore_id}/llm-query", response_model=VectorStoreLLMQueryResponse)
async def llm_query_vectorstore(
    vectorstore_id: str,
    query_request: VectorStoreLLMQueryRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Query a vector store and use an LLM to generate a response based on retrieved documents."""
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
        
        # Load the vector store with caching
        try:
            vectorstore = load_vectorstore_with_cache(vectorstore_id, embedding_model, vs_dir)
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
            # Apply the same normalization logic as in query_vectorstore
            if score <= 2.0:  # Cosine similarity range (-1 to 1) or distance (0 to 2)
                # Standard cosine similarity normalization
                similarity_score = float((score + 1) / 2 if score <= 1 else (2 - score) / 2)
            else:
                # For larger scores (like 100+), use a logarithmic normalization
                similarity_score = float(min(1.0, 0.8 + (0.2 * min(1.0, math.log10(score/100)))))
            
            # Store both normalized and original scores
            normalized_score = float(similarity_score)
            original_score = float(score)
            
            # Filter by score threshold
            if normalized_score >= query_request.score_threshold:
                formatted_results.append({
                    "text": doc.page_content,
                    "metadata": doc.metadata,
                    "score": normalized_score,
                    "original_score": original_score
                })
        
        # Clear results to free memory
        results = None
        
        # If no results or LLM not requested, return early
        if not formatted_results:
            return VectorStoreLLMQueryResponse(
                answer="No relevant information found for this query.",
                sources=[],
                raw_chunks=[]
            )
        
        if not query_request.use_llm:
            return VectorStoreLLMQueryResponse(
                answer="Retrieved relevant document chunks (LLM response not requested)",
                sources=[{
                    "source": str(result["metadata"].get("source", "Unknown")),
                    "page": str(result["metadata"].get("page", "N/A")),
                    "document_id": str(result["metadata"].get("document_id", "Unknown")),
                    "score": float(result["score"]),
                    "text_preview": result["text"][:100] + "..." if len(result["text"]) > 100 else result["text"],
                    "text": result["text"]  # Full document text
                } for result in formatted_results] if query_request.include_sources else None,
                raw_chunks=formatted_results
            )
        
        # Prepare context for LLM
        context = ""
        for i, result in enumerate(formatted_results):
            source = result["metadata"].get("source", "Unknown source")
            page = result["metadata"].get("page", "Unknown page")
            
            context += f"Document {i+1} | Source: {source}"
            if page != "Unknown page":
                context += f" | Page: {page}"
            context += f"\n{result['text']}\n\n"
        
        # Log context length and sample for debugging
        context_length = len(context)
        newline_char = '\n'  # Define newline character outside the f-string
        logger.info(f"LLM context length: {context_length} characters, {context.count(newline_char)} lines")
        logger.info(f"Number of document chunks provided to LLM: {len(formatted_results)}")
        
        # Log a sample of the context (first 500 chars of first document and last document)
        if formatted_results:
            first_doc = formatted_results[0]["text"]
            logger.info(f"First document sample: {first_doc[:500]}...")
            
            if len(formatted_results) > 1:
                last_doc = formatted_results[-1]["text"]
                logger.info(f"Last document sample: {last_doc[:500]}...")
                
        # Create query prompt
        system_prompt = """You are an AI assistant that answers questions based on the provided document extracts.
Follow these guidelines:
1. Answer ONLY based on the information in the provided document extracts.
2. If the documents don't contain relevant information to answer the question, state that clearly.
3. Do not make up or hallucinate information not present in the extracts.
4. Provide specific source references when possible (document numbers as mentioned in the extracts).
5. Format your response in clear, well-structured markdown.
6. Focus on being accurate rather than comprehensive."""

        # Prepare messages for LLM
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Here are some relevant document extracts:\n\n{context}\n\nQuestion: {query_request.query}")
        ]
        
        # Force GC before LLM call
        gc.collect()
        
        # Call LLM for analysis
        response = llm.invoke(messages)
        answer = response.content
        
        # Clear variables to free memory
        messages = None
        context = None
        
        # Prepare sources information if requested
        sources = None
        if query_request.include_sources:
            sources = [{
                "source": str(result["metadata"].get("source", "Unknown")),
                "page": str(result["metadata"].get("page", "N/A")),
                "document_id": str(result["metadata"].get("document_id", "Unknown")),
                "score": float(result["score"]),
                # Include both a preview and full text
                "text_preview": result["text"][:100] + "..." if len(result["text"]) > 100 else result["text"],
                "text": result["text"]  # Full document text
            } for result in formatted_results]
            
        # Clear formatted_results if not needed
        if not query_request.include_sources:
            formatted_results = None
            
        # Run GC to reclaim memory
        gc.collect()
        
        return VectorStoreLLMQueryResponse(
            answer=answer,
            sources=sources,
            raw_chunks=formatted_results if query_request.include_sources else None
        )
        
    except Exception as e:
        logger.error(f"Error querying vector store with LLM {vectorstore_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error querying vector store with LLM: {str(e)}")

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
                    timestamp = int(time.time())
                    backup_dir = vs_path / f"index_backup_{timestamp}"
                    shutil.copytree(index_subdir, backup_dir)
                    
                    # Update metadata if it exists in the backup
                    backup_metadata_path = backup_dir / "metadata.json"
                    if backup_metadata_path.exists():
                        try:
                            backup_metadata = load_metadata(backup_metadata_path)
                            if backup_metadata:
                                original_id = backup_metadata.get("id")
                                backup_id = f"{original_id}_backup_{timestamp}"
                                
                                # Update metadata
                                backup_metadata["id"] = backup_id
                                backup_metadata["is_backup"] = True
                                backup_metadata["original_id"] = original_id
                                backup_metadata["backup_timestamp"] = timestamp
                                backup_metadata["backup_date"] = datetime.fromtimestamp(timestamp).isoformat()
                                backup_metadata["display_name"] = f"BACKUP OF: {backup_metadata.get('name', 'Unknown')}"
                                backup_metadata["backup_reason"] = "Index migration"
                                
                                # Save updated metadata
                                save_metadata(backup_metadata, backup_metadata_path)
                                logger.info(f"Updated backup metadata for index migration backup with ID {backup_id}")
                        except Exception as e:
                            logger.warning(f"Error updating metadata for backup during migration: {str(e)}")
                    
                    logger.info(f"Successfully migrated index files for vector store {vectorstore_id}")
                except Exception as e:
                    logger.error(f"Error migrating index files for vector store {vectorstore_id}: {str(e)}")
    
    logger.info("Migration of vector store index files completed")

# Run migration on startup
@app.on_event("startup")
async def startup_event():
    """Run migration tasks when the app starts."""
    migrate_index_files()
    
    # Check system resources at startup
    log_system_resources("at startup")
    
    # Check GPU availability
    if gpu_available:
        logger.info("GPU is available for acceleration")
    else:
        logger.warning("No GPU available, using CPU only mode")
        
    # Check FAISS GPU support
    try:
        import faiss
        if hasattr(faiss, 'StandardGpuResources'):
            logger.info("FAISS GPU support is available")
            
            # Try to initialize a GPU resource
            try:
                res = faiss.StandardGpuResources()
                logger.info("Successfully initialized FAISS GPU resources")
            except Exception as e:
                logger.warning(f"Failed to initialize FAISS GPU resources: {str(e)}")
        else:
            logger.warning("FAISS is installed but GPU support is not available")
    except ImportError:
        logger.warning("FAISS could not be imported, using CPU only")
    except Exception as e:
        logger.warning(f"Error checking FAISS GPU support: {str(e)}")

@app.delete("/api/embedding/vectorstores/{vectorstore_id}/documents", response_model=RemoveDocumentsResponse)
async def remove_documents_from_vectorstore(
    vectorstore_id: str,
    request: RemoveDocumentsRequest,
    background_tasks: BackgroundTasks,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Remove specific documents from a vector store by their document IDs."""
    # Check if the vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    # Validate the request
    if not request.document_ids:
        raise HTTPException(status_code=400, detail="At least one document ID is required")
    
    try:
        # Register a new job for this operation
        job_id = register_job(
            operation_type="remove_documents",
            total_items=len(request.document_ids),
            details={
                "vectorstore_id": vectorstore_id,
                "name": vs_info["name"],
                "document_ids": request.document_ids
            }
        )
        
        # Process the removal in the background
        background_tasks.add_task(
            process_document_removal,
            job_id,
            vectorstore_id,
            request.document_ids,
            manager
        )
        
        return RemoveDocumentsResponse(
            success=True,
            message=f"Document removal process started. Check job status for updates.",
            job_id=job_id
        )
    except Exception as e:
        logger.error(f"Error starting document removal process: {str(e)}")
        return RemoveDocumentsResponse(
            success=False,
            message=f"Error starting document removal: {str(e)}"
        )

@app.post("/api/embedding/vectorstores/{vectorstore_id}/batch_update", response_model=BatchUpdateResponse)
async def batch_update_vectorstore(
    vectorstore_id: str,
    request: BatchUpdateRequest,
    background_tasks: BackgroundTasks,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Update a vector store with both document additions and removals in a single operation."""
    # Check if the vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    # Validate the request
    if not request.add and not request.remove:
        raise HTTPException(status_code=400, detail="At least one document ID to remove or file path to add is required")
    
    # Count total operations
    total_operations = len(request.add or []) + len(request.remove or [])
    
    try:
        # Register a new job for this operation
        job_id = register_job(
            operation_type="batch_update",
            total_items=total_operations,
            details={
                "vectorstore_id": vectorstore_id,
                "name": vs_info["name"],
                "add_count": len(request.add or []),
                "remove_count": len(request.remove or []),
                "new_name": request.name,
                "new_description": request.description
            }
        )
        
        # Process the batch update in the background
        background_tasks.add_task(
            process_batch_update,
            job_id,
            vectorstore_id,
            request,
            manager,
            vs_info
        )
        
        return BatchUpdateResponse(
            success=True,
            message=f"Batch update process started. Check job status for updates.",
            job_id=job_id
        )
    except Exception as e:
        logger.error(f"Error starting batch update process: {str(e)}")
        return BatchUpdateResponse(
            success=False,
            message=f"Error starting batch update: {str(e)}"
        )

async def process_document_removal(
    job_id: str,
    vectorstore_id: str,
    document_ids: List[str],
    manager: VectorStoreManager
):
    """Background task for removing documents from vector store."""
    try:
        # Get the embedding model
        vs_info = manager.get_vectorstore_info(vectorstore_id)
        if not vs_info:
            fail_job(job_id, f"Vector store {vectorstore_id} not found")
            return
            
        embedding_model_name = vs_info["embedding_model"]
        logger.info(f"Using embedding model: {embedding_model_name}")
        embedding_model = get_embedding_model(embedding_model_name)
        
        if not embedding_model:
            fail_job(job_id, f"Failed to initialize embedding model: {embedding_model_name}")
            return
        
        # Remove the documents from the vector store
        logger.info(f"Removing {len(document_ids)} documents from vector store {vectorstore_id}")
        
        result = remove_documents(vectorstore_id, document_ids, embedding_model)
        if result.get("success"):
            complete_job(job_id, {
                "removed_count": result.get("removed_count", 0),
                "message": f"Successfully removed {result.get('removed_count', 0)} documents"
            })
        else:
            fail_job(job_id, result.get("error", "Unknown error during document removal"))
    
    except Exception as e:
        logger.error(f"Error in document removal process: {str(e)}")
        import traceback
        logger.error(f"Error details: {traceback.format_exc()}")
        fail_job(job_id, f"Error removing documents: {str(e)}")

def remove_documents(vectorstore_id: str, document_ids: List[str], embedding_model, filename_to_id_map=None):
    """
    Remove documents from a vector store by their document IDs.
    
    This implementation loads all documents, filters out the ones to remove,
    and creates a new vector store with the remaining documents.
    
    Args:
        vectorstore_id: ID of the vector store
        document_ids: List of document IDs to remove
        embedding_model: The embedding model to use
        filename_to_id_map: Optional mapping from filenames to document IDs for alternative matching
    """
    try:
        vs_dir = Path(VECTORSTORE_DIR) / vectorstore_id
        
        if not vs_dir.exists() or not vs_dir.is_dir():
            return {"success": False, "error": f"Vector store directory not found: {vs_dir}"}
        
        # Note: Backup creation removed from here and moved to process_batch_update
        
        # Get metadata to also track document IDs from there
        metadata_doc_ids = set()
        filename_to_metadata_id = {}  # Map filenames to their document IDs
        metadata_file = vs_dir / "metadata.json"
        metadata = None
        
        if metadata_file.exists():
            try:
                metadata = load_metadata(metadata_file)
                for file_info in metadata.get("files", []):
                    if "document_id" in file_info:
                        metadata_doc_ids.add(file_info["document_id"])
                        if "filename" in file_info:
                            filename_to_metadata_id[file_info["filename"]] = file_info["document_id"]
                logger.info(f"Document IDs from metadata: {metadata_doc_ids}")
                logger.info(f"Filename to metadata ID mapping: {filename_to_metadata_id}")
            except Exception as e:
                logger.warning(f"Could not read document IDs from metadata: {str(e)}")
        
        # Merge filename_to_id_map if provided
        if filename_to_id_map:
            filename_to_metadata_id.update(filename_to_id_map)
        
        # Load the existing vector store
        vectorstore = FAISS.load_local(str(vs_dir), embedding_model, allow_dangerous_deserialization=True)
        if not vectorstore:
            return {"success": False, "error": "Failed to load vector store"}
        
        # Get all documents
        try:
            all_docs = []
            all_vectors = []
            
            # Access the underlying docstore to get all documents
            # This depends on the FAISS implementation in LangChain
            if hasattr(vectorstore, "docstore") and hasattr(vectorstore.docstore, "_dict"):
                # Get all documents
                all_docs = list(vectorstore.docstore._dict.values())
                logger.info(f"Found {len(all_docs)} total documents in vector store")
                
                # Log a few document IDs to help with debugging
                doc_id_samples = [doc.metadata.get("document_id") for doc in all_docs[:10]]
                logger.info(f"Sample document IDs in vector store: {doc_id_samples}")
                
                # Count occurrences of each document ID to help with debugging
                id_counts = {}
                for doc in all_docs:
                    doc_id = doc.metadata.get("document_id")
                    if doc_id:
                        id_counts[doc_id] = id_counts.get(doc_id, 0) + 1
                logger.info(f"Document ID counts in vector store: {id_counts}")
                
                # Collect all document IDs that need to be removed (including generated and metadata IDs)
                ids_to_remove = set(document_ids)
                
                # Create a mapping from metadata document IDs to generated document IDs
                metadata_to_generated_map = {}
                filename_to_generated_id = {}  # Map filenames to their generated IDs
                
                for doc in all_docs:
                    if "metadata_document_id" in doc.metadata and "document_id" in doc.metadata:
                        metadata_to_generated_map[doc.metadata["metadata_document_id"]] = doc.metadata["document_id"]
                    
                    # Also track filename to document ID mapping
                    if "original_filename" in doc.metadata and "document_id" in doc.metadata:
                        filename = doc.metadata["original_filename"]
                        if filename not in filename_to_generated_id:
                            filename_to_generated_id[filename] = doc.metadata["document_id"]
                
                logger.info(f"Metadata to generated ID mapping: {metadata_to_generated_map}")
                logger.info(f"Filename to generated ID mapping: {filename_to_generated_id}")
                
                # Add any generated IDs corresponding to metadata IDs in our removal list
                for metadata_id in document_ids:
                    if metadata_id in metadata_to_generated_map:
                        generated_id = metadata_to_generated_map[metadata_id]
                        ids_to_remove.add(generated_id)
                        logger.info(f"Adding generated ID {generated_id} for metadata ID {metadata_id} to removal list")
                
                # Also check each document for filename matching metadata document ID
                # This helps with older documents that might not have the correct IDs
                files_to_remove = set()
                
                # First identify filenames to remove based on document IDs
                for metadata_id in document_ids:
                    # Get filename from metadata
                    for file_info in metadata.get("files", []) if metadata else []:
                        if file_info.get("document_id") == metadata_id:
                            filename = file_info.get("filename", "")
                            if filename:
                                files_to_remove.add(filename)
                                logger.info(f"Adding filename {filename} for document ID {metadata_id} to removal list")
                
                # Now find any generated IDs that correspond to those filenames
                for filename in files_to_remove:
                    if filename in filename_to_generated_id:
                        generated_id = filename_to_generated_id[filename]
                        ids_to_remove.add(generated_id)
                        logger.info(f"Adding generated ID {generated_id} for filename {filename} to removal list")
                
                # Check if the requested IDs exist in any form
                requested_ids_found = set()
                for doc_id in ids_to_remove:
                    if doc_id in id_counts:
                        requested_ids_found.add(doc_id)
                
                if requested_ids_found:
                    logger.info(f"Found these requested document IDs in vector store: {requested_ids_found}")
                else:
                    # Check again with filename matching
                    found_by_filename = False
                    for doc in all_docs[:100]:  # Check just a sample for logging purposes
                        filename = doc.metadata.get("original_filename", "")
                        
                        if filename in files_to_remove:
                            logger.info(f"Found document with filename {filename} that matches a document to remove")
                            found_by_filename = True
                            break
                    
                    if found_by_filename:
                        logger.info("Found documents to remove by filename matching")
                    else:
                        logger.warning(f"No documents found with the specified document IDs or filenames")
                        logger.info(f"Available document IDs: {list(id_counts.keys())[:20]}")
                        logger.info(f"Available filenames: {list(set([doc.metadata.get('original_filename', '') for doc in all_docs[:100]]))}")
                
                # Filter out documents to remove - any doc that has either:
                # 1. document_id that's in our removal list
                # 2. metadata_document_id that's in our removal list
                # 3. original_filename that matches a file we want to remove
                docs_to_keep = []
                docs_removed = []
                
                for doc in all_docs:
                    doc_id = doc.metadata.get("document_id")
                    metadata_id = doc.metadata.get("metadata_document_id")
                    filename = doc.metadata.get("original_filename", "")
                    
                    # Skip document if any ID matches or filename matches
                    if (doc_id in ids_to_remove or 
                        (metadata_id and metadata_id in ids_to_remove) or
                        (filename in files_to_remove)):
                        docs_removed.append(doc)
                        continue
                    
                    docs_to_keep.append(doc)
                
                removed_count = len(docs_removed)
                logger.info(f"Keeping {len(docs_to_keep)} documents, removing {removed_count}")
                
                if removed_count > 0:
                    logger.info(f"Sample of removed documents:")
                    for idx, doc in enumerate(docs_removed[:5]):  # Log up to 5 samples
                        logger.info(f"  Removed doc {idx+1}: ID={doc.metadata.get('document_id')}, " +
                                   f"Filename={doc.metadata.get('original_filename')}, " +
                                   f"Metadata ID={doc.metadata.get('metadata_document_id')}")
                
                if len(docs_to_keep) == len(all_docs):
                    logger.warning(f"No documents found with the specified document IDs: {document_ids}")
                
                # Create a new vector store with the filtered documents
                if docs_to_keep:
                    new_vectorstore = FAISS.from_documents(docs_to_keep, embedding_model)
                    
                    # Save the updated vector store
                    new_vectorstore.save_local(str(vs_dir))
                    logger.info(f"Saved updated vector store with {len(docs_to_keep)} documents")
                else:
                    logger.warning("No documents left after filtering. Creating empty vector store.")
                    # Create an empty vector store if no documents are left
                    empty_docs = [Document(page_content="Empty document", metadata={"empty": True})]
                    new_vectorstore = FAISS.from_documents(empty_docs, embedding_model)
                    new_vectorstore.save_local(str(vs_dir))
                
                # Update metadata to remove file entries
                metadata_path = vs_dir / "metadata.json"
                if metadata_path.exists():
                    metadata = load_metadata(metadata_path)
                    if metadata:
                        # Filter out files that match the removed document IDs
                        updated_files = [
                            file_info for file_info in metadata.get("files", [])
                            if file_info.get("document_id") not in document_ids
                        ]
                        
                        # Log the file entries being removed
                        removed_files = [
                            file_info for file_info in metadata.get("files", [])
                            if file_info.get("document_id") in document_ids
                        ]
                        logger.info(f"Removing file entries: {removed_files}")
                        
                        # Update metadata
                        metadata["files"] = updated_files
                        metadata["updated_at"] = datetime.now().isoformat()
                        save_metadata(metadata, metadata_path)
                        logger.info(f"Updated metadata file with {len(updated_files)} remaining files")
                
                return {
                    "success": True, 
                    "removed_count": removed_count,
                    "message": f"Successfully removed {removed_count} documents"
                }
            else:
                return {"success": False, "error": "Vector store does not have expected structure for document removal"}
        
        except Exception as e:
            logger.error(f"Error during document filtering: {str(e)}")
            return {"success": False, "error": f"Error during document filtering: {str(e)}"}
    
    except Exception as e:
        logger.error(f"Error removing documents: {str(e)}")
        import traceback
        logger.error(f"Error details: {traceback.format_exc()}")
        return {"success": False, "error": f"Error removing documents: {str(e)}"}

async def process_batch_update(
    job_id: str,
    vectorstore_id: str,
    request: BatchUpdateRequest,
    manager: VectorStoreManager,
    vs_info: Dict[str, Any]
):
    """Background task for processing batch update of a vector store."""
    try:
        # Initialize counters and status tracking
        add_count = 0
        remove_count = 0
        skipped_files = []
        current_operation = "initializing"
        
        # Get vector store info
        if not vs_info:
            vs_info = manager.get_vectorstore_info(vectorstore_id)
            if not vs_info:
                fail_job(job_id, f"Vector store {vectorstore_id} not found")
                return
        
        # Get embedding model
        embedding_model_name = vs_info.get('embedding_model', 'nomic-embed-text')
        embedding_model = get_embedding_model(embedding_model_name)
        
        # Log progress for user
        update_job_progress(
            job_id, 
            0, 
            "Initializing update operation", 
            current_operation=current_operation,
            current_file="Preparing update for vector store"
        )
        
        # Process document removal if requested
        if request.remove and len(request.remove) > 0:
            logger.info(f"Document IDs requested for removal: {request.remove}")
            
            # Get metadata to check document IDs
            metadata_path = Path(VECTORSTORE_DIR) / vectorstore_id / "metadata.json"
            file_ids_by_name = {}  # Track filename to ID mapping for alternative matching
            metadata = None
            
            if metadata_path.exists():
                metadata = load_metadata(metadata_path)
                if metadata and "files" in metadata:
                    file_ids = {file_info.get("document_id"): file_info.get("filename") 
                                for file_info in metadata.get("files", [])
                                if "document_id" in file_info}
                    
                    # Also create reverse mapping from filename to ID
                    for file_info in metadata.get("files", []):
                        if "filename" in file_info and "document_id" in file_info:
                            file_ids_by_name[file_info["filename"]] = file_info["document_id"]
                    
                    logger.info(f"Document IDs in metadata: {file_ids}")
                    logger.info(f"Filename to ID mapping: {file_ids_by_name}")
                    
                    # Print exact IDs being removed for debugging
                    for doc_id in request.remove:
                        if doc_id in file_ids:
                            logger.info(f"Will remove document: ID={doc_id}, Filename={file_ids[doc_id]}")
                        else:
                            logger.warning(f"Requested removal of document ID={doc_id} but not found in metadata")
            
            current_operation = "removing"
            update_job_progress(job_id, 0, f"Removing {len(request.remove)} documents.", current_operation=current_operation)
            
            # Remove documents
            result = remove_documents(vectorstore_id, request.remove, embedding_model, file_ids_by_name)
            if result.get("success"):
                remove_count = result.get("removed_count", 0)
                logger.info(f"Successfully removed {remove_count} documents")
                update_job_progress(
                    job_id, 
                    len(request.remove), 
                    f"Removed {remove_count} documents.",
                    current_operation=current_operation
                )
            else:
                logger.error(f"Error removing documents: {result.get('error')}")
                update_job_progress(
                    job_id, 
                    len(request.remove), 
                    f"Error removing documents: {result.get('error')}",
                    current_operation=current_operation
                )
                # Continue with additions even if removals fail
        
        # Process document additions if any
        if request.add and len(request.add) > 0:
            current_operation = "adding"
            processed_so_far = len(request.remove or [])
            update_job_progress(
                job_id, 
                processed_so_far,
                f"Starting to add {len(request.add)} documents.",
                current_operation=current_operation
            )
            
            # Log the files to be added
            logger.info(f"Files to add: {request.add}")
            
            # Set up directories
            upload_dir = Path(UPLOAD_DIR)
            staging_dir = Path(DOC_STAGING_DIR)
            
            # Copy files to staging directory
            file_mapping = copy_files_to_staging(
                request.add,
                upload_dir,
                staging_dir
            )
            
            if not file_mapping:
                update_job_progress(
                    job_id, 
                    processed_so_far, 
                    f"No valid files found to add."
                )
            else:
                # Get chunking parameters
                use_paragraph_chunking = vs_info.get("chunking_method", "paragraph") == "paragraph"
                max_paragraph_length = vs_info.get("max_paragraph_length", 1500)
                min_paragraph_length = vs_info.get("min_paragraph_length", 50)
                chunk_size = vs_info.get("chunk_size", 1000)
                chunk_overlap = vs_info.get("chunk_overlap", 100)
                
                # Get security info before loading documents
                security_info = get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
                logger.info(f"Security info for files: {security_info}")
                
                # Log all document IDs from security info for debugging
                for file_path, info in security_info.items():
                    logger.info(f"Security info document ID for {os.path.basename(file_path)}: {info.get('document_id')}")
                
                # Load and process documents
                try:
                    documents, file_skipped = load_documents(
                        list(file_mapping.values()),
                        use_paragraph_chunking=use_paragraph_chunking,
                        max_paragraph_length=max_paragraph_length,
                        min_paragraph_length=min_paragraph_length,
                        chunk_size=chunk_size,
                        chunk_overlap=chunk_overlap,
                        batch_size=request.file_batch_size if request.batch_processing else len(file_mapping),
                        job_id=job_id,
                        security_info={staged_path: security_info[orig_path] 
                                      for orig_path, staged_path in file_mapping.items() 
                                      if orig_path in security_info}
                    )
                    
                    skipped_files.extend(file_skipped)
                    
                    if not documents:
                        logger.warning("No documents could be processed")
                        update_job_progress(
                            job_id, 
                            processed_so_far, 
                            f"No documents could be processed from the provided files."
                        )
                    else:
                        # Get document ID mapping from documents
                        document_id_map = {}
                        for doc in documents[:5]:  # Sample a few documents for logging
                            doc_id = doc.metadata.get("document_id")
                            filename = doc.metadata.get("original_filename")
                            if doc_id and filename:
                                document_id_map[filename] = doc_id
                                
                        logger.info(f"Sample document ID mapping from loaded documents: {document_id_map}")
                        
                        # Prepare file info list, using the SAME document IDs that were used in the documents
                        file_infos = []
                        for orig_path, staged_path in file_mapping.items():
                            orig_filename = os.path.basename(orig_path)
                            
                            # Find document ID for this file using the same priority as in load_documents
                            # 1. Check security info
                            doc_id = security_info.get(orig_path, {}).get("document_id")
                            
                            # Log what ID we found for each file
                            if doc_id:
                                logger.info(f"Using security info document ID for {orig_filename}: {doc_id}")
                            else:
                                # If we don't have a document ID, check if any document has this filename
                                for doc in documents:
                                    if doc.metadata.get("original_filename") == orig_filename:
                                        doc_id = doc.metadata.get("document_id")
                                        if doc_id:
                                            logger.info(f"Found document ID {doc_id} in document metadata for {orig_filename}")
                                            break
                                
                                if not doc_id:
                                    doc_id = f"doc_{uuid.uuid4()}"
                                    logger.warning(f"Had to generate a new document ID for {orig_path}: {doc_id}")
                            
                            file_info = {
                                "filename": orig_filename,
                                "original_path": orig_path,
                                "staged_path": staged_path,
                                "security_classification": security_info.get(orig_path, {}).get("security_classification", "UNCLASSIFIED"),
                                "content_security_classification": security_info.get(orig_path, {}).get("content_security_classification", "UNCLASSIFIED"),
                                "document_id": doc_id
                            }
                            file_infos.append(file_info)
                            logger.info(f"Added file info for {orig_path} with document_id {doc_id}")
                        
                        # Update vector store name and description if provided
                        update_params = {}
                        if request.name is not None:
                            update_params["name"] = request.name
                        if request.description is not None:
                            update_params["description"] = request.description
                        
                        # Update the vector store with new documents
                        logger.info(f"Adding {len(documents)} documents to vector store")
                        success = manager.update_vectorstore(
                            vectorstore_id,
                            documents=documents,
                            embedding_model=embedding_model,
                            file_infos=file_infos,
                            batch_size=request.doc_batch_size if request.batch_processing else len(documents),
                            **update_params
                        )
                        
                        if success:
                            add_count = len(file_infos)  # Set to number of files, not documents
                            logger.info(f"Successfully added {add_count} files ({len(documents)} document chunks)")
                        else:
                            logger.error("Failed to add documents to vector store")
                        
                        # Clean up staged files regardless of success
                        cleanup_staged_files(list(file_mapping.values()))
                
                except Exception as e:
                    logger.error(f"Error processing documents: {str(e)}")
                    import traceback
                    logger.error(f"Error details: {traceback.format_exc()}")
                    update_job_progress(
                        job_id, 
                        processed_so_far, 
                        f"Error processing documents: {str(e)}"
                    )
                    # Clean up staged files
                    if 'file_mapping' in locals() and file_mapping:
                        cleanup_staged_files(list(file_mapping.values()))
        
        # Complete the job with results
        complete_job(job_id, {
            "add_count": add_count,
            "remove_count": remove_count,
            "skipped_files": skipped_files,
            "message": f"Successfully updated vector store. Added {add_count} documents, removed {remove_count} documents."
        })
        
    except Exception as e:
        logger.error(f"Error in batch update process: {str(e)}")
        import traceback
        logger.error(f"Error details: {traceback.format_exc()}")
        fail_job(job_id, f"Error in batch update: {str(e)}")

# Constants for backup management
MAX_BACKUPS_PER_VECTORSTORE = 3  # Keep only this many most recent backups

def cleanup_old_backups(vectorstore_id, keep_count=MAX_BACKUPS_PER_VECTORSTORE):
    """Clean up old backups for a vector store, keeping only the most recent ones."""
    vs_dir = Path(VECTORSTORE_DIR)
    backup_pattern = f"{vectorstore_id}_backup_*"
    
    # Find all backup directories
    backups = list(vs_dir.glob(backup_pattern))
    
    # Skip if we don't have more than the keep_count
    if len(backups) <= keep_count:
        logger.info(f"Only {len(backups)} backups found for {vectorstore_id}, no cleanup needed")
        return 0
    
    logger.info(f"Found {len(backups)} backups for vector store {vectorstore_id}")
    
    # Sort backups by timestamp (newest first)
    try:
        # First try to sort by timestamp in the directory name
        sorted_backups = []
        for backup in backups:
            try:
                # Extract timestamp from the directory name
                parts = str(backup.name).split('_')
                if len(parts) >= 3:
                    timestamp = int(parts[-1])
                    sorted_backups.append((backup, timestamp))
                else:
                    logger.warning(f"Backup directory has unexpected format: {backup.name}")
                    # Use file modification time as fallback
                    timestamp = int(backup.stat().st_mtime)
                    sorted_backups.append((backup, timestamp))
            except (ValueError, IndexError) as e:
                logger.warning(f"Could not extract timestamp from {backup.name}: {str(e)}")
                # Use file modification time as fallback
                timestamp = int(backup.stat().st_mtime)
                sorted_backups.append((backup, timestamp))
        
        # Sort by timestamp (newest first)
        sorted_backups.sort(key=lambda x: x[1], reverse=True)
        
        # Extract just the paths
        backups = [b[0] for b in sorted_backups]
    except Exception as e:
        logger.error(f"Error sorting backups by timestamp: {str(e)}")
        # Fallback to sorting by directory name
        backups.sort(reverse=True)
    
    # Keep the newest, delete the rest
    to_keep = backups[:keep_count]
    to_remove = backups[keep_count:]
    
    logger.info(f"Keeping {len(to_keep)} newest backups: {[b.name for b in to_keep]}")
    logger.info(f"Removing {len(to_remove)} older backups: {[b.name for b in to_remove]}")
    
    removed_count = 0
    
    for backup_dir in to_remove:
        try:
            logger.info(f"Removing old backup: {backup_dir}")
            shutil.rmtree(backup_dir)
            removed_count += 1
        except Exception as e:
            logger.error(f"Error removing backup {backup_dir}: {str(e)}")
    
    logger.info(f"Cleaned up {removed_count} old backups for vector store {vectorstore_id}")
    return removed_count

# Add a new endpoint to clean up vector store backups
@app.post("/api/embedding/cleanup-backups")
async def cleanup_vectorstore_backups(max_per_store: int = MAX_BACKUPS_PER_VECTORSTORE):
    """Clean up old backup files for all vector stores."""
    try:
        total_removed = 0
        total_errors = 0
        vectorstore_dir = Path(VECTORSTORE_DIR)
        
        # Check if vectorstore directory exists
        if not vectorstore_dir.exists() or not vectorstore_dir.is_dir():
            return {
                "success": False,
                "message": f"Vector store directory {VECTORSTORE_DIR} not found",
            }
        
        # Get all vector store IDs
        vs_dirs = [d for d in vectorstore_dir.glob("*") if d.is_dir() and not str(d.name).endswith("_backup_")]
        logger.info(f"Found {len(vs_dirs)} vector stores")
        
        # Also look for backup directories without a corresponding vector store
        all_dirs = set(d.name for d in vectorstore_dir.glob("*") if d.is_dir())
        orphaned_backups = []
        
        for dir_name in all_dirs:
            if "_backup_" in dir_name:
                # Extract vectorstore_id from backup directory name
                vs_id = dir_name.split("_backup_")[0]
                if vs_id not in [d.name for d in vs_dirs]:
                    orphaned_backups.append((dir_name, vs_id))
        
        # For each vector store, clean up its backups
        for vs_dir in vs_dirs:
            vs_id = vs_dir.name
            try:
                removed = cleanup_old_backups(vs_id, max_per_store)
                total_removed += removed
            except Exception as e:
                logger.error(f"Error cleaning up backups for {vs_id}: {str(e)}")
                total_errors += 1
        
        # Clean up orphaned backups (ones without a corresponding vector store)
        orphaned_removed = 0
        if orphaned_backups:
            logger.info(f"Found {len(orphaned_backups)} orphaned backup directories")
            for backup_name, vs_id in orphaned_backups:
                try:
                    backup_dir = vectorstore_dir / backup_name
                    logger.info(f"Removing orphaned backup: {backup_dir}")
                    shutil.rmtree(backup_dir)
                    orphaned_removed += 1
                    total_removed += 1
                except Exception as e:
                    logger.error(f"Error removing orphaned backup {backup_dir}: {str(e)}")
                    total_errors += 1
        
        return {
            "success": True,
            "message": f"Cleaned up {total_removed} backup directories",
            "details": f"Keeping {max_per_store} most recent backups per vector store. Removed {orphaned_removed} orphaned backups. {total_errors} errors encountered."
        }
    except Exception as e:
        logger.error(f"Error during backup cleanup: {str(e)}")
        import traceback
        logger.error(f"Error details: {traceback.format_exc()}")
        return {
            "success": False,
            "message": f"Error during backup cleanup: {str(e)}",
        }

# Add a new endpoint to check system status
@app.get("/api/embedding/system/status")
async def get_system_status():
    """Get current system status including CPU, memory, and GPU usage"""
    status = {
        "timestamp": datetime.now().isoformat(),
        "cpu": {},
        "memory": {},
        "gpu": [],
        "cache": {
            "vectorstore_count": len(vs_cache.cache),
            "cached_vectorstores": list(vs_cache.cache.keys())
        }
    }
    
    try:
        # CPU status
        cpu_percent = psutil.cpu_percent(interval=0.1)
        status["cpu"] = {
            "percent": cpu_percent,
            "count": psutil.cpu_count(),
            "physical_count": psutil.cpu_count(logical=False)
        }
        
        # Memory status
        memory = psutil.virtual_memory()
        status["memory"] = {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "percent": memory.percent
        }
        
        # GPU status if available
        if GPUS_AVAILABLE:
            try:
                gpus = GPUtil.getGPUs()
                for gpu in gpus:
                    status["gpu"].append({
                        "id": gpu.id,
                        "name": gpu.name,
                        "memory_total": gpu.memoryTotal,
                        "memory_used": gpu.memoryUsed,
                        "memory_util": gpu.memoryUtil,
                        "load": gpu.load,
                        "temperature": gpu.temperature
                    })
            except Exception as e:
                logger.warning(f"Error getting GPU status: {str(e)}")
                status["gpu_error"] = str(e)
    except Exception as e:
        logger.error(f"Error getting system status: {str(e)}")
        status["error"] = str(e)
    
    return status

# Add endpoint to manually clear cache
@app.post("/api/embedding/cache/clear")
async def clear_cache():
    """Clear the vector store cache to free up memory"""
    cache_size_before = len(vs_cache.cache)
    vs_cache.clear()
    
    # Force garbage collection
    gc.collect()
    
    return {
        "success": True,
        "message": f"Cleared {cache_size_before} vector stores from cache",
        "cache_size_before": cache_size_before,
        "cache_size_after": 0
    }

@app.get("/api/embedding/system/gpu-status")
async def get_gpu_status():
    """Endpoint to check GPU status and run a small test to verify GPU acceleration"""
    response = {
        "gpu_available": False,
        "gpu_info": [],
        "torch_cuda_available": False,
        "torch_cuda_info": {},
        "faiss_gpu_available": False,
        "test_results": {}
    }
    
    # Check GPUtil
    if GPUS_AVAILABLE:
        try:
            gpus = GPUtil.getGPUs()
            response["gpu_available"] = len(gpus) > 0
            for i, gpu in enumerate(gpus):
                response["gpu_info"].append({
                    "id": i,
                    "name": gpu.name,
                    "memory_total": gpu.memoryTotal,
                    "memory_used": gpu.memoryUsed,
                    "memory_utilization": round(gpu.memoryUtil * 100, 2),
                    "load": round(gpu.load * 100, 2)
                })
        except Exception as e:
            logger.warning(f"Error getting GPU info from GPUtil: {str(e)}")
    
    # Check PyTorch CUDA
    if TORCH_CUDA_AVAILABLE:
        try:
            device_count = torch.cuda.device_count()
            response["torch_cuda_available"] = True
            response["torch_cuda_info"] = {
                "device_count": device_count,
                "current_device": torch.cuda.current_device(),
                "devices": []
            }
            
            # Get info for each device
            for i in range(device_count):
                device_name = torch.cuda.get_device_name(i)
                device_capability = torch.cuda.get_device_capability(i)
                allocated_mem = round(torch.cuda.memory_allocated(i) / (1024**3), 2)  # GB
                reserved_mem = round(torch.cuda.memory_reserved(i) / (1024**3), 2)    # GB
                
                response["torch_cuda_info"]["devices"].append({
                    "id": i,
                    "name": device_name,
                    "compute_capability": f"{device_capability[0]}.{device_capability[1]}",
                    "memory_allocated_gb": allocated_mem,
                    "memory_reserved_gb": reserved_mem
                })
            
            # Run a small PyTorch test to verify GPU acceleration
            try:
                start_time = time.time()
                # Create random tensors and perform operations
                a = torch.randn(10000, 10000).cuda()
                b = torch.randn(10000, 10000).cuda()
                c = torch.matmul(a, b)
                torch.cuda.synchronize()  # Wait for the operation to complete
                gpu_time = time.time() - start_time
                
                # Do the same on CPU for comparison
                start_time = time.time()
                a_cpu = torch.randn(10000, 10000)
                b_cpu = torch.randn(10000, 10000)
                c_cpu = torch.matmul(a_cpu, b_cpu)
                cpu_time = time.time() - start_time
                
                # Record results
                response["test_results"]["pytorch"] = {
                    "gpu_time_seconds": round(gpu_time, 4),
                    "cpu_time_seconds": round(cpu_time, 4),
                    "speedup_factor": round(cpu_time / gpu_time, 2) if gpu_time > 0 else 0
                }
                
                # Clean up
                del a, b, c, a_cpu, b_cpu, c_cpu
                torch.cuda.empty_cache()
                gc.collect()
            except Exception as e:
                logger.warning(f"Error running PyTorch GPU test: {str(e)}")
                response["test_results"]["pytorch_error"] = str(e)
        except Exception as e:
            logger.warning(f"Error getting PyTorch CUDA info: {str(e)}")
    
    # Check FAISS GPU availability
    try:
        # Check if the faiss module has GPU support
        response["faiss_gpu_available"] = has_faiss_gpu
        
        # Only run FAISS GPU test if FAISS GPU is available
        if has_faiss_gpu and "res" in globals() and TORCH_CUDA_AVAILABLE:
            # Run a small FAISS test with GPU
            try:
                dimension = 128
                num_vectors = 100000
                
                # Generate random vectors
                vectors = np.random.random((num_vectors, dimension)).astype('float32')
                
                # Create a CPU index
                start_time = time.time()
                cpu_index = faiss.IndexFlatL2(dimension)
                cpu_index.add(vectors)
                
                # Search on CPU
                queries = np.random.random((10, dimension)).astype('float32')
                cpu_index.search(queries, k=10)
                cpu_time = time.time() - start_time
                
                # Create a GPU index
                start_time = time.time()
                gpu_index = faiss.index_cpu_to_gpu(res, 0, faiss.IndexFlatL2(dimension))
                gpu_index.add(vectors)
                
                # Search on GPU
                gpu_index.search(queries, k=10)
                gpu_time = time.time() - start_time
                
                # Record results
                response["test_results"]["faiss"] = {
                    "gpu_time_seconds": round(gpu_time, 4),
                    "cpu_time_seconds": round(cpu_time, 4),
                    "speedup_factor": round(cpu_time / gpu_time, 2) if gpu_time > 0 else 0
                }
                
                # Clean up
                del cpu_index, gpu_index, vectors, queries
                gc.collect()
                torch.cuda.empty_cache()
            except Exception as e:
                logger.warning(f"Error running FAISS GPU test: {str(e)}")
                response["test_results"]["faiss_error"] = str(e)
        else:
            # If FAISS GPU is not available, report that
            response["test_results"]["faiss"] = {
                "error": "FAISS GPU support is not available. Using CPU version."
            }
    except Exception as e:
        logger.warning(f"Error checking FAISS GPU availability: {str(e)}")
    
    return response

# Add a manual CUDA cache clearing endpoint
@app.post("/api/embedding/system/clear-gpu-memory")
async def clear_gpu_memory():
    """Manually clear GPU memory cache"""
    if TORCH_CUDA_AVAILABLE:
        try:
            before = torch.cuda.memory_allocated(0) / (1024**3)  # GB
            torch.cuda.empty_cache()
            gc.collect()
            after = torch.cuda.memory_allocated(0) / (1024**3)   # GB
            
            return {
                "success": True,
                "message": "GPU memory cache cleared",
                "memory_before_gb": round(before, 2),
                "memory_after_gb": round(after, 2),
                "memory_freed_gb": round(before - after, 2)
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error clearing GPU memory: {str(e)}"
            }
    else:
        return {
            "success": False,
            "message": "CUDA is not available"
        }

class UpdateVectorStoreMetadataRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class UpdateVectorStoreMetadataResponse(BaseModel):
    success: bool
    message: str
    vectorstore_id: str

@app.put("/api/embedding/vectorstores/{vectorstore_id}", response_model=UpdateVectorStoreMetadataResponse)
async def update_vectorstore_metadata(
    vectorstore_id: str,
    request: UpdateVectorStoreMetadataRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """Update the metadata (name, description) of a vector store."""
    # Check if vector store exists
    vs_info = manager.get_vectorstore_info(vectorstore_id)
    if not vs_info:
        raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
    
    try:
        # Load metadata
        vs_dir = Path(VECTORSTORE_DIR) / vectorstore_id
        metadata_file = vs_dir / "metadata.json"
        
        if not metadata_file.exists():
            raise HTTPException(status_code=404, detail=f"Metadata file not found for vector store {vectorstore_id}")
        
        metadata = load_metadata(metadata_file)
        if not metadata:
            raise HTTPException(status_code=500, detail=f"Failed to load metadata for vector store {vectorstore_id}")
        
        # Update fields if provided
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
            save_metadata(metadata, metadata_file)
            logger.info(f"Updated metadata for vector store {vectorstore_id}")
            
            return UpdateVectorStoreMetadataResponse(
                success=True,
                message="Vector store metadata updated successfully",
                vectorstore_id=vectorstore_id
            )
        else:
            return UpdateVectorStoreMetadataResponse(
                success=True,
                message="No changes to update",
                vectorstore_id=vectorstore_id
            )
            
    except Exception as e:
        logger.error(f"Error updating vector store metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating vector store metadata: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=HOST, port=PORT, reload=True)

