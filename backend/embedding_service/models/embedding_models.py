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
    
    def __init__(self, model_name: str = "nomic-ai/nomic-embed-text-v1.5", **kwargs):
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
    model_name = model_name.lower()
    
    if model_name == "openai-ada-002" or model_name == "text-embedding-ada-002":
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        return OpenAIEmbeddings(openai_api_key=api_key, model="text-embedding-ada-002")
    
    elif model_name == "openai-3-small" or model_name == "text-embedding-3-small":
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        return OpenAIEmbeddings(openai_api_key=api_key, model="text-embedding-3-small")
    
    elif model_name == "openai-3-large" or model_name == "text-embedding-3-large":
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        return OpenAIEmbeddings(openai_api_key=api_key, model="text-embedding-3-large")
    
    elif model_name == "nomic-embed-text" or model_name == "nomic-ai/nomic-embed-text-v1.5":
        return NomicEmbeddings(
            model_name="nomic-ai/nomic-embed-text-v1.5", 
            **kwargs
        )
    
    else:
        raise ValueError(f"Unsupported embedding model: {model_name}")


def get_available_embedding_models() -> List[Dict[str, str]]:
    """
    Get a list of available embedding models.
    
    Returns:
        List of dictionaries with model information
    """
    return [
        {
            "id": "nomic-embed-text",
            "name": "Nomic Embed Text",
            "description": "Nomic AI's text embedding model",
            "provider": "Nomic AI"
        },
        {
            "id": "openai-ada-002",
            "name": "OpenAI Ada 002",
            "description": "OpenAI's text-embedding-ada-002 model",
            "provider": "OpenAI"
        },
        {
            "id": "openai-3-small",
            "name": "OpenAI Embedding 3 Small",
            "description": "OpenAI's text-embedding-3-small model",
            "provider": "OpenAI"
        },
        {
            "id": "openai-3-large",
            "name": "OpenAI Embedding 3 Large",
            "description": "OpenAI's text-embedding-3-large model",
            "provider": "OpenAI"
        }
    ] 