"""
Module for managing vector stores.
"""

import os
import shutil
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

from langchain.vectorstores import FAISS
from langchain.schema import Document
from langchain.embeddings.base import Embeddings

from ..utils.metadata import (
    create_vectorstore_metadata, 
    save_metadata, 
    load_metadata,
    update_metadata
)


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
    
    def list_vectorstores(self) -> List[Dict[str, Any]]:
        """
        List all available vector stores.
        
        Returns:
            List of dictionaries with vector store information
        """
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
        
        return vectorstores
    
    def get_vectorstore_info(self, vectorstore_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific vector store.
        
        Args:
            vectorstore_id: ID of the vector store
            
        Returns:
            Dictionary with vector store information, or None if not found
        """
        vs_dir = self.vectorstore_dir / vectorstore_id
        
        if not vs_dir.exists() or not vs_dir.is_dir():
            return None
        
        # Try to load metadata
        metadata = load_metadata(vs_dir)
        if not metadata:
            return None
        
        # Include file details
        files = metadata.get("files", [])
        file_details = []
        
        for file_info in files:
            file_details.append({
                "filename": file_info.get("filename", ""),
                "original_path": file_info.get("original_path", ""),
                "security_classification": file_info.get("security_classification", "UNCLASSIFIED")
            })
        
        # Extract and return full information
        return {
            "id": vectorstore_id,
            "name": metadata.get("name", vectorstore_id),
            "description": metadata.get("description", ""),
            "embedding_model": metadata.get("embedding_model", "unknown"),
            "created_at": metadata.get("created_at", ""),
            "updated_at": metadata.get("updated_at", ""),
            "files": file_details,
            "chunk_size": metadata.get("chunk_size", 1000),
            "chunk_overlap": metadata.get("chunk_overlap", 100)
        }
    
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
        # Create a unique ID for the vector store
        import uuid
        import time
        
        vectorstore_id = f"{int(time.time())}_{uuid.uuid4().hex[:8]}"
        vs_dir = self.vectorstore_dir / vectorstore_id
        
        # Create the vector store directory
        vs_dir.mkdir(parents=True, exist_ok=True)
        
        # Create the vector store
        vectorstore = FAISS.from_documents(documents, embedding_model)
        
        # Save the vector store
        vectorstore.save_local(str(vs_dir))
        
        # Create and save metadata
        metadata = create_vectorstore_metadata(
            name=name,
            description=description,
            embedding_model=model_name,
            files=file_infos,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        save_metadata(vs_dir, metadata)
        
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
            vectorstore = FAISS.load_local(str(vs_dir), embedding_model)
            
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