"""
Embedding model management functionality.

This module provides core embedding model functionality, including:
- Managing embedding models
- Creating and using embeddings
"""

import os
import logging
import requests
import re
from typing import List, Dict, Any, Optional
import numpy as np

from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings

# Set up logging
logger = logging.getLogger("embedding_service")

class VLLMOpenAIEmbeddings(Embeddings):
    """
    Embeddings implementation for vLLM models using OpenAI compatible API.
    This is a wrapper around OpenAIEmbeddings that configures it properly for vLLM.
    """
    
    def __init__(self, model: str = "/models/bge-base-en-v1.5", base_url: str = None):
        """
        Initialize vLLM embeddings with OpenAI compatible API.
        
        Args:
            model: Model name/path to use
            base_url: Base URL for vLLM API
        """
        # Store the model and base_url attributes
        self._model = model
        
        # Use config setting if available, with fallback to environment and default
        if base_url:
            self._base_url = base_url
        else:
            try:
                from ..config import VLLM_EMBEDDINGS_BASE_URL
                self._base_url = VLLM_EMBEDDINGS_BASE_URL
            except ImportError:
                try:
                    from config import VLLM_EMBEDDINGS_BASE_URL
                    self._base_url = VLLM_EMBEDDINGS_BASE_URL
                except ImportError:
                    self._base_url = os.environ.get("VLLM_EMBEDDINGS_BASE_URL", "http://host.docker.internal:8012/v1")
        
        # Try to detect the correct model ID from the server
        self._detect_model_id()
        
        logger.info(f"Initializing VLLMOpenAIEmbeddings with model: {self._model} and base URL: {self._base_url}")
        
        # Create an instance of OpenAIEmbeddings with our settings
        self._embeddings = OpenAIEmbeddings(
            model=self._model,
            openai_api_key="EMPTY",  # Not used by vLLM but required by OpenAI interface
            openai_api_base=self._base_url
        )
    
    def _detect_model_id(self):
        """
        Attempt to detect the correct model ID from the server.
        Updates self._model if a BGE model is found.
        """
        try:
            import requests
            
            # Query the models endpoint to get available models
            url = f"{self._base_url}/models"
            response = requests.get(url, timeout=3)
            
            if response.status_code == 200:
                data = response.json()
                
                if "data" in data:
                    models = data["data"]
                    model_ids = [model.get("id") for model in models if "id" in model]
                    
                    logger.info(f"Available embedding models: {model_ids}")
                    
                    # Try to find a BGE model in the list
                    for model_id in model_ids:
                        if "bge" in model_id.lower():
                            old_model = self._model
                            self._model = model_id
                            logger.info(f"Auto-detected BGE model: {self._model} (was: {old_model})")
                            return
            
            logger.warning(f"Could not auto-detect model ID, using provided model: {self._model}")
            
        except Exception as e:
            logger.warning(f"Error detecting model ID: {e}, using provided model: {self._model}")

    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess text to avoid tokenization issues.
        
        Args:
            text: Text to preprocess
            
        Returns:
            Preprocessed text
        """
        if not text:
            return ""
            
        # Remove null bytes and other control characters
        text = re.sub(r'[\x00-\x1F\x7F-\x9F]', ' ', text)
        
        # Replace multiple spaces with a single space
        text = re.sub(r'\s+', ' ', text)
        
        # Truncate to a reasonable length
        if len(text) > 8000:
            text = text[:8000]
            
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def _direct_api_embeddings(self, text: str) -> List[float]:
        """
        Make a direct API call to vLLM for embeddings when the OpenAI wrapper fails.
        
        Args:
            text: Text to embed
            
        Returns:
            List of embedding values
        """
        try:
            import requests
            
            # Clean and normalize the text to avoid token issues
            text = self._preprocess_text(text)
            if not text:
                logger.warning("Empty text after preprocessing, returning zero vector")
                return [0.0] * 768
            
            url = f"{self._base_url}/embeddings"
            headers = {"Content-Type": "application/json"}
            payload = {
                "model": self._model,
                "input": text
            }
            
            logger.debug(f"Making direct embedding API call to {url} with model {self._model}")
            response = requests.post(url, headers=headers, json=payload)
            
            # If we get an error, try getting the list of available models and using one of those
            if response.status_code != 200:
                logger.warning(f"Embedding API error: {response.status_code}. Trying alternative models.")
                try:
                    models_url = f"{self._base_url}/models"
                    models_response = requests.get(models_url, timeout=2)
                    if models_response.status_code == 200:
                        data = models_response.json()
                        if "data" in data:
                            available_models = [model.get("id") for model in data.get("data", [])]
                            logger.info(f"Available models: {available_models}")
                            
                            # Try the first available model or one with 'bge' in the name
                            for model_id in available_models:
                                if "bge" in model_id.lower():
                                    logger.info(f"Trying alternative model: {model_id}")
                                    payload["model"] = model_id
                                    response = requests.post(url, headers=headers, json=payload)
                                    if response.status_code == 200:
                                        # Update our model ID for future calls
                                        self._model = model_id
                                        logger.info(f"Successfully used alternative model: {model_id}")
                                        break
                            
                            # If we still don't have a valid model, try the first available one
                            if response.status_code != 200 and available_models:
                                logger.info(f"Trying first available model: {available_models[0]}")
                                payload["model"] = available_models[0]
                                response = requests.post(url, headers=headers, json=payload)
                                if response.status_code == 200:
                                    # Update our model ID for future calls
                                    self._model = available_models[0]
                                    logger.info(f"Successfully used first available model: {available_models[0]}")
                except Exception as e:
                    logger.error(f"Error trying to find alternative model: {e}")
            
            if response.status_code != 200:
                logger.error(f"All embedding attempts failed with status {response.status_code}. Response: {response.text}")
                return [0.0] * 768
                
            data = response.json()
            
            # Extract embedding from response
            if "data" in data and len(data["data"]) > 0 and "embedding" in data["data"][0]:
                embedding = data["data"][0]["embedding"]
                if embedding and len(embedding) > 0:
                    logger.debug(f"Successfully got embedding of dimension {len(embedding)}")
                    return embedding
            
            logger.error(f"Invalid embedding response format: {data}")
            return [0.0] * 768
            
        except Exception as e:
            logger.error(f"Error in direct API call: {e}")
            return [0.0] * 768
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed multiple documents.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embeddings
        """
        if not texts:
            logger.warning("Empty text list provided for embedding")
            return []
            
        logger.debug(f"Embedding {len(texts)} documents with vLLM")
        
        # Preprocess all texts first
        preprocessed_texts = [self._preprocess_text(text) for text in texts]
        
        # Directly use our robust API implementation instead of trying OpenAIEmbeddings first
        # This avoids token vocabulary errors and is more efficient
        embeddings = []
        for i, text in enumerate(preprocessed_texts):
            if i > 0 and i % 10 == 0:
                logger.debug(f"Embedded {i}/{len(preprocessed_texts)} documents")
            embedding = self._direct_api_embeddings(text)
            embeddings.append(embedding)
        
        logger.debug(f"Completed embedding {len(texts)} documents")
        return embeddings
        
    def embed_query(self, text: str) -> List[float]:
        """
        Embed a query.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding
        """
        if not text:
            logger.warning("Empty text provided for embedding")
            return [0.0] * 768
            
        logger.debug(f"Embedding query with vLLM, text length: {len(text)}")
        
        # Preprocess the text
        preprocessed_text = self._preprocess_text(text)
        
        # Use direct API method that has better error handling
        return self._direct_api_embeddings(preprocessed_text)

def get_embedding_model(model_id: str = "/models/bge-base-en-v1.5") -> Embeddings:
    """
    Get an embedding model instance.
    
    Args:
        model_id: ID or path of the embedding model to use
        
    Returns:
        Embedding model instance
    """
    logger.info(f"Getting embedding model: {model_id}")
    
    # Always use VLLMOpenAIEmbeddings with the specified model path
    return VLLMOpenAIEmbeddings(model=model_id)

def get_available_embedding_models() -> List[Dict[str, Any]]:
    """
    Get a list of available embedding models.
    
    Returns:
        List of embedding model info dictionaries
    """
    # Define a list of available embedding models
    models = [
        {
            "id": "/models/bge-base-en-v1.5",
            "name": "BGE Base English v1.5",
            "description": "BGE Base embedding model optimized for English text",
            "provider": "vLLM"
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
