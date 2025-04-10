"""
LLM client module for the workbench service.

This module handles communication with LLM services using the Ollama API.
"""

import json
import logging
import httpx
from typing import Dict, Any, Optional, List

from config import OLLAMA_BASE_URL, DEFAULT_LLM_MODEL

logger = logging.getLogger("workbench_service")

class LLMClient:
    """Client for interacting with LLM services."""
    
    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = DEFAULT_LLM_MODEL):
        """
        Initialize the LLM client.
        
        Args:
            base_url: Base URL for the LLM service
            model: Default model to use
        """
        self.base_url = base_url
        self.model = model
        self.timeout = 60.0  # Default timeout in seconds
    
    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> Dict[str, Any]:
        """
        Generate a response from the LLM.
        
        Args:
            system_prompt: System prompt to guide the LLM's behavior
            user_prompt: User prompt containing the actual request
            **kwargs: Additional parameters to pass to the LLM
            
        Returns:
            LLM response as a dictionary
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Prepare the request payload
                payload = {
                    "model": kwargs.get("model", self.model),
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "stream": False,
                    "temperature": kwargs.get("temperature", 0.7),
                    "top_p": kwargs.get("top_p", 0.9),
                    "max_tokens": kwargs.get("max_tokens", 2048),
                }
                
                # Send request to Ollama
                url = f"{self.base_url}/api/chat"
                logger.info(f"Sending request to LLM at {url}")
                
                response = await client.post(url, json=payload)
                response.raise_for_status()
                
                result = response.json()
                logger.debug(f"Received response from LLM: {result}")
                
                return result
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error when calling LLM: {e.response.text}")
            raise Exception(f"LLM service returned error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Request error when calling LLM: {str(e)}")
            raise Exception(f"Failed to connect to LLM service: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error when calling LLM: {str(e)}", exc_info=True)
            raise Exception(f"Error generating response from LLM: {str(e)}")

# Global LLM client instance
_llm_client = None

def get_llm_client() -> LLMClient:
    """Get the global LLM client instance."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client 