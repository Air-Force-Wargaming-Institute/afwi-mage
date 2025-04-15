"""
Embedding model management functionality.

This module provides core embedding model functionality, including:
- Managing embedding models
- Creating and using embeddings
"""

import os
import logging
from typing import List, Dict, Any
from langchain_core.embeddings import Embeddings
from langchain_ollama.embeddings import OllamaEmbeddings

# Set up logging
logger = logging.getLogger("embedding_service")

def get_embedding_model(model_id: str = "nomic-embed-text") -> Embeddings:
    """
    Get an embedding model instance.
    
    Args:
        model_id: ID or path of the embedding model to use
        
    Returns:
        Embedding model instance
    """
    logger.info(f"Getting embedding model: {model_id}")
    
    try:
        # Get base URL from environment or use default
        base_url = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        
        logger.info(f"Using Ollama embeddings with model: {model_id} at {base_url}")
        return OllamaEmbeddings(
            model=model_id,
            base_url=base_url
        )
    except Exception as e:
        logger.error(f"Error initializing embedding model: {e}")
        raise

def get_available_embedding_models() -> List[Dict[str, Any]]:
    """
    Get a list of available embedding models.
    
    Returns:
        List of embedding model info dictionaries
    """
    # Define a list of available embedding models
    models = [
        {
            "id": "nomic-embed-text:latest",
            "name": "Nomic Embed Text",
            "description": "Nomic Embed text embedding model (768 dimensions)",
            "provider": "Ollama"
        }
    ]
    
    logger.info(f"Returning {len(models)} available embedding models")
    return models

def check_gpu_available() -> bool:
    """
    Check if a GPU is available for embedding.
    In this CPU-only container, always returns False.
    
    Returns:
        False (GPU is never available in this container)
    """
    logger.info("Running in CPU-only mode, GPU is not available")
    return False
