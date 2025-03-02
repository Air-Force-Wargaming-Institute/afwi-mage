"""
Utility functions for loading and processing documents for vector stores.
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import shutil
import json

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    CSVLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    UnstructuredExcelLoader
)


def get_document_loader(file_path: str):
    """
    Get the appropriate document loader based on file extension.
    
    Args:
        file_path: Path to the document
        
    Returns:
        A document loader instance
        
    Raises:
        ValueError: If the file type is not supported
    """
    file_ext = os.path.splitext(file_path)[1].lower()
    
    if file_ext == '.pdf':
        return PyPDFLoader(file_path)
    elif file_ext == '.txt':
        return TextLoader(file_path)
    elif file_ext == '.csv':
        return CSVLoader(file_path)
    elif file_ext in ['.doc', '.docx']:
        return UnstructuredWordDocumentLoader(file_path)
    elif file_ext in ['.ppt', '.pptx']:
        return UnstructuredPowerPointLoader(file_path)
    elif file_ext in ['.xls', '.xlsx']:
        return UnstructuredExcelLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_ext}")


def copy_files_to_staging(files: List[str], upload_dir: Path, staging_dir: Path) -> Dict[str, str]:
    """
    Copy files from upload directory to staging directory.
    
    Args:
        files: List of file paths relative to upload directory
        upload_dir: Upload directory path
        staging_dir: Staging directory path
        
    Returns:
        Dictionary mapping original paths to staging paths
    """
    # Ensure staging directory exists and is empty
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
    staging_dir.mkdir(parents=True, exist_ok=True)
    
    file_mapping = {}
    
    for file_path in files:
        source_path = upload_dir / file_path
        
        if not source_path.exists():
            print(f"Warning: File {source_path} does not exist, skipping")
            continue
        
        # Create a safe filename for the staging area
        dest_filename = os.path.basename(file_path)
        dest_path = staging_dir / dest_filename
        
        # Copy the file
        shutil.copy2(source_path, dest_path)
        
        # Store the mapping
        file_mapping[file_path] = str(dest_path)
    
    return file_mapping


def load_documents(
    file_paths: List[str],
    chunk_size: int = 1000,
    chunk_overlap: int = 100
) -> Tuple[List[Document], List[str]]:
    """
    Load documents from the specified file paths and split them into chunks.
    
    Args:
        file_paths: List of file paths to load
        chunk_size: Size of text chunks
        chunk_overlap: Overlap between chunks
        
    Returns:
        Tuple of (list of documents, list of skipped files)
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        add_start_index=True
    )
    
    documents = []
    skipped_files = []
    
    for file_path in file_paths:
        try:
            print(f"Loading {file_path}")
            
            # Get the appropriate loader for this file type
            loader = get_document_loader(file_path)
            
            # Load the document
            file_docs = loader.load()
            
            # Add source file metadata to each document
            for doc in file_docs:
                doc.metadata["source"] = file_path
                doc.metadata["filename"] = os.path.basename(file_path)
            
            # Split the documents
            split_docs = text_splitter.split_documents(file_docs)
            
            # Add the documents to our list
            documents.extend(split_docs)
            print(f"Loaded {len(split_docs)} chunks from {file_path}")
            
        except Exception as e:
            print(f"Error loading {file_path}: {str(e)}")
            skipped_files.append(file_path)
    
    print(f"Total chunks loaded: {len(documents)}")
    print(f"Files skipped: {len(skipped_files)}")
    
    return documents, skipped_files


def get_security_classifications(file_paths: List[str]) -> Dict[str, Dict[str, str]]:
    """
    Get security classifications for files.
    
    This function would normally query your document management system
    or metadata storage to get the security classifications for each file.
    For now, it returns a placeholder value.
    
    Args:
        file_paths: List of file paths
        
    Returns:
        Dictionary mapping file paths to their security classifications
    """
    classifications = {}
    
    for file_path in file_paths:
        # In a real implementation, this would query your document storage system
        # For now, we'll just set a default classification
        classifications[file_path] = {
            "security_classification": "UNCLASSIFIED",
            "content_security_classification": "UNCLASSIFIED"
        }
    
    return classifications 