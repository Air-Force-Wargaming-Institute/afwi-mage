"""
Utility functions for loading and processing documents for vector stores.
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import shutil
import json
import time
import uuid

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

# Set up logging
logger = logging.getLogger("embedding_service")


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
    # Add debug logging at entry point
    logger.info(f"DEBUGGING: copy_files_to_staging called with files: {files}")
    logger.info(f"DEBUGGING: Upload dir: {upload_dir}, Staging dir: {staging_dir}")
    
    # Ensure staging directory exists and is empty
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
    staging_dir.mkdir(parents=True, exist_ok=True)
    
    file_mapping = {}
    
    for file_path in files:
        source_path = upload_dir / file_path
        
        # Log the full paths for debugging
        logger.info(f"DEBUGGING: Processing file - Original path: {file_path}")
        logger.info(f"DEBUGGING: Full source path: {source_path}")
        logger.info(f"DEBUGGING: Source path exists: {source_path.exists()}")
        
        if not source_path.exists():
            logger.warning(f"File {source_path} does not exist, skipping")
            continue
        
        # Use the original filename instead of generating a UUID
        original_filename = os.path.basename(file_path)
        logger.info(f"DEBUGGING: Original filename: {original_filename}")
        
        # If file with same name already exists in staging, append a timestamp to avoid conflicts
        dest_path = staging_dir / original_filename
        if dest_path.exists():
            timestamp = int(time.time())
            name, ext = os.path.splitext(original_filename)
            original_filename = f"{name}_{timestamp}{ext}"
            dest_path = staging_dir / original_filename
        
        logger.info(f"DEBUGGING: Destination filename: {original_filename}")
        logger.info(f"DEBUGGING: Destination path: {dest_path}")
        
        # Copy the file
        shutil.copy2(source_path, dest_path)
        
        # Store the mapping
        file_mapping[file_path] = str(dest_path)
        
        # Also copy the metadata file if it exists
        # Try multiple possible metadata file locations
        metadata_paths = [
            source_path.with_suffix(source_path.suffix + ".metadata"),
            Path(str(source_path) + ".metadata"),
            Path(f"{os.path.splitext(source_path)[0]}.metadata"),
        ]
        
        metadata_copied = False
        for metadata_path in metadata_paths:
            logger.info(f"DEBUGGING: Looking for metadata file: {metadata_path}")
            if metadata_path.exists():
                dest_metadata_path = dest_path.with_suffix(dest_path.suffix + ".metadata")
                shutil.copy2(metadata_path, dest_metadata_path)
                logger.info(f"DEBUGGING: Copied metadata file from {metadata_path} to {dest_metadata_path}")
                metadata_copied = True
                break
        
        if not metadata_copied:
            logger.warning(f"DEBUGGING: No metadata file found for {file_path}")
            
            # Create a minimal metadata file to preserve the original filename
            metadata = {
                "original_file": original_filename,
                "security_classification": "UNCLASSIFIED",
                "document_id": f"doc_{uuid.uuid4()}"
            }
            
            dest_metadata_path = dest_path.with_suffix(dest_path.suffix + ".metadata")
            with open(dest_metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            logger.info(f"DEBUGGING: Created new metadata file at {dest_metadata_path} with original filename")
    
    # Log the complete mapping before returning
    logger.info(f"DEBUGGING: Final file mapping: {json.dumps(file_mapping, indent=2)}")
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
    logger.info(f"DEBUGGING: load_documents called with paths: {file_paths}")
    if file_metadata:
        logger.info(f"DEBUGGING: File metadata keys provided: {list(file_metadata.keys())}")
    else:
        logger.info("DEBUGGING: No file metadata provided")
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        add_start_index=True
    )
    
    documents = []
    skipped_files = []
    
    for file_path in file_paths:
        try:
            logger.info(f"DEBUGGING: Processing document: {file_path}")
            
            # Get the appropriate loader for this file type
            loader = get_document_loader(file_path)
            
            # Load the document
            file_docs = loader.load()
            logger.info(f"DEBUGGING: Loaded {len(file_docs)} raw documents from {file_path}")
            
            # Get metadata for this file
            file_specific_metadata = {}
            
            # Try to find the correct metadata entry
            found_metadata = False
            if file_metadata:
                # First try exact path match
                if file_path in file_metadata:
                    file_specific_metadata = file_metadata[file_path]
                    logger.info(f"DEBUGGING: Found exact metadata match for {file_path}")
                    found_metadata = True
                else:
                    # Try matching by filename
                    filename = os.path.basename(file_path)
                    for key, metadata_value in file_metadata.items():
                        key_basename = os.path.basename(key)
                        if key_basename == filename:
                            file_specific_metadata = metadata_value
                            logger.info(f"DEBUGGING: Found metadata by filename match: {filename}")
                            found_metadata = True
                            break
                        
                        # Try more flexible matching for UUIDs in filenames
                        if os.path.splitext(key_basename)[1] == os.path.splitext(filename)[1]:
                            # If they have the same extension, this might be a good match
                            logger.info(f"DEBUGGING: Possible extension match: {key_basename} with {filename}")
                            
                            # Check if the metadata contains an original_filename that matches
                            if metadata_value.get("original_filename") == filename:
                                file_specific_metadata = metadata_value
                                logger.info(f"DEBUGGING: Found metadata by original_filename match")
                                found_metadata = True
                                break
                    
                    # If still not found, log all available keys for debugging
                    if not found_metadata:
                        logger.warning(f"DEBUGGING: No metadata found for {file_path}")
                        logger.info(f"DEBUGGING: Available metadata keys:")
                        for key in file_metadata.keys():
                            logger.info(f"  - {key} (basename: {os.path.basename(key)})")
            
            # If no metadata was found, try to read associated metadata file directly
            if not found_metadata:
                logger.info(f"DEBUGGING: No metadata found, checking for associated metadata file")
                metadata_file_paths = [
                    Path(str(file_path) + ".metadata"),
                    Path(f"{os.path.splitext(file_path)[0]}.metadata")
                ]
                
                for metadata_path in metadata_file_paths:
                    if metadata_path.exists():
                        try:
                            with open(metadata_path, "r") as f:
                                file_specific_metadata = json.load(f)
                                logger.info(f"DEBUGGING: Loaded metadata directly from {metadata_path}")
                                found_metadata = True
                                break
                        except Exception as e:
                            logger.error(f"DEBUGGING: Error reading metadata file {metadata_path}: {str(e)}")
            
            # If still no metadata found, create basic metadata with defaults
            if not found_metadata or not file_specific_metadata:
                file_specific_metadata = {
                    "security_classification": "UNCLASSIFIED",
                    "content_security_classification": "UNCLASSIFIED",
                    "original_filename": os.path.basename(file_path),
                    "document_id": f"doc_{uuid.uuid4()}"
                }
                logger.info(f"DEBUGGING: Using default metadata for {file_path}")
            
            # Log metadata that will be applied
            logger.info(f"DEBUGGING: Applying metadata for {file_path}: {json.dumps(file_specific_metadata, indent=2)}")
            
            # Add source file metadata to each document
            for doc in file_docs:
                # Start with base metadata
                original_metadata = doc.metadata.copy() if doc.metadata else {}
                logger.info(f"DEBUGGING: Original document metadata: {json.dumps(original_metadata, indent=2)}")
                
                # New metadata dictionary with file-specific metadata as base
                doc_metadata = file_specific_metadata.copy()
                
                # Add essential source information
                doc_metadata["source"] = file_path
                doc_metadata["file_path"] = file_path
                
                # Ensure document_id is present
                if "document_id" not in doc_metadata:
                    doc_metadata["document_id"] = f"doc_{uuid.uuid4()}"
                
                # Prioritize original document metadata for page numbers, etc.
                for key, value in original_metadata.items():
                    if key not in doc_metadata:
                        doc_metadata[key] = value
                
                # Set the metadata on the document
                doc.metadata = doc_metadata
                logger.info(f"DEBUGGING: Updated document metadata: {json.dumps(doc.metadata, indent=2)}")
            
            # Split the documents
            split_docs = text_splitter.split_documents(file_docs)
            logger.info(f"DEBUGGING: Split into {len(split_docs)} chunks from {file_path}")
            
            # Add chunk information to each document
            total_chunks = len(split_docs)
            for i, doc in enumerate(split_docs):
                doc.metadata["chunk_index"] = i
                doc.metadata["total_chunks"] = total_chunks
                doc.metadata["chunk_number"] = i + 1
                doc.metadata["of_total"] = total_chunks
                
                # Calculate approximate word count
                doc.metadata["word_count"] = len(doc.page_content.split())
                doc.metadata["char_count"] = len(doc.page_content)
                
                # Ensure each chunk retains the document ID from its parent document
                if "document_id" not in doc.metadata:
                    doc.metadata["document_id"] = file_specific_metadata.get("document_id", f"doc_{uuid.uuid4()}")
                    
                # Also ensure original filename is preserved
                if "original_filename" not in doc.metadata:
                    doc.metadata["original_filename"] = file_specific_metadata.get("original_filename", os.path.basename(file_path))
                
                # Ensure security classification is preserved
                if "security_classification" not in doc.metadata:
                    doc.metadata["security_classification"] = file_specific_metadata.get("security_classification", "UNCLASSIFIED")
                
                if "content_security_classification" not in doc.metadata:
                    doc.metadata["content_security_classification"] = file_specific_metadata.get("content_security_classification", "UNCLASSIFIED")
            
            # Log a sample chunked document's metadata
            if split_docs:
                logger.info(f"DEBUGGING: Sample chunk metadata: {json.dumps(split_docs[0].metadata, indent=2)}")
            
            # Add the documents to our list
            documents.extend(split_docs)
            logger.info(f"DEBUGGING: Loaded {len(split_docs)} chunks from {file_path}")
            
        except Exception as e:
            logger.error(f"DEBUGGING: Error loading {file_path}: {str(e)}")
            logger.error(f"DEBUGGING: Exception details: {str(e)}", exc_info=True)
            skipped_files.append(file_path)
    
    logger.info(f"DEBUGGING: Total chunks loaded: {len(documents)}")
    logger.info(f"DEBUGGING: Files skipped: {len(skipped_files)}")
    
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