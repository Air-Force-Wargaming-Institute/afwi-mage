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
    
    def get_metadata_path(self, vs_id: str) -> Path:
        """Get the path to the metadata file for a vector store."""
        return self.base_dir / vs_id / "metadata.json"
    
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
            documents: List of documents to add to the vector store
            embedding_model: Embedding model instance to use for THIS operation
            embedding_model_name: Name/ID of the embedding model (to be stored in metadata)
            file_infos: List of file info dictionaries
            chunk_size: Size of each chunk
            chunk_overlap: Overlap between chunks
            batch_size: Batch size for processing
            job_id: Optional job ID for tracking progress
            
        Returns:
            ID of the created vector store
            
        Raises:
            Exception: If an error occurs during vector store creation
        """
        # Create a unique ID for the vector store
        vs_id = str(uuid.uuid4())
        
        # Create the vector store directory
        vs_dir = self.base_dir / vs_id
        vs_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Check if we have any documents
            if not documents or len(documents) == 0:
                logger.warning("Attempting to create a vector store with 0 documents")
                
                # Create metadata file for the empty vector store
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
                
                logger.info(f"Created metadata for empty vector store: {vs_id}")
                
                # Add a placeholder dummy document to initialize FAISS
                dummy_text = "This is a placeholder document for empty vector stores."
                dummy_doc = Document(
                    page_content=dummy_text,
                    metadata={"source": "placeholder", "is_placeholder": True}
                )
                
                # Create FAISS vector store with the dummy document
                dummy_docs = [dummy_doc]
                vectorstore = FAISS.from_documents(dummy_docs, embedding_model)
                
                # Save the vector store
                vectorstore.save_local(str(vs_dir))
                logger.info(f"Successfully saved vector store with placeholder to {vs_dir}")
                
                # Clean up memory
                del vectorstore
                gc.collect()
                
                # Update job progress if a job_id is provided
                if job_id:
                    try:
                        from core.job import update_job_progress
                        update_job_progress(
                            job_id,
                            0,
                            "Created empty vector store with placeholder"
                        )
                    except ImportError:
                        # Job module might not be available or initialized
                        logger.warning(f"Could not update job progress for job {job_id}")
                
                return vs_id
            
            # Process documents in batches to avoid memory issues
            # Split batches for embedding
            gc.collect()
            
            all_docs = documents
            logger.info(f"Creating embeddings for {len(all_docs)} documents")
            
            # Process in batches
            batch_size = min(batch_size, len(all_docs))
            
            for i in range(0, len(all_docs), batch_size):
                batch = all_docs[i:i + batch_size]
                logger.info(f"Processing batch {i//batch_size + 1}/{math.ceil(len(documents)/batch_size)}: {len(batch)} documents")
                
                # Update job progress
                if job_id:
                    try:
                        from core.job import update_job_progress
                        update_job_progress(
                            job_id,
                            i,
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
            
            # --- Determine embedding dimension --- 
            dimension = 768 # Default
            if hasattr(embedding_model, 'client') and hasattr(embedding_model.client, 'config') and hasattr(embedding_model.client.config, 'embedding_dim'):
                dimension = embedding_model.client.config.embedding_dim
            elif all_docs:
                # Fallback: embed a sample text and check length
                try:
                    sample_embedding = embedding_model.embed_query("dimension check")
                    if sample_embedding:
                        dimension = len(sample_embedding)
                except Exception as dim_err:
                    logger.warning(f"Could not dynamically determine embedding dimension: {dim_err}")
            logger.info(f"Determined embedding dimension: {dimension}")
            # -------------------------------------

            # Create and save metadata file
            vs_metadata = create_vectorstore_metadata(
                vs_id, 
                name, 
                description, 
                embedding_model_name,
                embedding_dimension=dimension, # Pass determined dimension
                file_infos=file_infos,
                chunk_size=chunk_size, 
                chunk_overlap=chunk_overlap
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
            
            # --- Determine embedding dimension --- 
            dimension = 768 # Default
            if hasattr(embedding_model, 'client') and hasattr(embedding_model.client, 'config') and hasattr(embedding_model.client.config, 'embedding_dim'):
                dimension = embedding_model.client.config.embedding_dim
            elif all_docs:
                # Fallback: embed a sample text and check length
                try:
                    sample_embedding = embedding_model.embed_query("dimension check")
                    if sample_embedding:
                        dimension = len(sample_embedding)
                except Exception as dim_err:
                    logger.warning(f"Could not dynamically determine embedding dimension: {dim_err}")
            logger.info(f"Determined embedding dimension: {dimension}")
            # -------------------------------------

            # Create and save metadata file
            vs_metadata = create_vectorstore_metadata(
                vs_id, 
                name, 
                description, 
                embedding_model_name,
                embedding_dimension=dimension, # Pass determined dimension
                file_infos=file_infos,
                chunk_size=chunk_size, 
                chunk_overlap=chunk_overlap
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
            
    def query_vector_store(
        self, 
        vectorstore_id: str, 
        query_or_embedding: Any, 
        top_k: int = 5, 
        score_threshold: float = 1.0,
        allowed_classifications: Optional[List[str]] = None
    ):
        """
        Query a vector store with a text query or embedding, optionally filtering by classification.

        Args:
            vectorstore_id: ID of the vector store to query
            query_or_embedding: Text query or embedding vector
            top_k: Number of results to return
            score_threshold: Minimum similarity score threshold (interpreted as max distance for text queries, min relevance for vector queries)
            allowed_classifications: Optional list of chunk classifications to allow in results.
                                   If None or empty, no classification filtering is applied.

        Returns:
            List of results with text and metadata
        """
        logger.info(f"Starting query for vectorstore {vectorstore_id}")
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
                vs_info_metadata = load_metadata(metadata_file)
                if not vs_info_metadata:
                    logger.error(f"Failed loading vector store metadata from {metadata_file}")
                    return []
                embedding_model_name = vs_info_metadata.get("embedding_model", "nomic-embed-text:latest")
                logger.info(f"Using embedding model from metadata: {embedding_model_name}")
            except Exception as e:
                logger.error(f"Error loading vector store metadata: {str(e)}")
                return []

            # Get the embedding model *instance* based on the stored name
            from core.embedding import get_embedding_model
            embedding_function = get_embedding_model(embedding_model_name)
            if not embedding_function:
                logger.error(f"Could not load embedding model {embedding_model_name} specified in metadata")
                return []

            # Load the vector store using the correct embedding function
            try:
                from langchain_community.vectorstores import FAISS
                # Allow deserialization for custom metadata
                vectorstore = FAISS.load_local(str(vs_dir), embedding_function, allow_dangerous_deserialization=True)
                logger.info(f"Successfully loaded FAISS index from {vs_dir}")
            except Exception as e:
                logger.error(f"Error loading vector store with model {embedding_model_name}: {str(e)}")
                return []

            # Construct the filter dictionary if classifications are provided
            search_filter = None
            if allowed_classifications:
                # Ensure list is not empty and contains valid strings
                valid_classifications = [str(c).upper() for c in allowed_classifications if isinstance(c, str) and c]
                if valid_classifications:
                    # Use a lambda function for filtering as FAISS might not support $in directly
                    search_filter = lambda metadata: metadata.get("chunk_classification", "UNCLASSIFIED").upper() in valid_classifications
                    logger.info(f"Applying classification filter: {valid_classifications}")
                else:
                    logger.warning("allowed_classifications provided but was empty or invalid.")
            else:
                logger.info("No classification filter applied.")

            # Process the query and get raw results
            raw_results = [] # Initialize
            query_was_text = False # Flag to know score type

            # Log filter details before search
            logger.info(f"Attempting search with filter: {search_filter}")
            if search_filter:
                # Test the filter function with sample metadata for debugging
                sample_meta_pass = {"chunk_classification": allowed_classifications[0]} if allowed_classifications else {}
                sample_meta_fail = {"chunk_classification": "SOME_OTHER_CLASS"}
                try:
                    logger.debug(f"  Filter test (should pass): {search_filter(sample_meta_pass)}")
                    logger.debug(f"  Filter test (should fail): {search_filter(sample_meta_fail)}")
                except Exception as filter_err:
                     logger.error(f"  Error testing filter function: {filter_err}")

            if isinstance(query_or_embedding, str):
                query_was_text = True # Mark that we used text query
                logger.info(f"Performing text similarity search with k={top_k}, threshold={score_threshold}, filter={search_filter is not None}") # Added logging
                # For text queries, use similarity_search_with_score with the filter
                # This returns DISTANCE score (lower is better)
                try:
                    raw_results = vectorstore.similarity_search_with_score(
                        query_or_embedding,
                        k=top_k,
                        filter=search_filter # Pass the filter here
                    )
                    logger.info(f"FAISS similarity_search_with_score returned {len(raw_results)} raw results.") # Added logging
                except Exception as search_err:
                    logger.error(f"Error during FAISS similarity_search_with_score: {search_err}", exc_info=True)
                    return []
            else:
                # For vector queries, use similarity_search_by_vector with the filter
                query_was_text = False # Mark that we used vector query
                logger.info(f"Performing vector similarity search with k={top_k}, threshold={score_threshold}, filter={search_filter is not None}") # Added logging
                if isinstance(query_or_embedding, list):
                    query_embedding = query_or_embedding
                elif isinstance(query_or_embedding, np.ndarray):
                    query_embedding = query_or_embedding.tolist()
                else:
                    logger.error(f"Unsupported embedding type: {type(query_or_embedding)}")
                    return []

                # FAISS similarity_search_by_vector_with_relevance_scores supports filtering
                # This returns RELEVANCE score (0-1, higher is better)
                try:
                    # The score_threshold parameter likely needs to be applied *after* getting results
                    docs_only = vectorstore.similarity_search_by_vector(
                        embedding=query_embedding,
                        k=top_k,
                        filter=search_filter # Pass the filter here
                    )
                    # Synthesize score for compatibility with downstream processing
                    # Using 0.0 as a dummy distance score
                    raw_results = [(doc, 0.0) for doc in docs_only]
                except Exception as search_err:
                    logger.error(f"Error during FAISS similarity_search_by_vector: {search_err}", exc_info=True)
                    return []

            # Process results into a standardized format
            results = []
            logger.info(f"Processing {len(raw_results)} raw results with score_threshold={score_threshold} (Query was text: {query_was_text})")
            for i, (doc, score) in enumerate(raw_results):
                # If text query -> score is distance (lower is better)
                # If vector query -> score is relevance (higher is better, 0-1)

                passes_threshold = False
                if query_was_text:
                    # Handle distance score (lower is better) from similarity_search_with_score.
                    # Convert distance to relevance score (0-1, higher is better) before comparing with threshold.
                    # Max L2 distance for normalized vectors can be up to 2.0.
                    MAX_DISTANCE = 2.0 
                    # Ensure score is not negative if somehow returned
                    distance = max(0.0, score) 
                    # Calculate relevance: 1.0 for distance 0, approaching 0.0 for distance MAX_DISTANCE
                    calculated_relevance = 1.0 - (distance / MAX_DISTANCE) 
                    
                    # Now compare the calculated relevance with the provided relevance threshold
                    if calculated_relevance >= score_threshold:
                        passes_threshold = True
                    
                    # Update logging to show both distance and calculated relevance
                    logger.debug(f"  Result {i}: Distance={score:.4f}, Calculated Relevance={calculated_relevance:.4f}. Passes threshold ({score_threshold:.4f})? {passes_threshold}")
                else:
                    # Handle relevance score directly (assuming higher is better) from similarity_search_by_vector
                    relevance_threshold = score_threshold # Threshold is already for relevance
                    if score >= relevance_threshold:
                        passes_threshold = True
                    logger.debug(f"  Result {i}: Relevance score={score:.4f}. Passes threshold ({relevance_threshold:.4f})? {passes_threshold}")

                if passes_threshold:
                    result = {
                        "text": doc.page_content,
                        "score": float(score), # Keep original score for potential debugging/display differences
                        "metadata": doc.metadata
                    }
                    # Log the chunk classification of results that pass the threshold
                    chunk_class = result["metadata"].get("chunk_classification", "Unknown")
                    logger.debug(f"Result passing threshold (Score: {score:.4f}, Class: {chunk_class}) - Adding to final results.")
                    results.append(result)
                else:
                    chunk_class = doc.metadata.get("chunk_classification", "Unknown")
                    logger.debug(f"Result below threshold (Score: {score:.4f}, Class: {chunk_class})")

            logger.info(f"Processed results: {len(results)} chunks passed threshold.")

            # Enrich results with complete metadata from the vector store metadata file
            if vs_info_metadata and "files" in vs_info_metadata:
                # Create a lookup map of document_id to full file metadata
                doc_metadata_map = {}
                for file_info in vs_info_metadata.get("files", []):
                    if "document_id" in file_info:
                        doc_metadata_map[file_info["document_id"]] = file_info

                logger.info(f"Starting metadata enrichment for {len(results)} results using map with {len(doc_metadata_map)} entries.") # Added logging
                # --- Debug: Print the map contents ---
                print("\n--- Debug: Contents of doc_metadata_map ---")
                for doc_id, info in doc_metadata_map.items():
                    print(f"  Doc ID: {doc_id}, Info Keys: {list(info.keys())}")
                    # Optionally print the full info if needed for deeper debug
                    # print(f"    Full Info: {info}")
                print("--- End Map Contents ---\n")
                # --- End Debug ---

                # Enrich each result with the complete metadata
                enriched_results = [] # Create a new list for enriched results
                for i, result in enumerate(results):
                    logger.debug(f"Enriching result {i}")
                    if "metadata" in result and "document_id" in result["metadata"]:
                        doc_id = result["metadata"]["document_id"]
                        logger.debug(f"  Found document_id: {doc_id}")

                        if doc_id in doc_metadata_map:
                            file_info = doc_metadata_map[doc_id]
                            logger.debug(f"  Found matching file_info in map: {list(file_info.keys())}")

                            # Preserve chunk-specific metadata fields that should be kept
                            chunk_keys_to_preserve = ["semantic_block_index", "sub_chunk_index", "split_reason", "page", "chunk_classification"]
                            chunk_specific_data = { k: result["metadata"][k] for k in chunk_keys_to_preserve if k in result["metadata"] }
                            logger.debug(f"  Preserved chunk_specific metadata: {list(chunk_specific_data.keys())}")

                            # Start with the full file_info as the base for enriched metadata
                            enriched_metadata = file_info.copy()
                            # Ensure document_id from the chunk matches (should always be true here)
                            enriched_metadata["document_id"] = doc_id

                            # Now, merge/override with the preserved chunk-specific data
                            enriched_metadata.update(chunk_specific_data)

                            # --- Explicitly ensure original_filename from file_info exists ---
                            if "original_filename" in file_info and "original_filename" not in enriched_metadata:
                                enriched_metadata["original_filename"] = file_info["original_filename"]
                            # --- End explicit check ---

                            # Ensure filename/original_filename consistency (optional refinement)
                            # If chunk had a specific filename, keep it? Unlikely.
                            # Default to using filenames from file_info.
                            if "filename" not in enriched_metadata and "original_filename" in enriched_metadata:
                                enriched_metadata["filename"] = enriched_metadata["original_filename"]

                            # Ensure chunk_classification is present (it should be from chunk_specific_data)
                            if "chunk_classification" not in enriched_metadata:
                                enriched_metadata["chunk_classification"] = enriched_metadata.get("security_classification", "UNCLASSIFIED")
                                logger.warning(f"  Had to fallback chunk_classification for doc_id {doc_id}")

                            # Update the result metadata with the fully enriched version
                            result["metadata"] = enriched_metadata
                            logger.debug(f"  Enriched metadata for result {i}: {list(enriched_metadata.keys())}")
                        else:
                             logger.warning(f"  Document ID {doc_id} from chunk not found in vectorstore metadata map.") # Added warning

                    # Ensure each result has filename and security_classification
                    if "metadata" in result:
                        metadata = result["metadata"]
                        if "filename" not in metadata and "original_filename" in metadata:
                            metadata["filename"] = metadata["original_filename"]
                        if "security_classification" not in metadata:
                            metadata["security_classification"] = "UNCLASSIFIED"
                        if "chunk_classification" not in metadata:
                            metadata["chunk_classification"] = metadata.get("security_classification", "UNCLASSIFIED") # Default chunk to doc level
                    else:
                        logger.warning(f"Result {i} is missing the 'metadata' field entirely.")
                        result["metadata"] = {} # Add empty dict to avoid errors

                    enriched_results.append(result)
            else:
                 logger.warning(f"Skipping enrichment because vectorstore metadata ({vectorstore_id}) or 'files' key is missing.")
                 enriched_results = results

            logger.info(f"Query processing complete. Returning {len(enriched_results)} enriched results.")
            return enriched_results

        except Exception as e:
            logger.error(f"Error querying vector store {vectorstore_id}: {str(e)}", exc_info=True)
            return []


# Standalone functions
def create_vectorstore_metadata(
    vs_id: str,
    name: str,
    description: str,
    embedding_model: str,
    embedding_dimension: int,
    file_infos: List[Dict[str, Any]],
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
        embedding_dimension: Dimension of the embedding model
        file_infos: List of file info dictionaries (these will be stored as is)
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
        "embedding_dimension": embedding_dimension,
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "file_count": len(file_infos),
        "created_at": now,
        "updated_at": now,
        "files": file_infos
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
