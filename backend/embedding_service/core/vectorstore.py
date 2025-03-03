"""
Vector store management functionality.

This module provides core vector store management functionality, including:
- Creating and updating vector stores
- Managing vector store metadata
- Querying vector stores
"""

import os
import json
import logging
import uuid
import gc
import shutil
import math
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime

import numpy as np
import faiss
from langchain_core.vectorstores import VectorStore
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_community.vectorstores import FAISS

# Set up logging
logger = logging.getLogger("embedding_service")

class VectorStoreManager:
    """
    Manages vector stores for the embedding service.
    
    Responsibilities:
    - Create and update vector stores
    - Load and query vector stores
    - Manage vector store metadata
    """
    
    def __init__(self, base_dir: str):
        """
        Initialize the VectorStoreManager.
        
        Args:
            base_dir: Base directory where vector stores are stored
        """
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
    
    def list_vectorstores(self) -> List[Dict[str, Any]]:
        """
        List all available vector stores.
        
        Returns:
            List of vector store info dictionaries
        """
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
    
    def get_vectorstore_info(self, vs_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific vector store.
        
        Args:
            vs_id: Vector store ID
            
        Returns:
            Vector store info dictionary or None if not found
        """
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
        embedding_model: Embeddings,
        embedding_model_name: str,
        file_infos: List[Dict[str, Any]],
        chunk_size: int = 1000,
        chunk_overlap: int = 100,
        batch_size: int = 1000,
        job_id: Optional[str] = None
    ) -> str:
        """
        Create a new vector store.
        
        Args:
            name: Name of the vector store
            description: Description of the vector store
            documents: List of documents to include in the vector store
            embedding_model: Embedding model to use
            embedding_model_name: Name of the embedding model
            file_infos: List of file info dictionaries
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
            batch_size: Batch size for processing
            job_id: Optional job ID for tracking progress
            
        Returns:
            ID of the created vector store
        """
        # Log start of operation
        logger.info(f"Creating vector store '{name}' with {len(documents)} documents")
        
        # Generate a unique ID for the vector store
        vs_id = str(uuid.uuid4())
        
        # Create directory for vector store
        vs_dir = self.base_dir / vs_id
        vs_dir.mkdir(exist_ok=True)
        
        try:
            # Process documents in batches to limit memory usage
            logger.info(f"Creating vector store '{name}' with {len(documents)} documents")
            
            # Log a sample of document metadata
            if documents:
                logger.info(f"Sample document metadata: {json.dumps(documents[0].metadata, indent=2)}")
            
            # Update job progress if a job_id is provided
            if job_id:
                try:
                    from core.job import update_job_progress
                    update_job_progress(
                        job_id, 
                        10, 
                        f"Creating vector store {vs_id} with {len(documents)} documents"
                    )
                except ImportError:
                    # Job module might not be available or initialized
                    logger.warning(f"Could not update job progress for job {job_id}")
            
            # Use batch processing to avoid memory issues
            all_docs = []
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i+batch_size]
                logger.info(f"Processing batch {i//batch_size + 1}/{math.ceil(len(documents)/batch_size)}")
                all_docs.extend(batch)
                
                # Log progress if job_id provided
                if job_id:
                    try:
                        from core.job import update_job_progress
                        update_job_progress(
                            job_id,
                            i + len(batch),
                            f"Creating embeddings batch {i//batch_size + 1}/{math.ceil(len(documents)/batch_size)}"
                        )
                    except ImportError:
                        # Job module might not be available or initialized
                        logger.warning(f"Could not update job progress for job {job_id}")
                gc.collect()
            
            # Create FAISS vector store
            vectorstore = FAISS.from_documents(all_docs, embedding_model)
            
            # Save the vector store
            vectorstore.save_local(str(vs_dir))
            logger.info(f"Successfully saved vector store to {vs_dir}")
            
            # Create and save metadata file
            vs_metadata = create_vectorstore_metadata(
                vs_id, 
                name, 
                description, 
                embedding_model_name,
                file_infos,
                chunk_size, 
                chunk_overlap
            )
            
            metadata_file = vs_dir / "metadata.json"
            save_metadata(vs_metadata, metadata_file)
            
            logger.info(f"Successfully created vector store: {vs_id}")
            
            # Clean up memory
            del vectorstore
            gc.collect()
            
            # Update job progress if a job_id is provided
            if job_id:
                try:
                    from core.job import update_job_progress
                    update_job_progress(
                        job_id,
                        len(documents),
                        "Vector store creation completed"
                    )
                except ImportError:
                    # Job module might not be available or initialized
                    logger.warning(f"Could not update job progress for job {job_id}")
            
            return vs_id
            
        except Exception as e:
            logger.error(f"Error creating vector store: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Update job progress if a job_id is provided
            if job_id:
                try:
                    from core.job import fail_job
                    fail_job(job_id, str(e))
                except ImportError:
                    # Job module might not be available or initialized
                    logger.warning(f"Could not update job status for job {job_id}")
            
            # Clean up on failure
            if vs_dir.exists():
                shutil.rmtree(vs_dir)
            raise
    
    def update_vectorstore(
        self,
        vectorstore_id: str,
        documents: List[Document],
        embedding_model: Embeddings,
        file_infos: Optional[List[Dict[str, Any]]] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        batch_size: int = 1000,
        job_id: Optional[str] = None
    ) -> bool:
        """
        Update an existing vector store.
        
        Args:
            vectorstore_id: ID of the vector store to update
            documents: List of documents to add to the vector store
            embedding_model: Embedding model to use
            file_infos: Optional list of file info dictionaries
            name: Optional new name for the vector store
            description: Optional new description for the vector store
            batch_size: Batch size for processing
            job_id: Optional job ID for tracking progress
            
        Returns:
            True if successful, False otherwise
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
            
            # Load existing vector store
            try:
                # Load the vector store
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
                    try:
                        from core.job import update_job_progress
                        update_job_progress(
                            job_id,
                            0,
                            "Vector store metadata updated (no documents added)"
                        )
                    except ImportError:
                        # Job module might not be available or initialized
                        logger.warning(f"Could not update job progress for job {job_id}")
                
                return True
            
            # Add documents in batches
            batches = [documents[i:i + batch_size] for i in range(0, len(documents), batch_size)]
            
            for batch_idx, batch in enumerate(batches):
                logger.info(f"Processing batch {batch_idx + 1}/{len(batches)}: {len(batch)} documents")
                
                try:
                    # Update job progress with embedding information
                    if job_id:
                        try:
                            from core.job import update_job_progress
                            processed_docs = min((batch_idx) * batch_size, total_documents)
                            progress_percentage = (processed_docs / total_documents) * 100
                            update_job_progress(
                                job_id,
                                processed_docs,
                                f"Generating embeddings: batch {batch_idx + 1}/{len(batches)} ({progress_percentage:.1f}%)",
                                current_operation="embedding",
                                current_file=f"Batch {batch_idx + 1}/{len(batches)} ({len(batch)} documents)"
                            )
                        except ImportError:
                            # Job module might not be available or initialized
                            logger.warning(f"Could not update job progress for job {job_id}")
                    
                    # Add documents from this batch
                    vectorstore.add_documents(batch)
                    logger.info(f"Added batch of {len(batch)} documents to vector store")
                    
                    # Update job progress if job_id is provided
                    if job_id:
                        try:
                            from core.job import update_job_progress
                            processed_docs = min((batch_idx + 1) * batch_size, total_documents)
                            progress_percentage = (processed_docs / total_documents) * 100
                            update_job_progress(
                                job_id,
                                processed_docs,
                                f"Added {processed_docs}/{total_documents} documents ({progress_percentage:.1f}%)",
                                current_operation="indexing",
                                current_file=f"Completed batch {batch_idx + 1}/{len(batches)}"
                            )
                        except ImportError:
                            # Job module might not be available or initialized
                            logger.warning(f"Could not update job progress for job {job_id}")
                    
                except Exception as e:
                    logger.error(f"Error processing batch {batch_idx}: {str(e)}")
                    # If job_id is provided, update job status with error
                    if job_id:
                        try:
                            from core.job import update_job_progress
                            update_job_progress(
                                job_id,
                                (batch_idx * batch_size),
                                f"Error during batch processing: {str(e)}"
                            )
                        except ImportError:
                            # Job module might not be available or initialized
                            logger.warning(f"Could not update job status for job {job_id}")
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
                try:
                    from core.job import update_job_progress
                    update_job_progress(
                        job_id,
                        total_documents,
                        "Vector store update completed"
                    )
                except ImportError:
                    # Job module might not be available or initialized
                    logger.warning(f"Could not update job status for job {job_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating vector store {vectorstore_id}: {str(e)}")
            # If job_id is provided, update job status with error
            if job_id:
                try:
                    from core.job import fail_job
                    fail_job(job_id, str(e))
                except ImportError:
                    # Job module might not be available or initialized
                    logger.warning(f"Could not update job status for job {job_id}")
            return False
    
    def delete_vectorstore(self, vs_id: str) -> bool:
        """
        Delete a vector store.
        
        Args:
            vs_id: ID of the vector store to delete
            
        Returns:
            True if successful, False otherwise
        """
        vs_dir = self.base_dir / vs_id
        
        if not vs_dir.exists() or not vs_dir.is_dir():
            return False
        
        try:
            shutil.rmtree(vs_dir)
            return True
        
        except Exception as e:
            logger.error(f"Error deleting vector store {vs_id}: {str(e)}")
            return False
            
    def query_vector_store(self, vectorstore_id, query_or_embedding, top_k=5, score_threshold=0.5):
        """
        Query a vector store with a text query or embedding.
        
        Args:
            vectorstore_id: ID of the vector store to query
            query_or_embedding: Text query or embedding vector
            top_k: Number of results to return
            score_threshold: Minimum similarity score threshold
            
        Returns:
            List of results with text and metadata
        """
        try:
            # Load the vector store
            vs_dir = self.base_dir / vectorstore_id
            if not vs_dir.exists() or not vs_dir.is_dir():
                logger.error(f"Vector store directory {vs_dir} not found")
                return []
                
            # Get embedding model from metadata
            metadata_file = vs_dir / "metadata.json"
            if not metadata_file.exists():
                logger.error(f"Vector store metadata file not found: {metadata_file}")
                return []
                
            try:
                metadata = load_metadata(metadata_file)
                embedding_model_name = metadata.get("embedding_model", "nomic-embed-text")
            except Exception as e:
                logger.error(f"Error loading vector store metadata: {str(e)}")
                return []
                
            # Get the embedding model
            from core.embedding import get_embedding_model
            embedding_model = get_embedding_model(embedding_model_name)
            if not embedding_model:
                logger.error(f"Could not load embedding model {embedding_model_name}")
                return []
            
            # Load the vector store
            try:
                from langchain_community.vectorstores import FAISS
                vectorstore = FAISS.load_local(str(vs_dir), embedding_model, allow_dangerous_deserialization=True)
            except Exception as e:
                logger.error(f"Error loading vector store: {str(e)}")
                return []
            
            # Process the query and get raw results
            if isinstance(query_or_embedding, str):
                # For text queries, use similarity_search_with_score
                raw_results = vectorstore.similarity_search_with_score(
                    query_or_embedding, 
                    k=top_k
                )
            else:
                # For vector queries, generate the embeddings and use similarity_search_with_score
                # Using a workaround since similarity_search_by_vector_with_score doesn't exist
                try:
                    # Create a temporary document with the embedding
                    from langchain_core.documents import Document
                    import numpy as np
                    
                    # Get the embedding for the query directly using the embedding model
                    if isinstance(query_or_embedding, list):
                        query_embedding = query_or_embedding
                    elif isinstance(query_or_embedding, np.ndarray):
                        query_embedding = query_or_embedding.tolist()
                    else:
                        # If it's not a list or numpy array, it might be something else we can't handle
                        logger.error(f"Unsupported embedding type: {type(query_or_embedding)}")
                        return []
                    
                    # Use the FAISS index directly for similarity search with the embedding
                    # This is a lower-level approach that bypasses the missing method
                    if hasattr(vectorstore, '_index') and hasattr(vectorstore, '_docstore'):
                        # Convert the embedding to the right format if needed
                        if not isinstance(query_embedding, np.ndarray):
                            query_embedding = np.array(query_embedding, dtype=np.float32)
                        
                        # Make sure the embedding has the right shape
                        if len(query_embedding.shape) == 1:
                            query_embedding = query_embedding.reshape(1, -1)
                            
                        # Search the FAISS index
                        scores, indices = vectorstore._index.search(query_embedding, k=top_k)
                        
                        # Get the documents for these indices
                        raw_results = []
                        scores = scores[0]  # Flatten scores
                        indices = indices[0]  # Flatten indices
                        
                        # Filter results by score threshold
                        filtered_indices = []
                        filtered_scores = []
                        
                        for i, (idx, score) in enumerate(zip(indices, scores)):
                            # FAISS returns negative scores where higher (less negative) is better
                            # Convert to positive scores where higher is better
                            adjusted_score = 1.0 - (score / 2.0)  # Convert to a 0-1 scale
                            
                            if adjusted_score >= score_threshold:
                                filtered_indices.append(idx)
                                filtered_scores.append(adjusted_score)
                        
                        # Get documents for filtered indices
                        for idx, score in zip(filtered_indices, filtered_scores):
                            if idx in vectorstore._docstore._dict:
                                doc = vectorstore._docstore._dict[idx]
                                raw_results.append((doc, score))
                    else:
                        # Fallback to regular search if we can't access the index directly
                        logger.warning("Could not access FAISS index directly, falling back to text search")
                        # Generate a random document ID to use as a query
                        import random
                        import string
                        random_query = ''.join(random.choices(string.ascii_letters, k=10))
                        raw_results = vectorstore.similarity_search_with_score(random_query, k=top_k)
                except Exception as e:
                    logger.error(f"Error performing vector search: {str(e)}")
                    return []
            
            # Process results into a standardized format
            results = []
            for doc, score in raw_results:
                if score >= score_threshold:
                    result = {
                        "text": doc.page_content,
                        "score": float(score),
                        "metadata": doc.metadata
                    }
                    results.append(result)
            
            # Enrich results with complete metadata from the vector store metadata file
            vs_metadata = self.get_vectorstore_info(vectorstore_id)
            if vs_metadata and "files" in vs_metadata:
                # Create a lookup map of document_id to full file metadata
                doc_metadata_map = {}
                for file_info in vs_metadata.get("files", []):
                    if "document_id" in file_info:
                        doc_metadata_map[file_info["document_id"]] = file_info
                
                logger.info(f"Created document metadata map with {len(doc_metadata_map)} entries for vectorstore {vectorstore_id}")
                
                # Enrich each result with the complete metadata
                for i, result in enumerate(results):
                    if "metadata" in result and "document_id" in result["metadata"]:
                        doc_id = result["metadata"]["document_id"]
                        logger.debug(f"Processing result {i} with document_id: {doc_id}")
                        
                        if doc_id in doc_metadata_map:
                            file_info = doc_metadata_map[doc_id]
                            
                            # Preserve chunk-specific metadata
                            chunk_specific = {
                                k: result["metadata"].get(k) 
                                for k in ["chunk_id", "page", "chunk_index"]
                                if k in result["metadata"]
                            }
                            
                            # Create a new enriched metadata dict that combines file metadata with chunk metadata
                            enriched_metadata = {}
                            
                            # Start with document identification 
                            enriched_metadata["document_id"] = doc_id
                            
                            # Add filename fields
                            if "filename" in file_info:
                                enriched_metadata["filename"] = file_info["filename"]
                            if "original_filename" in result["metadata"]:
                                enriched_metadata["original_filename"] = result["metadata"]["original_filename"]
                            elif "original_filename" in file_info:
                                enriched_metadata["original_filename"] = file_info["original_filename"]
                                
                            # Add critical security classification fields
                            if "security_classification" in file_info:
                                enriched_metadata["security_classification"] = file_info["security_classification"]
                            if "content_security_classification" in file_info:
                                enriched_metadata["content_security_classification"] = file_info["content_security_classification"]
                            
                            # Add any remaining fields from file_info
                            for key, value in file_info.items():
                                if key not in enriched_metadata and key != "document_id":
                                    enriched_metadata[key] = value
                            
                            # Add chunk-specific fields
                            for key, value in chunk_specific.items():
                                enriched_metadata[key] = value
                                    
                            # Update the result metadata
                            result["metadata"] = enriched_metadata
                            logger.debug(f"Enriched metadata for result {i}: {enriched_metadata}")
                    
                    # Ensure each result has filename and security_classification
                    if "metadata" in result:
                        metadata = result["metadata"]
                        if "filename" not in metadata and "original_filename" in metadata:
                            metadata["filename"] = metadata["original_filename"]
                        if "security_classification" not in metadata:
                            metadata["security_classification"] = "UNCLASSIFIED"
            
            return results
            
        except Exception as e:
            logger.error(f"Error querying vector store {vectorstore_id}: {str(e)}", exc_info=True)
            return []


# Standalone functions
def create_vectorstore_metadata(
    vs_id: str,
    name: str,
    description: str,
    embedding_model: str,
    files: List[Dict[str, Any]],
    chunk_size: int,
    chunk_overlap: int
) -> Dict[str, Any]:
    """
    Create metadata for a vector store.
    
    Args:
        vs_id: Vector store ID
        name: Name of the vector store
        description: Description of the vector store
        embedding_model: Name of the embedding model
        files: List of file info dictionaries
        chunk_size: Size of text chunks
        chunk_overlap: Overlap between chunks
        
    Returns:
        Metadata dictionary
    """
    now = datetime.now().isoformat()
    
    # Create metadata
    metadata = {
        "id": vs_id,
        "name": name,
        "description": description,
        "embedding_model": embedding_model,
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "file_count": len(files),
        "created_at": now,
        "updated_at": now,
        "files": files
    }
    
    return metadata

def save_metadata(metadata: Dict[str, Any], file_path: Path) -> bool:
    """
    Save metadata to a file.
    
    Args:
        metadata: Metadata dictionary
        file_path: Path to save the metadata to
        
    Returns:
        True if successful, False otherwise
    """
    try:
        with open(file_path, "w") as f:
            json.dump(metadata, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving metadata to {file_path}: {str(e)}")
        return False

def load_metadata(file_path: Path) -> Optional[Dict[str, Any]]:
    """
    Load metadata from a file.
    
    Args:
        file_path: Path to load the metadata from
        
    Returns:
        Metadata dictionary or None if not found
    """
    try:
        with open(file_path, "r") as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        logger.error(f"Error loading metadata from {file_path}: {str(e)}")
        return None

def update_metadata(metadata: Dict[str, Any], file_path: Path) -> bool:
    """
    Update existing metadata.
    
    Args:
        metadata: Updated metadata dictionary
        file_path: Path to the metadata file
        
    Returns:
        True if successful, False otherwise
    """
    # Update the timestamp
    metadata["updated_at"] = datetime.now().isoformat()
    
    # Save the updated metadata
    return save_metadata(metadata, file_path)
