"""
Embedding model management functionality.

This module provides core embedding model functionality, including:
- Managing embedding models
- Creating and using embeddings
"""

import os
import logging
import requests
from typing import List, Dict, Any, Optional
import numpy as np

from langchain_core.embeddings import Embeddings

# Set up logging
logger = logging.getLogger("embedding_service")

class OllamaEmbeddings(Embeddings):
    """
    Embeddings implementation for Ollama models.
    """
    
    def __init__(self, model: str = "nomic-embed-text:latest", base_url: str = None):
        """
        Initialize Ollama embeddings.
        
        Args:
            model: Model name to use
            base_url: Base URL for Ollama API
        """
        self.model = model
        
        # Use config setting if available, with fallback to environment and default
        if base_url:
            self.base_url = base_url
        else:
            try:
                from ..config import OLLAMA_BASE_URL
                self.base_url = OLLAMA_BASE_URL
            except ImportError:
                try:
                    from config import OLLAMA_BASE_URL
                    self.base_url = OLLAMA_BASE_URL
                except ImportError:
                    self.base_url = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        
        logger.info(f"Initializing OllamaEmbeddings with model: {self.model} and base URL: {self.base_url}")
        
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed multiple documents.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embeddings
        """
        embeddings = []
        for text in texts:
            try:
                embedding = self.embed_query(text)
                embeddings.append(embedding)
            except Exception as e:
                logger.error(f"Error embedding document: {e}")
                # Return a zero vector of the same size as others if available
                if embeddings:
                    embeddings.append([0.0] * len(embeddings[0]))
                else:
                    # If no prior embeddings, use a default dimension
                    embeddings.append([0.0] * 384)  # Common embedding size
        return embeddings
        
    def embed_query(self, text: str) -> List[float]:
        """
        Embed a query.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding
        """
        try:
            # Clean and prepare the text
            text = text.replace('\n', ' ').strip()
            if not text:
                logger.warning("Empty text provided for embedding")
                return [0.0] * 384  # Return zero vector of default size
            
            # Make request to Ollama API
            # Ensure the URL is correctly formatted for the embeddings endpoint
            api_path = "/api/embeddings"
            
            # Remove trailing slashes from base_url and handle v1 in the URL
            base_url = self.base_url.rstrip('/')
            if base_url.endswith('/v1'):
                # If URL ends with /v1, remove it and use direct API path
                base_url = base_url[:-3]
                
            url = f"{base_url}{api_path}"
            logger.debug(f"Making embedding request to: {url}")
            
            payload = {
                "model": self.model,
                "prompt": text
            }
            
            logger.debug(f"Embedding payload: model={self.model}, text_length={len(text)}")
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            result = response.json()
            embedding = result.get("embedding", [])
            
            if not embedding:
                logger.error("No embedding returned from Ollama API")
                return [0.0] * 384  # Return zero vector of default size
                
            logger.debug(f"Successfully retrieved embedding with dimension: {len(embedding)}")
            return embedding
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error making request to Ollama API: {e}")
            # For development purposes, return a random embedding
            # In production, you might want to retry or raise an exception
            import random
            random_embedding = [random.uniform(-1, 1) for _ in range(384)]
            # Normalize
            magnitude = sum(x*x for x in random_embedding) ** 0.5
            if magnitude > 0:
                random_embedding = [x/magnitude for x in random_embedding]
            return random_embedding

def get_embedding_model(model_id: str = "nomic-embed-text") -> Embeddings:
    """
    Get an embedding model instance.
    
    Args:
        model_id: ID of the embedding model to use
        
    Returns:
        Embedding model instance
    """
    logger.info(f"Getting embedding model: {model_id}")
    
    # For now, all models use OllamaEmbeddings with different model names
    # In a production environment, you might want to switch between different
    # embedding implementations based on the model_id
    return OllamaEmbeddings(model=model_id)

def get_available_embedding_models() -> List[Dict[str, Any]]:
    """
    Get a list of available embedding models.
    
    Returns:
        List of embedding model info dictionaries
    """
    # Define a list of available embedding models
    models = [
        {
            "id": "nomic-embed-text",
            "name": "Nomic Embed Text",
            "description": "Nomic's text embedding model optimized for retrieval",
            "provider": "Ollama"
        },
        {
            "id": "text-embedding-3-small",
            "name": "Text Embedding 3 Small",
            "description": "OpenAI's text embedding model (simulation)",
            "provider": "Ollama"
        }
    ]
    
    logger.info(f"Returning {len(models)} available embedding models")
    return models

def check_gpu_available() -> bool:
    """
    Check if a GPU is available for embedding.
    
    Returns:
        True if GPU is available, False otherwise
    """
    try:
        # Try to import torch to check GPU availability
        import torch
        return torch.cuda.is_available()
    except ImportError:
        logger.warning("PyTorch not installed, cannot check GPU availability")
        return False
    except Exception as e:
        logger.error(f"Error checking GPU availability: {e}")
        return False
