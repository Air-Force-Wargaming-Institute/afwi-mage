"""
LLM integration functionality using Ollama.

This module provides core LLM integration functionality, including:
- Checking available Ollama models
- Generating responses from Ollama LLMs
"""

import os
import logging
import requests
from typing import List, Dict, Any, Optional, Union

# Set up logging
logger = logging.getLogger("embedding_service")

class OllamaLLM:
    """
    LLM integration class for Ollama models.
    """
    
    def __init__(self, model: str = "llama3.2:latest", base_url: str = None):
        """
        Initialize Ollama LLM integration.
        
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
        
        logger.info(f"Initializing OllamaLLM with model: {self.model} and base URL: {self.base_url}")
        
    def get_available_models(self) -> List[str]:
        """
        Get list of available models from Ollama.
        
        Returns:
            List of available model names
        """
        try:
            # Format the API URL
            base_url = self.base_url.rstrip('/')
            url = f"{base_url}/api/tags"
            
            # Make the request
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            models = []
            
            # Extract model names from the response
            if "models" in data:
                for model in data["models"]:
                    if "name" in model:
                        models.append(model["name"])
            
            logger.info(f"Found {len(models)} available Ollama models: {models}")
            return models
            
        except Exception as e:
            logger.error(f"Error getting available models from Ollama: {e}")
            return []
    
    def get_best_available_model(self, preferred_models: List[str] = None) -> str:
        """
        Get the best available model, prioritizing from a list of preferred models.
        
        Args:
            preferred_models: List of model names in order of preference
            
        Returns:
            Name of the best available model
        """
        if preferred_models is None:
            # Default models in order of preference
            preferred_models = ["llama3.2:latest", "llama3.1:latest"]
        
        # Get available models
        available_models = self.get_available_models()
        
        # Return the first preferred model that's available
        for model in preferred_models:
            if model in available_models:
                logger.info(f"Selected model {model} from available models")
                return model
        
        # If no preferred models are available, return the current model if it's available
        if self.model in available_models:
            return self.model
        
        # Otherwise return the first available model, or the current model if none are available
        return available_models[0] if available_models else self.model
    
    def generate(self, prompt: str, 
                 temperature: float = 0.7, 
                 max_tokens: int = 1000,
                 top_p: float = 0.9) -> str:
        """
        Generate a response from the LLM.
        
        Args:
            prompt: Text prompt to send to the LLM
            temperature: Temperature parameter for generation
            max_tokens: Maximum number of tokens to generate
            top_p: Top-p parameter for nucleus sampling
            
        Returns:
            Generated response
        """
        try:
            # Format the API URL
            base_url = self.base_url.rstrip('/')
            url = f"{base_url}/api/generate"
            
            # Prepare the payload
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": top_p,
                    "max_tokens": max_tokens
                }
            }
            
            # Log request details (but not the prompt as it could be large)
            logger.info(f"Sending generation request to {url} with model {self.model}")
            
            # Make the request
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            
            # Parse the response
            result = response.json()
            
            # Extract the generated text
            if "response" in result:
                logger.info(f"Generated response of length {len(result['response'])}")
                return result["response"]
            else:
                logger.warning("No 'response' field in Ollama API response")
                return ""
        
        except Exception as e:
            logger.error(f"Error generating response from Ollama: {e}")
            return f"Error generating response: {str(e)}"

# Singleton instance for reuse
_ollama_llm = None

def get_ollama_llm(model: str = None) -> OllamaLLM:
    """
    Get a singleton instance of OllamaLLM.
    
    Args:
        model: Optional model name to use (defaults to best available)
        
    Returns:
        OllamaLLM instance
    """
    global _ollama_llm
    
    if _ollama_llm is None:
        _ollama_llm = OllamaLLM()
    
    # If a specific model is requested, update the instance
    if model is not None:
        _ollama_llm.model = model
    
    return _ollama_llm

def generate_with_best_model(prompt: str, options: Dict[str, Any] = None) -> str:
    """
    Generate a response using the best available model.
    
    Args:
        prompt: Text prompt to send to the LLM
        options: Optional parameters for generation
        
    Returns:
        Generated response
    """
    llm = get_ollama_llm()
    
    # Find the best available model
    model = llm.get_best_available_model()
    llm.model = model
    
    # Set default options
    if options is None:
        options = {}
    
    # Generate the response
    return llm.generate(
        prompt=prompt,
        temperature=options.get("temperature", 0.7),
        max_tokens=options.get("max_tokens", 1000),
        top_p=options.get("top_p", 0.9)
    ) 