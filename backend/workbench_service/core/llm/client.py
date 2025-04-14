"""
LLM client module for the workbench service.

This module handles communication with LLM services using the Ollama API.
"""

import json
import logging
import httpx
from typing import Dict, Any, Optional, List

# Import necessary configurations
from config import (
    OLLAMA_BASE_URL, 
    VLLM_BASE_URL, 
    DEFAULT_LLM_MODEL, 
    LLM_PROVIDER
)

logger = logging.getLogger("workbench_service")

class LLMClient:
    """Client for interacting with LLM services (Ollama or vLLM)."""
    
    def __init__(self, model: str = DEFAULT_LLM_MODEL):
        """
        Initialize the LLM client based on the configured provider.
        
        Args:
            model: Default model to use
        """
        self.llm_provider = LLM_PROVIDER
        self.ollama_base_url = OLLAMA_BASE_URL
        self.vllm_base_url = VLLM_BASE_URL
        self.model = model
        self.timeout = 120.0  # Increased default timeout
        
        logger.info(f"Initializing LLMClient with provider: {self.llm_provider}")
        if self.llm_provider == 'ollama':
            logger.info(f"Using Ollama base URL: {self.ollama_base_url}")
        elif self.llm_provider == 'vllm':
            logger.info(f"Using vLLM base URL: {self.vllm_base_url}")
        else:
            # Fallback or raise error if provider is unsupported
            logger.warning(f"Unsupported LLM provider '{self.llm_provider}'. Client might not function correctly.")
            # Optionally raise ValueError("Unsupported LLM provider")
            
    
    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> Dict[str, Any]:
        """
        Generate a response from the configured LLM provider.
        
        Args:
            system_prompt: System prompt to guide the LLM's behavior
            user_prompt: User prompt containing the actual request
            **kwargs: Additional parameters (model, temperature, top_p, max_tokens)
            
        Returns:
            LLM response content as a dictionary (structure may vary slightly by provider)
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                model = kwargs.get("model", self.model)
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
                
                if self.llm_provider == 'ollama':
                    url = f"{self.ollama_base_url}/api/chat"
                    payload = {
                        "model": model,
                        "messages": messages,
                        "stream": False,
                        "temperature": kwargs.get("temperature", 0.7),
                        "top_p": kwargs.get("top_p", 0.9),
                        # Ollama might use different parameter names or support fewer options directly here
                    }
                    logger.info(f"Sending request to Ollama at {url} with model {model}")
                    
                elif self.llm_provider == 'vllm':
                    url = f"{self.vllm_base_url}/v1/chat/completions"
                    payload = {
                        "model": model, # vLLM uses the model specified here
                        "messages": messages,
                        "max_tokens": kwargs.get("max_tokens", 2048),
                        "temperature": kwargs.get("temperature", 0.7),
                        "top_p": kwargs.get("top_p", 0.9),
                        "stream": False
                        # Add other OpenAI compatible parameters if needed
                    }
                    logger.info(f"Sending request to vLLM at {url} with model {model}")
                else:
                    raise ValueError(f"Unsupported LLM provider configured: {self.llm_provider}")

                response = await client.post(url, json=payload)
                response.raise_for_status()
                
                result = response.json()

                # --- START DEBUG PRINT ---
                print("\n--- RAW VLLM RESPONSE --- START ---")
                import pprint
                pprint.pprint(result)
                print("--- RAW VLLM RESPONSE --- END ---")
                # --- END DEBUG PRINT ---

                # Extract content based on provider's response structure
                response_content = None
                if self.llm_provider == 'ollama':
                    if message_data := result.get('message'):
                        response_content = message_data.get('content')
                    else:
                        logger.warning(f"Ollama response missing 'message' key. Raw response: {result}")
                elif self.llm_provider == 'vllm':
                    if choices := result.get('choices'):
                        if isinstance(choices, list) and len(choices) > 0:
                            first_choice = choices[0]
                            if message_data := first_choice.get('message'):
                                response_content = message_data.get('content')
                                if response_content is None:
                                     logger.warning(f"vLLM response 'message' object missing 'content'. Message: {message_data}")
                            else:
                                logger.warning(f"vLLM response first choice missing 'message' key. Choice: {first_choice}")
                        else:
                            logger.warning(f"vLLM response 'choices' key is empty or not a list. Choices: {choices}")
                    else:
                         logger.warning(f"vLLM response missing 'choices' key. Raw response: {result}")

                # Check if content extraction failed or yielded empty content
                if not response_content: # Checks for None or empty string
                     logger.error(f"Could not extract non-empty response content from {self.llm_provider}. Raw response: {result}")
                     # Depending on desired behavior, you might return the raw result, raise an error,
                     # or return a specific structure indicating failure.
                     # Raising an exception as before seems appropriate given the previous error logs.
                     raise Exception(f"Failed to extract valid content from {self.llm_provider} response")

                # --- START DEBUG PRINT ---
                print("\n--- EXTRACTED CONTENT --- START ---")
                print(response_content)
                print("--- EXTRACTED CONTENT --- END ---")
                # --- END DEBUG PRINT ---

                # Log the extracted content for confirmation
                logger.debug(f"Extracted content: {response_content[:100]}...") # Log first 100 chars

                # Return the whole parsed result as before, letting the caller handle it
                return result
        
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error calling {self.llm_provider}: {e.response.text}")
            raise Exception(f"{self.llm_provider} service returned error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Request error calling {self.llm_provider}: {str(e)}")
            raise Exception(f"Failed to connect to {self.llm_provider} service: {str(e)}")
        except ValueError as e:
            logger.error(f"Configuration error: {str(e)}")
            raise # Re-raise configuration errors
        except Exception as e:
            logger.error(f"Unexpected error calling {self.llm_provider}: {str(e)}", exc_info=True)
            raise Exception(f"Error generating response from {self.llm_provider}: {str(e)}")

# Global LLM client instance
_llm_client: Optional[LLMClient] = None

def get_llm_client() -> LLMClient:
    """Get the global LLM client instance. Initializes if not already done."""
    global _llm_client
    if _llm_client is None:
        logger.info("Initializing global LLMClient instance.")
        _llm_client = LLMClient() # Reads provider and URLs from config internally
    return _llm_client 