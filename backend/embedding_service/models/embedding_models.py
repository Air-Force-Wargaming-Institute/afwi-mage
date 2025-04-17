"""
Module for handling different embedding models.
"""

import os
from typing import Dict, Any, Optional, List
from pathlib import Path

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_community.embeddings import OpenAIEmbeddings, HuggingFaceEmbeddings


class NomicEmbeddings(HuggingFaceEmbeddings):
    """Nomic embeddings implementation."""
    
    def __init__(self, model_name: str = "nomic-ai/nomic-embed-text:latest", **kwargs):
        """Initialize the Nomic embeddings."""
        model_kwargs = {"device": "cpu"}
        model_kwargs.update(kwargs.get("model_kwargs", {}))
        
        # Update kwargs with model_kwargs
        kwargs["model_kwargs"] = model_kwargs
        
        # Initialize the parent class
        super().__init__(model_name=model_name, **kwargs)


def get_embedding_model(model_name: str, **kwargs) -> Embeddings:
    """
    Get an embedding model based on the specified model name.
    
    Args:
        model_name: Name of the embedding model to use
        **kwargs: Additional arguments to pass to the embedding model
        
    Returns:
        An embedding model instance
        
    Raises:
        ValueError: If the model name is not supported
    """
    # Use VLLMOpenAIEmbeddings for all model requests
    try:
        # Try relative import first
        from ..core.embedding import VLLMOpenAIEmbeddings
    except ImportError:
        # Try direct import
        try:
            from core.embedding import VLLMOpenAIEmbeddings
        except ImportError:
            raise ImportError("Could not import VLLMOpenAIEmbeddings from core.embedding")
    
    # Use "/models/bge-base-en-v1.5" as the default model
    if model_name != "/models/nomic-embed-text:latest":
        model_name = "/models/nomic-embed-text:latest"
    
    return VLLMOpenAIEmbeddings(model=model_name)


def get_available_embedding_models() -> List[Dict[str, str]]:
    """
    Get a list of available embedding models.
    
    Returns:
        List of dictionaries with model information
    """
    return [
        {
            "id": "/models/bge-base-en-v1.5",
            "name": "BGE Base English v1.5",
            "description": "BGE Base embedding model optimized for English text",
            "provider": "vLLM"
        }
    ] 