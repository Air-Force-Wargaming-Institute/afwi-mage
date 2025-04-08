import requests
from typing import List, Dict, Optional
import logging
from config_ import load_config

logger = logging.getLogger(__name__)

class OllamaModelManager:
    def __init__(self, base_url: str = None):
        """Initialize the Ollama Model Manager.

        Args:
            base_url (str): Base URL for Ollama API. If None, loads from config.
        """
        config = load_config()
        # Use OLLAMA_API_URL for direct Ollama API calls (without /v1)
        self.base_url = (base_url or config.get('OLLAMA_API_URL', 'http://host.docker.internal:11434')).rstrip('/')
        logger.info(f"Initializing OllamaModelManager with base URL: {self.base_url}")

    def list_models(self) -> List[Dict[str, str]]:
        """Fetch all available models from Ollama.

        Returns:
            List[Dict[str, str]]: List of model information dictionaries
            Each dict contains 'name' and other model metadata

        Raises:
            requests.RequestException: If API request fails
        """
        try:
            url = f"{self.base_url}/api/tags"
            logger.debug(f"Fetching models from: {url}")
            
            response = requests.get(url, timeout=10)  # Added timeout
            response.raise_for_status()
            
            models = response.json().get('models', [])
            logger.info(f"Retrieved {len(models)} models from Ollama")
            logger.debug(f"Available models: {[model['name'] for model in models]}")
            return models
            
        except requests.RequestException as e:
            logger.error(f"Error fetching models: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response content: {e.response.text}")
            return []

    def model_exists(self, model_name: str) -> bool:
        """Check if a specific model exists in Ollama.

        Args:
            model_name (str): Name of the model to check

        Returns:
            bool: True if model exists, False otherwise
        """
        try:
            logger.debug(f"Checking existence of model: {model_name}")
            models = self.list_models()
            
            # More detailed logging of the comparison
            for model in models:
                logger.debug(f"Comparing requested '{model_name}' with available '{model['name']}'")
                
            exists = any(model['name'] == model_name for model in models)
            logger.info(f"Model {model_name} {'exists' if exists else 'does not exist'} in Ollama")
            return exists
            
        except Exception as e:
            logger.error(f"Error checking model existence: {str(e)}")
            return False

    def get_model_info(self, model_name: str) -> Optional[Dict[str, str]]:
        """Get detailed information about a specific model.

        Args:
            model_name (str): Name of the model to get info for

        Returns:
            Optional[Dict[str, str]]: Model information if found, None otherwise
        """
        try:
            models = self.list_models()
            return next((model for model in models if model['name'] == model_name), None)
        except Exception as e:
            print(f"Error getting model info: {str(e)}")
            return None

# Example usage:
if __name__ == "__main__":
    ollama = OllamaModelManager()
    
    # List all models
    models = ollama.list_models()
    print("Available models:", models)
    
    # Check if specific model exists
    model_name = "huihui_ai/llama3.2-abliterate:latest"
    exists = ollama.model_exists(model_name)
    print(f"Model {model_name} exists: {exists}")
    
    # Get specific model info
    model_info = ollama.get_model_info(model_name)
    print(f"Model info: {model_info}")
