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

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Import for embedding models and vector stores
import numpy as np
from langchain.embeddings.base import Embeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter, TextSplitter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("embedding_service")

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
    from langchain.document_loaders import (
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

def load_documents(file_paths, use_paragraph_chunking=True, max_paragraph_length=1500, min_paragraph_length=50, chunk_size=1000, chunk_overlap=100):
    """Load and process documents from the specified file paths using paragraph-based chunking or traditional chunking."""
    
    all_documents = []
    skipped_files = []
    
    # Create the appropriate text splitter based on the chunking method
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
    
    for file_path in file_paths:
        try:
            # Get the appropriate loader
            loader = get_document_loader(file_path)
            
            if loader is None:
                logger.warning(f"No loader available for {file_path}")
                skipped_files.append(file_path)
                continue
            
            # Load the document
            docs = loader.load()
            
            if not docs:
                logger.warning(f"No content loaded from {file_path}")
                skipped_files.append(file_path)
                continue
            
            # Split the document using the selected chunking method
            splits = text_splitter.split_documents(docs)
            
            # Log chunk statistics
            chunk_lengths = [len(chunk.page_content) for chunk in splits]
            avg_chunk_length = sum(chunk_lengths) / len(chunk_lengths) if chunk_lengths else 0
            
            logger.info(f"File: {file_path}, Chunks: {len(splits)}, Avg Chunk Length: {avg_chunk_length:.0f} chars")
            
            # Add metadata to track the source file for each chunk
            for chunk in splits:
                chunk.metadata["source"] = file_path
                # Add chunk statistics to metadata
                chunk.metadata["chunk_length"] = len(chunk.page_content)
            
            all_documents.extend(splits)
            
        except Exception as e:
            logger.error(f"Error processing {file_path}: {str(e)}")
            skipped_files.append(file_path)
    
    return all_documents, skipped_files

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
        name, 
        description, 
        documents, 
        embedding_model, 
        model_name,
        file_infos, 
        use_paragraph_chunking=True,
        max_paragraph_length=1500,
        min_paragraph_length=50,
        chunk_size=1000, 
        chunk_overlap=100
    ):
        """Create a new vector store."""
        from langchain.vectorstores import FAISS
        
        # Generate a unique ID for the vector store
        vs_id = str(uuid.uuid4())
        
        # Create the vector store directory
        vs_dir = self.base_dir / vs_id
        vs_dir.mkdir(exist_ok=True)
        
        # Create the FAISS vector store
        vectorstore = FAISS.from_documents(
            documents=documents,
            embedding=embedding_model
        )
        
        # Save the vector store directly in the vectorstore directory (same as metadata.json)
        vectorstore.save_local(str(vs_dir))
        
        # Create and save metadata
        metadata = create_vectorstore_metadata(
            vs_id=vs_id,
            name=name,
            description=description,
            embedding_model=model_name,
            file_infos=file_infos,
            use_paragraph_chunking=use_paragraph_chunking,
            max_paragraph_length=max_paragraph_length,
            min_paragraph_length=min_paragraph_length,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        save_metadata(metadata, vs_dir / "metadata.json")
        
        return vs_id
    
    def update_vectorstore(
        self, 
        vectorstore_id, 
        documents, 
        embedding_model, 
        new_file_infos
    ):
        """Update an existing vector store with new documents."""
        from langchain.vectorstores import FAISS
        
        vs_dir = self.base_dir / vectorstore_id
        
        if not vs_dir.exists() or not vs_dir.is_dir():
            return False
        
        metadata_file = vs_dir / "metadata.json"
        
        if not metadata_file.exists():
            return False
        
        try:
            # Load the existing metadata
            metadata = load_metadata(metadata_file)
            
            if not metadata:
                return False
            
            # Load the existing vector store from the vectorstore directory
            vectorstore = FAISS.load_local(
                str(vs_dir),
                embedding_model
            )
            
            # Add the new documents
            vectorstore.add_documents(documents)
            
            # Save the updated vector store back to the vectorstore directory
            vectorstore.save_local(str(vs_dir))
            
            # Update metadata
            metadata["files"].extend(new_file_infos)
            update_metadata(metadata, metadata_file)
            
            return True
        
        except Exception as e:
            logger.error(f"Error updating vector store {vectorstore_id}: {str(e)}")
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
        # Get the embedding model
        embedding_model = get_embedding_model(request.embedding_model)
        
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
            raise HTTPException(status_code=400, detail="No valid files found")
        
        # Load and process documents
        documents, skipped_files = load_documents(
            list(file_mapping.values()),
            use_paragraph_chunking=request.use_paragraph_chunking,
            max_paragraph_length=request.max_paragraph_length,
            min_paragraph_length=request.min_paragraph_length,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap
        )
        
        if not documents:
            raise HTTPException(status_code=400, detail="No valid documents could be processed")
        
        # Get security classifications
        security_info = get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
        
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
            use_paragraph_chunking=request.use_paragraph_chunking,
            max_paragraph_length=request.max_paragraph_length,
            min_paragraph_length=request.min_paragraph_length,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap
        )
        
        # Clean up staged files
        staged_files = list(file_mapping.values())
        success_count, error_count = cleanup_staged_files(staged_files)
        logger.info(f"Cleaned up {success_count} staged files after creating vectorstore {vectorstore_id}")
        
        return {
            "success": True,
            "message": f"Vector store '{request.name}' created successfully",
            "vectorstore_id": vectorstore_id,
            "skipped_files": skipped_files
        }
        
    except Exception as e:
        logger.error(f"Error creating vector store: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/embedding/vectorstores/{vectorstore_id}/update", response_model=UpdateVectorStoreResponse)
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
        file_mapping = copy_files_to_staging(
            request.files,
            upload_dir,
            staging_dir
        )
        
        if not file_mapping:
            raise HTTPException(status_code=400, detail="No valid files found")
        
        # Determine chunking method from existing metadata
        use_paragraph_chunking = vs_info.get("chunking_method", "fixed") == "paragraph"
        max_paragraph_length = vs_info.get("max_paragraph_length", 1500)
        min_paragraph_length = vs_info.get("min_paragraph_length", 50)
        chunk_size = vs_info.get("chunk_size", 1000)
        chunk_overlap = vs_info.get("chunk_overlap", 100)
        
        # Load and process documents using the same chunking method as the original vectorstore
        documents, skipped_files = load_documents(
            list(file_mapping.values()),
            use_paragraph_chunking=use_paragraph_chunking,
            max_paragraph_length=max_paragraph_length,
            min_paragraph_length=min_paragraph_length,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        if not documents:
            raise HTTPException(status_code=400, detail="No valid documents could be processed")
        
        # Get security classifications
        security_info = get_file_security_info(list(file_mapping.keys()), Path(UPLOAD_DIR))
        
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
        
        # Clean up staged files
        staged_files = list(file_mapping.values())
        success_count, error_count = cleanup_staged_files(staged_files)
        logger.info(f"Cleaned up {success_count} staged files after updating vectorstore {vectorstore_id}")
        
        return {
            "success": True,
            "message": f"Vector store {vectorstore_id} updated successfully",
            "skipped_files": skipped_files
        }
        
    except Exception as e:
        logger.error(f"Error updating vector store: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=HOST, port=PORT, reload=True)

