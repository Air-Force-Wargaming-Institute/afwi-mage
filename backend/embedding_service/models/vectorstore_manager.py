"""
Module for managing vector stores.
"""

import os
import json
import shutil
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

from ..utils.metadata import (
    create_vectorstore_metadata, 
    save_metadata, 
    load_metadata,
    update_metadata
)

# Set up logging
logger = logging.getLogger("embedding_service")


class VectorStoreManager:
    """
    Manager for vector stores.
    """
    
    def __init__(self, vectorstore_dir: Path):
        """
        Initialize the vector store manager.
        
        Args:
            vectorstore_dir: Directory where vector stores are saved
        """
        self.vectorstore_dir = vectorstore_dir
        self.vectorstore_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"DEBUGGING: VectorStoreManager initialized with directory: {vectorstore_dir}")
    
    def list_vectorstores(self) -> List[Dict[str, Any]]:
        """
        List all available vector stores.
        
        Returns:
            List of dictionaries with vector store information
        """
        logger.info(f"DEBUGGING: Listing vectorstores from {self.vectorstore_dir}")
        vectorstores = []
        
        for vs_dir in self.vectorstore_dir.iterdir():
            if not vs_dir.is_dir():
                continue
            
            # Try to load metadata
            metadata = load_metadata(vs_dir)
            if metadata:
                # Extract basic information
                vs_info = {
                    "id": vs_dir.name,
                    "name": metadata.get("name", vs_dir.name),
                    "description": metadata.get("description", ""),
                    "embedding_model": metadata.get("embedding_model", "unknown"),
                    "created_at": metadata.get("created_at", ""),
                    "updated_at": metadata.get("updated_at", ""),
                    "file_count": len(metadata.get("files", [])),
                    "chunk_size": metadata.get("chunk_size", 1000),
                    "chunk_overlap": metadata.get("chunk_overlap", 100)
                }
                vectorstores.append(vs_info)
                logger.info(f"DEBUGGING: Found vectorstore: {vs_dir.name}, name: {vs_info['name']}")
        
        logger.info(f"DEBUGGING: Found {len(vectorstores)} vectorstores")
        return vectorstores
    
    def get_vectorstore_info(self, vectorstore_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific vector store.
        
        Args:
            vectorstore_id: ID of the vector store
            
        Returns:
            Dictionary with vector store information, or None if not found
        """
        logger.info(f"DEBUGGING: Getting info for vectorstore: {vectorstore_id}")
        vs_dir = self.vectorstore_dir / vectorstore_id
        
        if not vs_dir.exists() or not vs_dir.is_dir():
            logger.warning(f"DEBUGGING: Vectorstore {vectorstore_id} not found")
            return None
        
        # Try to load metadata
        metadata = load_metadata(vs_dir)
        if not metadata:
            logger.warning(f"DEBUGGING: Metadata for vectorstore {vectorstore_id} not found")
            return None
        
        # Include file details
        files = metadata.get("files", [])
        file_details = []
        
        logger.info(f"DEBUGGING: Processing {len(files)} file entries in vectorstore metadata")
        
        for file_info in files:
            file_detail = {
                "filename": file_info.get("filename", ""),
                "original_path": file_info.get("original_path", ""),
                "security_classification": file_info.get("security_classification", "UNCLASSIFIED")
            }
            
            # Include document_id if available
            if "document_id" in file_info:
                file_detail["document_id"] = file_info["document_id"]
                logger.info(f"DEBUGGING: File has document_id: {file_info['document_id']}")
            
            file_details.append(file_detail)
            logger.info(f"DEBUGGING: Added file detail: {json.dumps(file_detail, indent=2)}")
        
        # Extract and return full information
        result = {
            "id": vectorstore_id,
            "name": metadata.get("name", vectorstore_id),
            "description": metadata.get("description", ""),
            "embedding_model": metadata.get("embedding_model", "unknown"),
            "created_at": metadata.get("created_at", ""),
            "updated_at": metadata.get("updated_at", ""),
            "files": file_details,
            "chunk_size": metadata.get("chunk_size", 1000),
            "chunk_overlap": metadata.get("chunk_overlap", 100),
            "chunking_method": metadata.get("chunking_method", "fixed"),
            "max_paragraph_length": metadata.get("max_paragraph_length", 1500),
            "min_paragraph_length": metadata.get("min_paragraph_length", 50)
        }
        
        logger.info(f"DEBUGGING: Returning info for vectorstore {vectorstore_id}")
        return result
    
    def create_vectorstore(
        self,
        name: str,
        description: str,
        documents: List[Document],
        embedding_model: Embeddings,
        model_name: str,
        file_infos: List[Dict[str, Any]],
        chunk_size: int = 1000,
        chunk_overlap: int = 100
    ) -> str:
        """
        Create a new vector store.
        
        Args:
            name: Name of the vector store
            description: Description of the vector store
            documents: List of documents to add to the vector store
            embedding_model: Embedding model to use
            model_name: Name of the embedding model
            file_infos: List of file information dictionaries
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
            
        Returns:
            ID of the new vector store
        """
        logger.info(f"DEBUGGING: Creating vectorstore with name: {name}, documents: {len(documents)}")
        
        # Log sample document metadata
        if documents:
            logger.info(f"DEBUGGING: Sample document metadata: {json.dumps(documents[0].metadata, indent=2)}")
        
        # Create a unique ID for the vector store
        import uuid
        import time
        
        vectorstore_id = f"{int(time.time())}_{uuid.uuid4().hex[:8]}"
        vs_dir = self.vectorstore_dir / vectorstore_id
        logger.info(f"DEBUGGING: Generated vectorstore ID: {vectorstore_id}")
        
        # Create the vector store directory
        vs_dir.mkdir(parents=True, exist_ok=True)
        
        # Create the vector store
        logger.info(f"DEBUGGING: Creating FAISS vector store with {len(documents)} documents")
        vectorstore = FAISS.from_documents(documents, embedding_model)
        
        # Save the vector store
        logger.info(f"DEBUGGING: Saving vector store to {vs_dir}")
        vectorstore.save_local(str(vs_dir))
        
        # Log file info
        for i, file_info in enumerate(file_infos):
            logger.info(f"DEBUGGING: File info {i+1}: filename={file_info.get('filename', 'unknown')}, security={file_info.get('security_classification', 'UNCLASSIFIED')}")
        
        # Create and save metadata
        logger.info(f"DEBUGGING: Creating vectorstore metadata")
        metadata_obj = create_vectorstore_metadata(
            name=name,
            description=description,
            embedding_model=model_name,
            files=file_infos,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        logger.info(f"DEBUGGING: Saving vectorstore metadata to {vs_dir}")
        save_metadata(vs_dir, metadata_obj)
        
        logger.info(f"DEBUGGING: Vectorstore {vectorstore_id} created successfully")
        return vectorstore_id
    
    def update_vectorstore(
        self,
        vectorstore_id: str,
        documents: List[Document],
        embedding_model: Embeddings,
        new_file_infos: List[Dict[str, Any]]
    ) -> bool:
        """
        Update an existing vector store with new documents.
        
        Args:
            vectorstore_id: ID of the vector store to update
            documents: List of new documents to add
            embedding_model: Embedding model to use
            new_file_infos: List of new file information dictionaries
            
        Returns:
            True if successful, False otherwise
        """
        vs_dir = self.vectorstore_dir / vectorstore_id
        
        if not vs_dir.exists() or not vs_dir.is_dir():
            return False
        
        try:
            # Load the existing vector store
            vectorstore = FAISS.load_local(str(vs_dir), embedding_model, allow_dangerous_deserialization=True)
            
            # Add new documents
            if documents:
                vectorstore.add_documents(documents)
                
                # Save the updated vector store
                vectorstore.save_local(str(vs_dir))
            
            # Update metadata
            metadata = load_metadata(vs_dir)
            if metadata:
                # Update the file list and timestamp
                existing_files = metadata.get("files", [])
                
                # Add new files
                existing_files.extend(new_file_infos)
                
                # Update metadata
                update_metadata(vs_dir, {
                    "files": existing_files,
                    "updated_at": import_iso_timestamp()
                })
            
            return True
            
        except Exception as e:
            print(f"Error updating vector store {vectorstore_id}: {str(e)}")
            return False
    
    def delete_vectorstore(self, vectorstore_id: str) -> bool:
        """
        Delete a vector store.
        
        Args:
            vectorstore_id: ID of the vector store to delete
            
        Returns:
            True if successful, False otherwise
        """
        vs_dir = self.vectorstore_dir / vectorstore_id
        
        if not vs_dir.exists() or not vs_dir.is_dir():
            return False
        
        try:
            shutil.rmtree(vs_dir)
            return True
        except Exception as e:
            print(f"Error deleting vector store {vectorstore_id}: {str(e)}")
            return False


def import_iso_timestamp():
    """Import and return current timestamp in ISO format."""
    from datetime import datetime
    return datetime.now().isoformat() 