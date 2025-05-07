"""
LLM integration functionality using vLLM.

This module provides core LLM integration functionality, including:
- Checking available vLLM models
- Generating responses from vLLM LLMs with OpenAI-compatible API
"""

import os
import logging
import requests
import json
from typing import List, Dict, Any, Optional, Union

# Set up logging
logger = logging.getLogger("embedding_service")

class VLLMLLM:
    """
    LLM integration class for vLLM models using OpenAI-compatible API.
    """
    
    def __init__(self, model: str = "/models/DeepSeek-R1-Distill-Llama-8B-abliterated", base_url: str = None):
        """
        Initialize vLLM LLM integration.
        
        Args:
            model: Model path to use
            base_url: Base URL for vLLM API
        """
        self.model = model
        
        # Use config setting if available, with fallback to environment and default
        if base_url:
            self.base_url = base_url
        else:
            try:
                from ..config import VLLM_BASE_URL
                self.base_url = VLLM_BASE_URL
            except ImportError:
                try:
                    from config import VLLM_BASE_URL
                    self.base_url = VLLM_BASE_URL
                except ImportError:
                    self.base_url = os.environ.get("VLLM_BASE_URL", "http://host.docker.internal:8007/v1")
        
        logger.info(f"Initializing VLLMLLM with model: {self.model} and base URL: {self.base_url}")
        
    def get_available_models(self) -> List[str]:
        """
        Get list of available models from vLLM.
        
        Returns:
            List of available model paths
        """
        try:
            # Format the API URL - vLLM OpenAI compatible API uses /models endpoint
            base_url = self.base_url.rstrip('/')
            url = f"{base_url}/models"
            
            # Make the request
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            models = []
            
            # Extract model names from the response
            if "data" in data:
                for model in data["data"]:
                    if "id" in model:
                        models.append(model["id"])
            
            logger.info(f"Found {len(models)} available vLLM models: {models}")
            return models
            
        except Exception as e:
            logger.error(f"Error getting available models from vLLM: {e}")
            return []
    
    def get_best_available_model(self, preferred_models: List[str] = None) -> str:
        """
        Get the best available model, prioritizing from a list of preferred models.
        
        Args:
            preferred_models: List of model paths in order of preference
            
        Returns:
            Path of the best available model
        """
        if preferred_models is None:
            # Default models in order of preference
            preferred_models = [
                "/models/DeepSeek-R1-Distill-Llama-8B-abliterated"
            ]
        
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
            # Format the API URL for chat completions
            base_url = self.base_url.rstrip('/')
            url = f"{base_url}/chat/completions"
            
            # Prepare the payload for OpenAI-compatible chat API
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature,
                "top_p": top_p,
                "max_tokens": max_tokens
            }
            
            # Log request details (but not the prompt as it could be large)
            logger.info(f"Sending chat completion request to {url} with model {self.model}")
            
            # Make the request
            headers = {"Content-Type": "application/json"}
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            
            # Parse the response
            result = response.json()
            
            # Extract the generated text from OpenAI-compatible format
            if "choices" in result and len(result["choices"]) > 0:
                message = result["choices"][0].get("message", {})
                if "content" in message:
                    response_text = message["content"]
                    logger.info(f"Generated response of length {len(response_text)}")
                    return response_text
                
            logger.warning(f"No valid content found in vLLM API response: {result}")
            return "I was unable to generate a response due to a technical issue with the language model."
        
        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error from vLLM API: {http_err}")
            # Try to extract error message from response
            try:
                error_json = response.json()
                error_message = error_json.get('error', {}).get('message', str(http_err))
                logger.error(f"vLLM API error message: {error_message}")
                return f"Error generating response: {error_message}"
            except:
                return f"Error generating response: {http_err}"
        except Exception as e:
            logger.error(f"Error generating response from vLLM: {e}")
            return f"Error generating response: {str(e)}"

# Singleton instance for reuse
_vllm_llm = None

def get_vllm_llm(model: str = None) -> VLLMLLM:
    """
    Get a singleton instance of VLLMLLM.
    
    Args:
        model: Optional model path to use (defaults to best available)
        
    Returns:
        VLLMLLM instance
    """
    global _vllm_llm
    
    if _vllm_llm is None:
        _vllm_llm = VLLMLLM()
    
    # If a specific model is requested, update the instance
    if model is not None:
        _vllm_llm.model = model
    
    return _vllm_llm

def generate_with_best_model(prompt: str, options: Dict[str, Any] = None) -> str:
    """
    Generate a response using the best available model.
    
    Args:
        prompt: Text prompt to send to the LLM
        options: Optional parameters for generation
        
    Returns:
        Generated response
    """
    llm = get_vllm_llm()
    
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

# Maintain compatibility with old code
get_ollama_llm = get_vllm_llm 