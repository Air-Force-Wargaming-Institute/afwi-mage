"""
Document processing functionality.

This module provides core document processing functionality, including:
- Loading and parsing documents
- Managing document metadata
- Chunking documents for embedding
"""

import os
import logging
import shutil
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import TextSplitter, RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    CSVLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    UnstructuredExcelLoader,
    UnstructuredHTMLLoader,
    UnstructuredMarkdownLoader
)

# Set up logging
logger = logging.getLogger("embedding_service")

def get_document_loader(file_path: str):
    """
    Get a document loader for the specified file path.
    
    Args:
        file_path: Path to the file to load
        
    Returns:
        Document loader
    """
    # Normalize file path
    file_path = os.path.normpath(file_path)
    
    # Get file extension
    file_extension = os.path.splitext(file_path)[1].lower()
    
    logger.info(f"Getting document loader for {file_path} with extension {file_extension}")
    
    # Choose loader based on file extension
    if file_extension == '.pdf':
        logger.info(f"Using PyPDFLoader for {file_path}")
        return PyPDFLoader(file_path)
    elif file_extension == '.txt':
        logger.info(f"Using TextLoader for {file_path}")
        return TextLoader(file_path)
    elif file_extension in ['.doc', '.docx']:
        logger.info(f"Using UnstructuredWordDocumentLoader for {file_path}")
        return UnstructuredWordDocumentLoader(file_path)
    elif file_extension in ['.ppt', '.pptx']:
        logger.info(f"Using UnstructuredPowerPointLoader for {file_path}")
        return UnstructuredPowerPointLoader(file_path)
    elif file_extension == '.csv':
        logger.info(f"Using CSVLoader for {file_path}")
        return CSVLoader(file_path)
    elif file_extension == '.html':
        logger.info(f"Using UnstructuredHTMLLoader for {file_path}")
        return UnstructuredHTMLLoader(file_path)
    elif file_extension in ['.md', '.markdown']:
        logger.info(f"Using UnstructuredMarkdownLoader for {file_path}")
        return UnstructuredMarkdownLoader(file_path)
    elif file_extension in ['.xls', '.xlsx']:
        logger.info(f"Using UnstructuredExcelLoader for {file_path}")
        return UnstructuredExcelLoader(file_path)
    else:
        logger.warning(f"No suitable loader found for file extension {file_extension}")
        return None

def copy_files_to_staging(
    files: List[str],
    upload_dir: Path,
    staging_dir: Path
) -> Dict[str, str]:
    """
    Copy files from upload directory to staging directory.
    
    Args:
        files: List of file paths relative to upload directory
        upload_dir: Upload directory path
        staging_dir: Staging directory path
        
    Returns:
        Dictionary mapping original paths to staging paths
    """
    logger.info(f"Copying {len(files)} files from {upload_dir} to {staging_dir}")
    
    # Create staging directory if it doesn't exist
    os.makedirs(staging_dir, exist_ok=True)
    
    file_mapping = {}
    
    for file_path in files:
        try:
            # Convert to Path objects
            src_path = upload_dir / file_path
            
            # Generate a unique filename to avoid collisions
            file_extension = os.path.splitext(file_path)[1]
            base_name = os.path.basename(file_path)
            dest_filename = f"{base_name}"
            dest_path = staging_dir / dest_filename
            
            # Check if source file exists
            if not os.path.exists(src_path):
                logger.warning(f"Source file not found: {src_path}")
                continue
                
            # Copy file to staging
            shutil.copy2(src_path, dest_path)
            logger.info(f"Copied {src_path} to {dest_path}")
            
            # Add to mapping
            file_mapping[file_path] = str(dest_path)
            
        except Exception as e:
            logger.error(f"Error copying file {file_path}: {str(e)}")
    
    logger.info(f"Successfully copied {len(file_mapping)} files to staging")
    return file_mapping

def load_documents(
    file_paths: List[str],
    chunk_size: int = 1000,
    chunk_overlap: int = 100,
    file_metadata: Optional[Dict[str, Dict[str, Any]]] = None
) -> Tuple[List[Document], List[str]]:
    """
    Load documents from the specified file paths and split them into chunks.
    
    Args:
        file_paths: List of file paths to load
        chunk_size: Size of text chunks
        chunk_overlap: Overlap between chunks
        file_metadata: Optional metadata for each file
        
    Returns:
        Tuple of (list of documents, list of skipped files)
    """
    logger.info(f"Loading documents from {len(file_paths)} file paths")
    
    # Create text splitter
    text_splitter = get_text_splitter(
        use_paragraph_chunking=True,
        max_paragraph_length=1500,
        min_paragraph_length=50,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    
    # Initialize outputs
    all_documents = []
    skipped_files = []
    
    for file_path in file_paths:
        try:
            # Ensure we have the absolute path
            abs_file_path = os.path.abspath(file_path)
            logger.info(f"Processing file: {abs_file_path}")
            
            # Check if file exists
            if not os.path.exists(abs_file_path):
                logger.error(f"File does not exist: {abs_file_path}")
                skipped_files.append(file_path)
                continue
                
            # Get document loader
            loader = get_document_loader(abs_file_path)
            if not loader:
                logger.warning(f"Could not find a suitable loader for {abs_file_path}")
                skipped_files.append(file_path)
                continue
                
            # Load document
            doc = loader.load()
            
            # Extract metadata
            base_metadata = {}
            if file_metadata and file_path in file_metadata:
                base_metadata.update(file_metadata[file_path])
            
            # Add source and file_path to metadata
            if base_metadata:
                for d in doc:
                    if 'source' not in d.metadata:
                        d.metadata['source'] = file_path
                    if 'file_path' not in d.metadata:
                        d.metadata['file_path'] = file_path
            
            # Split document
            split_docs = text_splitter.split_documents(doc)
            all_documents.extend(split_docs)
            
            logger.info(f"Loaded {len(split_docs)} chunks from {file_path}")
            
        except Exception as e:
            logger.error(f"Error loading {file_path}: {str(e)}")
            skipped_files.append(file_path)
    
    logger.info(f"Successfully loaded {len(all_documents)} chunks from {len(file_paths) - len(skipped_files)} files")
    return all_documents, skipped_files

def get_text_splitter(
    use_paragraph_chunking: bool = True,
    max_paragraph_length: int = 1500,
    min_paragraph_length: int = 50,
    chunk_size: int = 1000,
    chunk_overlap: int = 100
) -> TextSplitter:
    """
    Get a text splitter based on the specified parameters.
    
    Args:
        use_paragraph_chunking: Whether to use paragraph-based chunking
        max_paragraph_length: Maximum paragraph length
        min_paragraph_length: Minimum paragraph length
        chunk_size: Size of text chunks
        chunk_overlap: Overlap between chunks
        
    Returns:
        Text splitter
    """
    logger.info(f"Creating text splitter with chunk_size={chunk_size}, chunk_overlap={chunk_overlap}")
    
    # For now, we'll just use RecursiveCharacterTextSplitter
    # In a more advanced implementation, you could implement paragraph-based chunking
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    return splitter

async def process_documents(
    file_paths: List[str],
    text_splitter: TextSplitter,
    security_classification: Optional[str] = None,
    batch_size: int = 1000,
    job_id: Optional[str] = None
) -> Tuple[List[Document], List[Dict[str, Any]]]:
    """
    Process documents asynchronously.
    
    Args:
        file_paths: List of file paths to process
        text_splitter: Text splitter to use
        security_classification: Optional security classification to apply
        batch_size: Batch size for processing
        job_id: Optional job ID for tracking progress
        
    Returns:
        Tuple of (list of documents, list of file infos)
    """
    pass

def create_chunk_metadata(
    doc_metadata: Dict[str, Any],
    chunk_index: int,
    chunk_text: str,
    page_number: Optional[int] = None,
    total_chunks: Optional[int] = None
) -> Dict[str, Any]:
    """
    Create metadata for a document chunk.
    
    Args:
        doc_metadata: Document metadata
        chunk_index: Index of the chunk
        chunk_text: Text of the chunk
        page_number: Optional page number
        total_chunks: Optional total number of chunks
        
    Returns:
        Chunk metadata
    """
    pass

def extract_document_metadata(
    file_path: str,
    content: str,
    security_classification: str = None
) -> Dict[str, Any]:
    """
    Extract metadata from a document.
    
    Args:
        file_path: Path to the document
        content: Content of the document
        security_classification: Optional security classification
        
    Returns:
        Document metadata
    """
    pass

def get_file_security_info(
    file_paths: List[str],
    upload_dir: Path
) -> Dict[str, Dict[str, Any]]:
    """
    Get security classification and other metadata for files.
    
    Args:
        file_paths: List of file paths
        upload_dir: Base directory for uploads
        
    Returns:
        Dictionary mapping file paths to security info
    """
    pass
